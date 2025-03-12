const requestController = require("../controllers/requestController");
const { Router } = require("express");

const requestRouter = Router();

requestRouter.get("/", requestController.getRequests);
requestRouter.get("/sent", requestController.getSentRequests);
requestRouter.post("/:userId", requestController.postRequest);

module.exports = requestRouter;
