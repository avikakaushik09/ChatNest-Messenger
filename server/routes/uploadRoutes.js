const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// =====================================
// Create uploads folder if it doesn't exist
// =====================================

const uploadPath = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log("✅ uploads folder created");
}

// =====================================
// Multer Storage
// =====================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

// =====================================
// File Filter (Images, PDF, Docs)
// =====================================

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type"), false);
  }
};

// =====================================
// Multer Upload
// =====================================

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

// =====================================
// Upload Route
// POST /api/upload
// =====================================

router.post("/", (req, res) => {
  upload.single("file")(req, res, (err) => {
    try {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      res.status(200).json({
        success: true,
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileType: req.file.mimetype,
        size: req.file.size,
        url: `http://localhost:5000/uploads/${req.file.filename}`,
      });
    } catch (error) {
      console.error("Upload Error:", error);

      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  });
});

module.exports = router;