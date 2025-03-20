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

      const friend = await prisma.friend.getFriends(
        Number(userId),
        req.user.id,
      );
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

const validateDeleteId = () =>
  param("userId")
    .trim()
    .custom(async (userId, { req }) => {
      if (isNaN(Number(userId))) throw new Error("Parameter must be a number.");

      const request = await prisma.request.findFirst({
        where: {
          OR: [
            {
              from_id: req.user.id,
              to_id: Number(userId),
            },
            {
              from_id: Number(userId),
              to_id: req.user.id,
            },
          ],
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
  res.json(await prisma.request.getRequests(req.user.id));
});

const getSentRequests = asyncHandler(async (req, res) => {
  res.json(await prisma.request.getSentRequests(req.user.id));
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
      prisma.request.deleteMany({
        where: {
          // with OR just in case the users somehow bypass
          // the check for an existing request
          OR: [
            {
              from_id: req.user.id,
              to_id: Number(req.params.userId),
            },
            {
              from_id: Number(req.params.userId),
              to_id: req.user.id,
            },
          ],
        },
      }),
    ]);

    res.status(201).json({ status: 201 });
  }),
];

const deleteRequest = [
  validateDeleteId(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    await prisma.request.deleteMany({
      where: {
        OR: [
          {
            from_id: req.user.id,
            to_id: Number(req.params.userId),
          },
          {
            from_id: Number(req.params.userId),
            to_id: req.user.id,
          },
        ],
      },
    });

    res.json({ status: 200 });
  }),
];

module.exports = {
  postRequest,
  getRequests,
  getSentRequests,
  putRequest,
  deleteRequest,
};
