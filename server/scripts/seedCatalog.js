require("dotenv").config();

const axios = require("axios");
const Book = require("../models/Book");

const genres = [
    "science fiction",
    "cyberpunk",
    "dystopian",
    "fantasy",
    "epic fantasy",
    "mystery",
    "psychological thriller",
    "true crime",
    "romance",
    "historical fiction",
    "classic literature",
    "horror",
    "gothic",
    "biography",
    "philosophy",
    "psychology",
    "self help",
    "popular science",
    "artificial intelligence",
    "economics",
    "poetry",
    "graphic novels",
    "adventure",
    "young adult",
    "contemporary fiction"
];

const authors = [
    // Fantasy & Sci-Fi
    "J.K. Rowling", "J.R.R. Tolkien", "George R.R. Martin", "Brandon Sanderson", "Neil Gaiman",
    "Isaac Asimov", "Arthur C. Clarke", "Philip K. Dick", "Frank Herbert", "Terry Pratchett",
    "Ursula K. Le Guin", "William Gibson",
    // Thriller, Mystery & Horror
    "Stephen King", "Agatha Christie", "Dan Brown", "Gillian Flynn", "Arthur Conan Doyle",
    "Dean Koontz", "James Patterson", "John Grisham",
    // Classics & Literary
    "Jane Austen", "Charles Dickens", "Leo Tolstoy", "Fyodor Dostoevsky", "George Orwell",
    "F. Scott Fitzgerald", "Ernest Hemingway", "Franz Kafka", "Oscar Wilde", "Mark Twain",
    // Contemporary & Bestsellers
    "John Green", "Suzanne Collins", "Rick Riordan", "Haruki Murakami", "Kazuo Ishiguro",
    "Khaled Hosseini", "Yuval Noah Harari", "Malcolm Gladwell", "Carl Sagan", "James Clear"
];



console.log(genres);

async function fetchBooksByGenre(genre, startIndex = 0, retries = 2) {
    try {
        const response = await axios.get(
            "https://www.googleapis.com/books/v1/volumes",
            {
                params: {
                    q: genre,
                    startIndex: startIndex,
                    maxResults: 40,
                    key: process.env.GOOGLE_BOOKS_API_KEY
                },
                timeout: 10000 // 10 second timeout
            }
        );
        return response.data.items || [];
    } catch (err) {
        if (retries > 0) {
            console.warn(`[WARN] Google API blip for ${genre} (page ${startIndex}). Retrying in 1.5s...`);
            await new Promise(r => setTimeout(r, 1500));
            return fetchBooksByGenre(genre, startIndex, retries - 1);
        }
        console.error(`[ERROR] Skipped batch for ${genre} at ${startIndex}:`, err.message);
        return []; // Return empty array so the script keeps going!
    }
}

async function fetchBooksByAuthor(author, startIndex = 0, retries = 2) {
    try {
        const response = await axios.get(
            "https://www.googleapis.com/books/v1/volumes",
            {
                params: {
                    q: `inauthor:"${author}"`,
                    startIndex: startIndex,
                    maxResults: 40,
                    key: process.env.GOOGLE_BOOKS_API_KEY
                },
                timeout: 10000
            }
        );
        return response.data.items || [];
    } catch (err) {
        if (retries > 0) {
            console.warn(`[WARN] Retry for author: ${author}`);
            await new Promise(r => setTimeout(r, 1500));
            return fetchBooksByAuthor(author, startIndex, retries - 1);
        }
        return [];
    }
}


function normalizeBook(item, genre) {
    const info = item.volumeInfo;

    const thumbnail = info.imageLinks ? info.imageLinks.thumbnail : null;
    const secureCover = thumbnail ? thumbnail.replace("http://", "https://") : null;

    const genreSet = new Set([genre]);
    if (info.categories && Array.isArray(info.categories)) {
        info.categories.forEach(cat => {
            cat.split("/").forEach(sub => {
                const clean = sub.trim().toLowerCase();
                if (clean) genreSet.add(clean);
            });
        });
    }

    return {
        googleBooksId: item.id,
        title: info.title,
        author: info.authors ? info.authors.join(", ") : "Unknown",
        genre: Array.from(genreSet).join(", "), // e.g. "cyberpunk, fiction, science fiction"
        description: info.description || "",
        coverImageUrl: secureCover,
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

    if (process.argv.includes("--fresh")) {
        console.log("🧹 Clearing old shelves and books for fresh multi-genre seed...");
        const Shelf = require("../models/Shelf");
        await Shelf.destroy({ where: {} });
        await Book.destroy({ where: {} });
        console.log("✅ Database cleared! Starting fresh seed...");
    }

    for (const genre of genres) {
        console.log(`Fetching books for: ${genre}`);

        let allBooks = [];

        for (let startIndex = 0; startIndex < 160; startIndex += 40) {
            const books = await fetchBooksByGenre(genre, startIndex);

            allBooks = allBooks.concat(books);

            await new Promise(resolve => setTimeout(resolve, 150));
        }

        const normalizedBooks = allBooks
            .map(book => normalizeBook(book, genre))
            .filter(book => book.title && book.description);

        const uniqueBooks = removeDuplicates(normalizedBooks);

        try {
            await Book.bulkCreate(uniqueBooks, {
                ignoreDuplicates: true
            });
            console.log(`Added ${uniqueBooks.length} books for ${genre}`);
        } catch (dbErr) {
            console.warn(`[WARN] Batch issue for ${genre}:`, dbErr.message);
        }

        console.log(`Added ${uniqueBooks.length} books for ${genre}`);
    }

    console.log("\n📚 Now seeding Iconic Authors...");

    for (const author of authors) {
        console.log(`Fetching books for author: ${author}`);

        let allBooks = [];
        // Fetch 2 pages (up to 80 books per author)
        for (let startIndex = 0; startIndex < 80; startIndex += 40) {
            const books = await fetchBooksByAuthor(author, startIndex);
            allBooks = allBooks.concat(books);
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        const normalizedBooks = allBooks
            .map(book => normalizeBook(book, "Fiction"))
            .filter(book => book.title && book.description);

        const uniqueBooks = removeDuplicates(normalizedBooks);

        try {
            await Book.bulkCreate(uniqueBooks, {
                ignoreDuplicates: true
            });
            console.log(`Added ${uniqueBooks.length} books for ${author}`);
        } catch (dbErr) {
            console.warn(`[WARN] Issue for author ${author}:`, dbErr.message);
        }
    }

    const count = await Book.count();

    console.log("Catalog seeding complete!");
    console.log("Total books in database:", count);
}
seedCatalog();
