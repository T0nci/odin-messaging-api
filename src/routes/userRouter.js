const userController = require("../controllers/userController");
const { Router } = require("express");

const userRouter = Router();

userRouter.get("/", userController.getUsers);

module.exports = userRouter;
