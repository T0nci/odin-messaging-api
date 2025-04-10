const authController = require("../controllers/authController");
const { Router } = require("express");

const authRouter = Router();

authRouter.use(authController.cleanUpTokens);
authRouter.use(authController.parseCookies);
authRouter.post("/register", authController.register);
authRouter.post("/login", authController.login);
authRouter.use(authController.isAuthenticated);
authRouter.delete("/tokens", authController.deleteTokens);
authRouter.delete("/logout", authController.logout);

module.exports = authRouter;
