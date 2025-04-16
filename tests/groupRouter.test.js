const app = require("../src/app");
const request = require("supertest")(app);
const prisma = require("../src/db/client");
const { describe, it, expect, beforeAll, afterAll } = require("@jest/globals");
const { deleteGroups } = require("./data/cleanup");
const users = require("./data/users");

describe("groupRouter", () => {
  const admin = users.find((user) => user.username === "penny");
  const normalUser = users.find((user) => user.username === "al1c3");
  let groupId = null;

  beforeAll(async () => {
    const group = await prisma.group.create({
      data: {
        id: -1,
        name: "test",
      },
    });
    groupId = group.id;

    const memberIds = await prisma.groupMember.createManyAndReturn({
      data: [
        {
          id: -1,
          group_id: group.id,
          user_id: admin.id,
          is_admin: true,
        },
        {
          id: -2,
          group_id: group.id,
          user_id: normalUser.id,
          is_admin: false,
        },
      ],
    });
    admin.memberId = memberIds[0].id;
    normalUser.memberId = memberIds[1].id;
  });

  afterAll(async () => {
    await deleteGroups();
  });

  describe("POST /groups/", () => {
    it("returns error when name is not provided", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .post("/groups")
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe("Group must have a name.");
    });

    it("creates group", async () => {
      const creator = users.find((user) => user.username === "penny");

      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .post("/groups")
        .send({ name: "test create" })
        .set("Cookie", [accessToken]);

      const group = await prisma.group.findFirst({
        where: {
          name: "test create",
        },
      });
      const admin = await prisma.groupMember.findUnique({
        where: {
          user_id_group_id: {
            group_id: group.id,
            user_id: creator.id,
          },
        },
      });

      // clean up
      await prisma.groupMember.delete({
        where: {
          id: admin.id,
        },
      });
      await prisma.group.delete({
        where: {
          id: group.id,
        },
      });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(201);
      expect(group.name).toBe("test create");
      expect(group.picture).toBeNull();
      expect(admin.user_id).toBe(creator.id);
      expect(admin.group_id).toBe(group.id);
      expect(admin.is_admin).toBe(true);
    });
  });

  describe("PUT /groups/name/:groupId", () => {
    it("returns error if parameter isn't a number or is invalid", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .put("/groups/name/asd")
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe("Parameter must be a number.");
    });

    it("returns error if group doesn't exist", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .put("/groups/name/123")
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe("Group not found.");
    });

    it("returns error if person trying to updated isn't an admin", async () => {
      const login = await request
        .post("/login")
        .send({ username: "al1c3", password: "alISha*3" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .put("/groups/name/" + groupId)
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe(
        "You must be an admin to update the group.",
      );
    });

    it("returns error if there is no name or it's not different", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .put("/groups/name/" + groupId)
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe(
        "Different name is required for updating.",
      );
    });

    it("updates the name of the group", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .put("/groups/name/" + groupId)
        .send({ name: "testing" })
        .set("Cookie", [accessToken]);

      const group = await prisma.group.findUnique({
        where: {
          id: groupId,
        },
      });
      // clean up
      await prisma.group.update({
        where: {
          id: groupId,
        },
        data: {
          name: "test",
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(200);
      expect(group.name).toBe("testing");
    });
  });
});
