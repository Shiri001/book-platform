const { DataTypes } = require("sequelize");
const sequelize = require("../db")
// sequelize gives us several things, and we're importing DataTypes.
// DataTypes tells Sequelize what type each database column should have.


const Book = sequelize.define("Book", {
    googleBooksId: {
        type: DataTypes.STRING,
        unique: true
    },
    title: DataTypes.TEXT,
    author: DataTypes.TEXT,
    genre: DataTypes.TEXT,
    description: DataTypes.TEXT,
    coverImageUrl: DataTypes.TEXT,
    averageRating: DataTypes.FLOAT
});

module.exports = Book;