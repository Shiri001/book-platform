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

app.get("/api/books", (req, res) => {  //  GET request to fetch books
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

// listen() start listening for incoming HTTP requests on this port.

sequelize.sync({ force: true }).then(async () => {
    console.log("Database tables synced successfully!");

    const fakeBooks = [
        {
            title: "The Great Gatsby",
            author: "F. Scott Fitzgerald",
            genre: "Classic",
            description: "A story of wealth, love, and the American Dream in 1920s New York.",
            rating: 4.2
        },
        {
            title: "To Kill a Mockingbird",
            author: "Harper Lee",
            genre: "Classic",
            description: "A powerful story about justice, racism, and morality in the American South.",
            rating: 4.5
        },
        {
            title: "1984",
            author: "George Orwell",
            genre: "Dystopian",
            description: "A chilling vision of a totalitarian society where surveillance and propaganda control everyday life.",
            rating: 4.7
        },
        {
            title: "The Alchemist",
            author: "Paulo Coelho",
            genre: "Fiction",
            description: "A young shepherd embarks on a journey to discover his personal legend and fulfill his dreams.",
            rating: 4.3
        },
        {
            title: "Harry Potter and the Sorcerer's Stone",
            author: "J.K. Rowling",
            genre: "Fantasy",
            description: "A young boy discovers he is a wizard and begins his magical journey at Hogwarts School of Witchcraft and Wizardry.",
            rating: 4.8
        },
        {
            title: "The Hobbit",
            author: "J.R.R. Tolkien",
            genre: "Fantasy",
            description: "Bilbo Baggins leaves his quiet life behind and joins a dangerous adventure to reclaim a lost kingdom.",
            rating: 4.6
        }
    ];

    const createdBooks = await Book.bulkCreate(fakeBooks);

        await Review.create({
        text: "A beautifully written classic.",
        rating: 5,
        sentiment: "positive",
        bookId: createdBooks[0].id
    });

    await Review.create({
        text: "The story was interesting and memorable.",
        rating: 4,
        sentiment: "positive",
        bookId: createdBooks[0].id
    });

    await Review.create({
        text: "The pacing felt slow at times.",
        rating: 3,
        sentiment: "negative",
        bookId: createdBooks[1].id
    });

    console.log("Books created:", createdBooks.length);

    const booksWithReviews = await Book.findAll({
        include: Review
    })

    console.log(
        JSON.stringify(booksWithReviews.map(book => book.toJSON()),
            null,
            2
        )
    );

}).catch((error) => {
    console.error("Database operation failed:", error);
})

app.listen(PORT, ()=> {
    console.log(`Server running on ${PORT}`)
})