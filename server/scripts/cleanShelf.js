require("dotenv").config();
const sequelize = require("../db");
const Shelf = require("../models/Shelf");

async function clearShelf() {
    try {
        await sequelize.authenticate();
        console.log("Connected to PostgreSQL...");

        // Truncate empties all records in the Shelves table
        await Shelf.destroy({ where: {}, truncate: true, restartIdentity: true });

        console.log("Entire shelf cleared successfully!");
    } catch (error) {
        console.error("Error clearing shelf:", error);
    } finally {
        await sequelize.close();
    }
}

clearShelf();
