const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Shelf = sequelize.define("Shelf", {
    status: {
        type: DataTypes.ENUM(
            "want-to-read",
            "reading",
            "finished"
        ),
        defaultValue: "want-to-read"
    },

    progress: {
        type: DataTypes.INTEGER,
        defaultValue: 0 // Percentage: 0 to 100%
    },

    currentPage: {
        type: DataTypes.INTEGER,
        defaultValue: 0 // e.g., Page 142
    },

    totalPages: {
        type: DataTypes.INTEGER,
        defaultValue: 320 // Default book length; editable by user
    },

    pagesPerDay: {
        type: DataTypes.INTEGER,
        defaultValue: 25 // Reading velocity pace
    },

    // 1. Reading Notes & Memorable Quotes Log
    notes: {
        type: DataTypes.JSON,
        defaultValue: [] // Array of { id, type: 'note'|'quote'|'insight', content, page, createdAt }
    },

    // 2. Daily Goal & Streak Tracking
    dailyGoal: {
        type: DataTypes.INTEGER,
        defaultValue: 25 // Pages target per day
    },

    todayPages: {
        type: DataTypes.INTEGER,
        defaultValue: 0 // Number of pages read today
    },

    lastReadDate: {
        type: DataTypes.DATEONLY,
        allowNull: true // e.g. "2026-10-26"
    }
});

module.exports = Shelf;
