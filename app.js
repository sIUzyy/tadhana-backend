// ---- prevent the mongodb connection error (install dotenv) ----
require("dotenv").config();

// ---- import section ----
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const HttpError = require("./models/error/http-error");

// ---- import routes ----
const usersRoutes = require("./routes/user-routes");
const discoveryRoutes = require("./routes/discovery-routes");
const matchRoutes = require("./routes/match-routes");
const streamRoutes = require("./routes/stream-routes");

// ---- connection configuration ----
const PORT = process.env.PORT || process.env.PORT_ALTER; // port configuration
const GLOBAL_ACCESS = process.env.GLOBAL_ACCESS; // 0.0.0.0
const URL_STRING = process.env.URL_STRING; // conection string to mongodb

// ---- initializing section ----
const app = express(); // initialize an express
app.use(bodyParser.json()); // this will parse any incoming request body and extract any json data.

// image path
app.use("/uploads/images", express.static(path.join("uploads", "images")));

// cors
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // replace the "*" later with my frontend's URL, like "http://localhost:3000"
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Request-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  next();
});

// ---- route-middleware ----
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/discovery", discoveryRoutes);
app.use("/api/v1/match", matchRoutes);
app.use("/api/v1/stream", streamRoutes);

// ---- welcome message  ----
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Tadhana - A filipino dating app",
  });
});

/*
  middleware to handle any request that doesn't match an existing route
  this runs when no other route handles the request (e.g., user visits a wrong endpoint)
*/
app.use((req, res, next) => {
  const error = new HttpError(
    "Could not find this route. Please check the URL and try again.",
    404
  );
  throw error;
});

/*
   global error handling middleware function
   this catches all errors thrown in the app (including from above)
*/
app.use((error, req, res, next) => {
  // if a file was uploaded but an error occurred, remove the uploaded file to clean up
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }

  // catch the file-upload.js (multer) error
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      message: "File is too large. Maximum allowed size is 2 MB.",
    });
  }

  // if headers have already been sent, forward the error to the default Express handler
  if (res.headerSent) {
    return next(error);
  }

  // send an appropriate HTTP status code and a clear JSON message to the client
  res.status(error.code || 500);
  res.json({
    message:
      error.message ||
      "Something went wrong on our end. Please try again later.",
  });
});

// ---- connection section (local) ------
mongoose
  .connect(URL_STRING)
  .then(() => {
    app.listen(PORT, GLOBAL_ACCESS, () => {
      console.log("CONNECTED TO MONGODB...");
      console.log(`SERVER RUNNING ON PORT ${PORT}`);
    });
  })
  .catch((err) => console.error("MongoDB connection error:", err));
