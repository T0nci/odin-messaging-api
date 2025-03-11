const app = require("./app");
const request = require("supertest")(app);
const prisma = require("./db/client");
const {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} = require("@jest/globals");
const bcryptjs = require("bcryptjs");

describe("authRouter", () => {
  afterEach(async () => {
    await prisma.refreshToken.deleteMany();
  });

  beforeAll(async () => {
    const password = await bcryptjs.hash("pen@5Apple", 10);

    await prisma.user.create({
      data: {
        username: "penny",
        password,
      },
    });
  });

  afterAll(async () => {
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();
  });

  describe("/register", () => {
    it("returns errors when fields are missing", async () => {
      const response = await request
        .post("/register")
        .send({ random: "field" });

      expect(response.status).toBe(400);
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it("returns errors when field values aren't following formatting", async () => {
      const response = await request.post("/register").send({
        username: ".,.,",
        password: "asd",
        confirmPassword: "asd",
        displayName: "012345678901234567890123456789",
      });

      expect(response.status).toBe(400);
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it("registers a user and returns cookies", async () => {
      const response = await request.post("/register").send({
        username: "test",
        password: "Tester@2",
        confirmPassword: "Tester@2",
        displayName: "Tester",
      });

      const cookies = response.header["set-cookie"].map(
        (cookie) => cookie.split("=")[0],
      );

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(201);
      expect(cookies).toStrictEqual(["refresh", "access"]);
    });
  });

  describe("/login", () => {
    it("returns 400 error when fields are missing", async () => {
      const response = await request.post("/login").send({ blah: "random" });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe(400);
    });

    it("returns 400 error when username and/or password are incorrect", async () => {
      const response = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Pineapple" });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe(400);
    });

    it("returns 200 and cookies when username and password are correct", async () => {
      const response = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const cookies = response.header["set-cookie"].map(
        (cookie) => cookie.split("=")[0],
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(200);
      expect(cookies).toStrictEqual(["refresh", "access"]);
    });
  });

  describe("/tokens", () => {
    it("deletes all refresh tokens", async () => {
      const cookies = (
        await request
          .post("/login")
          .send({ username: "penny", password: "pen@5Apple" })
      ).header["set-cookie"];

      const response = await request.delete("/tokens").set(
        "Cookie",
        cookies.map((cookie) => cookie.split(";")[0]),
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(200);
      expect(
        response.header["set-cookie"].map(
          (cookie) => cookie.split(";")[0].split("=")[0],
        ),
      ).toStrictEqual(["refresh", "access"]);
    });
  });

  it("returns 401 when tokens are cleared", async () => {
    const login = await request
      .post("/login")
      .send({ username: "penny", password: "pen@5Apple" });

    const refreshToken = login.header["set-cookie"]
      .find((cookie) => cookie.startsWith("refresh"))
      .split(";")[0];
    const accessToken = login.header["set-cookie"]
      .find((cookie) => cookie.startsWith("access"))
      .split(";")[0];

    await request.delete("/tokens").set("Cookie", [accessToken]);

    const response = await request
      .get("/some-protected-route")
      .set("Cookie", [`refresh=${refreshToken}`]);

    expect(response.status).toBe(401);
    expect(response.body.status).toBe(401);
  });

  it("returns 401 when trying to access protected routes without tokens", async () => {
    const response = await request.get("/some-protected-route");

    expect(response.status).toBe(401);
    expect(response.body.status).toBe(401);
  });

  it("allows access to protected routes with tokens", async () => {
    const cookies = (
      await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" })
    ).header["set-cookie"];

    const response = await request.get("/some-protected-route").set(
      "Cookie",
      cookies.map((cookie) => cookie.split(";")[0]),
    );

    expect(response.status).toBe(404);
  });

  it("resend tokens if sent access token is invalid or doesn't exist", async () => {
    const login = await request
      .post("/login")
      .send({ username: "penny", password: "pen@5Apple" });

    const refreshToken = login.header["set-cookie"]
      .find((cookie) => cookie.startsWith("refresh"))
      .split(";")[0];

    const response = await request
      .get("/some-protected-route")
      .set("Cookie", ["access=blah", refreshToken]);

    expect(response.status).toBe(404);
    expect(
      response.header["set-cookie"].map((cookie) => cookie.split("=")[0]),
    ).toStrictEqual(["refresh", "access"]);
  });

  it("returns 401 when trying to access protected routes with fake refresh token", async () => {
    const response = await request
      .get("/some-protected-route")
      .set("Cookie", ["refresh=fakeToken"]);

    expect(response.status).toBe(401);
    expect(response.body.status).toBe(401);
  });
});
