const express = require("express");
const cors = require("cors");
const sequelize = require("./db");

// 1. Initialize Database Models & Associations
require("./models");

// 2. Import Modular Routers
const authRoutes = require("./routes/authRoutes");
const bookRoutes = require("./routes/bookRoutes");
const authorRoutes = require("./routes/authorRoutes");
const shelfRoutes = require("./routes/shelfRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// 3. Global Middlewares
app.use(cors());
app.use(express.json());

// 4. Mount Route Modules
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/authors", authorRoutes);
app.use("/api/shelf", shelfRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.json({ status: "online", timestamp: new Date().toISOString() });
});

// 5. Sync Database & Launch Server
sequelize.sync({ alter: true })
    .then(() => {
        console.log("Database synced successfully!");
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Database sync failed:", error);
    });

module.exports = app;
