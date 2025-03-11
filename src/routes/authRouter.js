const authController = require("../controllers/authController");
const { Router } = require("express");

const authRouter = Router();

authRouter.use(authController.parseCookies);
authRouter.post("/register", authController.register);
authRouter.post("/login", authController.login);
authRouter.use(authController.isAuthenticated);

module.exports = authRouter;
