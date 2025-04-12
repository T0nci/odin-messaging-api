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
        throw new Error("ID must belong to other user.");

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

      await prisma.friendMessage.create({
        data: {
          content: req.body.content,
          type: "TEXT",
          friend_id: await prisma.friend.getFriendId(
            req.user.id,
            Number(req.params.userId),
          ),
        },
      });
    } else if (req.body.type === "image") {
      if (!req.file)
        return res.status(400).json({
          errors: [{ msg: "Image must be provided." }],
        });

      const publicId = await cloudinary.uploadMessageImage(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      );

      await prisma.friendMessage.create({
        data: {
          content: cloudinary.generateUrl(publicId),
          type: "IMAGE",
          friend_id: await prisma.friend.getFriendId(
            req.user.id,
            Number(req.params.userId),
          ),
        },
      });
    }

    res.json({ status: 200 });
  }),
];

const getMessages = [
  validateUserId(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const userId = Number(req.params.userId);

    const firstUserId = await prisma.friend.getFriendId(req.user.id, userId);
    const secondUserId = await prisma.friend.getFriendId(userId, req.user.id);

    const messages = await prisma.friendMessage.findMany({
      where: {
        OR: [
          {
            friend_id: firstUserId,
          },
          {
            friend_id: secondUserId,
          },
        ],
      },
      orderBy: [
        {
          date_sent: "asc",
        },
      ],
    });

    res.json(
      messages.map((message) => ({
        id: message.id,
        content: message.content,
        dateSent: message.date_sent,
        type: message.type.toLowerCase(),
        me: message.friend_id === firstUserId,
      })),
    );
  }),
];

module.exports = {
  getMessages,
  postMessage,
};
