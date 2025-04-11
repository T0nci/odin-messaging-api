const prisma = require("../db/client");
const asyncHandler = require("express-async-handler");
const { validationResult, param } = require("express-validator");

const cloudinary = require("../utils/cloudinary");
const { uploadWithoutError } = require("../utils/multer");
const validateUserId = () =>
  param("userId")
    .trim()
    .custom(async (userId, { req }) => {
      if (isNaN(Number(userId))) throw new Error("Parameter must be a number.");

      if (Number(userId) === req.user.id)
        throw new Error("Can't send message to yourself.");

      const user = await prisma.friend.getFriends(Number(userId), req.user.id);
      if (!user.length) throw new Error("Friend not found.");
    });

const postMessage = [
  uploadWithoutError,
  validateUserId(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    if (!["text", "image"].includes(req.body.type))
      return res
        .status(400)
        .json({ errors: [{ msg: "Unknown message type." }] });

    if (req.body.type === "text") {
      if (req.body.content === undefined || req.body.content.length < 1)
        return res.status(400).json({
          errors: [{ msg: "Content must be at least 1 character long." }],
        });
    } else if (req.body.type === "image") {
      if (!req.file)
        return res.status(400).json({
          errors: [{ msg: "Image must be provided." }],
        });
    }

    res.json({ status: 200 });
  }),
];

module.exports = {
  postMessage,
};
