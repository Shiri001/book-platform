const fs = require("fs");
const path = require("path");
const https = require("https");
const csv = require("csv-parser");
const axios = require("axios");
const sequelize = require("../db");
const Book = require("../models/Book");

// Normalize titles for fuzzy/case-insensitive matching
function normalizeTitle(str) {
    if (!str) return "";
    return str
        .replace(/\(.*?\)/g, "") // strip (The Hunger Games, #1)
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase()
        .trim();
}

// Download goodbooks-10k metadata CSV if not cached locally
async function getGoodbooksData() {
    const localCache = path.join(__dirname, "goodbooks_metadata.csv");
    if (fs.existsSync(localCache)) {
        console.log("⚡ Found cached goodbooks_metadata.csv");
        return localCache;
    }

    console.log("📥 Downloading goodbooks-10k metadata with image URLs (~2MB)...");
    const url = "https://raw.githubusercontent.com/zygmuntz/goodbooks-10k/master/books.csv";
    const response = await axios({
        url,
        method: "GET",
        responseType: "stream"
    });

    const writer = fs.createWriteStream(localCache);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on("finish", () => {
            console.log("✅ Download complete.");
            resolve(localCache);
        });
        writer.on("error", reject);
    });
}

// Extract Goodreads ID from local goodreads_10k.csv
function loadLocalIdMap() {
    const csvPath = path.join(__dirname, "../../ml/goodreads_10k.csv");
    if (!fs.existsSync(csvPath)) return new Map();

    const idMap = new Map(); // book title::author -> goodreads_id
    const stream = fs.createReadStream(csvPath).pipe(csv());

    return new Promise(resolve => {
        stream.on("data", row => {
            const title = row.Book ? row.Book.trim() : "";
            const author = row.Author ? row.Author.trim() : "";
            const url = row.URL || "";
            const match = url.match(/\/show\/(\d+)/);
            if (match && title) {
                const grId = parseInt(match[1]);
                idMap.set(`${normalizeTitle(title)}::${author.toLowerCase()}`, grId);
            }
        });
        stream.on("end", () => resolve(idMap));
    });
}

async function enrichCovers() {
    try {
        console.log("Connecting to Neon PostgreSQL...");
        await sequelize.authenticate();
        console.log(" Connected to Database.");

        // 1. Load goodbooks-10k image mapping
        const goodbooksPath = await getGoodbooksData();
        const localIdMap = await loadLocalIdMap();

        console.log("🔍 Parsing image URL mappings from Goodreads repository...");
        const idToImage = new Map();
        const titleToImage = new Map();
        const origTitleToImage = new Map();

        await new Promise((resolve, reject) => {
            fs.createReadStream(goodbooksPath)
                .pipe(csv())
                .on("data", row => {
                    const img = row.image_url;
                    if (img && !img.includes("nophoto")) {
                        if (row.goodreads_book_id) {
                            idToImage.set(parseInt(row.goodreads_book_id), img);
                        }
                        if (row.title) {
                            titleToImage.set(normalizeTitle(row.title), img);
                        }
                        if (row.original_title) {
                            origTitleToImage.set(normalizeTitle(row.original_title), img);
                        }
                    }
                })
                .on("end", resolve)
                .on("error", reject);
        });

        console.log(` Loaded ${idToImage.size} direct Goodreads CDN image URLs.`);

        // 2. Fetch all books from Neon PostgreSQL
        console.log("📥 Fetching books from PostgreSQL database...");
        const books = await Book.findAll({
            attributes: ["id", "title", "author", "coverImageUrl"],
            order: [["id", "ASC"]]
        });
        console.log(` Found ${books.length} books in database.`);

        let updatedFromGoodreads = 0;
        let updatedFromOpenLibrary = 0;
        let updates = [];

        // 3. Match against Goodreads CDN
        for (const book of books) {
            let matchedImg = null;

            // Strategy A: By exact Goodreads ID
            const lookupKey = `${normalizeTitle(book.title)}::${(book.author || "").toLowerCase()}`;
            const grId = localIdMap.get(lookupKey);
            if (grId && idToImage.has(grId)) {
                matchedImg = idToImage.get(grId);
            }

            // Strategy B: By normalized title
            if (!matchedImg) {
                const norm = normalizeTitle(book.title);
                matchedImg = titleToImage.get(norm) || origTitleToImage.get(norm);
            }

            if (matchedImg && matchedImg !== book.coverImageUrl) {
                updates.push({ id: book.id, coverImageUrl: matchedImg });
                updatedFromGoodreads++;
            }
        }

        console.log(`\n🎯 Matched ${updatedFromGoodreads} books with official Goodreads CDN covers.`);

        // 4. For the first 150 books on page 1-10 that still don't have images, query Open Library
        const booksNeedingCovers = books
            .filter(b => !updates.some(u => u.id === b.id) && !b.coverImageUrl)
            .slice(0, 100);

        if (booksNeedingCovers.length > 0) {
            console.log(`🌐 Querying Open Library Archive for ${booksNeedingCovers.length} top catalog books...`);
            for (let i = 0; i < booksNeedingCovers.length; i++) {
                const b = booksNeedingCovers[i];
                try {
                    const cleanTitle = b.title.replace(/\(.*?\)/g, "").trim();
                    const query = encodeURIComponent(`${cleanTitle} ${b.author}`);
                    const olRes = await axios.get(`https://openlibrary.org/search.json?q=${query}&limit=1`, {
                        headers: { "User-Agent": "PageValence/1.0" },
                        timeout: 4000
                    });

                    const doc = olRes.data.docs?.[0];
                    if (doc && doc.cover_i) {
                        const olUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
                        updates.push({ id: b.id, coverImageUrl: olUrl });
                        updatedFromOpenLibrary++;
                        process.stdout.write(` Open Library: Found cover for "${cleanTitle.slice(0, 25)}..."\n`);
                    }
                } catch {
                    // Skip gracefully on timeout
                }
            }
        }

        // 5. Bulk update in PostgreSQL
        console.log(`\n💾 Writing ${updates.length} image URLs to Neon PostgreSQL in batches...`);
        const BATCH_SIZE = 500;
        for (let i = 0; i < updates.length; i += BATCH_SIZE) {
            const chunk = updates.slice(i, i + BATCH_SIZE);
            
            // Generate clean batch UPDATE query
            const cases = chunk.map(u => `WHEN ${u.id} THEN '${u.coverImageUrl.replace(/'/g, "''")}'`).join(" ");
            const ids = chunk.map(u => u.id).join(",");
            const query = `UPDATE "Books" SET "coverImageUrl" = CASE "id" ${cases} END WHERE "id" IN (${ids});`;
            
            await sequelize.query(query);
            process.stdout.write(` Updated ${Math.min(i + BATCH_SIZE, updates.length)} of ${updates.length} books...\r`);
        }

        console.log("\n==========================================");
        console.log(" COVER ENRICHMENT COMPLETE");
        console.log("==========================================");
        console.log(` Total covers added:     ${updates.length}`);
        console.log(` From Goodreads CDN:     ${updatedFromGoodreads}`);
        console.log(` From Open Library:      ${updatedFromOpenLibrary}`);
        console.log("==========================================\n");

    } catch (error) {
        console.error("❌ Enrichment failed:", error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

enrichCovers();
