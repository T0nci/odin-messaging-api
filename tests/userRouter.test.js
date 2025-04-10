const app = require("../src/app");
const request = require("supertest")(app);
const { jest: globalJest, describe, it, expect } = require("@jest/globals");

const cloudinary = require("../src/utils/cloudinary");
globalJest.mock("../src/utils/cloudinary");
cloudinary.generateUrl = globalJest.fn();

describe("GET /users", () => {
  it("returns error if name isn't present or 1 character long", async () => {
    const login = await request
      .post("/login")
      .send({ username: "penny", password: "pen@5Apple" });

    const accessToken = login.header["set-cookie"]
      .find((cookie) => cookie.startsWith("access"))
      .split(";")[0];

    const response = await request.get("/users").set("Cookie", [accessToken]);

    expect(response.status).toBe(400);
    expect(response.body.errors[0].msg).toBe(
      "Search name must be at least 1 character long.",
    );
  });

  it("returns matching users", async () => {
    cloudinary.generateUrl.mockReturnValueOnce("some url");
    cloudinary.generateUrl.mockReturnValueOnce("some url");

    const login = await request
      .post("/login")
      .send({ username: "penny", password: "pen@5Apple" });

    const accessToken = login.header["set-cookie"]
      .find((cookie) => cookie.startsWith("access"))
      .split(";")[0];

    const response = await request
      .get("/users")
      .set("Cookie", [accessToken])
      .send({ name: "SEArch" });

    expect(response.status).toBe(200);
    // from data/users.js
    expect(response.body).toStrictEqual([
      {
        displayName: "Sea1rch",
        id: 6,
        picture: "some url",
      },
      {
        displayName: "Sea2rch",
        id: 7,
        picture: "some url",
      },
    ]);
  });
});
