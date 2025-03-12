const profileController = require("../controllers/profileController");
const { Router } = require("express");

const profileRouter = Router();

profileRouter.put("/", profileController.updateProfile);
profileRouter.put("/picture", profileController.updatePicture);

module.exports = profileRouter;
