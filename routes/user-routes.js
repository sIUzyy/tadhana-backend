// express
const express = require("express");
const router = express.Router();

// express-validator (inputs-validator)
const { check } = require("express-validator");

// controller
const userController = require("../controller/user-controllers");

// middleware
const fileUpload = require("../middleware/file-upload");
const checkAuth = require("../middleware/check-auth");

// api/v1/users/signup
router.post(
  "/signup",
  fileUpload.single("photo"),
  [
    check("email")
      .isEmail()
      .withMessage("Please provide a valid email address."),
    check("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long."),
    check("name").not().isEmpty().withMessage("Name is required."),
    check("age").custom((value) => {
      const age = parseInt(value, 10);
      if (isNaN(age) || age < 18)
        throw new Error("Age must be a number and at least 18.");
      return true;
    }),
    check("gender")
      .isIn(["Male", "Female", "Any"])
      .withMessage("Gender must be Male, Female, or Any."),
    check("location").not().isEmpty().withMessage("Location is required."),
  ],
  userController.signUp
);

// api/v1/users/signin
router.post("/signin", userController.signIn);

router.use(checkAuth);

// api/v1/users/me - GET
router.get("/me", userController.getUserProfile);

// api/v1/users/me - UPDATE
router.patch(
  "/me",
  fileUpload.single("photo"),
  userController.updateUserProfile
);

// exports
module.exports = router;
