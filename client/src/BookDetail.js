import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from './AuthContext';
import BookCover from "./BookCover";
import AuthorModal from "./AuthorModal";

function BookDetail() {
    const { id } = useParams();
    const [book, setBook] = useState(null);
    const [added, setAdded] = useState(false);
    const { isAuthenticated, token, openAuthModal, user } = useAuth();
    const [spotlightAuthor, setSpotlightAuthor] = useState(null);

    // ML Recommendation States
    const [recommendations, setRecommendations] = useState([]);
    const [recMode, setRecMode] = useState("discover"); // "discover" | "more_like_this"
    const [loadingRecs, setLoadingRecs] = useState(false);

    // Sentiment & Review States
    const [reviews, setReviews] = useState([]);
    const [sentimentSummary, setSentimentSummary] = useState(null);
    const [reviewText, setReviewText] = useState("");
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewMessage, setReviewMessage] = useState(null);

    // 1. Fetch Book Details from PostgreSQL
    useEffect(() => {
        setBook(null);
        setAdded(false);
        setReviewMessage(null);

        fetch(`http://localhost:3000/api/books/${id}`)
            .then(res => {
                if (!res.ok) throw new Error("Not Found");
                return res.json();
            })
            .then(data => setBook(data))
            .catch(() => setBook("not-found"));
    }, [id]);

    // 2. Fetch Reviews & Sentiment Summary
    const loadReviewsAndSentiment = useCallback(() => {
        fetch(`http://localhost:3000/api/books/${id}/reviews`)
            .then(res => res.json())
            .then(data => {
                const list = data.reviews || [];
                setReviews(list);
                // Pre-fill user review if already submitted
                const existing = list.find(r => r.userId === user?.id);
                if (existing) {
                    setReviewText(existing.text);
                    setRating(existing.rating);
                }
            })
            .catch(err => console.error("Failed to load reviews:", err));

        fetch(`http://localhost:3000/api/books/${id}/sentiment-summary`)
            .then(res => res.json())
            .then(data => setSentimentSummary(data))
            .catch(err => console.error("Failed to load sentiment summary:", err));
    }, [id, user]);

    useEffect(() => {
        loadReviewsAndSentiment();
    }, [loadReviewsAndSentiment]);


    // 3. Fetch ML Recommendations through Express Gateway
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
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ bookId, status })
        })
            .then(res => res.json())
            .then(() => setAdded(true))
            .catch(error => console.error("Error adding to shelf:", error));
    }

    // Submit Review with NLP Sentiment Analysis
    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!isAuthenticated) {
            openAuthModal("signin");
            return;
        }

        if (!reviewText.trim()) return;

        setSubmittingReview(true);
        setReviewMessage(null);

        try {
            const res = await fetch(`http://localhost:3000/api/books/${id}/reviews`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ text: reviewText, rating })
            });

            const data = await res.json();
            setSubmittingReview(false);

            if (res.ok) {
                const s = data.review?.sentiment;
                const p = data.review?.sentimentScore;
                setReviewMessage({
                    type: "success",
                    text: `Reflection recorded! NLP classified this tone as ${s} (${p >= 0 ? "+" : ""}${p}).`
                });
                loadReviewsAndSentiment();
                // Refresh book average rating
                fetch(`http://localhost:3000/api/books/${id}`)
                    .then(r => r.json())
                    .then(b => setBook(b))
                    .catch(() => { });
            } else {
                setReviewMessage({ type: "error", text: data.message || "Failed to submit review." });
            }
        } catch (err) {
            console.error("Review submission error:", err);
            setSubmittingReview(false);
            setReviewMessage({ type: "error", text: "Connection error. Please try again." });
        }
    };

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
                textDecoration: "none",
                transition: "color 0.2s"
            }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
            >
                ← RETURN TO CATALOG
            </Link>

            {/* 1. Main Book Hero Stage */}
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
                            ★ {book.averageRating ? Number(book.averageRating).toFixed(2) : "N/A"} COMMUNITY SCORE
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

            {/* 2. Literary Reception & Sentiment Pulse Section */}
            <section style={{
                background: "linear-gradient(180deg, rgba(20, 20, 26, 0.7) 0%, rgba(12, 12, 16, 0.9) 100%)",
                border: "1px solid var(--border-hairline)",
                borderRadius: "16px",
                padding: "32px",
                marginBottom: "48px",
                backdropFilter: "blur(12px)"
            }}>
                <div style={{ marginBottom: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                        <div>
                            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "24px", color: "var(--text-primary)", margin: 0 }}>
                                Literary Reception & Sentiment Pulse
                            </h2>
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                                Natural language sentiment analysis evaluated across reader reflections
                            </p>
                        </div>

                        {sentimentSummary?.hasReviews && (
                            <span style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "11px",
                                padding: "4px 10px",
                                borderRadius: "20px",
                                background: "rgba(56, 189, 248, 0.1)",
                                border: "1px solid rgba(56, 189, 248, 0.25)",
                                color: "var(--accent-cyan)"
                            }}>
                                Consensus: {sentimentSummary.verdict}
                            </span>
                        )}
                    </div>

                    {/* Emotional Pulse Bar */}
                    {sentimentSummary?.hasReviews ? (
                        <div style={{ marginTop: "20px", background: "rgba(0, 0, 0, 0.4)", padding: "18px 20px", borderRadius: "12px", border: "1px solid var(--border-hairline)" }}>
                            {/* The Tripartite Progress Bar */}
                            <div style={{
                                width: "100%",
                                height: "12px",
                                borderRadius: "6px",
                                display: "flex",
                                overflow: "hidden",
                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                marginBottom: "12px"
                            }}>
                                <div style={{
                                    width: `${sentimentSummary.positivePercent}%`,
                                    backgroundColor: "var(--accent-green)",
                                    transition: "width 0.4s ease"
                                }} title={`Positive: ${sentimentSummary.positivePercent}%`} />
                                <div style={{
                                    width: `${sentimentSummary.neutralPercent}%`,
                                    backgroundColor: "#94a3b8",
                                    transition: "width 0.4s ease"
                                }} title={`Neutral: ${sentimentSummary.neutralPercent}%`} />
                                <div style={{
                                    width: `${sentimentSummary.negativePercent}%`,
                                    backgroundColor: "#f87171",
                                    transition: "width 0.4s ease"
                                }} title={`Critical: ${sentimentSummary.negativePercent}%`} />
                            </div>

                            {/* Legend & Stats */}
                            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
                                <div style={{ display: "flex", gap: "16px" }}>
                                    <span style={{ color: "var(--accent-green)" }}>
                                        ● {sentimentSummary.positivePercent}% Positive
                                    </span>
                                    <span style={{ color: "#94a3b8" }}>
                                        ● {sentimentSummary.neutralPercent}% Neutral
                                    </span>
                                    <span style={{ color: "#f87171" }}>
                                        ● {sentimentSummary.negativePercent}% Critical
                                    </span>
                                </div>
                                <div style={{ color: "var(--text-muted)" }}>
                                    Polarity: <strong style={{ color: "var(--text-primary)" }}>{sentimentSummary.averagePolarity >= 0 ? "+" : ""}{sentimentSummary.averagePolarity}</strong> ({sentimentSummary.totalReviews} reviews)
                                </div>
                            </div>

                            {/* Dissonance Alert Callout if any */}
                            {sentimentSummary.dissonanceCount > 0 && (
                                <div style={{
                                    marginTop: "12px",
                                    paddingTop: "10px",
                                    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                                    fontSize: "11px",
                                    fontFamily: "var(--font-mono)",
                                    color: "var(--accent-gold)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px"
                                }}>
                                    ⚡ <strong>{sentimentSummary.dissonanceCount} review(s)</strong> exhibit Rating-Sentiment Dissonance (star rating diverges from written emotional tone).
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{
                            marginTop: "16px",
                            padding: "16px",
                            borderRadius: "10px",
                            background: "rgba(255, 255, 255, 0.02)",
                            border: "1px dashed var(--border-hairline)",
                            fontSize: "13px",
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-mono)"
                        }}>
                            No community reviews recorded yet. Write the first reflection below to seed this volume's sentiment pulse!
                        </div>
                    )}
                </div>

                {/* 3. Review Composer */}
                <div style={{
                    background: "rgba(5, 5, 8, 0.5)",
                    border: "1px solid var(--border-hairline)",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "32px"
                }}>
                    <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "17px", color: "var(--text-primary)", marginBottom: "14px" }}>
                        {isAuthenticated ? "Leave Your Literary Reflection" : "Sign In to Record Your Review"}
                    </h3>

                    {isAuthenticated ? (
                        <form onSubmit={handleSubmitReview}>
                            {/* Star Rating Picker */}
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                                    Rating:
                                </span>
                                <div style={{ display: "flex", gap: "4px" }}>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            type="button"
                                            key={star}
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                fontSize: "22px",
                                                color: (hoverRating || rating) >= star ? "var(--accent-gold)" : "rgba(255, 255, 255, 0.15)",
                                                cursor: "pointer",
                                                padding: "0 2px",
                                                transition: "transform 0.1s"
                                            }}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--accent-gold)" }}>
                                    {rating} / 5 Stars
                                </span>
                            </div>

                            {/* Text Area */}
                            <textarea
                                value={reviewText}
                                onChange={e => setReviewText(e.target.value)}
                                rows={3}
                                placeholder="Share your thoughts on the prose, character arcs, pacing, or thematic depth..."
                                style={{
                                    width: "100%",
                                    background: "rgba(255, 255, 255, 0.03)",
                                    border: "1px solid var(--border-hairline)",
                                    borderRadius: "8px",
                                    color: "var(--text-primary)",
                                    fontSize: "14px",
                                    fontFamily: "var(--font-sans)",
                                    padding: "12px",
                                    outline: "none",
                                    resize: "vertical",
                                    marginBottom: "12px",
                                    boxSizing: "border-box"
                                }}
                            />

                            {/* Feedback message */}
                            {reviewMessage && (
                                <div style={{
                                    marginBottom: "12px",
                                    padding: "8px 12px",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontFamily: "var(--font-mono)",
                                    background: reviewMessage.type === "success" ? "rgba(74, 222, 128, 0.1)" : "rgba(248, 113, 113, 0.1)",
                                    border: `1px solid ${reviewMessage.type === "success" ? "rgba(74, 222, 128, 0.3)" : "rgba(248, 113, 113, 0.3)"}`,
                                    color: reviewMessage.type === "success" ? "var(--accent-green)" : "#f87171"
                                }}>
                                    {reviewMessage.text}
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={submittingReview || !reviewText.trim()}
                                style={{
                                    padding: "8px 20px",
                                    background: "var(--text-primary)",
                                    color: "var(--bg-primary)",
                                    border: "none",
                                    borderRadius: "20px",
                                    fontFamily: "var(--font-sans)",
                                    fontWeight: 600,
                                    fontSize: "13px",
                                    cursor: (submittingReview || !reviewText.trim()) ? "default" : "pointer",
                                    opacity: (submittingReview || !reviewText.trim()) ? 0.6 : 1,
                                    transition: "opacity 0.2s"
                                }}
                            >
                                {submittingReview ? "🧠 Evaluating NLP Sentiment..." : "Analyze & Post Reflection"}
                            </button>
                        </form>
                    ) : (
                        <div>
                            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
                                Join our community of readers to review this volume and see how our NLP engine interprets your reflection.
                            </p>
                            <button
                                onClick={() => openAuthModal("signin")}
                                style={{
                                    padding: "8px 18px",
                                    background: "rgba(255, 255, 255, 0.08)",
                                    border: "1px solid var(--border-hairline)",
                                    color: "var(--text-primary)",
                                    borderRadius: "20px",
                                    fontSize: "12px",
                                    cursor: "pointer"
                                }}
                            >
                                Sign In to Write a Review
                            </button>
                        </div>
                    )}
                </div>

                {/* 4. Community Reviews Feed */}
                <div>
                    <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "19px", color: "var(--text-primary)", marginBottom: "16px" }}>
                        Reader Reflections ({reviews.length})
                    </h3>

                    {reviews.length === 0 ? (
                        <p style={{ fontSize: "13px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                            No published reflections yet.
                        </p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {reviews.map(rev => (
                                <div
                                    key={rev.id}
                                    style={{
                                        background: "rgba(255, 255, 255, 0.02)",
                                        border: "1px solid var(--border-hairline)",
                                        borderRadius: "10px",
                                        padding: "18px 20px"
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
                                        {/* Reviewer Profile */}
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            {rev.User?.avatarUrl ? (
                                                <img
                                                    src={rev.User.avatarUrl}
                                                    alt={rev.User.name}
                                                    referrerPolicy="no-referrer"
                                                    style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
                                                />
                                            ) : (
                                                <div style={{
                                                    width: "32px",
                                                    height: "32px",
                                                    borderRadius: "50%",
                                                    background: "var(--accent-gold)",
                                                    color: "#000",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontWeight: 700,
                                                    fontSize: "13px"
                                                }}>
                                                    {rev.User?.name?.[0] || "R"}
                                                </div>
                                            )}
                                            <div>
                                                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", display: "block" }}>
                                                    {rev.User?.name || "Anonymous Reader"}
                                                </span>
                                                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                                                    {new Date(rev.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Stars & Sentiment Badge */}
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                            <span style={{ color: "var(--accent-gold)", fontSize: "13px" }}>
                                                {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
                                            </span>

                                            {/* AI Sentiment Tone Tag */}
                                            {rev.sentiment && (
                                                <span style={{
                                                    fontSize: "11px",
                                                    fontFamily: "var(--font-mono)",
                                                    padding: "2px 8px",
                                                    borderRadius: "12px",
                                                    background: rev.sentiment === "POSITIVE"
                                                        ? "rgba(74, 222, 128, 0.1)"
                                                        : rev.sentiment === "NEGATIVE"
                                                            ? "rgba(248, 113, 113, 0.1)"
                                                            : "rgba(148, 163, 184, 0.1)",
                                                    border: `1px solid ${rev.sentiment === "POSITIVE"
                                                        ? "rgba(74, 222, 128, 0.3)"
                                                        : rev.sentiment === "NEGATIVE"
                                                            ? "rgba(248, 113, 113, 0.3)"
                                                            : "rgba(148, 163, 184, 0.3)"
                                                        }`,
                                                    color: rev.sentiment === "POSITIVE"
                                                        ? "var(--accent-green)"
                                                        : rev.sentiment === "NEGATIVE"
                                                            ? "#f87171"
                                                            : "#94a3b8"
                                                }}>
                                                    ● {rev.sentiment} ({rev.sentimentScore >= 0 ? "+" : ""}{rev.sentimentScore})
                                                </span>
                                            )}

                                            {/* Dissonance Badge */}
                                            {rev.dissonanceDetected && (
                                                <span
                                                    title={rev.dissonanceReason || "Rating differs significantly from text tone"}
                                                    style={{
                                                        fontSize: "11px",
                                                        fontFamily: "var(--font-mono)",
                                                        padding: "2px 8px",
                                                        borderRadius: "12px",
                                                        background: "rgba(234, 179, 8, 0.12)",
                                                        border: "1px solid rgba(234, 179, 8, 0.3)",
                                                        color: "var(--accent-gold)",
                                                        cursor: "help"
                                                    }}
                                                >
                                                    ⚡ Dissonance Detected
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Review Text */}
                                    <p style={{ fontSize: "14px", lineHeight: "1.65", color: "var(--text-secondary)", margin: 0 }}>
                                        {rev.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* 5. Recommendations Section */}
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
                                    textDecoration: "none",
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

            {/* 6. Author Spotlight Modal */}
            <AuthorModal
                authorName={spotlightAuthor}
                onClose={() => setSpotlightAuthor(null)}
            />
        </div>
    );
}

export default BookDetail;
