const friendController = require("../controllers/friendController");
const { Router } = require("express");

const friendRouter = Router();

friendRouter.get("/", friendController.getUserFriends);
friendRouter.delete("/:userId", friendController.deleteFriend);

module.exports = friendRouter;
