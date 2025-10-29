// express
const express = require("express");
const router = express.Router();

const matchController = require("../controller/match-controller");

// middleware
const checkAuth = require("../middleware/check-auth");

router.use(checkAuth);

// api/v1/match
router.get("/", matchController.getMatches);

// api/v1/match/:matchId/channel
router.get("/:matchId/channel", matchController.getMatchChannel);

// api/v1/unmatch/:matchId
router.delete("/unmatch/:matchId", matchController.unmatchUser);

module.exports = router;
