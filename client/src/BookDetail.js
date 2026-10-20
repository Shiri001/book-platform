import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";

function BookDetail() {
    const { id } = useParams();
    const [book, setBook] = useState(null);
    const [added, setAdded] = useState(false);

    // ML Recommendation States
    const [recommendations, setRecommendations] = useState([]);
    const [recMode, setRecMode] = useState("discover"); // "discover" | "more_like_this"
    const [loadingRecs, setLoadingRecs] = useState(false);

    // 1. Fetch Book Details from PostgreSQL
    useEffect(() => {
        setBook(null);
        setAdded(false);

        fetch(`http://localhost:3000/api/books/${id}`)
            .then(res => {
                if (!res.ok) throw new Error("Not Found");
                return res.json();
            })
            .then(data => setBook(data))
            .catch(() => setBook("not-found"));
    }, [id]);

    // 2. Fetch ML Recommendations through Express Gateway
    useEffect(() => {
        setLoadingRecs(true);
        fetch(`http://localhost:3000/api/books/${id}/recommendations?mode=${recMode}&topN=5`)
            .then(res => res.json())
            .then(data => {
                setRecommendations(data.recommendations || []);
                setLoadingRecs(false);
            })
            .catch(err => {
                console.error("Failed to load recommendations:", err);
                setRecommendations([]);
                setLoadingRecs(false);
            });
    }, [id, recMode]);

    function addToShelf(bookId, status) {
        fetch("http://localhost:3000/api/shelf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookId, status })
        })
            .then(res => res.json())
            .then(() => setAdded(true))
            .catch(error => console.error("Error adding to shelf:", error));
    }

    if (book === "not-found") return <p>❌ Book Not Found</p>;
    if (!book) return <p>⏳ Loading Book Details...</p>;

    return (
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
            <Link to="/" style={{ textDecoration: "none", color: "#0066cc" }}>← Back to Catalog</Link>

            {/* Main Book Header */}
            <div style={{ display: "flex", gap: "24px", marginTop: "16px", marginBottom: "32px" }}>
                {book.coverImageUrl ? (
                    <img src={book.coverImageUrl} alt={book.title} style={{ width: "160px", height: "240px", objectFit: "cover", borderRadius: "6px" }} />
                ) : (
                    <div style={{ width: "160px", height: "240px", background: "linear-gradient(135deg, #1e293b, #334155)", color: "white", padding: "16px", borderRadius: "6px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "14px", fontWeight: "bold" }}>{book.title}</span>
                        <span style={{ fontSize: "12px", opacity: 0.8 }}>{book.author}</span>
                    </div>
                )}

                <div style={{ flex: 1 }}>
                    <h1 style={{ margin: "0 0 8px 0" }}>{book.title}</h1>
                    <p style={{ margin: "4px 0", fontSize: "16px", color: "#555" }}>By <strong>{book.author}</strong></p>
                    <p style={{ margin: "4px 0", fontSize: "14px", color: "#777" }}>Genres: {book.genre || "Fiction"}</p>
                    <p style={{ margin: "4px 0", fontSize: "14px" }}>⭐ Rating: {book.averageRating ? book.averageRating.toFixed(2) : "N/A"}</p>

                    <button
                        onClick={() => addToShelf(book.id, "want-to-read")}
                        disabled={added}
                        style={{
                            marginTop: "12px",
                            padding: "8px 16px",
                            background: added ? "#10b981" : "#2563eb",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: added ? "default" : "pointer"
                        }}
                    >
                        {added ? "✓ Added to Shelf" : "Add to Shelf"}
                    </button>
                </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: "40px" }}>
                <h3>Description</h3>
                <p style={{ lineHeight: "1.6", color: "#333" }}>{book.description}</p>
            </div>

            <hr style={{ border: "0", borderTop: "1px solid #e2e8f0", margin: "32px 0" }} />

            {/* Recommendations Section */}
            <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h2 style={{ margin: 0 }}>Recommended for You</h2>

                    {/* Mode Toggle Tabs */}
                    <div style={{ display: "flex", gap: "8px" }}>
                        <button
                            onClick={() => setRecMode("discover")}
                            style={{
                                padding: "6px 12px",
                                borderRadius: "20px",
                                border: "1px solid #2563eb",
                                background: recMode === "discover" ? "#2563eb" : "transparent",
                                color: recMode === "discover" ? "white" : "#2563eb",
                                cursor: "pointer",
                                fontSize: "13px"
                            }}
                        >
                            ✨ Discover Something New
                        </button>
                        <button
                            onClick={() => setRecMode("more_like_this")}
                            style={{
                                padding: "6px 12px",
                                borderRadius: "20px",
                                border: "1px solid #2563eb",
                                background: recMode === "more_like_this" ? "#2563eb" : "transparent",
                                color: recMode === "more_like_this" ? "white" : "#2563eb",
                                cursor: "pointer",
                                fontSize: "13px"
                            }}
                        >
                            📚 More Like This
                        </button>
                    </div>
                </div>

                {loadingRecs ? (
                    <p style={{ color: "#666" }}>🧠 Vector Recommender computing similarities...</p>
                ) : recommendations.length === 0 ? (
                    <p style={{ color: "#888" }}>No recommendations found.</p>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
                        {recommendations.map(rec => (
                            <div
                                key={rec.bookId}
                                style={{
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "8px",
                                    padding: "16px",
                                    background: "#f8fafc",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between"
                                }}
                            >
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                                        <span style={{ fontSize: "12px", fontWeight: "bold", color: "#16a34a", background: "#dcfce7", padding: "2px 6px", borderRadius: "4px" }}>
                                            {Math.round(rec.similarityScore * 100)}% Match
                                        </span>
                                    </div>
                                    <Link
                                        to={`/books/${rec.bookId}`}
                                        style={{ textDecoration: "none", color: "#1e293b", fontWeight: "bold", fontSize: "15px", display: "block", marginBottom: "4px" }}
                                    >
                                        {rec.title}
                                    </Link>
                                    <p style={{ margin: "2px 0", fontSize: "13px", color: "#64748b" }}>by {rec.author}</p>
                                    <p style={{ margin: "6px 0 0 0", fontSize: "11px", color: "#94a3b8" }}>{rec.genre}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default BookDetail;
