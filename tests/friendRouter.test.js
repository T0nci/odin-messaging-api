const app = require("../src/app");
const request = require("supertest")(app);
const prisma = require("../src/db/client");
const { jest: globalJest, describe, it, expect } = require("@jest/globals");
const { deleteFriends } = require("./data/cleanup");
const users = require("./data/users");

const cloudinary = require("../src/utils/cloudinary");
globalJest.mock("../src/utils/cloudinary");
cloudinary.generateUrl = globalJest.fn();

describe("GET /friends", () => {
  it("returns all friends", async () => {
    cloudinary.generateUrl.mockReturnValueOnce("some url");
    cloudinary.generateUrl.mockReturnValueOnce("some url");

    const user = users.find((user) => user.username === "penny");
    const friend1 = users.find((user) => user.username === "al1c3");
    const friend2 = users.find((user) => user.username === "sam1");

    const friendship1 = await prisma.friendship.create({
      data: {
        id: 1,
      },
    });
    const friendship2 = await prisma.friendship.create({
      data: {
        id: 2,
      },
    });
    await prisma.friend.createMany({
      data: [
        {
          id: 1,
          friendship_id: friendship1.id,
          user_id: user.id,
        },
        {
          id: 2,
          friendship_id: friendship1.id,
          user_id: friend1.id,
        },
        {
          id: 3,
          friendship_id: friendship2.id,
          user_id: user.id,
        },
        {
          id: 4,
          friendship_id: friendship2.id,
          user_id: friend2.id,
        },
      ],
    });

    const login = await request
      .post("/login")
      .send({ username: "penny", password: "pen@5Apple" });

    const accessToken = login.header["set-cookie"]
      .find((cookie) => cookie.startsWith("access"))
      .split(";")[0];

    const response = await request.get("/friends").set("Cookie", [accessToken]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      [
        {
          displayName: friend1.profile.create.display_name,
          id: friend1.id,
          picture: "some url",
        },
        {
          displayName: friend2.profile.create.display_name,
          id: friend2.id,
          picture: "some url",
        },
        // alphabetically ordered
      ].sort((a, b) => (a.displayName > b.displayName ? 1 : -1)),
    );

    await deleteFriends();
  });
});
