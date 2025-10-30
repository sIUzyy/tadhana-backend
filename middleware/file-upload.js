const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

// map MIME types to file extensions
const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

// configure multer for file uploads
const fileUpload = multer({
  // limit file size to 2 MB
  limits: { fileSize: 2 * 1024 * 1024 },

  // configure storage options
  storage: multer.diskStorage({
    // set the destination folder for uploaded files
    destination: (req, file, cb) => {
      cb(null, "uploads/images");
    },

    // generate a unique filename using UUID and proper extension
    filename: (req, file, cb) => {
      const extensions = MIME_TYPE_MAP[file.mimetype];
      cb(null, uuidv4() + "." + extensions);
    },
  }),

  // filter files to allow only valid image MIME types
  fileFilter: (req, file, cb) => {
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    let error = isValid
      ? null
      : new Error("Invalid file type. Only PNG, JPEG, JPG are allowed.");
    cb(error, isValid);
  },
});

module.exports = fileUpload;
