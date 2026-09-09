const { DataTypes } = require("sequelize");
const sequelize = require("../db")
// sequelize gives us several things, and we're importing DataTypes.
// DataTypes tells Sequelize what type each database column should have.


const Book = sequelize.define("Book", {
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },

    author: {
        type: DataTypes.STRING,
        allowNull: false
    },

    genre: {
        type: DataTypes.STRING,
    },
    
    description: {
        type: DataTypes.TEXT
    },

    rating: {
        type: DataTypes.FLOAT
    }

})

module.exports = Book;