const prisma = require("../db/client");
const asyncHandler = require("express-async-handler");
const { validationResult, body } = require("express-validator");
const bcryptjs = require("bcryptjs");
const jsonwebtoken = require("jsonwebtoken");
const CustomError = require("../utils/CustomError");

// callback for middlewares
const setCookies = async (req, res) => {
  const refresh = await prisma.refreshToken.create({
    data: {
      user_id: req.user.id,
    },
  });
  const access = jsonwebtoken.sign(
    { id: req.user.id },
    process.env.JWT_SECRET,
    {
      expiresIn: "30m",
    },
  );

  res.cookie("refresh", refresh.id, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.cookie("access", access, {
    maxAge: 30 * 60 * 1000,
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  return;
};

const validateRegister = () => [
  body("username")
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage("Username must be between 1 and 20 characters long.")
    .custom((username) => /^[a-zA-Z0-9._]+$/.test(username))
    .withMessage(
      "Username must only contain letters of the alphabet, numbers, '.' and/or '_'.",
    )
    .custom(async (username) => {
      const result = await prisma.user.findUnique({
        where: {
          username,
        },
      });

      if (result) throw false;
    })
    .withMessage("Username already exists."),
  body("password")
    .trim()
    .isLength({ min: 6, max: 50 })
    .withMessage("Password must contain between 6 and 50 characters.")
    .custom((password) => {
      if (!/[a-z]/.test(password)) return false;
      if (!/[A-Z]/.test(password)) return false;
      if (!/[0-9]/.test(password)) return false;
      if (!/[`~!@#$%^&*()\-_=+{}[\]|\\;:'",<.>/?]/.test(password)) return false;
      return true;
    })
    .withMessage(
      "Password must contain at least: 1 uppercase letter, 1 lowercase letter, 1 number and 1 symbol.",
    ),
  body("confirmPassword")
    .trim()
    .custom((password, { req }) => password === req.body.password)
    .withMessage("Passwords must match."),
  body("displayName")
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage("Display name must be between 1 and 20 characters long.")
    .custom(async (display_name) => {
      const result = await prisma.profile.findUnique({
        where: {
          display_name,
        },
      });

      if (result) throw false;
    })
    .withMessage("Display name already exists."),
];

const cleanUpTokens = asyncHandler(async (req, res, next) => {
  await prisma.$executeRaw`DELETE FROM "RefreshToken" WHERE expires <= now() at time zone 'utc'`;

  next();
});

const parseCookies = asyncHandler(async (req, res, next) => {
  if (req.cookies.access) {
    try {
      const payload = jsonwebtoken.verify(
        req.cookies.access,
        process.env.JWT_SECRET,
      );
      req.user = await prisma.user.findUnique({
        where: {
          id: payload.id,
        },
      });
    } catch (error) {
      if (!(error instanceof jsonwebtoken.JsonWebTokenError)) throw error;
    }
  }

  if (!req.user && req.cookies.refresh) {
    const token = await prisma.refreshToken.findUnique({
      where: {
        id: req.cookies.refresh,
      },
    });

    if (token) {
      req.user = await prisma.user.findUnique({
        where: {
          id: token.user_id,
        },
      });
      await prisma.refreshToken.delete({
        where: {
          id: token.id,
        },
      });

      await setCookies(req, res);
    }
  }

  next();
});

const register = [
  validateRegister(),
  (req, res, next) => {
    if (req.user) throw new CustomError("Not Found", 404);

    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    next();
  },
  asyncHandler(async (req, res) => {
    const password = await bcryptjs.hash(req.body.password, 10);

    req.user = await prisma.user.create({
      data: {
        username: req.body.username,
        password,
        profile: {
          create: {
            display_name: req.body.displayName,
          },
        },
      },
    });

    await setCookies(req, res);

    res.status(201).json({ status: 201 });
  }),
];

const login = asyncHandler(async (req, res) => {
  if (req.user) throw new CustomError("Not Found", 404);

  const user = await prisma.user.findUnique({
    where: {
      username: req.body.username || "",
    },
  });

  if (!user) return res.status(400).json({ status: 400 });

  const match = await bcryptjs.compare(req.body.password, user.password);
  if (!match) return res.status(400).json({ status: 400 });

  req.user = user;
  await setCookies(req, res);

  res.json({ status: 200 });
});

const isAuthenticated = asyncHandler(async (req, res, next) => {
  if (!req.user) return res.status(401).json({ status: 401 });

  next();
});

const deleteTokens = asyncHandler(async (req, res) => {
  await prisma.refreshToken.deleteMany({
    where: {
      user_id: req.user.id,
    },
  });

  res
    .cookie("refresh", "", {
      maxAge: 0,
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .cookie("access", "", {
      maxAge: 0,
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .json({ status: 200 });
});

module.exports = {
  cleanUpTokens,
  parseCookies,
  register,
  login,
  isAuthenticated,
  deleteTokens,
};
