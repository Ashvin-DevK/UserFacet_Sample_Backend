import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            minlength: 2,
            maxlength: 50
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: 8,
            maxlength: 100,
            select: false
        },

        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
            index: true
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true
        },

        failedLoginAttempts: {
            type: Number,
            default: 0,
            min: 0
        },

        lockUntil: {
            type: Date,
            default: null
        },

        lastLoginAt: {
            type: Date,
            default: null
        },

        passwordChangedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

const User = mongoose.model(
    "User",
    userSchema
);

export default User;