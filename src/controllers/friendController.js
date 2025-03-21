const prisma = require("../db/client");
const asyncHandler = require("express-async-handler");
const cloudinary = require("../utils/cloudinary");
const { validationResult, param } = require("express-validator");

const validateFriend = () =>
  param("userId")
    .trim()
    .custom(async (userId, { req }) => {
      if (isNaN(Number(userId))) throw new Error("Parameter must be a number.");

      const friends = await prisma.friend.getFriends(
        Number(userId),
        req.user.id,
      );
      if (friends.length === 0) throw new Error("Friend not found.");
    });

const getUserFriends = asyncHandler(async (req, res) => {
  // ordered by date from latest to earliest
  const friends = await prisma.friend.getUserFriends(req.user.id);

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

    const friendship_id = await prisma.friendship.getFriendshipId(
      Number(req.params.userId),
      req.user.id,
    );
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
  getUserFriends,
  deleteFriend,
};
