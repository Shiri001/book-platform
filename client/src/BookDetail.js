import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";

function BookDetail() {
    const { id } = useParams();
    const [book, setBook] = useState(null);
    const [added, setAdded] = useState(false);

    useEffect(() => {
        fetch(`http://localhost:3000/api/books/${id}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error("Not Found")
                }
                return res.json();
            })
            .then(data => setBook(data))
            .catch(() => setBook("not-found"));
    }, [id])

    function addToShelf(bookId, status) {

        console.log("Button clcikd:", bookId, status);

        fetch("http://localhost:3000/api/shelf", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                bookId: bookId,
                status: status
            })
        })
            .then(res => {
                console.log("Response status:", res.status);
                return res.json();
            })
            .then(data => {
                console.log("Added:", data);
                setAdded(true);
            })
            .catch(error => {
                console.error("Error:", error);
            })

    }

    if (book === "not-found") {
        return <p>Book Not Found</p>
    }

    if (!book) {
        return <p>Loading....</p>
    }
    return (
        <div>
            <h1>{book.title}</h1>
            {book.coverImageUrl && (
                <img
                    src={book.coverImageUrl}
                    alt={book.title}
                    width="200"
                />
            )}
            <p>By {book.author}</p>
            <p>Rating: {book.averageRating || "Not available"}</p>
            <p>{book.description}</p>

            <button onClick={() => addToShelf(book.id, "want-to-read")} disabled={added}>
                {added ? "Added to shelf" : "Add to Shelf"}
            </button>
        </div>
    )
}



export default BookDetail;
