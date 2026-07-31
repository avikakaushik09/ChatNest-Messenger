const express = require("express");
const router = express.Router();

const User = require("../models/User");

// =========================
// GET ALL USERS
// =========================

router.get("/", async (req, res) => {
    try {
        const users = await User.find()
            .select("-password")
            .sort({ name: 1 });

        res.status(200).json(users);

    } catch (error) {
        console.error("Get users error:", error);

        res.status(500).json({
            message: "Server error while fetching users"
        });
    }
});

module.exports = router;