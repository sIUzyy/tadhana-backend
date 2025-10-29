const StreamChat = require("stream-chat").StreamChat;
const User = require("../models/schema/user-schema");
const HttpError = require("../models/error/http-error");

const serverClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY,
  process.env.STREAM_API_SECRET
);

// api/v1/stream/token
const getStreamToken = async (req, res, next) => {
  try {
    const userId = req.userData.userId; // from JWT
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    const token = serverClient.createToken(userId);

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
    next(new HttpError("Failed to generate Stream token", 500));
  }
};

exports.getStreamToken = getStreamToken;
