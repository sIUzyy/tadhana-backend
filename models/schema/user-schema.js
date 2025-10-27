const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 8 },
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: {
    type: String,
    required: true,
    enum: ["Male", "Female", "Any"],
  },
  location: { type: String, required: true },
  photo: { type: String, required: true },
  preferences: {
    gender: {
      type: String,
      enum: ["Male", "Female", "Any"],
      default: "Any",
    },

    ageRange: {
      min: { type: Number, min: 18 },
      max: { type: Number, min: 18 },
    },

    maxDistanceKm: { type: Number, min: 0 },
  },
  bio: { type: String, maxlength: 300 },
});

module.exports = mongoose.model("User", userSchema);
