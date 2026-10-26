import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import BookCover from "./BookCover";

function AuthorModal({ authorName, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authorName) return;

        setLoading(true);
        fetch(`http://localhost:3000/api/authors/${encodeURIComponent(authorName)}`)
            .then(res => res.json())
            .then(result => {
                setData(result);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load author profile:", err);
                setLoading(false);
            });
    }, [authorName]);

    if (!authorName) return null;

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.82)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
        }}>
            <div style={{
                background: "var(--bg-card, #121216)",
                border: "1px solid var(--border-hairline, rgba(255, 255, 255, 0.1))",
                borderRadius: "20px",
                maxWidth: "800px",
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)",
                display: "flex",
                flexDirection: "column",
                position: "relative"
            }}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute",
                        top: "20px",
                        right: "20px",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "var(--text-secondary)",
                        borderRadius: "50%",
                        width: "36px",
                        height: "36px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        zIndex: 10
                    }}
                >
                    ✕
                </button>

                {loading ? (
                    <div style={{ padding: "80px 20px", textAlign: "center", fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: "13px" }}>
                        Fetching author archive & biographical records...
                    </div>
                ) : data ? (
                    <div style={{ padding: "36px 32px", display: "flex", flexDirection: "column", gap: "28px" }}>

                        {/* 1. Author Header with Portrait, Name & Tagline */}
                        <div style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" }}>
                            {data.photo ? (
                                <img
                                    src={data.photo}
                                    alt={data.name}
                                    style={{
                                        width: "110px",
                                        height: "110px",
                                        borderRadius: "50%",
                                        objectFit: "cover",
                                        border: "2px solid var(--accent-gold, #d4a359)",
                                        boxShadow: "0 4px 20px rgba(212, 163, 89, 0.2)"
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: "100px",
                                    height: "100px",
                                    borderRadius: "50%",
                                    background: "rgba(255, 255, 255, 0.05)",
                                    border: "2px solid var(--border-hairline)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "32px",
                                    fontFamily: "var(--font-serif)",
                                    color: "var(--accent-gold)"
                                }}>
                                    {data.name.charAt(0)}
                                </div>
                            )}

                            <div style={{ flex: 1, minWidth: "240px" }}>
                                <span style={{
                                    fontFamily: "var(--font-mono)",
                                    fontSize: "10px",
                                    letterSpacing: "2px",
                                    color: "var(--accent-cyan)",
                                    textTransform: "uppercase"
                                }}>
                                    AUTHOR SPOTLIGHT // BIOGRAPHY
                                </span>
                                <h2 style={{
                                    fontFamily: "var(--font-serif)",
                                    fontSize: "30px",
                                    fontWeight: 400,
                                    color: "var(--text-primary)",
                                    margin: "4px 0 6px 0"
                                }}>
                                    {data.name}
                                </h2>
                                <p style={{
                                    fontSize: "13px",
                                    color: "var(--text-muted)",
                                    margin: "0 0 10px 0",
                                    fontFamily: "var(--font-mono)"
                                }}>
                                    {data.tagline}
                                </p>

                                {data.wikipediaUrl && (
                                    <a
                                        href={data.wikipediaUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                            fontSize: "11px",
                                            fontFamily: "var(--font-mono)",
                                            color: "var(--accent-gold)",
                                            textDecoration: "none"
                                        }}
                                    >
                                        View on Wikipedia ↗
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* 2. Clear, Broad Biography Description */}
                        <div>
                            <div style={{
                                fontSize: "10px",
                                fontFamily: "var(--font-mono)",
                                color: "var(--text-muted)",
                                letterSpacing: "1.5px",
                                textTransform: "uppercase",
                                marginBottom: "10px"
                            }}>
                                BIOGRAPHY & LITERARY OVERVIEW
                            </div>
                            <div style={{
                                background: "rgba(255, 255, 255, 0.02)",
                                border: "1px solid var(--border-hairline)",
                                borderRadius: "12px",
                                padding: "20px 24px"
                            }}>
                                <p style={{
                                    margin: 0,
                                    fontSize: "15px",
                                    lineHeight: "1.85",
                                    color: "var(--text-secondary)",
                                    fontFamily: "var(--font-sans)",
                                    whiteSpace: "pre-line",
                                    letterSpacing: "0.2px"
                                }}>
                                    {data.biography}
                                </p>
                            </div>
                        </div>

                        {/* 3. Catalog Books by Same Author */}
                        <div>
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "12px"
                            }}>
                                <span style={{
                                    fontSize: "10px",
                                    fontFamily: "var(--font-mono)",
                                    color: "var(--text-muted)",
                                    letterSpacing: "1.5px",
                                    textTransform: "uppercase"
                                }}>
                                    BOOKS BY THIS AUTHOR IN CATALOG ({data.books ? data.books.length : 0})
                                </span>
                            </div>

                            {data.books && data.books.length > 0 ? (
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                                    gap: "16px"
                                }}>
                                    {data.books.map(b => (
                                        <Link
                                            key={b.id}
                                            to={`/books/${b.id}`}
                                            onClick={onClose}
                                            style={{
                                                textDecoration: "none",
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "8px"
                                            }}
                                        >
                                            <div style={{ width: "100%" }}>
                                                <BookCover
                                                    title={b.title}
                                                    author={b.author}
                                                    genre={b.genre}
                                                    coverImageUrl={b.coverImageUrl}
                                                    height="170px"
                                                />
                                            </div>
                                            <div>
                                                <div style={{
                                                    fontSize: "12px",
                                                    fontWeight: 600,
                                                    color: "var(--text-primary)",
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis"
                                                }}>
                                                    {b.title}
                                                </div>
                                                {b.averageRating && (
                                                    <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--accent-gold)" }}>
                                                        ★ {b.averageRating}
                                                    </div>
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                                    No additional titles currently recorded for this author.
                                </p>
                            )}
                        </div>

                    </div>
                ) : (
                    <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
                        Could not retrieve details for this author.
                    </div>
                )}
            </div>
        </div>
    );
}

export default AuthorModal;
