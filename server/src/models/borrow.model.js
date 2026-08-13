import mongoose from "mongoose";

const borrowSchema = new mongoose.Schema(
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

        borrowedAt: {
            type: Date,
            default: Date.now,
            required: true
        },

        dueAt: {
            type: Date,
            required: true,
            index: true
        },

        returnedAt: {
            type: Date,
            default: null
        },

        fine: {
            type: Number,
            default: 0,
            min: 0
        },

        fineCalculatedAt: {
            type: Date,
            default: null
        },

        status: {
            type: String,
            enum: [
                "borrowed",
                "returned",
                "overdue"
            ],
            default: "borrowed",
            required: true,
            index: true
        }
    },
    {
        timestamps: true
    }
);

borrowSchema.index({
    user: 1,
    book: 1,
    status: 1
});

borrowSchema.index(
    {
        user: 1,
        book: 1
    },
    {
        unique: true,
        partialFilterExpression: {
            status: {
                $in: [
                    "borrowed",
                    "overdue"
                ]
            }
        }
    }
);

borrowSchema.index({
    status: 1,
    dueAt: 1
});

const Borrow = mongoose.model(
    "Borrow",
    borrowSchema
);

export default Borrow;