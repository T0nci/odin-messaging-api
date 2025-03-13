const prisma = require("../db/client");
const asyncHandler = require("express-async-handler");
const { validationResult, param } = require("express-validator");

const validateSendId = () =>
  param("userId")
    .trim()
    .custom(async (userId, { req }) => {
      if (isNaN(Number(userId))) throw new Error("Parameter must be a number.");

      if (Number(userId) === req.user.id)
        throw new Error("Can't send request to yourself.");

      const sentRequest = await prisma.request.findUnique({
        where: {
          from_id_to_id: {
            from_id: req.user.id,
            to_id: Number(userId),
          },
        },
      });
      if (sentRequest) throw new Error("Request is sent already.");

      const receivedRequest = await prisma.request.findUnique({
        where: {
          from_id_to_id: {
            from_id: Number(userId),
            to_id: req.user.id,
          },
        },
      });
      if (receivedRequest) throw new Error("Request is received already.");

      const friend = await prisma.$queryRaw`
        SELECT *
        FROM "Friend"
        WHERE friendship_id IN (
          SELECT friendship_id
          FROM "Friend"
          WHERE user_id = ${req.user.id}
        ) AND user_id = ${Number(userId)};
      `;
      if (friend.length) throw new Error("Can't send request to friend.");
    });

const validateAcceptId = () =>
  param("userId")
    .trim()
    .custom(async (userId, { req }) => {
      if (isNaN(Number(userId))) throw new Error("Parameter must be a number.");

      const request = await prisma.request.findUnique({
        where: {
          from_id_to_id: {
            from_id: Number(userId),
            to_id: req.user.id,
          },
        },
      });

      if (!request) throw new Error("Request not found.");
    });

const postRequest = [
  validateSendId(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    await prisma.request.create({
      data: {
        from_id: req.user.id,
        to_id: Number(req.params.userId),
      },
    });

    res.status(201).json({ status: 201 });
  }),
];

const getRequests = asyncHandler(async (req, res) => {
  res.json(
    await prisma.$queryRaw`
      SELECT r.from_id AS "id", p.display_name AS "from", r.date_sent AS "sent"
      FROM "Request" AS r
      JOIN "User" AS u ON r.from_id = u.id
      JOIN "Profile" AS p ON u.id = p.user_id
      WHERE r.to_id = ${req.user.id}
    `,
  );
});

const getSentRequests = asyncHandler(async (req, res) => {
  res.json(
    await prisma.$queryRaw`
      SELECT r.to_id AS "id", p.display_name AS "to", r.date_sent AS "sent"
      FROM "Request" AS r
      JOIN "User" AS u ON r.to_id = u.id
      JOIN "Profile" AS p ON p.user_id = u.id
      WHERE r.from_id = ${req.user.id}
    `,
  );
});

const putRequest = [
  validateAcceptId(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({
        errors: errors.array(),
      });

    await prisma.$transaction([
      prisma.friendship.create({
        data: {
          friends: {
            createMany: {
              data: [
                {
                  user_id: req.user.id,
                },
                {
                  user_id: Number(req.params.userId),
                },
              ],
            },
          },
        },
      }),
      prisma.request.delete({
        where: {
          from_id_to_id: {
            from_id: Number(req.params.userId),
            to_id: req.user.id,
          },
        },
      }),
    ]);

    res.status(201).json({ status: 201 });
  }),
];

module.exports = {
  postRequest,
  getRequests,
  getSentRequests,
  putRequest,
};
