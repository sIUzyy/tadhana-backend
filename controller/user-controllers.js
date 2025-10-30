// model
const User = require("../models/schema/user-schema");
const HttpError = require("../models/error/http-error");

// encrypt and decrypt password
const bcrypt = require("bcryptjs");

// jwt for authentication
const jwt = require("jsonwebtoken");

// input validator
const { validationResult } = require("express-validator");

// api/v1/users/signup
const signUp = async (req, res, next) => {
  // validate request body using express-validator
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError("Invalid input, please check your data.", 422);
    return next(error);
  }

  // extract user data from request body
  const { email, password, name, age, gender, location } = req.body;

  let existingUser;
  try {
    // check if a user with the same email already exists
    existingUser = await User.findOne({ email });
  } catch (err) {
    return next(
      new HttpError(
        "Something went wrong on our end. Please try again later.",
        500
      )
    );
  }

  // if user already exists, prompt to log in instead
  if (existingUser) {
    return next(
      new HttpError("User already exists. Please log in instead.", 400)
    );
  }

  // hash the password before saving
  const hashedPassword = await bcrypt.hash(password, 12);

  // create a new User document
  const createdUser = new User({
    email,
    password: hashedPassword,
    name,
    age,
    gender,
    location,
    photo: req.file.path, // file path from uploaded profile photo
    preferences: {
      gender: "Any", // default preference
      ageRange: { min: 18, max: 99 }, // default age range
    },
    bio: "", // default empty bio
  });

  try {
    // save the new user to the database
    await createdUser.save();
  } catch (err) {
    return next(
      new HttpError("Signing up failed. Please try again later.", 500)
    );
  }

  let token;
  try {
    // generate JWT token for authentication
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "30d" }
    );
  } catch (err) {
    return next(
      new HttpError(
        "We’re having trouble generating your token right now. Please try again later.",
        500
      )
    );
  }

  // send response with user info and token
  res.status(201).json({
    message: "User signed up successfully.",
    user: {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      photo: createdUser.photo,
      token: token,
    },
  });
};

// api/v1/users/signin
const signIn = async (req, res, next) => {
  // extract email and password from request body
  const { email, password } = req.body;

  // validate input: both email and password are required
  if (!email || !password) {
    return next(new HttpError("Email and password are required.", 400));
  }

  let existingUser;
  try {
    // fetch user by email
    existingUser = await User.findOne({ email });
  } catch {
    return next(
      new HttpError("Signing in failed. Please try again later.", 500)
    );
  }

  // if user with this email doesn't exist
  if (!existingUser) {
    return next(
      new HttpError(
        "The email you entered is incorrect. Please try again.",
        401
      )
    );
  }

  let isValidPassword = false;
  try {
    // compare entered password with hashed password in database
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch {
    return next(
      new HttpError("Signing in failed. Please try again later.", 500)
    );
  }

  // if password is incorrect
  if (!isValidPassword) {
    return next(
      new HttpError(
        "The password you entered is incorrect. Please try again.",
        401
      )
    );
  }

  let token;
  try {
    // generate JWT token for authentication
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "30d" }
    );
  } catch {
    return next(
      new HttpError("Logging in failed, please try again later.", 500)
    );
  }

  // respond with user info and token
  res.status(200).json({
    message: "User signed in successfully.",
    user: {
      id: existingUser.id,
      name: existingUser.name,
      email: existingUser.email,
      photo: existingUser.photo,
      token: token,
    },
  });
};

// api/v1/users/me
const getUserProfile = async (req, res, next) => {
  // get the currently logged-in user's ID from JWT (set by auth middleware)
  const userId = req.userData.userId;

  try {
    // fetch user from the database
    // - exclude password and preferences fields for security/privacy
    const user = await User.findById(userId).select("-password -preferences");

    // validate: check if user exists
    if (!user) {
      return next(new HttpError("User does not exist.", 404));
    }

    // convert Mongoose document to plain JS object with getters
    const userObj = user.toObject({ getters: true });

    // normalize the photo path for frontend usage
    if (userObj.photo) {
      userObj.photo = userObj.photo.replace(/\\/g, "/");
    }

    // send response with user profile
    res.status(200).json({
      message: "User profile fetched successfully.",
      user: userObj,
    });
  } catch (err) {
    console.error(err);
    return next(
      new HttpError(
        "Fetching user profile failed. Please try again later.",
        500
      )
    );
  }
};

// api/v1/users/:id
const getUserById = async (req, res, next) => {
  // extract the user ID from route parameters
  const { id } = req.params;

  try {
    // fetch user from database by ID
    // - exclude password for security
    const user = await User.findById(id).select("-password");

    // validate: check if user exists
    if (!user) return next(new HttpError("User not found.", 404));

    // return the raw user object (no photo path modification)
    const userObj = user.toObject({ getters: true });

    // send response with user data
    res.status(200).json({ user: userObj });
  } catch (err) {
    console.error(err);
    return next(new HttpError("Fetching user failed.", 500));
  }
};

// api/v1/users/me
const updateUserProfile = async (req, res, next) => {
  // get the currently logged-in user's ID from JWT (set by auth middleware)
  const userId = req.userData.userId;

  // extract data from request body (what user wants to update)
  const { name, bio } = req.body;

  try {
    // prepare an updates object dynamically
    const updates = {};
    if (name) updates.name = name; // update name if provided
    if (bio !== undefined) updates.bio = bio; // update bio if provided
    if (req.file) updates.photo = req.file.path; // update photo if a file was uploaded

    // update the user in database
    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true, // return the updated document
      runValidators: true, // run schema validations
      select: "-password -preferences", // exclude sensitive fields
    });

    // check if the user exists
    if (!updatedUser) {
      return next(new HttpError("User does not exist.", 404));
    }

    // normalize the photo path for frontend usage
    updatedUser.photo = updatedUser.photo?.replace(/\\/g, "/");

    // send response with updated user profile
    res.status(200).json({
      message: "Profile updated successfully.",
      user: updatedUser,
    });
  } catch (err) {
    console.error(err);
    return next(
      new HttpError("Updating profile failed. Please try again later.", 500)
    );
  }
};

// api/v1/users/preferences - GET
const getUserPreferences = async (req, res, next) => {
  // get the currently logged-in user's ID from JWT (set by auth middleware)
  const userId = req.userData.userId;

  try {
    // fetch only the preferences field from the user document
    const user = await User.findById(userId).select("preferences");

    // validate: check if user exists
    if (!user) {
      return next(new HttpError("User not found.", 404));
    }

    // respond with the user's preferences
    res.status(200).json({
      message: "Preferences fetched successfully.",
      preferences: user.preferences,
    });
  } catch (err) {
    console.error(err);
    return next(
      new HttpError("Fetching preferences failed. Please try again later.", 500)
    );
  }
};

// api/v1/users/preferences - UDPATE
const updateUserPreferences = async (req, res, next) => {
  // get the currently logged-in user's ID from JWT (set by auth middleware)
  const userId = req.userData.userId;

  // extract preferences from request body
  const { gender, ageRange } = req.body;

  try {
    // prepare an updates object dynamically
    const updates = {};
    if (gender) {
      // check if the provided gender is valid
      if (!["Male", "Female", "Any"].includes(gender)) {
        return next(new HttpError("Invalid gender preference.", 400));
      }
      updates["preferences.gender"] = gender;
    }

    // validate and update age range preference
    if (ageRange) {
      const { min, max } = ageRange;
      // ensure minimum age is 18 and range is valid
      if (min < 18 || max < 18 || min > max) {
        return next(
          new HttpError("Age range must start from 18 and be valid.", 400)
        );
      }
      updates["preferences.ageRange"] = { min, max };
    }

    // update the user's preferences in the database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates }, // apply updates
      { new: true, runValidators: true, select: "-password" } // return updated doc, run validators, exclude password
    );

    // check if the user exists
    if (!updatedUser) {
      return next(new HttpError("User not found.", 404));
    }

    // send response with updated preferences
    res.status(200).json({
      message: "Preferences updated successfully.",
      preferences: updatedUser.preferences,
    });
  } catch (err) {
    console.error(err);
    return next(
      new HttpError("Updating preferences failed. Please try again later.", 500)
    );
  }
};

exports.signUp = signUp;
exports.signIn = signIn;
exports.getUserProfile = getUserProfile;
exports.getUserById = getUserById;
exports.updateUserProfile = updateUserProfile;
exports.updateUserPreferences = updateUserPreferences;
exports.getUserPreferences = getUserPreferences;
