const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

// Models & Routes
const Message = require("./models/Message"); // Ensure path matches your Message model
const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");
const groupRoutes = require("./routes/groupRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

dotenv.config();

const app = express();

const server = http.createServer(app);

// =====================================
// Middleware
// =====================================

app.use(
  cors({
    origin: [
      "http://localhost:5173",
  "https://chat-nest-messenger.vercel.app",
],
  
    credentials: true,
  })
);

app.use(express.json());
app.use("/api/upload", uploadRoutes);

// Serve Static Uploads Directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =====================================
// Routes
// =====================================

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);

// =====================================
// Test Route
// =====================================

app.get("/", (req, res) => {
  res.json({
    message: "ChatNest Messenger API Running 🚀",
  });
});

// =====================================
// HTTP Server & Socket.IO Setup
// =====================================

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://chat-nest-messenger.vercel.app",
    ],
    credentials: true,
  },
});
// =====================================
// Online Users Tracker
// =====================================

const onlineUsers = new Map(); // Map<userId, socketId>

// =====================================
// Socket Events
// =====================================

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // USER ONLINE
  socket.on("user_online", (userId) => {
    if (!userId) return;

    onlineUsers.set(String(userId), socket.id);
    console.log(`User ${userId} is online`);

    io.emit("online_users", Array.from(onlineUsers.keys()));
  });

  // TYPING
  socket.on("typing", ({ sender, receiver }) => {
    const receiverSocket = onlineUsers.get(String(receiver));

    if (receiverSocket) {
      io.to(receiverSocket).emit("typing", { sender });
    }
  });

  // STOP TYPING
  socket.on("stop_typing", ({ sender, receiver }) => {
    const receiverSocket = onlineUsers.get(String(receiver));

    if (receiverSocket) {
      io.to(receiverSocket).emit("stop_typing", { sender });
    }
  });

  // SEND MESSAGE
  socket.on("send_message", async (message) => {
    if (!message) return;

    try {
      const receiverId =
        typeof message.receiver === "object"
          ? message.receiver._id
          : message.receiver;

      const senderId =
        typeof message.sender === "object"
          ? message.sender._id
          : message.sender;

      const receiverSocket = onlineUsers.get(String(receiverId));

      // Emit to receiver if online
      if (receiverSocket) {
        io.to(receiverSocket).emit("receive_message", message);
        console.log(`Realtime message sent to ${receiverId}`);
      }

      // Update message status in MongoDB to "delivered"
      if (message._id) {
        await Message.findByIdAndUpdate(message._id, {
          status: "delivered",
        });

        // Notify sender that message has been delivered
        const senderSocket = onlineUsers.get(String(senderId));
        if (senderSocket) {
          io.to(senderSocket).emit("message_delivered", {
            messageId: message._id,
          });
        }
      }
    } catch (err) {
      console.error("Error handling send_message:", err.message);
    }
  });

  // MESSAGES SEEN
  socket.on("messages_seen", async ({ senderId }) => {
    try {
      // Get current socket's user ID (the receiver viewing the messages)
      let currentUserId = null;
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          currentUserId = userId;
          break;
        }
      }

      if (!currentUserId || !senderId) return;

      // Update status in database to "seen"
      await Message.updateMany(
        { sender: senderId, receiver: currentUserId, status: { $ne: "seen" } },
        { status: "seen" }
      );

      // Notify the original sender that their messages were read
      const senderSocket = onlineUsers.get(String(senderId));
      if (senderSocket) {
        io.to(senderSocket).emit("messages_seen", {
          senderId: currentUserId,
        });
      }
    } catch (err) {
      console.error("Error updating messages_seen:", err.message);
    }
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);

    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`User ${userId} went offline`);
        break;
      }
    }

    io.emit("online_users", Array.from(onlineUsers.keys()));
  });
});

// =====================================
// MongoDB Connection & Server Start
// =====================================

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully ✅");

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT} 🚀`);
    });
  })
  .catch((err) => {
    console.log("MongoDB connection failed ❌");
    console.error(err.message);
  });