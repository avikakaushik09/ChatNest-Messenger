const express = require("express");
const router = express.Router();

const Group = require("../models/Group");
const protect = require("../middleware/authMiddleware");


// ===============================
// CREATE GROUP
// ===============================

router.post("/", protect, async (req, res) => {
  try {
    const { name, members } = req.body;

    if (!name || !members || members.length === 0) {
      return res.status(400).json({
        message: "Group name and members required",
      });
    }

    const group = await Group.create({
      name,
      admin: req.user.userId,
      members: [...members, req.user.userId],
    });

    const populated = await Group.findById(group._id)
      .populate("members", "name email")
      .populate("admin", "name email");

    res.status(201).json(populated);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Server Error",
    });
  }
});


// ===============================
// GET MY GROUPS
// ===============================

router.get("/", protect, async (req, res) => {
  try {
    const groups = await Group.find({
      members: req.user.userId,
    })
      .populate("members", "name email")
      .populate("admin", "name email")
      .sort({ createdAt: -1 });

    res.json(groups);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

module.exports = router;