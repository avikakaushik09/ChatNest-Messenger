const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 50
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true,
            minlength: 6
        },

        profilePicture: {
            type: String,
            default: ""
        },

        status: {
            type: String,
            enum: ["online", "offline"],
            default: "offline"
        },

        lastSeen: {
            type: Date,
            default: Date.now
        },

        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user"
        },

        isBlocked: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);