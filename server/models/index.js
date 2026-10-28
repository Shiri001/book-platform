const Book = require("./Book");
const Review = require("./Review");
const Shelf = require("./Shelf");
const User = require("./User");

// 1. Book <-> Review Associations
Book.hasMany(Review, { foreignKey: "bookId", onDelete: "CASCADE" });
Review.belongsTo(Book, { foreignKey: "bookId" });

// 2. User <-> Review Associations
User.hasMany(Review, { foreignKey: "userId", onDelete: "CASCADE" });
Review.belongsTo(User, { foreignKey: "userId" });

// 3. Book <-> Shelf Associations
Book.hasMany(Shelf, { foreignKey: "bookId", onDelete: "CASCADE" });
Shelf.belongsTo(Book, { foreignKey: "bookId" });

// 4. User <-> Shelf Associations
User.hasMany(Shelf, { foreignKey: "userId", onDelete: "CASCADE" });
Shelf.belongsTo(User, { foreignKey: "userId" });

module.exports = {
    Book,
    Review,
    Shelf,
    User
};
