// model/error
const HttpError = require("../models/error/http-error");

// model/schema
const Discovery = require("../models/schema/discovery-schema");
const Match = require("../models/schema/match-schema");
const User = require("../models/schema/user-schema");

// api/v1/match
const getMatches = async (req, res, next) => {
  try {
    // get the currently logged-in user's id from request set by auth middleware
    const userId = req.userData.userId;

    // fFind all Match documents that include the current user
    // - populate users field but exclude password
    // - sort matches by most recently updated first
    const matches = await Match.find({ users: userId })
      .populate("users", "-password")
      .sort({ updatedAt: -1 });

    // transform each match to only return the other user (not the current user)
    const filteredMatches = matches
      .map((match) => {
        const otherUser = match.users.find((u) => u._id.toString() !== userId);
        return otherUser
          ? { ...otherUser.toObject(), matchId: match._id }
          : null;
      })
      .filter(Boolean); // remove nulls just in case

    // respond with the filtered matches
    res.status(200).json({ matches: filteredMatches });
  } catch (err) {
    console.error(err);
    return next(new HttpError("Failed to fetch matches. Try again later", 500));
  }
};

// api/v1/match/unmatch/:matchId
const unmatchUser = async (req, res, next) => {
  try {
    // get the current logged-in user's ID from request set by auth middleware
    const userId = req.userData.userId;

    // get the match ID from URL parameters
    const { matchId } = req.params;

    // validate: match must exist and include current user
    const match = await Match.findById(matchId);
    if (!match || !match.users.includes(userId)) {
      return next(new HttpError("No existing match found", 404));
    }

    // delete the match document from the database
    await Match.findByIdAndDelete(matchId);

    // find the other user's ID (the one that is not the current user)
    const otherUserId = match.users.find((id) => id.toString() !== userId);

    // if no other user exists, respond success
    if (!otherUserId) {
      return res
        .status(200)
        .json({ message: "Unmatched successfully, no other user found" });
    }

    // fetch both users' Discovery documents to update their matches
    const userDiscovery = await Discovery.findOne({ user: userId });
    const targetDiscovery = await Discovery.findOne({ user: otherUserId });

    // remove the other user from current user's matches, if exists
    if (userDiscovery?.matches) {
      userDiscovery.matches = userDiscovery.matches.filter(
        (id) => id.toString() !== otherUserId
      );
      await userDiscovery.save();
    }

    // remove current user from the other user's matches, if exists
    if (targetDiscovery?.matches) {
      targetDiscovery.matches = targetDiscovery.matches.filter(
        (id) => id.toString() !== userId
      );
      await targetDiscovery.save();
    }

    // respond with success
    res.status(200).json({ message: "User unmatched successfully" });
  } catch (err) {
    console.error(err);
    return next(new HttpError("Failed to unmatch user", 500));
  }
};

// api/v1/match/:matchId/channel
const getMatchChannel = async (req, res, next) => {
  try {
    // get the match ID from URL parameters
    const { matchId } = req.params;

    // fetch the Match document by its ID
    const match = await Match.findById(matchId);

    // validate: check if the match exists
    if (!match) return next(new HttpError("Match not found", 404));

    // respond with the channel ID associated with this match
    res.status(200).json({ channelId: match.channelId });
  } catch (err) {
    console.error(err);
    return next(new HttpError("Failed to fetch match channel", 500));
  }
};

exports.getMatches = getMatches;
exports.unmatchUser = unmatchUser;
exports.getMatchChannel = getMatchChannel;
