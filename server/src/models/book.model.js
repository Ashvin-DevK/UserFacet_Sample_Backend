import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },

    description: {
      type: String,
      required: true,
      maxlength: 5000,
    },

    isbn: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    authors: [
      {
        type: String,
        trim: true,
      },
    ],

    categories: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    publisher: {
      type: String,
      trim: true,
    },

    publishedYear: {
      type: Number,
      min: 0,
      max: new Date().getFullYear(),
    },

    language: {
      type: String,
      default: "English",
      trim: true,
    },

    coverImage: {
      type: String,
      default: null,
    },

    totalCopies: {
      type: Number,
      required: true,
      min: 1,
    },

    availableCopies: {
      type: Number,
      required: true,
      min: 0,
    },

    aiSummary: {
      type: String,
      default: null,
    },

    aiSummaryGeneratedAt: {
      type: Date,
      default: null,
    },

    aiSummaryStatus: {
      type: String,
      enum: ["not_generated", "generating", "completed"],
      default: "not_generated",
    },
    aiSummaryGenerationStartedAt: {
    type: Date,
    default: null
},

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

bookSchema.index({
  title: "text",
  description: "text",
  authors: "text",
  categories: "text",
});

const Book = mongoose.model("Book", bookSchema);

export default Book;
