const app = require("../src/app");
const request = require("supertest")(app);
const prisma = require("../src/db/client");
const {
  jest: globalJest,
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} = require("@jest/globals");
const bcryptjs = require("bcryptjs");

const path = require("node:path");
const cloudinary = require("../src/utils/cloudinary");
globalJest.mock("../src/utils/cloudinary");
cloudinary.uploadImage = globalJest.fn();
cloudinary.generateUrl = globalJest.fn();

afterEach(async () => {
  await prisma.refreshToken.deleteMany();
});

beforeAll(async () => {
  const users = [
    {
      username: "penny",
      password: await bcryptjs.hash("pen@5Apple", 10),
      profile: {
        create: {
          display_name: "Penny",
        },
      },
    },
    {
      username: "sam1",
      password: await bcryptjs.hash("guitar$69Sam", 10),
      profile: {
        create: {
          display_name: "Sam",
        },
      },
    },
    {
      username: "al1c3",
      password: await bcryptjs.hash("alISha*3", 10),
      profile: {
        create: {
          display_name: "Alice",
        },
      },
    },
    {
      username: "benn",
      password: await bcryptjs.hash("bend0VER!", 10),
      profile: {
        create: {
          display_name: "Ben",
        },
      },
    },
    {
      username: "p3ter",
      password: await bcryptjs.hash("P4TrishA", 10),
      profile: {
        create: {
          display_name: "Peter Parker",
        },
      },
    },
  ];

  for (const user of users) {
    await prisma.user.create({
      data: user,
    });
  }
});

afterAll(async () => {
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
});

describe("requestRouter", () => {
  afterEach(async () => {
    await prisma.request.deleteMany();
    await prisma.friend.deleteMany();
    await prisma.friendship.deleteMany();
  });

  describe("/requests", () => {
    it("gets received requests", async () => {
      const from_user = await prisma.user.findUnique({
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
      const to_user = await prisma.user.findUnique({
        where: {
          username: "penny",
        },
      });
      await prisma.request.create({
        data: {
          from_id: from_user.id,
          to_id: to_user.id,
        },
      });

      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      await request
        .post("/requests/" + to_user.id)
        .set("Cookie", [accessToken]);

      const response = await request
        .get("/requests")
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(200);
      expect(response.body[0].id).toBe(from_user.id);
      expect(response.body[0].from).toBe(from_user.profile.display_name);
      expect(response.body[0].sent).toBeDefined();
    });

    it("gets sent requests", async () => {
      const to_user = await prisma.user.findUnique({
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

      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      await request
        .post("/requests/" + to_user.id)
        .set("Cookie", [accessToken]);

      const response = await request
        .get("/requests/sent")
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(200);
      expect(response.body[0].id).toBe(to_user.id);
      expect(response.body[0].to).toBe(to_user.profile.display_name);
      expect(response.body[0].sent).toBeDefined();
    });
  });

  describe("POST /request/:userId", () => {
    it("returns error when parameter is invalid", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .post("/requests/asd")
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe("Parameter must be a number.");
      expect(response.body.errors.length).toBe(1);
    });

    it("returns error when trying to send request to self", async () => {
      const user = await prisma.user.findUnique({
        where: {
          username: "penny",
        },
      });

      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .post("/requests/" + user.id)
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe(
        "Can't send request to yourself.",
      );
      expect(response.body.errors.length).toBe(1);
    });

    it("returns error when sent request already exists", async () => {
      const from_user = await prisma.user.findUnique({
        where: {
          username: "penny",
        },
      });
      const to_user = await prisma.user.findUnique({
        where: {
          username: "al1c3",
        },
      });
      await prisma.request.create({
        data: {
          from_id: from_user.id,
          to_id: to_user.id,
        },
      });

      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .post("/requests/" + to_user.id)
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe("Request is sent already.");
      expect(response.body.errors.length).toBe(1);
    });

    it("returns error when received request already exists", async () => {
      const from_user = await prisma.user.findUnique({
        where: {
          username: "al1c3",
        },
      });
      const to_user = await prisma.user.findUnique({
        where: {
          username: "penny",
        },
      });
      await prisma.request.create({
        data: {
          from_id: from_user.id,
          to_id: to_user.id,
        },
      });

      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .post("/requests/" + from_user.id)
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe("Request is received already.");
      expect(response.body.errors.length).toBe(1);
    });

    it("returns error when friendship already exists", async () => {
      const from_user = await prisma.user.findUnique({
        where: {
          username: "penny",
        },
      });
      const to_user = await prisma.user.findUnique({
        where: {
          username: "al1c3",
        },
      });
      const friendship = await prisma.friendship.create();
      await prisma.friend.createMany({
        data: [
          {
            user_id: from_user.id,
            friendship_id: friendship.id,
          },
          {
            user_id: to_user.id,
            friendship_id: friendship.id,
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
        .post("/requests/" + to_user.id)
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe("Can't send request to friend.");
      expect(response.body.errors.length).toBe(1);
    });

    it("creates request", async () => {
      const from_user = await prisma.user.findUnique({
        where: {
          username: "penny",
        },
      });
      const to_user = await prisma.user.findUnique({
        where: {
          username: "al1c3",
        },
      });

      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .post("/requests/" + to_user.id)
        .set("Cookie", [accessToken]);

      const friendRequest = await prisma.request.findUnique({
        where: {
          from_id_to_id: {
            from_id: from_user.id,
            to_id: to_user.id,
          },
        },
      });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(201);
      expect(friendRequest).toBeDefined();
    });
  });

  describe("PUT /request/:userId", () => {
    it("returns error when parameter is invalid", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .put("/requests/asd")
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe("Parameter must be a number.");
      expect(response.body.errors.length).toBe(1);
    });

    it("returns error if no such request exists", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .put("/requests/" + 12)
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe("Request not found.");
      expect(response.body.errors.length).toBe(1);
    });

    it("accepts request and creates a friendship", async () => {
      const from_user = await prisma.user.findUnique({
        where: {
          username: "al1c3",
        },
      });
      const to_user = await prisma.user.findUnique({
        where: {
          username: "penny",
        },
      });
      await prisma.request.create({
        data: {
          from_id: from_user.id,
          to_id: to_user.id,
        },
      });

      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .put("/requests/" + from_user.id)
        .set("Cookie", [accessToken]);

      const friends = await prisma.friend.findMany({
        select: {
          user_id: true,
          friendship_id: true,
        },
      });
      const friendship = await prisma.friendship.findMany();
      const friendshipRequest = await prisma.request.findUnique({
        where: {
          from_id_to_id: {
            from_id: from_user.id,
            to_id: to_user.id,
          },
        },
      });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(201);
      expect(friendshipRequest).toBeNull();
      expect(friendship.length).toBe(1);
      expect(friends.length).toBe(2);
      expect(friends).toStrictEqual([
        {
          user_id: to_user.id,
          friendship_id: friendship[0].id,
        },
        {
          user_id: from_user.id,
          friendship_id: friendship[0].id,
        },
      ]);
    });
  });

  describe("DELETE /request/:userId", () => {
    it("returns error when parameter is invalid", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .delete("/requests/asd")
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe("Parameter must be a number.");
      expect(response.body.errors.length).toBe(1);
    });

    it("returns error if no such request exists", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .delete("/requests/" + 12)
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe("Request not found.");
      expect(response.body.errors.length).toBe(1);
    });

    it("deletes received request", async () => {
      const from_user = await prisma.user.findUnique({
        where: {
          username: "al1c3",
        },
      });
      const to_user = await prisma.user.findUnique({
        where: {
          username: "penny",
        },
      });
      await prisma.request.create({
        data: {
          from_id: from_user.id,
          to_id: to_user.id,
        },
      });

      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .delete("/requests/" + from_user.id)
        .set("Cookie", [accessToken]);

      const friendshipRequest = await prisma.request.findUnique({
        where: {
          from_id_to_id: {
            from_id: from_user.id,
            to_id: to_user.id,
          },
        },
      });
      const friends = await prisma.friend.findMany();

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(200);
      expect(friendshipRequest).toBeNull();
      expect(friends.length).toBe(0);
    });

    it("deletes sent request", async () => {
      const from_user = await prisma.user.findUnique({
        where: {
          username: "penny",
        },
      });
      const to_user = await prisma.user.findUnique({
        where: {
          username: "al1c3",
        },
      });
      await prisma.request.create({
        data: {
          from_id: from_user.id,
          to_id: to_user.id,
        },
      });

      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .delete("/requests/" + to_user.id)
        .set("Cookie", [accessToken]);

      const friendshipRequest = await prisma.request.findUnique({
        where: {
          from_id_to_id: {
            from_id: from_user.id,
            to_id: to_user.id,
          },
        },
      });
      const friends = await prisma.friend.findMany();

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(200);
      expect(friendshipRequest).toBeNull();
      expect(friends.length).toBe(0);
    });
  });
});

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
          display_name: "Penny",
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
        .attach("picture", path.join(__dirname, "data/doc.odt"))
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
        .attach("picture", path.join(__dirname, "data/test.jpg"))
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
          display_name: "Penny",
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

      const user = await prisma.user.findUnique({
        where: {
          username: "penny",
        },
      });

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

      const from_user = await prisma.user.findUnique({
        where: {
          username: "penny",
        },
      });
      const to_user = await prisma.user.findUnique({
        where: {
          username: "al1c3",
        },
      });
      const friendship = await prisma.friendship.create();
      await prisma.friend.createMany({
        data: [
          {
            friendship_id: friendship.id,
            user_id: from_user.id,
          },
          {
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
      await prisma.friend.deleteMany();
      await prisma.friendship.deleteMany();
    });

    it("returns stranger profile", async () => {
      cloudinary.generateUrl.mockReturnValueOnce("some url");

      const from_user = await prisma.user.findUnique({
        where: {
          username: "penny",
        },
      });
      const mutual = await prisma.user.findUnique({
        where: {
          username: "sam1",
        },
      });
      const to_user = await prisma.user.findUnique({
        where: {
          username: "al1c3",
        },
      });

      const friendship1 = await prisma.friendship.create();
      await prisma.friend.createMany({
        data: [
          {
            friendship_id: friendship1.id,
            user_id: mutual.id,
          },
          {
            friendship_id: friendship1.id,
            user_id: from_user.id,
          },
        ],
      });
      const friendship2 = await prisma.friendship.create();
      await prisma.friend.createMany({
        data: [
          {
            friendship_id: friendship2.id,
            user_id: mutual.id,
          },
          {
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
      await prisma.friend.deleteMany();
      await prisma.friendship.deleteMany();
    });
  });
});
