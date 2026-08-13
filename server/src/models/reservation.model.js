import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        book: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Book",
            required: true,
            index: true
        },

        status: {
            type: String,
            enum: [
                "waiting",
                "ready",
                "fulfilled",
                "cancelled",
                "expired"
            ],
            default: "waiting",
            index: true
        },

        position: {
            type: Number,
            required: true
        },

        expiresAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

reservationSchema.index({
    book: 1,
    status: 1,
    position: 1
});

reservationSchema.index(
    {
        user: 1,
        book: 1
    },
    {
        unique: true,
        partialFilterExpression: {
            status: {
                $in: ["waiting", "ready"]
            }
        }
    }
);

const Reservation = mongoose.model(
    "Reservation",
    reservationSchema
);

export default Reservation;