const prisma = require("../db/client");
const asyncHandler = require("express-async-handler");
const { validationResult, param } = require("express-validator");

const cloudinary = require("../utils/cloudinary");
const { uploadWithoutError } = require("../utils/multer");

const validateUserIdSend = () =>
  param("userId")
    .trim()
    .custom(async (userId, { req }) => {
      if (isNaN(Number(userId))) throw new Error("Parameter must be a number.");

      if (Number(userId) === req.user.id)
        throw new Error("ID must belong to other user.");

      const user = await prisma.friend.getFriends(Number(userId), req.user.id);
      if (!user.length) throw new Error("Friend not found.");
    });

const validateUserIdGet = () =>
  param("userId")
    .trim()
    .custom(async (userId, { req }) => {
      if (isNaN(Number(userId))) throw new Error("Parameter must be a number.");

      if (Number(userId) === req.user.id)
        throw new Error("ID must belong to other user.");

      const user = await prisma.message.findFirst({
        where: {
          OR: [
            {
              from_id: Number(userId),
              to_id: req.user.id,
            },
            {
              from_id: req.user.id,
              to_id: Number(userId),
            },
          ],
        },
      });
      if (!user) throw new Error("No messages found.");
    });

const validateMessageId = () =>
  param("messageId")
    .trim()
    .custom(async (messageId, { req }) => {
      if (isNaN(Number(messageId)))
        throw new Error("Parameter must be a number.");

      const message = await prisma.message.findUnique({
        where: {
          id: Number(messageId),
          from_id: req.user.id,
        },
      });
      if (!message || message.type === "DELETED")
        throw new Error("Message not found.");
    });

const postMessage = [
  uploadWithoutError,
  validateUserIdSend(),
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

      await prisma.message.create({
        data: {
          content: req.body.content,
          type: "TEXT",
          from_id: req.user.id,
          to_id: Number(req.params.userId),
        },
      });
    } else if (req.body.type === "image") {
      if (!req.file)
        return res.status(400).json({
          errors: [{ msg: "Image must be provided." }],
        });

      const publicId = await cloudinary.uploadImageWithPublicId(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      );

      await prisma.message.create({
        data: {
          content: publicId,
          type: "IMAGE",
          from_id: req.user.id,
          to_id: Number(req.params.userId),
        },
      });
    }

    res.json({ status: 200 });
  }),
];

const getMessages = [
  validateUserIdGet(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const userId = Number(req.params.userId);

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            from_id: req.user.id,
            to_id: userId,
          },
          {
            from_id: userId,
            to_id: req.user.id,
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
        content:
          message.type === "IMAGE"
            ? cloudinary.generateUrl(message.content)
            : message.content,
        dateSent: message.date_sent,
        type: message.type.toLowerCase(),
        me: message.from_id === req.user.id,
      })),
    );
  }),
];

const getAllMessages = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // getting all IDs
  const ids = await prisma.$queryRaw`
    SELECT DISTINCT from_id, to_id
    FROM "Message"
    WHERE from_id = ${userId} OR to_id = ${userId}
  `;

  const users = {};
  for (const obj of ids) {
    const id = obj.from_id === userId ? obj.to_id : obj.from_id;

    // if user is already fetched then skip this turn
    if (users[id]) continue;

    const latestMessage = await prisma.message.findFirst({
      where: {
        OR: [
          {
            from_id: id,
            to_id: userId,
          },
          {
            from_id: userId,
            to_id: id,
          },
        ],
      },
      orderBy: {
        date_sent: "desc",
      },
      take: 1,
    });
    const profile = await prisma.profile.getProfile(id);

    users[id] = {
      displayName: profile.displayName,
      picture: profile.default_picture
        ? cloudinary.generateUrl(process.env.DEFAULT_PFP)
        : cloudinary.generateUrl(id),
      message: {
        id: latestMessage.id,
        content:
          latestMessage.type === "IMAGE"
            ? cloudinary.generateUrl(latestMessage.content)
            : latestMessage.content,
        dateSent: latestMessage.date_sent,
        type: latestMessage.type.toLowerCase(),
        me: latestMessage.from_id === userId,
      },
    };
  }

  // turn the object into an array and sort it based on the latest message
  res.json(
    Object.entries(users)
      .map(([id, user]) => ({ id: Number(id), ...user }))
      .sort((a, b) => (b.message.dateSent > a.message.dateSent ? 1 : -1)),
  );
});

const deletedData = {
  content: "",
  type: "DELETED",
};
const deleteMessage = [
  validateMessageId(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const message = await prisma.message.findUnique({
      where: {
        id: Number(req.params.messageId),
      },
    });

    await prisma.$transaction(async (tx) => {
      // first update the message
      // then delete the asset
      // this way if the query fails we didn't delete the image
      // and if cloudinary fails the query is restored
      await tx.message.update({
        where: {
          id: message.id,
        },
        data: deletedData,
      });

      if (message.type === "IMAGE") {
        await cloudinary.deleteImage(message.content);
      }
    });

    res.json({ status: 200 });
  }),
];

module.exports = {
  getMessages,
  postMessage,
  getAllMessages,
  deleteMessage,
};
