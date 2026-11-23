require("dotenv").config();

const { Sequelize } = require("sequelize");

const isProduction = process.env.NODE_ENV === "production" || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("neon.tech"));

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    logging: process.env.NODE_ENV === "production" ? false : false,
    dialectOptions: isProduction ? {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    } : {}
});

module.exports = sequelize;