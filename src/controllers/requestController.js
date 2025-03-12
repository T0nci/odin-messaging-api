const prisma = require("../db/client");
const asyncHandler = require("express-async-handler");
const { validationResult, param } = require("express-validator");

const validateUserId = () =>
  param("userId")
    .trim()
    .custom(async (userId, { req }) => {
      if (Number(userId) === req.user.id)
        throw new Error("Can't send request to yourself.");

      const request = await prisma.request.findUnique({
        where: {
          from_id_to_id: {
            from_id: req.user.id,
            to_id: Number(userId),
          },
        },
      });
      if (request) throw new Error("Request already exists.");

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

const postRequest = [
  validateUserId(),
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
    await prisma.request.findMany({
      where: {
        to_id: req.user.id,
      },
    }),
  );
});

module.exports = {
  postRequest,
  getRequests,
};
