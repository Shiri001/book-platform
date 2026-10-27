const { Op } = require("sequelize");
const axios = require("axios");
const sequelize = require("../db");
const { Book } = require("../models");

// GET /api/books — Search, Filter & Sort Catalog
const getBooks = async (req, res) => {
    try {
        const { genre, search, author, sortBy = "featured", page = 1, limit = 18 } = req.query;
        const pageNumber = parseInt(page) || 1;
        const limitNumber = parseInt(limit) || 18;
        const offset = (pageNumber - 1) * limitNumber;

        const whereConditions = [];

        // 1. Genre filter
        if (genre && genre !== "All") {
            whereConditions.push({ genre: { [Op.iLike]: `%${genre}%` } });
        }

        // 2. Specific Author filter
        if (author && author.trim()) {
            whereConditions.push({ author: { [Op.iLike]: `%${author.trim()}%` } });
        }

        // 3. Search query (matches title, author, or description)
        if (search && search.trim()) {
            const q = search.trim();
            whereConditions.push({
                [Op.or]: [
                    { title: { [Op.iLike]: `%${q}%` } },
                    { author: { [Op.iLike]: `%${q}%` } },
                    { description: { [Op.iLike]: `%${q}%` } }
                ]
            });
        }

        const where = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};

        // 4. Sort ordering
        let order;
        if (sortBy === "rating") {
            order = [
                ['averageRating', 'DESC NULLS LAST'],
                [sequelize.literal('"coverImageUrl" IS NOT NULL'), 'DESC']
            ];
        } else if (sortBy === "title") {
            order = [
                ['title', 'ASC']
            ];
        } else {
            // Default "featured": books with real covers first, highest rated, then by id
            order = [
                [sequelize.literal('"coverImageUrl" IS NOT NULL'), 'DESC'],
                ['averageRating', 'DESC NULLS LAST'],
                ['id', 'ASC']
            ];
        }

        const { count, rows } = await Book.findAndCountAll({
            where,
            limit: limitNumber,
            offset: offset,
            order
        });

        res.json({
            total: count,
            page: pageNumber,
            limit: limitNumber,
            books: rows
        });
    } catch (error) {
        console.error("Failed to fetch books:", error);
        res.status(500).json({ message: "Failed to fetch books" });
    }
};

// GET /api/books/:id
const getBookById = async (req, res) => {
    try {
        const book = await Book.findByPk(req.params.id);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }
        res.json(book);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch the book" });
    }
};

// GET /api/books/:id/recommendations
const getRecommendations = async (req, res) => {
    try {
        const { id } = req.params;
        const { mode = "discover", topN = 5 } = req.query;

        const mlResponse = await axios.get("http://127.0.0.1:8000/recommend", {
            params: { book_id: id, mode, top_n: topN },
            timeout: 3000
        });

        const recs = mlResponse.data.recommendations || [];
        const bookIds = recs.map(r => r.bookId);

        const dbBooks = await Book.findAll({
            where: { id: bookIds },
            attributes: ["id", "coverImageUrl"]
        });
        const coverMap = new Map(dbBooks.map(b => [b.id, b.coverImageUrl]));

        const enrichedRecs = recs.map(r => ({
            ...r,
            coverImageUrl: coverMap.get(r.bookId) || null
        }));

        res.json({
            ...mlResponse.data,
            recommendations: enrichedRecs
        });
    } catch (error) {
        console.error("ML Recommender Gateway Error:", error.message);
        if (error.code === "ECONNREFUSED") {
            return res.status(503).json({
                message: "Recommendation engine is temporarily offline",
                recommendations: []
            });
        }
        res.status(error.response?.status || 500).json({
            message: error.response?.data?.detail || "Failed to fetch recommendations",
            recommendations: []
        });
    }
};

module.exports = {
    getBooks,
    getBookById,
    getRecommendations
};
