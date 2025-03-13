const app = require("../app");
const request = require("supertest")(app);
const prisma = require("../db/client");
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
const cloudinary = require("../utils/cloudinary");
globalJest.mock("../utils/cloudinary");

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
          display_name: "Sam Vaw",
        },
      },
    },
    {
      username: "al1c3",
      password: await bcryptjs.hash("alisha*3", 10),
      profile: {
        create: {
          display_name: "Alice",
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

describe("authRouter", () => {
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
  describe("/profiles", () => {
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
    });

    describe("/profile/picture", () => {
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
          .attach("picture", path.join(__dirname, "doc.odt"))
          .set("Cookie", [accessToken]);

        expect(response.status).toBe(400);
        expect(response.body.errors[0].msg).toBe("Invalid file value.");
      });

      it("successfully uploads file", async () => {
        cloudinary.uploadImage = globalJest.fn();

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
          .attach("picture", path.join(__dirname, "test.jpg"))
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
      });
    });
  });
});
