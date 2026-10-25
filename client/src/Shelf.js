import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";

function Shelf() {
    const [shelf, setShelf] = useState([]);
    const [loading, setLoading] = useState(true);
    const { isAuthenticated, token, openAuthModal } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }

        fetch("http://localhost:3000/api/shelf", {
            headers: {
                "Authorization": `Bearer ${token}` // Fetch only this user's books!
            }
        })
            .then(res => res.json())
            .then(data => {
                setShelf(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to load shelf:", err);
                setLoading(false);
            });
    }, [isAuthenticated, token]);

    if (!isAuthenticated) {
        return (
            <div style={{ maxWidth: "600px", margin: "80px auto", textAlign: "center", padding: "40px 20px" }}>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "28px", color: "var(--text-primary)", marginBottom: "12px" }}>
                    Your Reading Shelf Awaits
                </h2>
                <p style={{ color: "var(--text-secondary)", marginBottom: "24px", lineHeight: 1.6 }}>
                    Sign in to track what you've read, save volumes for later, and build your personal reading history.
                </p>
                <button
                    onClick={() => openAuthModal("signin")}
                    style={{
                        padding: "12px 28px",
                        background: "var(--text-primary)",
                        color: "var(--bg-primary)",
                        border: "none",
                        borderRadius: "30px",
                        fontWeight: 600,
                        cursor: "pointer"
                    }}
                >
                    Sign In to View Shelf →
                </button>
            </div>
        );
    }

    if (loading) {
        return <div style={{ textAlign: "center", padding: "80px 0", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>Loading your personal shelf...</div>;
    }

    if (shelf.length === 0) {
        return (
            <div style={{ maxWidth: "600px", margin: "80px auto", textAlign: "center", padding: "40px 20px" }}>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "28px", color: "var(--text-primary)", marginBottom: "12px" }}>
                    Your Shelf is Empty
                </h2>
                <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
                    Explore the catalog and click "+ Add to Shelf" to start curating your library.
                </p>
                <Link to="/" style={{ color: "var(--accent-cyan)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                    ← Explore 9,800+ Catalog Volumes
                </Link>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 24px" }}>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "36px", color: "var(--text-primary)", marginBottom: "32px" }}>
                My Reading Shelf ({shelf.length})
            </h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "24px" }}>
                {shelf.map(entry => (
                    <div key={entry.id} style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-hairline)",
                        borderRadius: "12px",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px"
                    }}>
                        {entry.Book ? (
                            <Link to={`/books/${entry.Book.id}`} style={{ fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}>
                                {entry.Book.title}
                            </Link>
                        ) : (
                            <span style={{ color: "var(--text-muted)" }}>Unknown Book</span>
                        )}
                        <span style={{
                            display: "inline-block",
                            alignSelf: "flex-start",
                            fontSize: "11px",
                            fontFamily: "var(--font-mono)",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            background: "rgba(74, 222, 128, 0.1)",
                            color: "var(--accent-green)",
                            textTransform: "uppercase"
                        }}>
                            {entry.status}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Shelf;
