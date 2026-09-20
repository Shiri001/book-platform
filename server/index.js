const express = require("express");   // importing express packages
const cors = require("cors");
const sequelize = require("./db");
const { Op } = require("sequelize")

const Book = require("./models/Book"); // importing Book model
const Review = require("./models/Review"); // importing Review model
const Shelf = require("./models/Shelf")
Book.hasMany(Review, {
    foreignKey: "bookId"
});

Review.belongsTo(Book, {
    foreignKey: "bookId"
});

Book.hasMany(Shelf);
Shelf.belongsTo(Book);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000; // port on which our server will listen


app.get("/api/books", async (req, res) => {  //  GET request to fetch books
    
    try{
        const { genre, page = 1, limit = 20 } = req.query;

        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);

        const offset = (pageNumber - 1) * limitNumber;

        const where = genre ? { genre: { [Op.iLike]: genre } } : {};

        const { count, rows } = await Book.findAndCountAll({
            where,
            limit: limitNumber,
            offset: offset
        });

        res.json({
            total: count,
            page: pageNumber,
            limit: limitNumber,
            books: rows
        });


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

app.post("/api/shelf", async (req, res) => {
    try {
        const { bookId, status } = req.body;

        const entry = await Shelf.create({
            BookId: bookId,
            status: status
        });

        res.status(201).json(entry);

    } catch (error) {
        res.status(500).json({
            message: "Failed to add book to shelf"
        });
    }
})

app.get("/api/shelf", async (req, res) => {
    try {

        const shelf = await Shelf.findAll({
            include: Book
        });

        res.json(shelf);

    } catch (error) {

        res.status(500).json({
            message: "Failed to fetch shelf"
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