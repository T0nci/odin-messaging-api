const { PrismaClient } = require("@prisma/client");

const databaseUrl =
  process.env.NODE_ENV === "test"
    ? process.env.TEST_DATABASE_URL
    : process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

prisma.request.getRequests = async (userId) => {
  return await prisma.$queryRaw`
    SELECT r.from_id AS "id", p.display_name AS "from", r.date_sent AS "sent"
    FROM "Request" AS r
    JOIN "User" AS u ON r.from_id = u.id
    JOIN "Profile" AS p ON u.id = p.user_id
    WHERE r.to_id = ${userId}
  `;
};

prisma.request.getSentRequests = async (userId) => {
  return await prisma.$queryRaw`
    SELECT r.to_id AS "id", p.display_name AS "to", r.date_sent AS "sent"
    FROM "Request" AS r
    JOIN "User" AS u ON r.to_id = u.id
    JOIN "Profile" AS p ON p.user_id = u.id
    WHERE r.from_id = ${userId}
  `;
};

prisma.friend.getFriends = async (friend1, friend2) => {
  return await prisma.$queryRaw`
    SELECT *
    FROM "Friend"
    WHERE friendship_id IN (
      SELECT friendship_id
      FROM "Friend"
      WHERE friendship_id IN (
        SELECT friendship_id
        FROM "Friend"
        WHERE user_id = ${friend2}
      ) AND user_id = ${friend1}
    )
  `;
};

prisma.friendship.getFriendshipId = async (friend1, friend2) => {
  return (
    await prisma.$queryRaw`
    SELECT friendship_id
    FROM "Friend"
    WHERE user_id = ${friend1} AND friendship_id IN (
      SELECT friendship_id
      FROM "Friend"
      WHERE user_id = ${friend2}
    )
  `
  )[0].friendship_id;
};

prisma.friend.getUserFriends = async (userId) => {
  // ordered by date from latest to earliest
  return await prisma.$queryRaw`
    SELECT f.user_id, fs.date_accepted, p.display_name, p.default_picture
    FROM "Friend" AS f
    JOIN "Friendship" AS fs
    ON f.friendship_id = fs.id
    JOIN "User" AS u
    ON f.user_id = u.id
    JOIN "Profile" AS p
    ON u.id = p.user_id
    WHERE f.user_id != ${userId} AND f.friendship_id IN (
      SELECT friendship_id
      FROM "Friend"
      WHERE user_id = ${userId}
    )
    ORDER BY fs.date_accepted DESC
  `;
};

prisma.profile.getProfile = async (userId) => {
  return (
    await prisma.$queryRaw`
      SELECT default_picture, display_name AS "displayName", bio
      FROM "Profile"
      WHERE user_id = ${userId}
    `
  )[0];
};

prisma.friend.getMutuals = async (friend1, friend2) => {
  return await prisma.$queryRaw`
    SELECT display_name AS "displayName", user_id AS "id"
    FROM "Profile"
    WHERE user_id IN (
      SELECT user_id
      FROM "Friend"
      WHERE user_id != ${friend1} AND friendship_id IN (
        SELECT friendship_id
        FROM "Friend"
        WHERE user_id = ${friend1} AND friendship_id IN (
          SELECT friendship_id
          FROM "Friend"
          WHERE user_id IN (
            SELECT user_id
            FROM "Friend"
            WHERE user_id != ${friend2} AND friendship_id IN (
              SELECT friendship_id
              FROM "Friend"
              WHERE user_id = ${friend2}
            )
          )
        )
      )
    )
  `;
};

prisma.friend.getFriendId = async (sender, receiver) => {
  return (
    await prisma.$queryRaw`
      SELECT id
      FROM "Friend"
      WHERE friendship_id IN (
        SELECT friendship_id
        FROM "Friend"
        WHERE user_id = ${receiver}
      ) AND user_id = ${sender}
  `
  )[0].id;
};

module.exports = prisma;
