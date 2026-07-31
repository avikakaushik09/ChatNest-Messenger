const express = require("express");

const router = express.Router();

const {
    register,
    login,
    getMe
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

// Register
router.post("/register", register);

// Login
router.post("/login", login);

// Get current user
router.get("/me", protect, getMe);

module.exports = router;