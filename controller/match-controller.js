const Match = require("../models/schema/match-schema");
const HttpError = require("../models/error/http-error");
const Discovery = require("../models/schema/discovery-schema");
const User = require("../models/schema/user-schema");

// api/v1/match
const getMatches = async (req, res, next) => {
  try {
    const userId = req.userData.userId;

    // Find matches where current user is included
    const matches = await Match.find({ users: userId })
      .populate("users", "-password")
      .sort({ updatedAt: -1 });

    // Map each match to only include the other user
    const filteredMatches = matches
      .map((match) => {
        const otherUser = match.users.find((u) => u._id.toString() !== userId);
        return otherUser
          ? { ...otherUser.toObject(), matchId: match._id }
          : null;
      })
      .filter(Boolean); // remove nulls just in case

    res.status(200).json({ matches: filteredMatches });
  } catch (err) {
    console.error(err);
    return next(new HttpError("Failed to fetch matches", 500));
  }
};

// api/v1/match/unmatch/:matchId
const unmatchUser = async (req, res, next) => {
  try {
    const userId = req.userData.userId;
    const { matchId } = req.params;

    const match = await Match.findById(matchId);
    if (!match || !match.users.includes(userId)) {
      return next(new HttpError("No existing match found", 404));
    }

    // Delete the match document
    await Match.findByIdAndDelete(matchId);

    // Safely get the other user's id
    const otherUserId = match.users.find((id) => id.toString() !== userId);
    if (!otherUserId) {
      return res
        .status(200)
        .json({ message: "Unmatched successfully, no other user found" });
    }

    // Update both discoveries safely
    const userDiscovery = await Discovery.findOne({ user: userId });
    const targetDiscovery = await Discovery.findOne({ user: otherUserId });

    if (userDiscovery?.matches) {
      userDiscovery.matches = userDiscovery.matches.filter(
        (id) => id.toString() !== otherUserId
      );
      await userDiscovery.save();
    }

    if (targetDiscovery?.matches) {
      targetDiscovery.matches = targetDiscovery.matches.filter(
        (id) => id.toString() !== userId
      );
      await targetDiscovery.save();
    }

    res.status(200).json({ message: "User unmatched successfully" });
  } catch (err) {
    console.error("Unmatch Error:", err);
    return next(new HttpError("Failed to unmatch user", 500));
  }
};

exports.getMatches = getMatches;
exports.unmatchUser = unmatchUser;
