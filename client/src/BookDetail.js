import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from './AuthContext';
import BookCover from "./BookCover";
import AuthorModal from "./AuthorModal";


function BookDetail() {
    const { id } = useParams();
    const [book, setBook] = useState(null);
    const [added, setAdded] = useState(false);
    const { isAuthenticated, token, openAuthModal } = useAuth();
    const [spotlightAuthor, setSpotlightAuthor] = useState(null);


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
        if (!isAuthenticated) {
            openAuthModal("signin");
            return;
        }
        fetch("http://localhost:3000/api/shelf", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` // Passes the user's session token!
            },
            body: JSON.stringify({ bookId, status })
        })
            .then(res => res.json())
            .then(() => setAdded(true))
            .catch(error => console.error("Error adding to shelf:", error));
    }

    if (book === "not-found") return (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            <p>❌ Volume Not Found in Archive</p>
            <Link to="/" style={{ color: "var(--accent-cyan)", marginTop: "12px", display: "inline-block" }}>← Return to Catalog</Link>
        </div>
    );

    if (!book) return (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            ⏳ Hydrating Volume Metadata...
        </div>
    );

    return (
        <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 24px" }}>
            <Link to="/" style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                color: "var(--text-muted)",
                letterSpacing: "1px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "32px",
                transition: "color 0.2s"
            }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
            >
                ← RETURN TO CATALOG
            </Link>

            {/* Main Book Hero Stage */}
            <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "40px",
                background: "var(--bg-card)",
                border: "1px solid var(--border-hairline)",
                borderRadius: "16px",
                padding: "36px",
                marginBottom: "48px"
            }}>
                {/* Physical Book Cover */}
                <div style={{ width: "220px", flexShrink: 0 }}>
                    <BookCover
                        title={book.title}
                        author={book.author}
                        genre={book.genre}
                        coverImageUrl={book.coverImageUrl}
                        height="330px"
                    />
                </div>

                {/* Book Metadata & Reading Actions */}
                <div style={{ flex: 1, minWidth: "280px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                        <p style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "11px",
                            letterSpacing: "2px",
                            color: "var(--accent-cyan)",
                            textTransform: "uppercase",
                            marginBottom: "8px"
                        }}>
                            {book.genre ? book.genre.split(',')[0].trim() : "Fiction"}
                        </p>

                        <h1 style={{
                            fontFamily: "var(--font-serif)",
                            fontSize: "clamp(26px, 3.5vw, 38px)",
                            fontWeight: 600,
                            lineHeight: 1.2,
                            color: "var(--text-primary)",
                            marginBottom: "12px"
                        }}>
                            {book.title}
                        </h1>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "16px", color: "var(--text-secondary)" }}>
                                by <strong style={{ color: "var(--text-primary)" }}>{book.author}</strong>
                            </span>
                            <button
                                onClick={() => setSpotlightAuthor(book.author)}
                                style={{
                                    background: "rgba(56, 189, 248, 0.08)",
                                    border: "1px solid rgba(56, 189, 248, 0.25)",
                                    color: "var(--accent-cyan)",
                                    fontSize: "11px",
                                    fontFamily: "var(--font-mono)",
                                    padding: "4px 12px",
                                    borderRadius: "14px",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    transition: "all 0.2s"
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = "rgba(56, 189, 248, 0.16)";
                                    e.currentTarget.style.borderColor = "var(--accent-cyan)";
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = "rgba(56, 189, 248, 0.08)";
                                    e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.25)";
                                }}
                            >
                                👤 Author Bio & Works ↗
                            </button>
                        </div>



                        <div style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            background: "rgba(229, 192, 123, 0.1)",
                            border: "1px solid rgba(229, 192, 123, 0.25)",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontFamily: "var(--font-mono)",
                            fontSize: "12px",
                            color: "var(--accent-gold)",
                            marginBottom: "24px"
                        }}>
                            ★ {book.averageRating ? book.averageRating.toFixed(2) : "N/A"} GOODREADS SCORE
                        </div>

                        {/* Description */}
                        <div>
                            <h3 style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "11px",
                                letterSpacing: "1.5px",
                                textTransform: "uppercase",
                                color: "var(--text-muted)",
                                marginBottom: "8px"
                            }}>
                                Synopsis
                            </h3>
                            <p style={{ lineHeight: "1.7", color: "var(--text-secondary)", fontSize: "15px" }}>
                                {book.description}
                            </p>
                        </div>
                    </div>

                    {/* Shelf Button */}
                    <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid var(--border-hairline)" }}>
                        <button
                            onClick={() => addToShelf(book.id, "want-to-read")}
                            disabled={added}
                            style={{
                                padding: "10px 24px",
                                background: added ? "rgba(74, 222, 128, 0.15)" : "var(--text-primary)",
                                color: added ? "var(--accent-green)" : "var(--bg-primary)",
                                border: added ? "1px solid var(--accent-green)" : "none",
                                borderRadius: "8px",
                                fontFamily: "var(--font-sans)",
                                fontWeight: 600,
                                fontSize: "14px",
                                cursor: added ? "default" : "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            {added ? "✓ Added to Personal Shelf" : "+ Add to Shelf"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Recommendations Section */}
            <div style={{ marginTop: "48px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
                    <div>
                        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "24px", color: "var(--text-primary)", margin: 0 }}>
                            Semantic Affinity Repertoire
                        </h2>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                            Nearest neighbors mapped via 384-dimensional dense vectors
                        </p>
                    </div>

                    {/* Mode Toggle Tabs */}
                    <div style={{
                        display: "flex",
                        gap: "6px",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-hairline)",
                        padding: "4px",
                        borderRadius: "24px"
                    }}>
                        <button
                            onClick={() => setRecMode("discover")}
                            style={{
                                padding: "6px 16px",
                                borderRadius: "20px",
                                border: "none",
                                background: recMode === "discover" ? "var(--text-primary)" : "transparent",
                                color: recMode === "discover" ? "var(--bg-primary)" : "var(--text-secondary)",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontFamily: "var(--font-sans)",
                                fontWeight: 500,
                                transition: "all 0.2s"
                            }}
                        >
                            ✨ Discover Something New
                        </button>
                        <button
                            onClick={() => setRecMode("more_like_this")}
                            style={{
                                padding: "6px 16px",
                                borderRadius: "20px",
                                border: "none",
                                background: recMode === "more_like_this" ? "var(--text-primary)" : "transparent",
                                color: recMode === "more_like_this" ? "var(--bg-primary)" : "var(--text-secondary)",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontFamily: "var(--font-sans)",
                                fontWeight: 500,
                                transition: "all 0.2s"
                            }}
                        >
                            📚 More Like This
                        </button>
                    </div>
                </div>

                {loadingRecs ? (
                    <div style={{ textAlign: "center", padding: "40px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: "13px" }}>
                        🧠 Vector Recommender evaluating dot-product affinities...
                    </div>
                ) : recommendations.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>No semantic neighbors discovered.</p>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "20px" }}>
                        {recommendations.map(rec => (
                            <Link
                                key={rec.bookId}
                                to={`/books/${rec.bookId}`}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    background: "var(--bg-card)",
                                    border: "1px solid var(--border-hairline)",
                                    borderRadius: "10px",
                                    overflow: "hidden",
                                    padding: "10px",
                                    transition: "transform 0.2s, border-color 0.2s"
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = "translateY(-4px)";
                                    e.currentTarget.style.borderColor = "var(--border-focus)";
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.borderColor = "var(--border-hairline)";
                                }}
                            >
                                <BookCover
                                    title={rec.title}
                                    author={rec.author}
                                    genre={rec.genre}
                                    coverImageUrl={rec.coverImageUrl}
                                    height="220px"
                                />

                                <div style={{ paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{
                                        fontFamily: "var(--font-mono)",
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        color: "var(--accent-green)",
                                        background: "rgba(74, 222, 128, 0.1)",
                                        border: "1px solid rgba(74, 222, 128, 0.2)",
                                        padding: "2px 6px",
                                        borderRadius: "4px"
                                    }}>
                                        {Math.round(rec.similarityScore * 100)}% Match
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
            <AuthorModal
                authorName={spotlightAuthor}
                onClose={() => setSpotlightAuthor(null)}
            />
        </div>
    );
}

export default BookDetail;
