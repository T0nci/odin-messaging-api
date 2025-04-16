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
} = require("@jest/globals");
const { deleteGroups } = require("./data/cleanup");
const users = require("./data/users");

const path = require("node:path");
const cloudinary = require("../src/utils/cloudinary");
globalJest.mock("../src/utils/cloudinary");
cloudinary.uploadImageWithPublicId = globalJest.fn();
cloudinary.deleteImage = globalJest.fn();

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
      expect(response.body.error).toBe("Group must have a name.");
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
      expect(response.body.error).toBe("Parameter must be a number.");
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
      expect(response.body.error).toBe("Group not found.");
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
      expect(response.body.error).toBe(
        "You must be an admin to do this action.",
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
      expect(response.body.error).toBe(
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

  describe("PUT /groups/picture/:groupId", () => {
    it("returns error if parameter isn't a number or is invalid", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .put("/groups/picture/asd")
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Parameter must be a number.");
    });

    it("returns error if group doesn't exist", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .put("/groups/picture/123")
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Group not found.");
    });

    it("returns error if person trying to updated isn't an admin", async () => {
      const login = await request
        .post("/login")
        .send({ username: "al1c3", password: "alISha*3" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .put("/groups/picture/" + groupId)
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        "You must be an admin to do this action.",
      );
    });

    it("returns error if file is invalid or there is no file", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .put("/groups/picture/" + groupId)
        .attach("image", path.join(__dirname, "data/doc.odt"))
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid file.");
    });

    it("updates group picture successfully", async () => {
      cloudinary.uploadImageWithPublicId.mockReset();
      cloudinary.uploadImageWithPublicId.mockResolvedValueOnce("some url");

      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .put("/groups/picture/" + groupId)
        .set("Cookie", [accessToken])
        .attach("image", path.join(__dirname, "data/test.jpg"));

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
          picture: null,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(200);
      expect(group.picture).toBe("some url");
      expect(cloudinary.uploadImageWithPublicId).toBeCalledTimes(1);
    });

    it("replaces group picture successfully", async () => {
      cloudinary.uploadImageWithPublicId.mockReset();
      cloudinary.uploadImageWithPublicId.mockResolvedValueOnce("some url");
      cloudinary.deleteImage.mockReset();
      cloudinary.uploadImageWithPublicId.mockResolvedValueOnce(true);

      await prisma.group.update({
        where: {
          id: groupId,
        },
        data: {
          picture: "some url 1",
        },
      });

      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .put("/groups/picture/" + groupId)
        .set("Cookie", [accessToken])
        .attach("image", path.join(__dirname, "data/test.jpg"));

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
          picture: null,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(200);
      expect(group.picture).toBe("some url");
      expect(cloudinary.uploadImageWithPublicId).toBeCalledTimes(1);
      expect(cloudinary.deleteImage).toBeCalledTimes(1);
    });
  });

  describe("DELETE /groups/:groupId", () => {
    it("returns error if parameter isn't a number or is invalid", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .delete("/groups/asd")
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Parameter must be a number.");
    });

    it("returns error if group doesn't exist", async () => {
      const login = await request
        .post("/login")
        .send({ username: "penny", password: "pen@5Apple" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .delete("/groups/123")
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Group not found.");
    });

    it("returns error if person trying to updated isn't an admin", async () => {
      const login = await request
        .post("/login")
        .send({ username: "al1c3", password: "alISha*3" });

      const accessToken = login.header["set-cookie"]
        .find((cookie) => cookie.startsWith("access"))
        .split(";")[0];

      const response = await request
        .delete("/groups/" + groupId)
        .set("Cookie", [accessToken]);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        "You must be an admin to do this action.",
      );
    });

    it("deletes group successfully", async () => {
      const newGroup = await prisma.group.create({
        data: {
          name: "to be deleted",
        },
      });
      const newMembers = await prisma.groupMember.createManyAndReturn({
        data: [
          {
            id: -3,
            user_id: admin.id,
            is_admin: true,
            group_id: newGroup.id,
          },
          {
            id: -4,
            user_id: normalUser.id,
            group_id: newGroup.id,
          },
        ],
      });
      await prisma.groupMessage.createMany({
        data: [
          {
            from_id: newMembers[0].id,
            content: "test",
            type: "TEXT",
          },
          {
            from_id: newMembers[1].id,
            content: "test",
            type: "TEXT",
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
        .delete("/groups/" + newGroup.id)
        .set("Cookie", [accessToken]);

      const group = await prisma.group.findFirst({
        where: {
          id: newGroup.id,
        },
      });
      const members = await prisma.groupMember.findMany({
        where: {
          group_id: newGroup.id,
        },
      });
      const messages = await prisma.groupMessage.findMany();

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(200);
      expect(group).toBeNull();
      expect(members.length).toBe(0);
      expect(messages.length).toBe(0);
    });
  });
});
