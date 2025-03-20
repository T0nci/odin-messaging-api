const prisma = require("../db/client");
const asyncHandler = require("express-async-handler");
const cloudinary = require("../utils/cloudinary");
const { validationResult, param } = require("express-validator");

const validateFriend = () =>
  param("userId")
    .trim()
    .custom(async (userId, { req }) => {
      if (isNaN(Number(userId))) throw new Error("Parameter must be a number.");

      const friends = await prisma.$queryRaw`
      SELECT friendship_id
      FROM "Friend"
      WHERE user_id = ${Number(userId)} AND friendship_id IN (
        SELECT friendship_id
        FROM "Friend"
        WHERE user_id = ${req.user.id}
      )
    `;
      if (friends.length === 0) throw new Error("Friend not found.");
    });

const getFriends = asyncHandler(async (req, res) => {
  // ordered by date from latest to earliest
  const friends = await prisma.$queryRaw`
    SELECT f.user_id, fs.date_accepted, p.display_name, p.default_picture
    FROM "Friend" AS f
    JOIN "Friendship" AS fs
    ON f.friendship_id = fs.id
    JOIN "User" AS u
    ON f.user_id = u.id
    JOIN "Profile" AS p
    ON u.id = p.user_id
    WHERE f.user_id != ${req.user.id} AND f.friendship_id IN (
      SELECT friendship_id
      FROM "Friend"
      WHERE user_id = ${req.user.id}
    )
    ORDER BY fs.date_accepted DESC
  `;

  res.json(
    friends.map((user) => ({
      displayName: user.display_name,
      id: user.user_id,
      picture: user.default_picture
        ? cloudinary.generateUrl(process.env.DEFAULT_PFP)
        : cloudinary.generateUrl(user.user_id),
      dateAccepted: user.date_accepted,
    })),
  );
});

const deleteFriend = [
  validateFriend(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const friendship_id = (
      await prisma.$queryRaw`
      SELECT friendship_id
      FROM "Friend"
      WHERE user_id = ${Number(req.params.userId)} AND friendship_id IN (
        SELECT friendship_id
        FROM "Friend"
        WHERE user_id = ${req.user.id}
      )
    `
    )[0].friendship_id;
    const friends = await prisma.friend.findMany({
      where: {
        friendship_id,
      },
    });

    await prisma.$transaction([
      prisma.friendMessage.deleteMany({
        where: {
          OR: [{ friend_id: friends[0].id }, { friend_id: friends[1].id }],
        },
      }),
      prisma.friend.deleteMany({
        where: {
          friendship_id,
        },
      }),
      prisma.friendship.delete({
        where: {
          id: friendship_id,
        },
      }),
    ]);

    res.json({ status: 200 });
  }),
];

module.exports = {
  getFriends,
  deleteFriend,
};
