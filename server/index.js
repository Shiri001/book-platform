const express = require("express");

const app = express();

const PORT = 3000;

const books = require('./books.json')

app.get("/api/books", (req, res) => {
    const { genre } = req.query;

    if (genre) {
        const filteredBooks = books.filter(
            b => b.genre.trim().toLowerCase() === genre.trim().toLowerCase()
        );

        return res.json(filteredBooks);
    }

    res.json(books);
});

app.get("/api/books/:id", (req, res) => {
    const book = books.find(b => b.id === parseInt(req.params.id));

    if(!book){
        return res.status(404).json({error: "Book not found"});
    }

    res.json(book);
});

//if theres no book with a certain id you put find returns undefined

app.listen(PORT, () => console.log(`Server running on ${PORT}`))