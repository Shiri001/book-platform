const Book = require("./Book");
const Review = require("./Review");
const Shelf = require("./Shelf");
const User = require("./User");

// 1. Book <-> Review Associations
Book.hasMany(Review, { foreignKey: "bookId" });
Review.belongsTo(Book, { foreignKey: "bookId" });

// 2. Book <-> Shelf Associations
Book.hasMany(Shelf);
Shelf.belongsTo(Book);

// 3. User <-> Shelf Associations
User.hasMany(Shelf, { foreignKey: "userId", onDelete: "CASCADE" });
Shelf.belongsTo(User, { foreignKey: "userId" });

module.exports = {
    Book,
    Review,
    Shelf,
    User
};
