const groupController = require("../controllers/groupController");
const { Router } = require("express");

const groupRouter = Router();

groupRouter.post("/", groupController.createGroup);

module.exports = groupRouter;
