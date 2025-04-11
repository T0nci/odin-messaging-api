const messageController = require("../controllers/messageController");
const { Router } = require("express");

const messageRouter = Router();

messageRouter.post("/:userId", messageController.postMessage);

module.exports = messageRouter;
