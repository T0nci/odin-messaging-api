const app = require("./app");
const request = require("supertest")(app);
const prisma = require("./db/client");
const { describe, it, expect, beforeAll, afterAll } = require("@jest/globals");
const bcryptjs = require("bcryptjs");

describe("authRouter", () => {
  beforeAll(async () => {
    const password = await bcryptjs.hash("pen@5Apple", 10);

    await prisma.user.create({
      data: {
        username: "penny",
        password,
      },
    });
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

  afterAll(() =>
    prisma.$transaction([
      prisma.profile.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.user.deleteMany(),
    ]),
  );
});
