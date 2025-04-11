const app = require("../src/app");
const request = require("supertest")(app);
const prisma = require("../src/db/client");
const { jest: globalJest, describe, it, expect } = require("@jest/globals");
const { deleteFriends } = require("./data/cleanup");
const users = require("./data/users");

const path = require("node:path");
const cloudinary = require("../src/utils/cloudinary");
globalJest.mock("../src/utils/cloudinary");
cloudinary.uploadImage = globalJest.fn();
cloudinary.generateUrl = globalJest.fn();

describe("POST /messages/:userId", () => {
  it("returns error if parameter isn't a number or is invalid", async () => {
    const login = await request
      .post("/login")
      .send({ username: "penny", password: "pen@5Apple" });

    const accessToken = login.header["set-cookie"]
      .find((cookie) => cookie.startsWith("access"))
      .split(";")[0];

    const response = await request
      .post("/messages/asd")
      .set("Cookie", [accessToken]);

    expect(response.status).toBe(400);
    expect(response.body.errors[0].msg).toBe("Parameter must be a number.");
  });

  it("returns error if user is sending a message to self", async () => {
    const login = await request
      .post("/login")
      .send({ username: "penny", password: "pen@5Apple" });

    const accessToken = login.header["set-cookie"]
      .find((cookie) => cookie.startsWith("access"))
      .split(";")[0];

    const response = await request
      .post("/messages/" + users.find((user) => user.username === "penny").id)
      .set("Cookie", [accessToken]);

    expect(response.status).toBe(400);
    expect(response.body.errors[0].msg).toBe("Can't send message to yourself.");
  });

  it("returns error if user is not friends with receiver", async () => {
    const login = await request
      .post("/login")
      .send({ username: "penny", password: "pen@5Apple" });

    const accessToken = login.header["set-cookie"]
      .find((cookie) => cookie.startsWith("access"))
      .split(";")[0];

    const response = await request
      .post("/messages/" + users.find((user) => user.username === "al1c3").id)
      .set("Cookie", [accessToken]);

    expect(response.status).toBe(400);
    expect(response.body.errors[0].msg).toBe("Friend not found.");
  });

  it("returns error if invalid type", async () => {
    const sender = users.find((user) => user.username === "penny");
    const receiver = users.find((user) => user.username === "al1c3");
    const friendship = await prisma.friendship.create({
      data: {
        id: 1,
      },
    });
    await prisma.friend.createMany({
      data: [
        {
          friendship_id: friendship.id,
          user_id: sender.id,
        },
        {
          friendship_id: friendship.id,
          user_id: receiver.id,
        },
      ],
    });

    const login = await request
      .post("/login")
      .send({ username: "penny", password: "pen@5Apple" });

    const accessToken = login.header["set-cookie"]
      .find((cookie) => cookie.startsWith("access"))
      .split(";")[0];

    const response = await request
      .post("/messages/" + users.find((user) => user.username === "al1c3").id)
      .set("Cookie", [accessToken])
      .field("type", "blah");

    expect(response.status).toBe(400);
    expect(response.body.errors[0].msg).toBe("Unknown message type.");

    await deleteFriends();
  });

  it("returns error if no or invalid content", async () => {
    const sender = users.find((user) => user.username === "penny");
    const receiver = users.find((user) => user.username === "al1c3");
    const friendship = await prisma.friendship.create({
      data: {
        id: 1,
      },
    });
    await prisma.friend.createMany({
      data: [
        {
          friendship_id: friendship.id,
          user_id: sender.id,
        },
        {
          friendship_id: friendship.id,
          user_id: receiver.id,
        },
      ],
    });

    const login = await request
      .post("/login")
      .send({ username: "penny", password: "pen@5Apple" });

    const accessToken = login.header["set-cookie"]
      .find((cookie) => cookie.startsWith("access"))
      .split(";")[0];

    const response = await request
      .post("/messages/" + users.find((user) => user.username === "al1c3").id)
      .set("Cookie", [accessToken])
      .field("type", "text");

    expect(response.status).toBe(400);
    expect(response.body.errors[0].msg).toBe(
      "Content must be at least 1 character long.",
    );

    await deleteFriends();
  });

  it("returns error if no or invalid image", async () => {
    const sender = users.find((user) => user.username === "penny");
    const receiver = users.find((user) => user.username === "al1c3");
    const friendship = await prisma.friendship.create({
      data: {
        id: 1,
      },
    });
    await prisma.friend.createMany({
      data: [
        {
          friendship_id: friendship.id,
          user_id: sender.id,
        },
        {
          friendship_id: friendship.id,
          user_id: receiver.id,
        },
      ],
    });

    const login = await request
      .post("/login")
      .send({ username: "penny", password: "pen@5Apple" });

    const accessToken = login.header["set-cookie"]
      .find((cookie) => cookie.startsWith("access"))
      .split(";")[0];

    const response = await request
      .post("/messages/" + users.find((user) => user.username === "al1c3").id)
      .set("Cookie", [accessToken])
      .field("type", "image");

    expect(response.status).toBe(400);
    expect(response.body.errors[0].msg).toBe("Image must be provided.");

    await deleteFriends();
  });
});
