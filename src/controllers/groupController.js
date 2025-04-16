const prisma = require("../db/client");
const asyncHandler = require("express-async-handler");
const { validationResult, param } = require("express-validator");

const validateGroupIdUpdate = () =>
  param("groupId")
    .trim()
    .custom(async (groupId, { req }) => {
      if (isNaN(Number(groupId)))
        throw new Error("Parameter must be a number.");

      const member = await prisma.groupMember.findFirst({
        where: {
          user_id: req.user.id,
          group_id: Number(groupId),
        },
      });

      if (!member) throw new Error("Group not found.");

      if (!member.is_admin)
        throw new Error("You must be an admin to update the group.");
    });

const createGroup = asyncHandler(async (req, res) => {
  if (!req.body.name)
    return res
      .status(400)
      .json({ errors: [{ msg: "Group must have a name." }] });

  await prisma.group.create({
    data: {
      name: req.body.name,
      members: {
        create: {
          user_id: req.user.id,
          is_admin: true,
        },
      },
    },
  });

  res.status(201).json({ status: 201 });
});

const updateGroup = [
  validateGroupIdUpdate(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const group = await prisma.group.findUnique({
      where: {
        id: Number(req.params.groupId),
      },
    });
    if (!req.body.name || group.name === req.body.name)
      return res
        .status(400)
        .json({
          errors: [{ msg: "Different name is required for updating." }],
        });

    await prisma.group.update({
      where: {
        id: group.id,
      },
      data: {
        name: req.body.name,
      },
    });

    res.json({ status: 200 });
  }),
];

module.exports = { createGroup, updateGroup };
