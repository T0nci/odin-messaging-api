const friendController = require("../controllers/friendController");
const { Router } = require("express");

const friendRouter = Router();

friendRouter.get("/", friendController.getFriends);

module.exports = friendRouter;
