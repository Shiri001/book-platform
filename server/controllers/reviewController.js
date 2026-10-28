const axios = require("axios");
const { Review, Book, User } = require("../models");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

// POST /api/books/:id/reviews — Submit or Update a Review with Sentiment Analysis
const createReview = async (req, res) => {
    try {
        const bookId = parseInt(req.params.id);
        const userId = req.user?.id || req.userId; // From requireAuth middleware
        const { text, rating } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ message: "Review text cannot be empty." });
        }

        const ratingNum = parseInt(rating);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return res.status(400).json({ message: "Rating must be an integer between 1 and 5." });
        }

        const book = await Book.findByPk(bookId);
        if (!book) {
            return res.status(404).json({ message: "Book not found." });
        }

        // 1. Call FastAPI ML service for Sentiment & Dissonance analysis
        let sentimentData = {
            polarity: 0.0,
            label: "NEUTRAL",
            dissonance: false,
            dissonanceReason: null
        };

        try {
            const mlResponse = await axios.post(`${ML_SERVICE_URL}/sentiment/analyze`, {
                text: text.trim(),
                rating: ratingNum
            }, { timeout: 3000 });

            sentimentData = mlResponse.data;
        } catch (mlErr) {
            console.warn("⚠️ ML Sentiment service unavailable, falling back to neutral defaults:", mlErr.message);
        }

        // 2. Upsert Review (one review per user per book)
        let review = await Review.findOne({ where: { bookId, userId } });

        if (review) {
            review.text = text.trim();
            review.rating = ratingNum;
            review.sentiment = sentimentData.label;
            review.sentimentScore = sentimentData.polarity;
            review.dissonanceDetected = sentimentData.dissonance;
            review.dissonanceReason = sentimentData.dissonanceReason;
            await review.save();
        } else {
            review = await Review.create({
                bookId,
                userId,
                text: text.trim(),
                rating: ratingNum,
                sentiment: sentimentData.label,
                sentimentScore: sentimentData.polarity,
                dissonanceDetected: sentimentData.dissonance,
                dissonanceReason: sentimentData.dissonanceReason
            });
        }

        // 3. Recalculate and update the Book's average rating
        const allReviews = await Review.findAll({ where: { bookId }, attributes: ["rating"] });
        if (allReviews.length > 0) {
            const sum = allReviews.reduce((acc, r) => acc + r.rating, 0);
            const avg = (sum / allReviews.length).toFixed(2);
            await book.update({ averageRating: parseFloat(avg) });
        }

        // 4. Return enriched review with author details
        const enrichedReview = await Review.findByPk(review.id, {
            include: [{ model: User, attributes: ["id", "name", "avatarUrl"] }]
        });

        res.status(201).json({
            message: "Review submitted and analyzed successfully.",
            review: enrichedReview
        });
    } catch (error) {
        console.error("Failed to submit review:", error);
        res.status(500).json({ message: "Failed to process review." });
    }
};

// GET /api/books/:id/reviews — Fetch all reviews for a book
const getBookReviews = async (req, res) => {
    try {
        const bookId = parseInt(req.params.id);

        const reviews = await Review.findAll({
            where: { bookId },
            include: [{ model: User, attributes: ["id", "name", "avatarUrl"] }],
            order: [["createdAt", "DESC"]]
        });

        res.json({ count: reviews.length, reviews });
    } catch (error) {
        console.error("Failed to fetch reviews:", error);
        res.status(500).json({ message: "Failed to fetch reviews." });
    }
};

// GET /api/books/:id/sentiment-summary — Aggregated community emotional consensus
const getBookSentimentSummary = async (req, res) => {
    try {
        const bookId = parseInt(req.params.id);
        const reviews = await Review.findAll({ where: { bookId } });

        if (reviews.length === 0) {
            return res.json({
                hasReviews: false,
                totalReviews: 0,
                positivePercent: 0,
                neutralPercent: 0,
                negativePercent: 0,
                averagePolarity: 0.0,
                dissonanceCount: 0,
                verdict: "No community reviews logged yet."
            });
        }

        let positiveCount = 0;
        let neutralCount = 0;
        let negativeCount = 0;
        let dissonanceCount = 0;
        let totalPolarity = 0;

        reviews.forEach(r => {
            const p = r.sentimentScore !== null ? r.sentimentScore : 0;
            totalPolarity += p;

            if (r.sentiment === "POSITIVE" || p >= 0.05) {
                positiveCount++;
            } else if (r.sentiment === "NEGATIVE" || p <= -0.05) {
                negativeCount++;
            } else {
                neutralCount++;
            }

            if (r.dissonanceDetected) {
                dissonanceCount++;
            }
        });

        const total = reviews.length;
        const posPct = Math.round((positiveCount / total) * 100);
        const neuPct = Math.round((neutralCount / total) * 100);
        const negPct = Math.round((negativeCount / total) * 100);
        const avgPolarity = Number((totalPolarity / total).toFixed(3));

        // Generate literary consensus verdict
        let verdict = "Varied community sentiment";
        if (posPct >= 75) {
            verdict = "Overwhelmingly Captivating & Acclaimed";
        } else if (posPct >= 50) {
            verdict = "Largely Positive & Moving";
        } else if (negPct >= 50) {
            verdict = "Critical & Divisive Reception";
        } else if (neuPct >= 40) {
            verdict = "Thought-Provoking & Reflective";
        }

        res.json({
            hasReviews: true,
            totalReviews: total,
            positivePercent: posPct,
            neutralPercent: neuPct,
            negativePercent: negPct,
            averagePolarity: avgPolarity,
            dissonanceCount,
            verdict
        });
    } catch (error) {
        console.error("Failed to compute sentiment summary:", error);
        res.status(500).json({ message: "Failed to generate sentiment summary." });
    }
};

module.exports = {
    createReview,
    getBookReviews,
    getBookSentimentSummary
};
