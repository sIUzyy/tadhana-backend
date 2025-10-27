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
      ageRange: { min: 18, max: 18 },
      maxDistanceKm: 0,
    },
    bio: "",
  });

  try {
    await createdUser.save();
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

  //   res.status(201).json({
  //     message: "User signed up successfully.",
  //     user: {
  //       id: createdUser.id,
  //       name: createdUser.name,
  //       age: createdUser.age,
  //       gender: createdUser.gender,
  //       location: createdUser.location,
  //       photo: createdUser.photo,
  //     },
  //     token,
  //   });

  res.status(201).json({
    message: "User signed up successfully.",
    user: { user: createdUser.id, email: createdUser.email, token: token },
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
    user: { userId: existingUser.id, email: existingUser.email, token: token },
  });
};

exports.signUp = signUp;
exports.signIn = signIn;
