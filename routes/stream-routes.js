// express
const express = require("express");
const router = express.Router();

// controller
const streamController = require("../controller/stream-controller");

// middleware
const checkAuth = require("../middleware/check-auth");

// get stream token for logged-in user
router.get("/token", checkAuth, streamController.getStreamToken);

module.exports = router;
