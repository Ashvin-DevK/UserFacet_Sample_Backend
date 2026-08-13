import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        tokenHash: {
            type: String,
            required: true,
            unique: true
        },

        familyId: {
            type: String,
            required: true,
            index: true
        },

        expiresAt: {
            type: Date,
            required: true
        },

        revokedAt: {
            type: Date,
            default: null
        },

        replacedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RefreshToken",
            default: null
        }
    },
    {
        timestamps: true
    }
);

refreshTokenSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

refreshTokenSchema.index({
    user: 1,
    familyId: 1
});

const RefreshToken = mongoose.model(
    "RefreshToken",
    refreshTokenSchema
);

export default RefreshToken;