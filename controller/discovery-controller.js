const User = require("../models/schema/user-schema");
const Discovery = require("../models/schema/discovery-schema");
const Match = require("../models/schema/match-schema");
const HttpError = require("../models/error/http-error");
const StreamChat = require("stream-chat").StreamChat;

// Initialize Stream server client
const serverClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY,
  process.env.STREAM_API_SECRET
);

// api/v1/discovery
const getDiscoveryUsers = async (req, res, next) => {
  try {
    const userId = req.userData.userId;

    // Get current user with preferences
    const currentUser = await User.findById(userId);
    if (!currentUser) return next(new HttpError("User does not exist.", 404));

    // Ensure discovery doc exists
    let discovery = await Discovery.findOne({ user: userId });
    if (!discovery) discovery = await Discovery.create({ user: userId });

    // ✅ Extract preferences (with safe defaults)
    const prefGender = currentUser.preferences?.gender || "Any";
    const prefAge = currentUser.preferences?.ageRange || { min: 18, max: 99 };

    // ✅ Build gender filter based on preference
    let genderFilter = [];
    if (prefGender === "Any") {
      genderFilter = ["Male", "Female"];
    } else {
      genderFilter = [prefGender];
    }

    // ✅ Query users who match the preference
    const users = await User.find({
      _id: { $nin: [userId, ...discovery.seenUsers] },
      gender: { $in: genderFilter },
      age: { $gte: prefAge.min, $lte: prefAge.max },
    }).select("-password");

    res.status(200).json({
      message: "Discovery displayed successfully.",
      users,
      preferences: currentUser.preferences, // optional: return for debugging
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
    const userId = req.userData.userId;
    const { targetUserId, liked } = req.body;

    if (!targetUserId || typeof liked !== "boolean") {
      return next(new HttpError("Invalid request. Try again later.", 400));
    }

    // ✅ Fetch current user
    const currentUser = await User.findById(userId);
    if (!currentUser) return next(new HttpError("User does not exist.", 404));

    // Get or create current user's Discovery doc
    let discovery = await Discovery.findOne({ user: userId });
    if (!discovery) discovery = await Discovery.create({ user: userId });

    // Add target to seenUsers
    if (!discovery.seenUsers.includes(targetUserId)) {
      discovery.seenUsers.push(targetUserId);
    }

    let newMatch = false;
    let channelId = null;

    if (liked && !discovery.likedUsers.includes(targetUserId)) {
      discovery.likedUsers.push(targetUserId);

      // Get or create target user's Discovery doc
      let targetDiscovery = await Discovery.findOne({ user: targetUserId });
      if (!targetDiscovery)
        targetDiscovery = await Discovery.create({ user: targetUserId });

      // Check for mutual like → new match
      if (targetDiscovery.likedUsers.includes(userId)) {
        if (!discovery.matches.includes(targetUserId))
          discovery.matches.push(targetUserId);
        if (!targetDiscovery.matches.includes(userId))
          targetDiscovery.matches.push(userId);

        await targetDiscovery.save();

        // Check if Match document exists
        let existingMatch = await Match.findOne({
          users: { $all: [userId, targetUserId] },
        });

        if (!existingMatch) {
          // Ensure both users exist in Stream
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

          // Create Stream channel
          const channel = serverClient.channel("messaging", {
            members: [userId, targetUserId],
            created_by_id: userId,
          });
          await channel.create();

          // Save Match document with channelId
          existingMatch = await Match.create({
            users: [userId, targetUserId],
            channelId: channel.id,
          });
        }

        newMatch = true;
        channelId = existingMatch.channelId;
      }

      await discovery.save();
      return res.json({ message: "Swipe recorded", newMatch, channelId });
    }

    // Default (not liked or already liked)
    await discovery.save();
    res.json({ message: "Swipe recorded", newMatch: false, channelId: null });
  } catch (error) {
    console.error(error);
    return next(
      new HttpError("Something went wrong. Please try again later.", 500)
    );
  }
};

exports.getDiscoveryUsers = getDiscoveryUsers;
exports.swipeUser = swipeUser;
