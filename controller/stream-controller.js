// stream-chat (messaging service)
const StreamChat = require("stream-chat").StreamChat;

// model/schema
const User = require("../models/schema/user-schema");

// model/error
const HttpError = require("../models/error/http-error");

// initialize stream server client
const serverClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY,
  process.env.STREAM_API_SECRET
);

// api/v1/stream/token
const getStreamToken = async (req, res, next) => {
  try {
    // get the currently logged-in user's ID from JWT set by auth middleware
    const userId = req.userData.userId;

    // fetch the user from the database
    const user = await User.findById(userId);

    // validate: user must exist
    if (!user) return res.status(404).json({ message: "User not found" });

    // generate a stream token for the user (used for real-time chat authentication)
    const token = serverClient.createToken(userId);

    // respond with the token and some user info
    res.status(200).json({
      token,
      user: {
        id: userId,
        name: user.name,
        photo: user.photo,
      },
    });
  } catch (err) {
    console.error(err);
    return next(new HttpError("Failed to generate Stream token", 500));
  }
};

exports.getStreamToken = getStreamToken;
