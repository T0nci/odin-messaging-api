const prisma = require("../db/client");
const asyncHandler = require("express-async-handler");
const cloudinary = require("../utils/cloudinary");

const getFriends = asyncHandler(async (req, res) => {
  // alphabetically ordered
  const friends = await prisma.$queryRaw`
    SELECT display_name, user_id, default_picture
    FROM "Profile"
    WHERE user_id IN (
      SELECT user_id
      FROM "Friend"
      WHERE user_id != ${req.user.id} AND friendship_id IN (
        SELECT friendship_id
        FROM "Friend"
        WHERE user_id = ${req.user.id}
      )
    )
    ORDER BY display_name
  `;

  res.json(
    friends.map((user) => ({
      displayName: user.display_name,
      id: user.user_id,
      picture: user.default_picture
        ? cloudinary.generateUrl(process.env.DEFAULT_PFP)
        : cloudinary.generateUrl(user.user_id),
    })),
  );
});

module.exports = {
  getFriends,
};
