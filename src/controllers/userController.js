const prisma = require("../db/client");
const asyncHandler = require("express-async-handler");
const cloudinary = require("../utils/cloudinary");
const { validationResult, body } = require("express-validator");

const validateName = () =>
  body("name")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Search name must be at least 1 character long.");

const getUsers = [
  validateName(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const words = req.body.name
      .replaceAll("%", "\\%")
      .replaceAll("_", "\\_")
      .split(" ");
    const modifiedWords = words.map(
      (word) => "%" + word.split("").join("%") + "%",
    );

    const users = await prisma.profile.findMany({
      where: {
        display_name: {
          contains: modifiedWords.join(" "),
          mode: "insensitive",
        },
      },
    });

    res.json(
      users.map((user) => ({
        displayName: user.display_name,
        id: user.user_id,
        picture: user.default_picture
          ? cloudinary.generateUrl(process.env.DEFAULT_PFP)
          : cloudinary.generateUrl(user.user_id),
      })),
    );
  }),
];

module.exports = {
  getUsers,
};
