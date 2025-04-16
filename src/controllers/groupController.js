const prisma = require("../db/client");
const asyncHandler = require("express-async-handler");
const { validationResult, param } = require("express-validator");
const { uploadWithoutError } = require("../utils/multer");
const cloudinary = require("../utils/cloudinary");

const validateGroupId = () =>
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
        throw new Error("You must be an admin to do this action.");
    });

const createGroup = asyncHandler(async (req, res) => {
  if (!req.body.name)
    return res.status(400).json({ error: "Group must have a name." });

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
  validateGroupId(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ error: errors.array()[0].msg });

    const group = await prisma.group.findUnique({
      where: {
        id: Number(req.params.groupId),
      },
    });
    if (!req.body.name || group.name === req.body.name)
      return res.status(400).json({
        error: "Different name is required for updating.",
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
  validateGroupId(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ error: errors.array()[0].msg });

    next();
  },
  uploadWithoutError,
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Invalid file." });

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

    const publicId = await cloudinary.uploadImageWithPublicId(
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

const deleteGroup = [
  validateGroupId(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ error: errors.array()[0].msg });

    const group = await prisma.group.findUnique({
      where: {
        id: Number(req.params.groupId),
      },
    });

    await prisma.$transaction(async (tx) => {
      const groupMemberIds = (
        await tx.groupMember.findMany({
          where: {
            group_id: group.id,
          },
        })
      ).map((row) => row.id);

      await tx.groupMessage.deleteMany({
        where: {
          from_id: {
            in: groupMemberIds,
          },
        },
      });
      await tx.groupMember.deleteMany({
        where: {
          id: {
            in: groupMemberIds,
          },
        },
      });
      await tx.group.delete({
        where: {
          id: group.id,
        },
      });

      // if picture fails to delete the deletes are reverted
      if (group.picture) await cloudinary.deleteImage(group.picture);
    });

    res.json({ status: 200 });
  }),
];

module.exports = {
  createGroup,
  updateGroupName,
  updateGroupPicture,
  deleteGroup,
};
