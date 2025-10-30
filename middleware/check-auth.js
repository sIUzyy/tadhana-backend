const HttpError = require("../models/error/http-error");
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  // allow preflight requests to pass through
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    // get the Authorization header and extract the token
    // Header format: 'Authorization: Bearer TOKEN'
    const token = req.headers.authorization.split(" ")[1];

    // if no token is provided, throw an error
    if (!token) {
      throw new Error("Authentication failed!");
    }

    // verify the token using the JWT secret
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    // attach user data to the request for downstream use
    req.userData = { userId: decodedToken.userId };

    // call next middleware or route handler
    next();
  } catch (err) {
    const error = new HttpError("Authentication failed!", 403);
    return next(error);
  }
};
