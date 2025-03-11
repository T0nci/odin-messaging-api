const profileController = require("../controllers/profileController");
const { Router } = require("express");

const profileRouter = Router();

profileRouter.put("/", profileController.updateProfile);

module.exports = profileRouter;
