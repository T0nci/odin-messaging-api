const prisma = require("../db/client");
const asyncHandler = require("express-async-handler");
const { validationResult, body, param } = require("express-validator");

const cloudinary = require("../utils/cloudinary");
const multer = require("multer");
const memoryStorage = multer.memoryStorage();
const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5242880, // 5 MiB to bytes
  },
  fileFilter: (req, file, cb) => {
    const types = [
      "image/avif",
      "image/jpeg",
      "image/png",
      "image/svg+xml",
      "image/webp",
    ];

    if (!types.includes(file.mimetype)) return cb(null, false);

    cb(null, true);
  },
});

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

const validateUserId = () =>
  param("userId")
    .trim()
    .custom(async (userId) => {
      if (isNaN(Number(userId))) throw new Error("Parameter must be a number.");

      const user = await prisma.user.findUnique({
        where: {
          id: Number(userId),
        },
      });
      if (!user) throw new Error("User not found.");
    });

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

const updatePicture = [
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err instanceof multer.MulterError) return next();

      next(err);
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file)
      return res.status(400).json({
        errors: [{ msg: "Invalid file value." }],
      });

    await cloudinary.uploadImage(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      req.user.id,
    );

    await prisma.profile.update({
      where: {
        user_id: req.user.id,
      },
      data: {
        default_picture: false,
      },
    });

    res.json({ status: 200 });
  }),
];

const getProfile = [
  validateUserId(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const userId = Number(req.params.userId);

    const profile = await prisma.profile.getProfile(userId);
    if (profile.default_picture)
      profile.picture = cloudinary.generateUrl(process.env.DEFAULT_PFP);
    else profile.picture = cloudinary.generateUrl(userId);

    const friend = await prisma.friend.getFriends(userId, req.user.id);
    if (req.user.id !== userId && friend.length === 0) {
      profile.mutualFriends = await prisma.friend.getMutuals(
        userId,
        req.user.id,
      );
    }

    delete profile.default_picture;
    res.json(profile);
  }),
];

const deletePicture = asyncHandler(async (req, res) => {
  const profile = await prisma.profile.findUnique({
    where: {
      user_id: req.user.id,
    },
  });
  if (profile.default_picture)
    return res
      .status(400)
      .json({ error: "Default picture is already in use." });

  await prisma.$transaction(async (tx) => {
    // first update the profile
    // then delete the asset
    // this way if the query fails we didn't delete the image
    // and if cloudinary fails the query is restored
    await tx.profile.update({
      where: {
        user_id: req.user.id,
      },
      data: {
        default_picture: true,
      },
    });

    await cloudinary.deleteImage(req.user.id);
  });

  res.json({ status: 200 });
});

module.exports = {
  updateProfile,
  updatePicture,
  getProfile,
  deletePicture,
};
