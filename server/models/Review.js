const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Review = sequelize.define("Review", {
    text: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 5 }
    },
    sentiment: {
        type: DataTypes.STRING, // "POSITIVE", "NEUTRAL", "NEGATIVE"
        allowNull: true
    },
    sentimentScore: {
        type: DataTypes.FLOAT, // -1.000 to +1.000
        allowNull: true
    },
    dissonanceDetected: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    dissonanceReason: {
        type: DataTypes.STRING,
        allowNull: true
    },
    bookId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

module.exports = Review;
