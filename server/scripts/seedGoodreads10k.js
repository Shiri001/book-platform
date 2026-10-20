const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const sequelize = require("../db");
const Book = require("../models/Book");
const Shelf = require("../models/Shelf");
const Review = require("../models/Review");

// Helper: Cleans Python stringified list: "['Classics', 'Fiction']" -> "Classics, Fiction"
function parseGenres(raw) {
    if (!raw) return "Fiction";
    try {
        const cleaned = raw
            .replace(/^\[/, "")
            .replace(/\]$/, "")
            .split(",")
            .map(g => g.trim().replace(/^['"]|['"]$/g, ""))
            .filter(Boolean);
        return cleaned.length > 0 ? cleaned.join(", ") : "Fiction";
    } catch {
        return "Fiction";
    }
}

async function seedGoodreads10k() {
    const isFresh = process.argv.includes("--fresh");
    const csvPath = path.join(__dirname, "../../ml/goodreads_10k.csv");

    if (!fs.existsSync(csvPath)) {
        console.error(`❌ CSV not found at: ${csvPath}`);
        process.exit(1);
    }

    try {
        console.log("Connecting to Neon PostgreSQL...");
        await sequelize.authenticate();
        console.log(" Connected to Database.");

        if (isFresh) {
            console.log("\n⚠️  --fresh flag detected. Resetting catalog tables...");
            // Delete dependent records first to maintain referential integrity
            await Shelf.destroy({ where: {} });
            await Review.destroy({ where: {} });
            await Book.destroy({ where: {}, truncate: false });
            console.log(" Old books, shelves, and reviews cleared.");
        }

        console.log(`\n Streaming and parsing books from ${path.basename(csvPath)}...`);
        const startTime = Date.now();

        const seenKeys = new Set();
        let batch = [];
        let totalProcessed = 0;
        let totalInserted = 0;
        let skippedEmptyDesc = 0;
        let skippedDuplicates = 0;

        const BATCH_SIZE = 1000;

        const stream = fs.createReadStream(csvPath).pipe(csv());

        for await (const row of stream) {
            totalProcessed++;

            const title = row.Book ? row.Book.trim() : null;
            const author = row.Author ? row.Author.trim() : "Unknown";
            const description = row.Description ? row.Description.trim() : "";
            const rawGenres = row.Genres;
            const avgRating = parseFloat(row.Avg_Rating) || 0.0;
            const indexKey = row[""] || totalProcessed;

            // 1. Skip if missing critical info
            if (!title) continue;
            if (!description || description.length < 15) {
                skippedEmptyDesc++;
                continue;
            }

            // 2. Deduplicate identical title + author
            const dedupKey = `${title}::${author}`.toLowerCase();
            if (seenKeys.has(dedupKey)) {
                skippedDuplicates++;
                continue;
            }
            seenKeys.add(dedupKey);

            // 3. Format row for Book model
            batch.push({
                googleBooksId: `gr-${indexKey}`,
                title: title,
                author: author,
                genre: parseGenres(rawGenres),
                description: description,
                coverImageUrl: null, // UI will render dynamic CSS spine covers
                averageRating: avgRating
            });

            // 4. Flush batch to DB when batch size reached
            if (batch.length >= BATCH_SIZE) {
                await Book.bulkCreate(batch, { ignoreDuplicates: true });
                totalInserted += batch.length;
                process.stdout.write(` Ingested ${totalInserted} books...\r`);
                batch = [];
            }
        }

        // Flush remaining records
        if (batch.length > 0) {
            await Book.bulkCreate(batch, { ignoreDuplicates: true });
            totalInserted += batch.length;
        }

        const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log("\n==========================================");
        console.log(" CATALOG SEEDING COMPLETE");
        console.log("==========================================");
        console.log(` Rows scanned:        ${totalProcessed}`);
        console.log(` Books inserted:      ${totalInserted}`);
        console.log(` Skipped (no desc):   ${skippedEmptyDesc}`);
        console.log(` Skipped (duplicate): ${skippedDuplicates}`);
        console.log(` Time taken:          ${durationSeconds}s`);
        console.log("==========================================\n");

    } catch (error) {
        console.error("❌ Seeding failed:", error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

seedGoodreads10k();
