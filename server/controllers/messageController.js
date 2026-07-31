const Message = require("../models/Message");

// =========================
// SEND MESSAGE
// =========================

const sendMessage = async (req, res) => {
    try {
        const { receiverId, text } = req.body;

        if (!receiverId || !text) {
            return res.status(400).json({
                message: "Receiver and message are required"
            });
        }

        const message = await Message.create({
            sender: req.user.userId,
            receiver: receiverId,
            text
        });

        const populatedMessage = await Message.findById(message._id)
            .populate("sender", "name email")
            .populate("receiver", "name email");

        res.status(201).json({
            message: "Message sent successfully",
            data: populatedMessage
        });

    } catch (error) {
        console.error("Send message error:", error);

        res.status(500).json({
            message: "Server error while sending message"
        });
    }
};


// =========================
// GET CHAT
// =========================

const getMessages = async (req, res) => {
    try {
        const { userId } = req.params;

        const messages = await Message.find({
            $or: [
                {
                    sender: req.user.userId,
                    receiver: userId
                },
                {
                    sender: userId,
                    receiver: req.user.userId
                }
            ]
        })
            .populate("sender", "name email")
            .populate("receiver", "name email")
            .sort({ createdAt: 1 });

        res.status(200).json(messages);

    } catch (error) {
        console.error("Get messages error:", error);

        res.status(500).json({
            message: "Server error while fetching messages"
        });
    }
};


module.exports = {
    sendMessage,
    getMessages
};