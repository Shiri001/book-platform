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
        defaultValue: 0
    }
});

module.exports = Shelf;