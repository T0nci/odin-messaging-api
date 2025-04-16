const groupController = require("../controllers/groupController");
const { Router } = require("express");

const groupRouter = Router();

groupRouter.post("/", groupController.createGroup);
groupRouter.put("/name/:groupId", groupController.updateGroup);

module.exports = groupRouter;
