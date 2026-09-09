const { DataTypes } = require("sequelize");
const sequelize = require("../db")

const Review = sequelize.define("Review", {

    text: {
        type: DataTypes.TEXT,
        allowNull: false
    },

    rating: {
        type: DataTypes.INTEGER,
    },

    sentiment: {
        type: DataTypes.STRING,
    },

    bookId: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

module.exports = Review;
