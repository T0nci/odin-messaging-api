const prisma = require("../src/db/client");
const { beforeAll, afterAll } = require("@jest/globals");
const bcryptjs = require("bcryptjs");

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
  await prisma.refreshToken.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
});
