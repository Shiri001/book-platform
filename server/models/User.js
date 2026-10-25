const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const User = sequelize.define("User", {
    googleId: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true // 1. Now OPTIONAL (null for users who register with email/password)
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    passwordHash: {
        type: DataTypes.STRING,
        allowNull: true // 2. NEW: Stores bcrypt hashed password (null for Google OAuth users)
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    avatarUrl: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    role: {
        type: DataTypes.ENUM("user", "admin"),
        defaultValue: "user"
    }
});

module.exports = User;
