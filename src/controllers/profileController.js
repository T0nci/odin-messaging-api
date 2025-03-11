const prisma = require("../db/client");
const asyncHandler = require("express-async-handler");
const { validationResult, body } = require("express-validator");

const validateProfile = () => [
  body("displayName")
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage("Display name must be between 1 and 20 characters long.")
    .custom(async (display_name) => {
      const result = await prisma.profile.findUnique({
        where: {
          display_name,
        },
      });

      if (result) throw false;
    })
    .withMessage("Display name already exists."),
  body("bio")
    .trim()
    .isLength({ max: 190 })
    .withMessage("Bio must not exceed 190 characters."),
];

const updateProfile = [
  validateProfile(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    await prisma.profile.update({
      where: {
        user_id: req.user.id,
      },
      data: {
        display_name: req.body.displayName,
        bio: req.body.bio,
      },
    });

    res.json({ status: 200 });
  }),
];

module.exports = {
  updateProfile,
};
