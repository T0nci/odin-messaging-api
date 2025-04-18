const messageController = require("../controllers/messageController");
const { Router } = require("express");

const messageRouter = Router();

messageRouter.get("/", messageController.getAllMessages);
messageRouter.get("/:userId", messageController.getMessages);
messageRouter.post("/:userId", messageController.postMessage);
messageRouter.delete("/:messageId", messageController.deleteMessage);

module.exports = messageRouter;
