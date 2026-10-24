const express = require("express");   // importing express packages
const cors = require("cors");
const sequelize = require("./db");
const { Op } = require("sequelize")
const axios = require("axios");

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