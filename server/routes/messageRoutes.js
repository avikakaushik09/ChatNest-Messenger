const express = require("express");
const router = express.Router();

const Message = require("../models/Message");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");

// =====================================
// GET ALL USERS
// =====================================

router.get("/users", protect, async (req, res) => {
    try {
        const users = await User.find({
            _id: { $ne: req.user.userId },
            isBlocked: { $ne: true }
        })
            .select("-password")
            .sort({ name: 1 });

        res.status(200).json(users);

    } catch (error) {
        console.error("Get users error:", error);

        res.status(500).json({
            message: "Server error while getting users"
        });
    }
});


// =====================================
// GET CHAT HISTORY
// =====================================

router.get("/:userId", protect, async (req, res) => {
    try {
        const currentUserId = req.user.userId;
        const otherUserId = req.params.userId;

        const messages = await Message.find({
            $or: [
                {
                    sender: currentUserId,
                    receiver: otherUserId
                },
                {
                    sender: otherUserId,
                    receiver: currentUserId
                }
            ]
        }).sort({ createdAt: 1 });

        res.status(200).json(messages);

    } catch (error) {
        console.error("Get messages error:", error);

        res.status(500).json({
            message: "Server error while getting messages"
        });
    }
});


// =====================================
// SEND MESSAGE
// =====================================

router.post("/", protect, async (req, res) => {
    try {

        console.log("SEND MESSAGE BODY:", req.body);
        console.log("CURRENT USER:", req.user);

        const {
            receiver,
            content,
            text,
            messageType
        } = req.body;

        // Support both content and text
        const messageText = (content || text || "").trim();

        // Validate
        if (!receiver || !messageText) {
            return res.status(400).json({
                message: "Receiver and message content are required"
            });
        }

        // Check receiver
        const receiverUser = await User.findById(receiver);

        if (!receiverUser) {
            return res.status(404).json({
                message: "Receiver not found"
            });
        }

        // Create message
        const message = await Message.create({
            sender: req.user.userId,
            receiver: receiver,
            content: messageText,
            messageType: messageType || "text"
        });

        // Populate users
        const populatedMessage = await Message.findById(message._id)
            .populate("sender", "name email")
            .populate("receiver", "name email");

        console.log("MESSAGE CREATED:", populatedMessage);

        res.status(201).json(populatedMessage);

    } catch (error) {

        console.error("Send message error:", error);

        res.status(500).json({
            message: "Server error while sending message",
            error: error.message
        });
    }
});


module.exports = router;