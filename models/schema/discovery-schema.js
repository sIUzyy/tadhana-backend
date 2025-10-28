const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const discoverySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    seenUsers: [{ type: Schema.Types.ObjectId, ref: "User" }], // users already seen
    likedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }], // users liked
    matches: [{ type: Schema.Types.ObjectId, ref: "User" }], // mutual matches
  },
  { timestamps: true }
);

module.exports = mongoose.model("Discoveries", discoverySchema);
