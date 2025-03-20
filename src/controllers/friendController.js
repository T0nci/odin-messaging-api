const prisma = require("../db/client");
const asyncHandler = require("express-async-handler");
const cloudinary = require("../utils/cloudinary");

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

module.exports = {
  getFriends,
};
