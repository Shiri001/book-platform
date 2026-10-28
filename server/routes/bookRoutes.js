const express = require("express");
const router = express.Router();
const { getBooks, getBookById, getRecommendations } = require("../controllers/bookController");
const { getBookReviews, getBookSentimentSummary, createReview } = require("../controllers/reviewController");
const { requireAuth } = require("../middlewares/authMiddleware");

// Catalog & Recommendations
router.get("/", getBooks);
router.get("/:id", getBookById);
router.get("/:id/recommendations", getRecommendations);

// Sentiment Analysis & Community Review Intelligence
router.get("/:id/reviews", getBookReviews);
router.get("/:id/sentiment-summary", getBookSentimentSummary);
router.post("/:id/reviews", requireAuth, createReview);

module.exports = router;
