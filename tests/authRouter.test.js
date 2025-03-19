const app = require("../src/app");
const request = require("supertest")(app);
const prisma = require("../src/db/client");
const {
  describe,
  it,
  expect,
  afterEach,
  beforeAll,
  afterAll,
} = require("@jest/globals");
const bcryptjs = require("bcryptjs");
const users = require("./data/users");

afterEach(async () => {
  await prisma.refreshToken.deleteMany();
});

beforeAll(async () => {
  for (const user of users) {
    await prisma.user.create({
      data: { ...user, password: await bcryptjs.hash(user.password, 10) },
    });
  }
});

afterAll(async () => {
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
});

describe("/register", () => {
  it("returns errors when fields are missing", async () => {
    const response = await request.post("/register").send({ random: "field" });

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
