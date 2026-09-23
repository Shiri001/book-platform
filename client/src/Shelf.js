import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function Shelf() {
    const [shelf, setShelf] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("http://localhost:3000/api/shelf")
            .then(res => res.json())
            .then(data => {
                setShelf(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to load shelf:", err);
                setLoading(false);
            });
    }, [])

    if (loading) {
        return <p>Loading shelf...</p>
    }

    if (shelf.length === 0) {
        return <p>Your shelf is empty. Start by adding books!</p>
    }

    return (
        <div>
            <h1>My Shelf</h1>
            <ul>
                {shelf.map(entry => (
                    <li key={entry.id}>
                        {entry.Book ? (
                            <Link to={`/books/${entry.Book.id}`}>
                                {entry.Book.title}
                            </Link>
                        ) : (
                            <span>Unknown Book</span>
                        )}
                        {" - "}
                        <span>{entry.status}</span>
                    </li>
                ))}
            </ul>
        </div>
    )

}

export default Shelf;