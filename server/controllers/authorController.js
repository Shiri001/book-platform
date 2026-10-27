const { Op } = require("sequelize");
const axios = require("axios");
const sequelize = require("../db");
const { Book } = require("../models");

// In-memory cache for author biographies (prevents repeated Wikipedia calls)
const authorCache = new Map();

// GET /api/authors/:name
const getAuthorDetails = async (req, res) => {
    try {
        const rawName = req.params.name;
        const cleanName = rawName.split(",")[0].replace(/\(.*?\)/g, "").trim();

        if (!cleanName) {
            return res.status(400).json({ message: "Author name is required" });
        }

        // 1. Fetch books by this author from PostgreSQL
        const authorBooks = await Book.findAll({
            where: {
                author: { [Op.iLike]: `%${cleanName}%` }
            },
            order: [
                [sequelize.literal('"coverImageUrl" IS NOT NULL'), 'DESC'],
                ['averageRating', 'DESC']
            ],
            limit: 20
        });

        // 2. Check in-memory cache
        if (authorCache.has(cleanName.toLowerCase())) {
            const cachedBio = authorCache.get(cleanName.toLowerCase());
            return res.json({
                ...cachedBio,
                books: authorBooks
            });
        }

        // 3. Fetch Wikipedia biography
        let authorBio = {
            name: cleanName,
            tagline: "Author",
            biography: "No biographical summary available for this author in public records yet.",
            photo: null,
            wikipediaUrl: null
        };

        try {
            const wikiFormatted = cleanName.replace(/\s+/g, "_");
            const wikiRes = await axios.get(
                `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiFormatted)}`,
                {
                    headers: { "User-Agent": "PageValence/1.0 (contact@pagevalence.dev)" },
                    timeout: 4000
                }
            );

            if (wikiRes.data && wikiRes.data.extract) {
                authorBio = {
                    name: wikiRes.data.title || cleanName,
                    tagline: wikiRes.data.description || "Author",
                    biography: wikiRes.data.extract,
                    photo: wikiRes.data.thumbnail?.source || null,
                    wikipediaUrl: wikiRes.data.content_urls?.desktop?.page || null
                };
            }
        } catch (wikiErr) {
            console.log(`Wikipedia bio not found for "${cleanName}", proceeding with catalog entries.`);
        }

        authorCache.set(cleanName.toLowerCase(), authorBio);

        res.json({
            ...authorBio,
            totalBooksInCatalog: authorBooks.length,
            books: authorBooks
        });
    } catch (error) {
        console.error("Failed to fetch author details:", error);
        res.status(500).json({ message: "Failed to fetch author details" });
    }
};

module.exports = {
    getAuthorDetails
};
