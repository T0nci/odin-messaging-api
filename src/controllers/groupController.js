const prisma = require("../db/client");
const asyncHandler = require("express-async-handler");

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

module.exports = { createGroup };
