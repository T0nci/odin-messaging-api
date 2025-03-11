const indexController = require("../controllers/indexController");
const { Router } = require("express");

const indexRouter = Router();

indexRouter.put("/profile", indexController.updateProfile);

module.exports = indexRouter;
