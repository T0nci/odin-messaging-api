const prisma = require("../db/client");
const asyncHandler = require("express-async-handler");
const { validationResult, param } = require("express-validator");
const { uploadWithoutError } = require("../utils/multer");
const cloudinary = require("../utils/cloudinary");

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

const updateGroupName = [
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
      return res.status(400).json({
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

const updateGroupPicture = [
  validateGroupIdUpdate(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    next();
  },
  uploadWithoutError,
  asyncHandler(async (req, res) => {
    if (!req.file)
      return res.status(400).json({ errors: [{ msg: "Invalid file." }] });

    const group = await prisma.group.findUnique({
      where: {
        id: Number(req.params.groupId),
      },
    });

    if (group.picture) {
      // update and delete the old image first, then even if something goes wrong
      // in the upload the old image is deleted and recorded
      await prisma.$transaction(async (tx) => {
        await tx.group.update({
          where: {
            id: group.id,
          },
          data: {
            picture: null,
          },
        });

        await cloudinary.deleteImage(group.picture);
      });
    }

    const publicId = cloudinary.uploadImageWithPublicId(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
    );

    await prisma.group.update({
      where: {
        id: group.id,
      },
      data: {
        picture: publicId,
      },
    });

    res.json({ status: 200 });
  }),
];

module.exports = { createGroup, updateGroupName, updateGroupPicture };
