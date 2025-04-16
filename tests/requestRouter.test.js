const app = require("../src/app");
const request = require("supertest")(app);
const prisma = require("../src/db/client");
const { describe, it, expect } = require("@jest/globals");
const { deleteFriends, deleteRequests } = require("./data/cleanup");
const users = require("./data/users");

describe("requestRouter", () => {
  describe("/requests", () => {
    it("gets received requests", async () => {
      const from_user = users.find((user) => user.username === "al1c3");
      const to_user = users.find((user) => user.username === "penny");
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
        .get("/requests")
        .set("Cookie", [accessToken]);

      await deleteRequests();

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].id).toBe(from_user.id);
      expect(response.body[0].from).toBe(from_user.profile.create.display_name);
      expect(response.body[0].sent).toBeDefined();
    });

    it("gets sent requests", async () => {
      const from_user = users.find((user) => user.username === "penny");
      const to_user = users.find((user) => user.username === "al1c3");
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
        .get("/requests/sent")
        .set("Cookie", [accessToken]);

      await deleteRequests();

      expect(response.status).toBe(200);
      expect(response.body[0].id).toBe(to_user.id);
      expect(response.body[0].to).toBe(to_user.profile.create.display_name);
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
      expect(response.body.error).toBe("Parameter must be a number.");
    });

    it("returns error when trying to send request to self", async () => {
      const user = users.find((user) => user.username === "penny");

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
      expect(response.body.error).toBe("Can't send request to yourself.");
    });

    it("returns error when sent request already exists", async () => {
      const from_user = users.find((user) => user.username === "penny");
      const to_user = users.find((user) => user.username === "al1c3");
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

      await deleteRequests();

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Request is sent already.");
    });

    it("returns error when received request already exists", async () => {
      const from_user = users.find((user) => user.username === "al1c3");
      const to_user = users.find((user) => user.username === "penny");
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

      await deleteRequests();

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Request is received already.");
    });

    it("returns error when friendship already exists", async () => {
      const from_user = users.find((user) => user.username === "penny");
      const to_user = users.find((user) => user.username === "al1c3");
      const friendship = await prisma.friendship.create({
        data: {
          id: -1,
        },
      });
      await prisma.friend.createMany({
        data: [
          {
            id: -1,
            user_id: from_user.id,
            friendship_id: friendship.id,
          },
          {
            id: -2,
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

      await deleteFriends();

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Can't send request to friend.");
    });

    it("creates request", async () => {
      const from_user = users.find((user) => user.username === "penny");
      const to_user = users.find((user) => user.username === "al1c3");

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

      await deleteRequests();

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
      expect(response.body.error).toBe("Parameter must be a number.");
    });

    it("returns error if no such request exists", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .put("/requests/" + 12534)
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Request not found.");
    });

    it("accepts request and creates a friendship", async () => {
      const from_user = users.find((user) => user.username === "al1c3");
      const to_user = users.find((user) => user.username === "penny");
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

      await deleteFriends();

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
      expect(response.body.error).toBe("Parameter must be a number.");
    });

    it("returns error if no such request exists", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .delete("/requests/" + 12534)
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Request not found.");
    });

    it("deletes received request", async () => {
      const from_user = users.find((user) => user.username === "al1c3");
      const to_user = users.find((user) => user.username === "penny");
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
      const from_user = users.find((user) => user.username === "penny");
      const to_user = users.find((user) => user.username === "al1c3");
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
