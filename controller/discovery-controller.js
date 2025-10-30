// model/schema
const User = require("../models/schema/user-schema");
const Match = require("../models/schema/match-schema");
const Discovery = require("../models/schema/discovery-schema");

// model/error
const HttpError = require("../models/error/http-error");

// stream-chat (messaging service)
const StreamChat = require("stream-chat").StreamChat;

// initialize stream server client
const serverClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY,
  process.env.STREAM_API_SECRET
);

// api/v1/discovery
const getDiscoveryUsers = async (req, res, next) => {
  try {
    // extract the current logged-in user's id from request set by auth middleware
    const userId = req.userData.userId;

    // get current user with preferences
    const currentUser = await User.findById(userId);
    if (!currentUser) return next(new HttpError("User does not exist.", 404));

    // ensure discovery doc exists
    let discovery = await Discovery.findOne({ user: userId });
    if (!discovery) discovery = await Discovery.create({ user: userId });

    // extract preferences with defaults value
    const prefGender = currentUser.preferences?.gender || "Any";
    const prefAge = currentUser.preferences?.ageRange || { min: 18, max: 99 };

    // build gender filter based on preference
    let genderFilter = [];
    if (prefGender === "Any") {
      genderFilter = ["Male", "Female"];
    } else {
      genderFilter = [prefGender];
    }

    // query users who match the preference
    const users = await User.find({
      _id: { $nin: [userId, ...discovery.seenUsers] },
      gender: { $in: genderFilter },
      age: { $gte: prefAge.min, $lte: prefAge.max },
    }).select("-password");

    // return status code of 200 and json data
    res.status(200).json({
      message: "Discovery displayed successfully.",
      users,
      preferences: currentUser.preferences,
    });
  } catch (err) {
    console.error(err);
    return next(
      new HttpError(
        "Something went wrong while displaying discovery users. Please try again later.",
        500
      )
    );
  }
};

// api/v1/discovery/swipe
const swipeUser = async (req, res, next) => {
  try {
    // extract the current logged-in user's id from request set by auth middleware
    const userId = req.userData.userId;

    // extract target user id and like status from request body
    const { targetUserId, liked } = req.body;

    // validate input: targetUserId must exist and liked must be boolean
    if (!targetUserId || typeof liked !== "boolean") {
      return next(new HttpError("Invalid request. Try again later.", 400));
    }

    // fetch the current user from the database
    const currentUser = await User.findById(userId);
    if (!currentUser) return next(new HttpError("User does not exist.", 404));

    // fetch current user's discovery document (stores swipes & matches), or create if not exists
    let discovery = await Discovery.findOne({ user: userId });
    if (!discovery) discovery = await Discovery.create({ user: userId });

    // record that the current user has seen this target user
    if (!discovery.seenUsers.includes(targetUserId)) {
      discovery.seenUsers.push(targetUserId);
    }

    // initialize match-related variables
    let newMatch = false;
    let channelId = null;

    //  handle like action
    if (liked && !discovery.likedUsers.includes(targetUserId)) {
      // add target user to current user's liked list
      discovery.likedUsers.push(targetUserId);

      // fetch target user's Discovery doc or create if not exists
      let targetDiscovery = await Discovery.findOne({ user: targetUserId });
      if (!targetDiscovery)
        targetDiscovery = await Discovery.create({ user: targetUserId });

      // check if the target user has already liked current user → mutual like → new match
      if (targetDiscovery.likedUsers.includes(userId)) {
        // add each other to matches if not already added
        if (!discovery.matches.includes(targetUserId))
          discovery.matches.push(targetUserId);
        if (!targetDiscovery.matches.includes(userId))
          targetDiscovery.matches.push(userId);

        // save the updated target user's discovery doc
        await targetDiscovery.save();

        // check if a match document already exists for this pair
        let existingMatch = await Match.findOne({
          users: { $all: [userId, targetUserId] },
        });

        if (!existingMatch) {
          // ensure both users exist in stream chat service
          await serverClient.upsertUser({
            id: userId,
            name: currentUser.name,
            image: currentUser.photo,
          });

          const targetUser = await User.findById(targetUserId);
          await serverClient.upsertUser({
            id: targetUserId,
            name: targetUser.name,
            image: targetUser.photo,
          });

          // create a messaging channel in stream for the matched users
          const channel = serverClient.channel("messaging", {
            members: [userId, targetUserId],
            created_by_id: userId,
          });
          await channel.create();

          // save new match document with channelId
          existingMatch = await Match.create({
            users: [userId, targetUserId],
            channelId: channel.id,
          });
        }

        // update match flags for response
        newMatch = true;
        channelId = existingMatch.channelId;
      }

      // save current user's Discovery doc after processing like
      await discovery.save();

      // respond with success and match info
      return res.json({ message: "Swipe recorded", newMatch, channelId });
    }

    // default case: either disliked or already liked
    await discovery.save();
    res.json({ message: "Swipe recorded", newMatch: false, channelId: null });
  } catch (error) {
    console.error(error);
    return next(
      new HttpError(
        "Something went wrong with the server. Please try again later.",
        500
      )
    );
  }
};

exports.getDiscoveryUsers = getDiscoveryUsers;
exports.swipeUser = swipeUser;
