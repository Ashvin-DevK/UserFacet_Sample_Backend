import mongoose from "mongoose";

const reservationCounterSchema = new mongoose.Schema(
    {
        book: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Book",
            required: true,
            unique: true,
            index: true
        },

        nextPosition: {
            type: Number,
            default: 1,
            min: 1
        }
    },
    {
        timestamps: true
    }
);

const ReservationCounter = mongoose.model(
    "ReservationCounter",
    reservationCounterSchema
);

export default ReservationCounter;