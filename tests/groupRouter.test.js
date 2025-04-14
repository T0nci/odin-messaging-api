const app = require("../src/app");
const request = require("supertest")(app);
const prisma = require("../src/db/client");
const { describe, it, expect } = require("@jest/globals");
const { deleteGroups } = require("./data/cleanup");
const users = require("./data/users");

describe("groupRouter", () => {
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
        .send({ name: "test" })
        .set("Cookie", [accessToken]);

      const group = await prisma.group.findFirst({
        where: {
          name: "test",
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
      await deleteGroups();

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(201);
      expect(group.name).toBe("test");
      expect(group.picture).toBeNull();
      expect(admin.user_id).toBe(creator.id);
      expect(admin.group_id).toBe(group.id);
      expect(admin.is_admin).toBe(true);
    });
  });
});
