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
cloudinary.deleteImage = globalJest.fn();

describe("profileRouter", () => {
  describe("PUT /profile", () => {
    it("returns 400 when trying to update with an invalid name", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .put("/profiles")
        .send({ displayName: "Penny", bio: "" })
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.errors.length).toBe(1);
    });

    it("returns 400 when trying to update with an invalid bio", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .put("/profiles")
        .send({
          displayName: "Tenpenny",
          bio: "01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789",
        })
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.errors.length).toBe(1);
    });

    it("returns 200 when updating successfully", async () => {
      const displayName = "Tenpenny";
      const bio = "Hello, my name is Tenpenny!";

      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .put("/profiles")
        .send({ displayName, bio })
        .set("Cookie", [accessToken]);

      const profile = await prisma.profile.findUnique({
        where: {
          display_name: "Tenpenny",
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(200);
      expect(profile.display_name).toBe(displayName);
      expect(profile.bio).toBe(bio);

      // clean up
      await prisma.profile.update({
        where: {
          display_name: displayName,
        },
        data: {
          display_name: users.find((user) => user.username === "penny").profile
            .create.display_name,
          bio: null,
        },
      });
    });
  });

  describe("PUT /profile/picture", () => {
    it("returns an error if file is missing", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .put("/profiles/picture")
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe("Invalid file value.");
    });

    it("returns an error if file is invalid", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .put("/profiles/picture")
        .attach("image", path.join(__dirname, "data/doc.odt"))
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe("Invalid file value.");
    });

    it("returns an error if file key isn't 'image'", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .put("/profiles/picture")
        .attach("picture", path.join(__dirname, "data/test.jpg"))
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe("Invalid file value.");
    });

    it("successfully uploads file", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .put("/profiles/picture")
        // was throwing error (aborting) because the pathname
        // is relative from where the command is being ran
        // so it works with joining path
        .attach("image", path.join(__dirname, "data/test.jpg"))
        .set("Cookie", [accessToken]);

      const user = await prisma.user.findUnique({
        where: {
          username: "penny",
        },
        include: {
          profile: {
            select: {
              default_picture: true,
            },
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(200);
      expect(user.profile.default_picture).toBe(false);
      expect(cloudinary.uploadImage).toBeCalledTimes(1);

      // clean up
      await prisma.profile.update({
        where: {
          user_id: user.id,
        },
        data: {
          default_picture: true,
        },
      });
    });
  });

  describe("GET /profiles/:userId", () => {
    it("returns error when parameter is invalid", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .get("/profiles/asd")
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe("Parameter must be a number.");
      expect(response.body.errors.length).toBe(1);
    });

    it("returns own profile", async () => {
      cloudinary.generateUrl.mockReturnValueOnce("some url");

      const user = users.find((user) => user.username === "penny");

      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .get("/profiles/" + user.id)
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(200);
      expect(response.body.displayName).toBe("Penny");
      expect(response.body.bio).toBe(null);
      expect(response.body.picture).toBe("some url");
      expect(response.body.mutualFriends).toBeUndefined();
    });

    it("returns friend profile", async () => {
      cloudinary.generateUrl.mockReturnValueOnce("some url");

      const from_user = users.find((user) => user.username === "penny");
      const to_user = users.find((user) => user.username === "al1c3");
      const friendship = await prisma.friendship.create({
        data: {
          id: 1,
        },
      });
      await prisma.friend.createMany({
        data: [
          {
            id: 1,
            friendship_id: friendship.id,
            user_id: from_user.id,
          },
          {
            id: 2,
            friendship_id: friendship.id,
            user_id: to_user.id,
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
        .get("/profiles/" + to_user.id)
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(200);
      expect(response.body.displayName).toBe("Alice");
      expect(response.body.bio).toBe(null);
      expect(response.body.picture).toBe("some url");
      expect(response.body.mutualFriends).toBeUndefined();

      // clean up
      await deleteFriends();
    });

    it("returns stranger profile", async () => {
      cloudinary.generateUrl.mockReturnValueOnce("some url");

      const from_user = users.find((user) => user.username === "penny");
      const mutual = users.find((user) => user.username === "sam1");
      const to_user = users.find((user) => user.username === "al1c3");

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
            user_id: mutual.id,
          },
          {
            id: 2,
            friendship_id: friendship1.id,
            user_id: from_user.id,
          },
          {
            id: 3,
            friendship_id: friendship2.id,
            user_id: mutual.id,
          },
          {
            id: 4,
            friendship_id: friendship2.id,
            user_id: to_user.id,
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
        .get("/profiles/" + to_user.id)
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(200);
      expect(response.body.displayName).toBe("Alice");
      expect(response.body.bio).toBe(null);
      expect(response.body.picture).toBe("some url");
      expect(response.body.mutualFriends).toStrictEqual([
        {
          displayName: "Sam",
          id: mutual.id,
        },
      ]);

      // clean up
      await deleteFriends();
    });
  });

  describe("DELETE /profile/picture", () => {
    it("returns error if default picture is already used", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .delete("/profiles/picture")
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Default picture is already in use.");
    });

    it("deletes profile picture", async () => {
      await prisma.profile.update({
        where: {
          display_name: "Penny",
        },
        data: {
          default_picture: false,
        },
      });

      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .delete("/profiles/picture")
        .set("Cookie", [accessToken]);

      const user = await prisma.user.findUnique({
        where: {
          username: "penny",
        },
        include: {
          profile: {
            select: {
              default_picture: true,
            },
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(200);
      expect(user.profile.default_picture).toBe(true);
      expect(cloudinary.deleteImage).toBeCalledTimes(1);
    });
  });
});
