const prisma = require("../src/db/client");
const { beforeAll, afterAll } = require("@jest/globals");
const users = require("./data/users");
const bcryptjs = require("bcryptjs");

beforeAll(async () => {
  for (const user of users) {
    await prisma.user.create({
      data: {
        ...user,
        password: await bcryptjs.hash(user.password, 10),
      },
    });
  }
});

afterAll(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
});
