const User = require("../models/schema/user-schema");
const Discovery = require("../models/schema/discovery-schema");
const Match = require("../models/schema/match-schema");
const HttpError = require("../models/error/http-error");

// api/v1/discovery
const getDiscoveryUsers = async (req, res, next) => {
  try {
    const userId = req.userData.userId;

    // Get current user
    const currentUser = await User.findById(userId);
    if (!currentUser) return next(new HttpError("User does not exist.", 404));

    // Get or create Discovery doc for current user
    let discovery = await Discovery.findOne({ user: userId });
    if (!discovery) discovery = await Discovery.create({ user: userId });

    // Determine gender filter
    let genderFilter;
    if (currentUser.gender === "Any") {
      genderFilter = ["Male", "Female", "Any"];
    } else if (currentUser.gender === "Male") {
      genderFilter = ["Female"];
    } else if (currentUser.gender === "Female") {
      genderFilter = ["Male"];
    }

    // Query users: exclude self and already seen users
    const users = await User.find({
      _id: { $nin: [userId, ...discovery.seenUsers] },
      gender: { $in: genderFilter },
    }).select("-password");

    res
      .status(200)
      .json({ message: "Discovery displayed success", users: users });
  } catch (err) {
    console.error(err);
    return next(
      new HttpError(
        "Something went wrong while displaying the discovery. Please try again later.",
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

    if (!targetUserId || typeof liked !== "boolean")
      return next(new HttpError("Invalid request. Try again later.", 400));

    // Get or create current user's Discovery doc
    let discovery = await Discovery.findOne({ user: userId });
    if (!discovery) discovery = await Discovery.create({ user: userId });

    // Add target to seenUsers
    if (!discovery.seenUsers.includes(targetUserId)) {
      discovery.seenUsers.push(targetUserId);
    }

    // If liked, add to likedUsers and check for match
    if (liked && !discovery.likedUsers.includes(targetUserId)) {
      discovery.likedUsers.push(targetUserId);

      // ✅ Get or create target user's Discovery doc
      let targetDiscovery = await Discovery.findOne({ user: targetUserId });
      if (!targetDiscovery)
        targetDiscovery = await Discovery.create({ user: targetUserId });

      // Check if target already liked current user → mutual match
      if (targetDiscovery.likedUsers.includes(userId)) {
        // Add each other to discovery.matches
        if (!discovery.matches.includes(targetUserId))
          discovery.matches.push(targetUserId);
        if (!targetDiscovery.matches.includes(userId))
          targetDiscovery.matches.push(userId);

        await targetDiscovery.save();

        // ✅ Create a Match document if it doesn't exist
        const existingMatch = await Match.findOne({
          users: { $all: [userId, targetUserId] },
        });

        if (!existingMatch) {
          await Match.create({ users: [userId, targetUserId] });
        }
      }
    }

    await discovery.save();

    res.json({ message: "Swipe recorded", matches: discovery.matches });
  } catch (error) {
    console.error(error);
    return next(
      new HttpError("Something went wrong. Please try again later.", 500)
    );
  }
};

exports.getDiscoveryUsers = getDiscoveryUsers;
exports.swipeUser = swipeUser;
