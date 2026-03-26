// // controllers/faq.controller.js

// const Faq = require("../models/Faq");

// // Create FAQ (User submits question)
// exports.createFAQ = async (req, res) => {
//   try {
//     const { question } = req.body;

//     if (!question) {
//       return res.status(400).json({ message: "Question is required" });
//     }

//     const faq = await Faq.create({
//       user: req.user._id,          // from auth middleware
//       userName: req.user.name,     // logged-in user's name
//       question,
//     });

//     res.status(201).json({
//       success: true,
//       data: faq,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Get all FAQs (Admin / public)
// exports.getAllFAQs = async (req, res) => {
//   try {
//     const faqs = await Faq.find().sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       count: faqs.length,
//       data: faqs,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };



// controllers/faqController.js

import Faq from "../models/Faq.js";

// Create FAQ
export const createFAQ = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ message: "Question is required" });
    }

    const faq = await Faq.create({
      user: req.user._id,
      userName: req.user.name,
      question,
    });

    res.status(201).json({
      success: true,
      data: faq,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all FAQs
export const getAllFAQs = async (req, res) => {
  try {
    const faqs = await Faq.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: faqs.length,
      data: faqs,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};