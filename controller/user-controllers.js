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
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError("Invalid input, please check your data.", 422);
    return next(error);
  }

  const { email, password, name, age, gender, location } = req.body;

  console.log("req.body:", req.body);
  console.log("req.file:", req.file);

  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    return next(
      new HttpError(
        "Something went wrong on our end. Please try again later.",
        500
      )
    );
  }

  if (existingUser) {
    return next(
      new HttpError("User already exists. Please log in instead.", 400)
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const createdUser = new User({
    email,
    password: hashedPassword,
    name,
    age,
    gender,
    location,
    photo: req.file.path,
    preferences: {
      gender: "Any",
      ageRange: { min: 18, max: 99 },
    },
    bio: "",
  });

  try {
    await createdUser.save();
    console.log("Created user object:", createdUser);
  } catch (err) {
    return next(
      new HttpError("Signing up failed. Please try again later.", 500)
    );
  }

  let token;
  try {
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

  res.status(201).json({
    message: "User signed up successfully.",
    user: {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      token: token,
    },
  });
};

// api/v1/users/signin
const signIn = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new HttpError("Email and password are required.", 400));
  }

  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch {
    return next(
      new HttpError("Signing in failed. Please try again later.", 500)
    );
  }

  if (!existingUser) {
    return next(new HttpError("Invalid credentials. Please try again.", 401));
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch {
    return next(
      new HttpError("Signing in failed. Please try again later.", 500)
    );
  }

  if (!isValidPassword) {
    return next(new HttpError("Invalid credentials. Please try again.", 401));
  }

  let token;
  try {
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

  res.status(200).json({
    message: "User signed in successfully.",
    user: {
      id: existingUser.id,
      name: existingUser.name,
      email: existingUser.email,
      token: token,
    },
  });
};

// api/v1/users/me
const getUserProfile = async (req, res, next) => {
  const userId = req.userData.userId;

  try {
    const user = await User.findById(userId).select("-password -preferences");

    if (!user) {
      return next(new HttpError("User does not exist.", 404));
    }

    // Normalize the photo path
    const userObj = user.toObject({ getters: true });
    if (userObj.photo) {
      userObj.photo = userObj.photo.replace(/\\/g, "/");
    }

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

// api/v1/users/me
const updateUserProfile = async (req, res, next) => {
  //
  const userId = req.userData.userId;

  // need from request body
  const { name, bio } = req.body;

  try {
    // updat object
    const updates = {};
    if (name) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (req.file) updates.photo = req.file.path;

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
      select: "-password -preferences",
    });

    if (!updatedUser) {
      return next(new HttpError("User does not exist.", 404));
    }

    updatedUser.photo = updatedUser.photo?.replace(/\\/g, "/");

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
  const userId = req.userData.userId;

  try {
    const user = await User.findById(userId).select("preferences");

    if (!user) {
      return next(new HttpError("User not found.", 404));
    }

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
  const userId = req.userData.userId;
  const { gender, ageRange } = req.body;

  try {
    // validate inputs
    const updates = {};
    if (gender) {
      if (!["Male", "Female", "Any"].includes(gender)) {
        return next(new HttpError("Invalid gender preference.", 400));
      }
      updates["preferences.gender"] = gender;
    }

    if (ageRange) {
      const { min, max } = ageRange;
      if (min < 18 || max < 18 || min > max) {
        return next(
          new HttpError("Age range must start from 18 and be valid.", 400)
        );
      }
      updates["preferences.ageRange"] = { min, max };
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true, select: "-password" }
    );

    if (!updatedUser) {
      return next(new HttpError("User not found.", 404));
    }

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
exports.updateUserProfile = updateUserProfile;
exports.updateUserPreferences = updateUserPreferences;
exports.getUserPreferences = getUserPreferences;
