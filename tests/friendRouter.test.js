const app = require("../src/app");
const request = require("supertest")(app);
const prisma = require("../src/db/client");
const { jest: globalJest, describe, it, expect } = require("@jest/globals");
const { deleteFriends } = require("./data/cleanup");

const cloudinary = require("../src/utils/cloudinary");
globalJest.mock("../src/utils/cloudinary");
cloudinary.generateUrl = globalJest.fn();

describe("GET /friends", () => {
  it("returns all friends", async () => {
    cloudinary.generateUrl.mockReturnValueOnce("some url");
    cloudinary.generateUrl.mockReturnValueOnce("some url");

    const user = await prisma.user.findUnique({
      where: {
        username: "penny",
      },
    });
    const friend1 = await prisma.user.findUnique({
      where: {
        username: "al1c3",
      },
      include: {
        profile: {
          select: {
            display_name: true,
          },
        },
      },
    });
    const friend2 = await prisma.user.findUnique({
      where: {
        username: "sam1",
      },
      include: {
        profile: {
          select: {
            display_name: true,
          },
        },
      },
    });

    const friendship1 = await prisma.friendship.create();
    const friendship2 = await prisma.friendship.create();
    await prisma.friend.createMany({
      data: [
        {
          friendship_id: friendship1.id,
          user_id: user.id,
        },
        {
          friendship_id: friendship1.id,
          user_id: friend1.id,
        },
        {
          friendship_id: friendship2.id,
          user_id: user.id,
        },
        {
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
          displayName: friend1.profile.display_name,
          id: friend1.id,
          picture: "some url",
        },
        {
          displayName: friend2.profile.display_name,
          id: friend2.id,
          picture: "some url",
        },
        // alphabetically ordered
      ].sort((a, b) => (a.displayName > b.displayName ? 1 : -1)),
    );

    await deleteFriends();
  });
});
