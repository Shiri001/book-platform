require("dotenv").config();

const axios = require("axios");
const Book = require("../models/Book");

const genres = [
    "science fiction",
    "fantasy",
    "mystery",
    "romance",
    "thriller",
    "biography",
    "self help",
    "history",
    "horror",
    "classic literature"
];

console.log(genres);

async function fetchBooksByGenre(genre, startIndex = 0){
    const response = await axios.get(
        "https://www.googleapis.com/books/v1/volumes",
        {
            params: {
                q: `subject:${genre}`,
                startIndex: startIndex,
                maxResults: 40,
                key: process.env.GOOGLE_BOOKS_API_KEY
            }
        }
    )

    return response.data.items || []
}

function normalizeBook(item, genre) {
    const info = item.volumeInfo;

    return {
        googleBooksId: item.id,
        title: info.title,
        author: info.authors ? info.authors.join(", ") : "Unknown",
        genre: genre,
        description: info.description || "",
        coverImageUrl: info.imageLinks
            ? info.imageLinks.thumbnail
            : null,
        averageRating: info.averageRating || null
    };
}

function removeDuplicates(books) {
    const seen = new Set();

    return books.filter(book => {
        if (seen.has(book.googleBooksId)) {
            return false;
        }

        seen.add(book.googleBooksId);
        return true;
    });
}

async function seedCatalog() {
    for (const genre of genres) {
        console.log(`Fetching books for: ${genre}`);

        let allBooks = [];

        for (let startIndex = 0; startIndex < 120; startIndex += 40) {
            const books = await fetchBooksByGenre(genre, startIndex);

            allBooks = allBooks.concat(books);
        }

        const normalizedBooks = allBooks
            .map(book => normalizeBook(book, genre))
            .filter(book => book.title && book.description);

        const uniqueBooks = removeDuplicates(normalizedBooks);

        await Book.bulkCreate(uniqueBooks, {
            ignoreDuplicates: true
        });

        console.log(`Added ${uniqueBooks.length} books for ${genre}`);
    }

    const count = await Book.count();

    console.log("Catalog seeding complete!");
    console.log("Total books in database:", count);
}
seedCatalog();
