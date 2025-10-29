const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const matchSchema = new Schema(
  {
    users: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    channelId: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Matches", matchSchema);
