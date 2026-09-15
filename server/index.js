const express = require("express");   // importing express packages
const cors = require("cors");
const sequelize = require("./db");

const Book = require("./models/Book"); // importing Book model
const Review = require("./models/Review"); // importing Review model
Book.hasMany(Review, {
    foreignKey: "bookId"
});

Review.belongsTo(Book, {
    foreignKey: "bookId"
});

const app = express();
app.use(cors());

const PORT = 3000; // port on which our server will listen

const books = require('./books.json')

app.get("/api/books", async (req, res) => {  //  GET request to fetch books
    
    try{
        const books = await Book.findAll();

        res.json(books);

    }  catch(error){
        res.status(500).json({
            message: "Failed to fetch books"
        });
    }
});

app.get("/api/books/:id", async (req, res) => {
    
    try{
        const book = await Book.findByPk(req.params.id);

        if(!book){
            return res.status(404).json({
                message: "Book not found"
            })
        }

        res.json(book);

    } catch(error){

        res.status(500).json({
            message: "Failed to fetch the book"
        });

    }

});

//if theres no book with a certain id you put find returns undefined
// listen() start listening for incoming HTTP requests on this port.

sequelize.sync()
    .then(() => {
        console.log("Database synced successfully!");
    })
    .catch((error) => {
        console.error("Database sync failed:", error);
    });

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});