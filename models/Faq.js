// models/Faq.js
import mongoose from "mongoose";

const faqSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const Faq = mongoose.model("FAQ", faqSchema);

export default Faq;