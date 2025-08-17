import mongoose from "mongoose";
import Review from "../models/Review.js";

// Add a new review
export const createReview = async (req, res) => {
  try {
    const { userName, rating, comment, productId } = req.body;

    if (!userName || !rating || !comment || !productId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const review = new Review({ userName, rating, comment, productId });
    await review.save();

    res.status(201).json({ message: "Review submitted successfully", review });
  } catch (error) {
    console.error("❌ Error submitting review:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all reviews for a product
export const getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid productId" });
    }
    const pid = new mongoose.Types.ObjectId(productId);

    const [reviews, stats] = await Promise.all([
      Review.find({ productId: pid })
        .sort({ createdAt: -1 })
        .select("userName rating comment createdAt")
        .lean(),
      Review.aggregate([
        { $match: { productId: pid } },
        { $group: { _id: "$productId", averageRating: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]),
    ]);

    const count = stats[0]?.count ?? 0;
    const averageRating = stats[0]?.averageRating ? Number(stats[0].averageRating.toFixed(1)) : 0;

    res.status(200).json({ productId, count, averageRating, reviews });
  } catch (e) {
    console.error("❌ Error fetching reviews:", e?.message, e?.stack);
    res.status(500).json({ message: "Internal server error" });
  }
};

//get all reviews by own users
export const getReviewsByUserName = async (req, res) => {
  try {
    const { userName } = req.params;
    const { productId } = req.query;

    if (!userName || !userName.trim()) {
      return res.status(400).json({ message: "userName is required" });
    }

    // Build filter
    const filter = { userName };
    if (productId) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: "Invalid productId" });
      }
      filter.productId = new mongoose.Types.ObjectId(productId);
    }

    // Fetch reviews list (latest first)
    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .select("productId rating comment createdAt userName")
      .lean();

    // Stats
    const aggregation = [
      { $match: { userName } },
      ...(productId
        ? [{ $match: { productId: new mongoose.Types.ObjectId(productId) } }]
        : []),
      {
        $group: {
          _id: productId ? "$productId" : "$userName",
          totalReviews: { $sum: 1 },
          averageRatingGiven: { $avg: "$rating" },
        },
      },
    ];

    const stats = await Review.aggregate(aggregation);
    const totalReviews = stats[0]?.totalReviews ?? 0;
    const averageRatingGiven =
      stats[0]?.averageRatingGiven != null
        ? Number(stats[0].averageRatingGiven.toFixed(1))
        : 0;

    return res.status(200).json({
      userName,
      ...(productId ? { productId } : {}),
      totalReviews,
      averageRatingGiven,
      reviews,
    });
  } catch (err) {
    console.error("❌ getReviewsByUserName error:", err?.message, err?.stack);
    return res.status(500).json({ message: "Internal server error" });
  }
};


