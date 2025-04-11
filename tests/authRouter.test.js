const app = require("../src/app");
const request = require("supertest")(app);
const prisma = require("../src/db/client");
const { describe, it, expect, afterEach } = require("@jest/globals");
const users = require("./data/users");

describe("authRouter", () => {
  afterEach(async () => await prisma.refreshToken.deleteMany());

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
      const user = users.find((user) => user.username === "penny");
      await prisma.refreshToken.createMany({
        data: [
          {
            user_id: user.id,
          },
          {
            user_id: user.id,
          },
          {
            user_id: user.id,
          },
        ],
      });

      const cookies = (
        await request
          .post("/login")
          .send({ username: "penny", password: "pen@5Apple" })
      ).header["set-cookie"];

      const response = await request.delete("/tokens").set(
        "Cookie",
        cookies.map((cookie) => cookie.split(";")[0]),
      );

      const refreshTokens = await prisma.refreshToken.findMany({
        where: {
          user_id: user.id,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(200);
      expect(
        response.header["set-cookie"].map(
          (cookie) => cookie.split(";")[0].split("=")[0],
        ),
      ).toStrictEqual(["refresh", "access"]);
      expect(refreshTokens.length).toBe(0);
    });
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

  it("resends tokens if sent access token is invalid or doesn't exist", async () => {
    const login = await request
      .post("/login")
      .send({ username: "penny", password: "pen@5Apple" });

    const refreshToken = login.header["set-cookie"]
      .find((cookie) => cookie.startsWith("refresh"))
      .split(";")[0];

    const response = await request
      .get("/some-protected-route")
      .set("Cookie", ["access=blah", refreshToken]);

    const newToken = await prisma.refreshToken.findUnique({
      where: {
        id: refreshToken.split("=")[1],
      },
    });

    expect(response.status).toBe(404);
    expect(
      response.header["set-cookie"].map((cookie) => cookie.split("=")[0]),
    ).toStrictEqual(["refresh", "access"]);
    expect(newToken).toBeDefined();
  });

  it("returns 401 when trying to access protected routes with fake refresh token", async () => {
    const response = await request
      .get("/some-protected-route")
      .set("Cookie", ["refresh=fakeToken"]);

    expect(response.status).toBe(401);
    expect(response.body.status).toBe(401);
  });

  it("returns 401 when trying to access protected routes with tampered refresh token", async () => {
    const login = await request
      .post("/login")
      .send({ username: "penny", password: "pen@5Apple" });

    const refreshToken = login.header["set-cookie"]
      .find((cookie) => cookie.startsWith("refresh"))
      .split(";")[0]
      .split("=")[1];

    // modify the token - in this case I replace the third character with 1
    // or if it's 1 already I replace it with 2
    const modifiedToken = refreshToken.split("").map((item, index) => {
      if (index === 3) {
        if (item === "1") return "2";
        else return "1";
      }

      return item;
    });

    const response = await request
      .get("/some-protected-route")
      .set("Cookie", [`refresh=${modifiedToken}`]);

    expect(response.status).toBe(401);
    expect(response.body.status).toBe(401);
  });

  describe("DELETE /logout", () => {
    it("logs the user out", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const tokens = login.header["set-cookie"].map(
        (cookie) => cookie.split(";")[0],
      );

      const response = await request.delete("/logout").set("Cookie", tokens);

      const cookies = response.header["set-cookie"].map(
        (cookie) => cookie.split(";")[0].split("=")[0],
      );
      const refreshTokens = await prisma.refreshToken.findMany();

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(200);
      expect(cookies.length).toBe(2);
      expect(cookies).toStrictEqual(["refresh", "access"]);
      expect(refreshTokens.length).toBe(0);
    });

    it("logs the user out only with access token", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .delete("/logout")
        .set("Cookie", [accessToken]);

      const cookies = response.header["set-cookie"].map(
        (cookie) => cookie.split(";")[0].split("=")[0],
      );
      const refreshTokens = await prisma.refreshToken.findMany();

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(200);
      expect(cookies.length).toBe(2);
      expect(cookies).toStrictEqual(["refresh", "access"]); // in this order because the middleware defines them in that order
      expect(refreshTokens.length).toBe(1);
    });
  });
});
