// express
const express = require("express");
const router = express.Router();

// controller
const discoveryController = require("../controller/discovery-controller");

// middleware
const checkAuth = require("../middleware/check-auth");

// check if user is authenticated (all route below is private)
router.use(checkAuth);

// api/v1/discovery
router.get("/", discoveryController.getDiscoveryUsers);

// api/v1/discovery/swipe
router.post("/swipe", discoveryController.swipeUser);

// exports
module.exports = router;
