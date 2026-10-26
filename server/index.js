const express = require("express");   // importing express packages
const cors = require("cors");
const sequelize = require("./db");
const { Op } = require("sequelize")
const axios = require("axios");
const bcrypt = require("bcryptjs");


const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_dev";


const Book = require("./models/Book"); // importing Book model
const Review = require("./models/Review"); // importing Review model
const Shelf = require("./models/Shelf")
const User = require("./models/User"); // <-- Import User model

Book.hasMany(Review, {
    foreignKey: "bookId"
});

Review.belongsTo(Book, {
    foreignKey: "bookId"
});

Book.hasMany(Shelf);
Shelf.belongsTo(Book);

// Link User to Shelf
User.hasMany(Shelf, { foreignKey: "userId", onDelete: "CASCADE" });
Shelf.belongsTo(User, { foreignKey: "userId" });


const app = express();
app.use(cors());
app.use(express.json());

// Auth Middleware — Protects routes requiring user authentication
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Check if the request includes a "Bearer <token>" header
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.split(" ")[1];

    try {
        // Verify token authenticity and expiration
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attaches { id, email, name } to the request object!
        next(); // Proceed to the actual route handler
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired session" });
    }
};


const PORT = 3000; // port on which our server will listen


app.get("/api/books", async (req, res) => {  //  GET request to fetch books

    try {
        const { genre, page = 1, limit = 20 } = req.query;

        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);

        const offset = (pageNumber - 1) * limitNumber;

        const where = genre ? { genre: { [Op.iLike]: `%${genre}%` } } : {};

        const { count, rows } = await Book.findAndCountAll({
            where,
            limit: limitNumber,
            offset: offset,
            // Prioritize books with real covers first, then order by id
            order: [
                [sequelize.literal('"coverImageUrl" IS NOT NULL'), 'DESC'],
                ['id', 'ASC']
            ]
        });

        res.json({
            total: count,
            page: pageNumber,
            limit: limitNumber,
            books: rows
        });


    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch books"
        });
    }
});

app.get("/api/books/:id", async (req, res) => {

    try {
        const book = await Book.findByPk(req.params.id);

        if (!book) {
            return res.status(404).json({
                message: "Book not found"
            })
        }

        res.json(book);

    } catch (error) {

        res.status(500).json({
            message: "Failed to fetch the book"
        });

    }

});

// In-memory cache for author biographies (prevents repeated Wikipedia calls)
const authorCache = new Map();

// GET /api/authors/:name — Fetch Author Biography, Portrait & Their Catalog Books
app.get("/api/authors/:name", async (req, res) => {
    try {
        const rawName = req.params.name;
        // Clean author name (handles multiple authors like "Harper Lee, Sally Smith" -> takes primary author)
        const cleanName = rawName.split(",")[0].replace(/\(.*?\)/g, "").trim();

        if (!cleanName) {
            return res.status(400).json({ message: "Author name is required" });
        }

        // 1. Fetch all books by this author from our PostgreSQL database
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

        // 2. Check if we already have this author's Wikipedia bio in memory cache
        if (authorCache.has(cleanName.toLowerCase())) {
            const cachedBio = authorCache.get(cleanName.toLowerCase());
            return res.json({
                ...cachedBio,
                books: authorBooks
            });
        }

        // 3. Fetch Author Biography & Portrait from Wikipedia REST API
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
            // If Wikipedia doesn't have an exact page match, we gracefully fall back
            console.log(`Wikipedia bio not found for "${cleanName}", proceeding with catalog entries.`);
        }

        // Cache the author biography for instant subsequent queries
        authorCache.set(cleanName.toLowerCase(), authorBio);

        // Return combined author profile + catalog books
        res.json({
            ...authorBio,
            totalBooksInCatalog: authorBooks.length,
            books: authorBooks
        });

    } catch (error) {
        console.error("Failed to fetch author details:", error);
        res.status(500).json({ message: "Failed to fetch author details" });
    }
});


// Add requireAuth as the 2nd argument
app.post("/api/shelf", requireAuth, async (req, res) => {
    try {
        const { bookId, status } = req.body;

        // Associate the new shelf entry with the logged-in user's ID!
        const entry = await Shelf.create({
            BookId: bookId,
            userId: req.user.id, // <-- Isolated to this specific user
            status: status
        });

        res.status(201).json(entry);
    } catch (error) {
        res.status(500).json({ message: "Failed to add book to shelf" });
    }
});


// Add requireAuth as the 2nd argument
app.get("/api/shelf", requireAuth, async (req, res) => {
    try {
        // Only return shelf entries belonging to the logged-in user!
        const shelf = await Shelf.findAll({
            where: { userId: req.user.id }, // <-- User isolation filter!
            include: Book
        });

        res.json(shelf);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch shelf" });
    }
});

// PUT /api/shelf/:id — Update Reading Progress & Status
app.put("/api/shelf/:id", requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, currentPage, totalPages, pagesPerDay, dailyGoal, notes } = req.body;
        const entry = await Shelf.findOne({
            where: { id, userId: req.user.id },
            include: Book
        });
        if (!entry) {
            return res.status(404).json({ message: "Shelf entry not found" });
        }
        let updatedStatus = status || entry.status;
        let newCurrent = currentPage !== undefined ? parseInt(currentPage) : entry.currentPage;
        let newTotal = totalPages !== undefined ? parseInt(totalPages) : entry.totalPages;
        let newPace = pagesPerDay !== undefined ? parseInt(pagesPerDay) : entry.pagesPerDay;
        let newGoal = dailyGoal !== undefined ? parseInt(dailyGoal) : (entry.dailyGoal || 25);
        // Daily Streak Calculation:
        const todayStr = new Date().toISOString().split("T")[0];
        let todayPages = entry.todayPages || 0;
        let lastReadDate = entry.lastReadDate;
        if (currentPage !== undefined && newCurrent > entry.currentPage) {
            const pagesDelta = newCurrent - entry.currentPage;
            if (lastReadDate === todayStr) {
                todayPages += pagesDelta;
            } else {
                todayPages = pagesDelta; // Reset for new day
                lastReadDate = todayStr;
            }
        }
        if (newCurrent >= newTotal && newTotal > 0) {
            updatedStatus = "finished";
            newCurrent = newTotal;
        }
        if (status === "finished") {
            newCurrent = newTotal;
        }
        const progress = newTotal > 0 ? Math.min(100, Math.round((newCurrent / newTotal) * 100)) : 0;
        await entry.update({
            status: updatedStatus,
            currentPage: newCurrent,
            totalPages: newTotal,
            pagesPerDay: newPace,
            dailyGoal: newGoal,
            todayPages,
            lastReadDate,
            notes: notes !== undefined ? notes : entry.notes,
            progress
        });
        res.json(entry);
    } catch (error) {
        console.error("Failed to update shelf entry:", error);
        res.status(500).json({ message: "Failed to update shelf entry" });
    }
});
// POST /api/shelf/:id/notes — Add a Reflection or Memorable Quote
app.post("/api/shelf/:id/notes", requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { type = "note", content, page } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ message: "Content is required" });
        }
        const entry = await Shelf.findOne({
            where: { id, userId: req.user.id }
        });
        if (!entry) {
            return res.status(404).json({ message: "Shelf entry not found" });
        }
        const currentNotes = Array.isArray(entry.notes) ? entry.notes : [];
        const newNote = {
            id: Date.now().toString(),
            type, // "note" | "quote" | "insight"
            content: content.trim(),
            page: page ? parseInt(page) : null,
            createdAt: new Date().toISOString()
        };
        const updatedNotes = [newNote, ...currentNotes];
        await entry.update({ notes: updatedNotes });
        res.status(201).json(updatedNotes);
    } catch (error) {
        console.error("Failed to add note:", error);
        res.status(500).json({ message: "Failed to add note" });
    }
});
// DELETE /api/shelf/:id/notes/:noteId — Remove a Note
app.delete("/api/shelf/:id/notes/:noteId", requireAuth, async (req, res) => {
    try {
        const { id, noteId } = req.params;
        const entry = await Shelf.findOne({
            where: { id, userId: req.user.id }
        });
        if (!entry) {
            return res.status(404).json({ message: "Shelf entry not found" });
        }
        const currentNotes = Array.isArray(entry.notes) ? entry.notes : [];
        const updatedNotes = currentNotes.filter(n => n.id !== noteId);
        await entry.update({ notes: updatedNotes });
        res.json(updatedNotes);
    } catch (error) {
        console.error("Failed to remove note:", error);
        res.status(500).json({ message: "Failed to remove note" });
    }
});


// DELETE /api/shelf/:id — Remove Book from Shelf
app.delete("/api/shelf/:id", requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const deletedCount = await Shelf.destroy({
            where: { id, userId: req.user.id }
        });
        if (deletedCount === 0) {
            return res.status(404).json({ message: "Shelf entry not found" });
        }
        res.json({ message: "Book removed from shelf successfully", id: parseInt(id) });
    } catch (error) {
        console.error("Failed to remove book from shelf:", error);
        res.status(500).json({ message: "Failed to remove book from shelf" });
    }
});



app.get("/api/books/:id/recommendations", async (req, res) => {
    try {
        const { id } = req.params;
        const { mode = "discover", topN = 5 } = req.query;
        // Call the Python FastAPI ML microservice on port 8000
        const mlResponse = await axios.get("http://127.0.0.1:8000/recommend", {
            params: {
                book_id: id,
                mode: mode,
                top_n: topN
            },
            timeout: 3000 // 3-second circuit-breaker timeout
        });

        // Hydrate recommendations with real coverImageUrl from PostgreSQL database!
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
        // Graceful degradation: if ML service is down, don't crash the client
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
});


// POST /api/auth/google — Verify Google ID Token & Issue App Session JWT
app.post("/api/auth/google", async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ message: "Google credential token is required" });
        }

        // 1. Cryptographically verify the token with Google
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        // 2. Extract verified user profile from Google's payload
        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture: avatarUrl } = payload;

        // 3. Find or Create the user in Neon PostgreSQL
        const [user, created] = await User.findOrCreate({
            where: { googleId },
            defaults: {
                email,
                name,
                avatarUrl
            }
        });

        // If the user already existed, keep their latest name and avatar synced
        if (!created) {
            await user.update({ name, avatarUrl });
        }

        // 4. Mint our own PageValence Session Token (valid for 7 days)
        const appToken = jwt.sign(
            { id: user.id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        // 5. Send token and user profile to React client
        res.json({
            token: appToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Google Auth Verification Error:", error.message);
        res.status(401).json({ message: "Google authentication failed" });
    }
});

// POST /api/auth/register — Email & Password Signup
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // 1. Validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        // 2. Check if email already registered
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: "An account with this email already exists" });
        }

        // 3. Salt and Hash the password with bcrypt
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 4. Create the new user in PostgreSQL
        const user = await User.create({
            name,
            email,
            passwordHash
        });

        // 5. Issue PageValence App JWT (7-day validity)
        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Registration failed on server" });
    }
});


// POST /api/auth/login — Email & Password Sign In
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // 1. Look up user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // 2. If user registered via Google only, they don't have a password
        if (!user.passwordHash) {
            return res.status(400).json({
                message: "This account was created with Google. Please use Google Sign In."
            });
        }

        // 3. Compare supplied password against hashed password in database
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // 4. Issue App JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Login failed on server" });
    }
});






//if theres no book with a certain id you put find returns undefined
// listen() start listening for incoming HTTP requests on this port.

sequelize.sync({ alter: true })
    .then(() => {
        console.log("Database synced successfully!");
    })
    .catch((error) => {
        console.error("Database sync failed:", error);
    });


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});