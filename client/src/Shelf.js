import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import BookCover from "./BookCover";
import AuthorModal from "./AuthorModal";

function Shelf() {
    const [shelf, setShelf] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState("all"); // "all" | "reading" | "want-to-read" | "finished"
    const [selectedId, setSelectedId] = useState(null);
    const { isAuthenticated, token, openAuthModal } = useAuth();
    const [spotlightAuthor, setSpotlightAuthor] = useState(null);

    // Studio tab state: "synopsis" | "notes"
    const [studioTab, setStudioTab] = useState("synopsis");

    // Note form inputs
    const [noteContent, setNoteContent] = useState("");
    const [noteType, setNoteType] = useState("note"); // "note" | "quote" | "insight"
    const [notePage, setNotePage] = useState("");
    const [submittingNote, setSubmittingNote] = useState(false);

    // 1. Fetch user's personal shelf on mount
    useEffect(() => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }

        fetch("http://localhost:3000/api/shelf", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })
            .then(res => res.json())
            .then(data => {
                const list = Array.isArray(data) ? data : [];
                setShelf(list);
                if (list.length > 0) {
                    setSelectedId(list[0].id);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to load shelf:", err);
                setLoading(false);
            });
    }, [isAuthenticated, token]);

    // 2. Optimistic Update Handler (Updates UI instantly + persists to PostgreSQL)
    const handleUpdateProgress = async (id, updates) => {
        setShelf(prev => prev.map(item => {
            if (item.id === id) {
                const newCurrent = updates.currentPage !== undefined
                    ? Math.max(0, parseInt(updates.currentPage) || 0)
                    : item.currentPage;
                const newTotal = updates.totalPages !== undefined
                    ? Math.max(1, parseInt(updates.totalPages) || 1)
                    : (item.totalPages || 320);
                const newPace = updates.pagesPerDay !== undefined
                    ? Math.max(1, parseInt(updates.pagesPerDay) || 1)
                    : (item.pagesPerDay || 25);
                const newStatus = updates.status || item.status;
                const newProgress = Math.min(100, Math.round((newCurrent / newTotal) * 100));

                return {
                    ...item,
                    ...updates,
                    currentPage: newCurrent,
                    totalPages: newTotal,
                    pagesPerDay: newPace,
                    status: newCurrent >= newTotal ? "finished" : newStatus,
                    progress: newProgress
                };
            }
            return item;
        }));

        try {
            await fetch(`http://localhost:3000/api/shelf/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });
        } catch (err) {
            console.error("Failed to save progress to server:", err);
        }
    };

    // 3. Add Note / Quote Handler
    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!noteContent.trim() || !selectedId) return;

        setSubmittingNote(true);
        const optimisticNote = {
            id: Date.now().toString(),
            type: noteType,
            content: noteContent.trim(),
            page: notePage ? parseInt(notePage) : null,
            createdAt: new Date().toISOString()
        };

        // Optimistically update local state
        setShelf(prev => prev.map(item => {
            if (item.id === selectedId) {
                const currentNotes = Array.isArray(item.notes) ? item.notes : [];
                return { ...item, notes: [optimisticNote, ...currentNotes] };
            }
            return item;
        }));

        setNoteContent("");
        setNotePage("");

        try {
            const res = await fetch(`http://localhost:3000/api/shelf/${selectedId}/notes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(optimisticNote)
            });
            const updatedNotes = await res.json();
            if (Array.isArray(updatedNotes)) {
                setShelf(prev => prev.map(item => item.id === selectedId ? { ...item, notes: updatedNotes } : item));
            }
        } catch (err) {
            console.error("Failed to save note:", err);
        } finally {
            setSubmittingNote(false);
        }
    };

    // 4. Delete Note Handler
    const handleDeleteNote = async (noteId) => {
        if (!selectedId) return;

        setShelf(prev => prev.map(item => {
            if (item.id === selectedId) {
                const currentNotes = Array.isArray(item.notes) ? item.notes : [];
                return { ...item, notes: currentNotes.filter(n => n.id !== noteId) };
            }
            return item;
        }));

        try {
            await fetch(`http://localhost:3000/api/shelf/${selectedId}/notes/${noteId}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
        } catch (err) {
            console.error("Failed to delete note:", err);
        }
    };

    // 5. Remove Book Handler
    const handleRemoveBook = async (id) => {
        if (!window.confirm("Remove this book from your reading shelf?")) return;

        setShelf(prev => {
            const updated = prev.filter(item => item.id !== id);
            if (selectedId === id) {
                setSelectedId(updated.length > 0 ? updated[0].id : null);
            }
            return updated;
        });

        try {
            await fetch(`http://localhost:3000/api/shelf/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
        } catch (err) {
            console.error("Failed to remove book:", err);
        }
    };

    // 6. Calculate Reading Velocity (Days to finish & hours remaining)
    const calculateVelocity = (current, total, pace = 25) => {
        const remainingPages = Math.max(0, (total || 320) - (current || 0));
        if (remainingPages === 0) return { hoursLeft: "0", daysLeft: 0, finishDateStr: "Finished" };

        const daysLeft = Math.ceil(remainingPages / (pace || 25));
        const hoursLeft = (remainingPages / 35).toFixed(1);

        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + daysLeft);
        const finishDateStr = targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

        return { remainingPages, daysLeft, hoursLeft, finishDateStr };
    };

    if (!isAuthenticated) {
        return (
            <div style={{ maxWidth: "600px", margin: "100px auto", textAlign: "center", padding: "40px 24px" }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "2.5px", color: "var(--accent-gold)", textTransform: "uppercase", marginBottom: "12px" }}>
                    Personal Library & Velocity
                </p>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "36px", color: "var(--text-primary)", marginBottom: "16px", fontWeight: 400 }}>
                    Your Reading Shelf Awaits.
                </h2>
                <p style={{ color: "var(--text-secondary)", marginBottom: "32px", lineHeight: 1.7, fontSize: "15px" }}>
                    Sign in to track custom total pages, monitor reading speed, and receive tailored velocity projections.
                </p>
                <button
                    onClick={() => openAuthModal("signin")}
                    style={{
                        padding: "14px 32px",
                        background: "var(--text-primary)",
                        color: "var(--bg-primary)",
                        border: "none",
                        borderRadius: "30px",
                        fontWeight: 600,
                        fontSize: "14px",
                        cursor: "pointer"
                    }}
                >
                    Sign In to View Shelf →
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{ textAlign: "center", padding: "100px 0", fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: "13px" }}>
                Loading your personal library...
            </div>
        );
    }

    // 7. Aggregate Reading Stats & Today's Goal Progress
    const totalVolumes = shelf.length;
    const readingCount = shelf.filter(s => s.status === "reading").length;
    const finishedCount = shelf.filter(s => s.status === "finished").length;
    const totalPagesRead = shelf.reduce((acc, curr) => acc + (curr.status === "finished" ? (curr.totalPages || 320) : (curr.currentPage || 0)), 0);

    const todayStr = new Date().toISOString().split("T")[0];
    const todayPagesTotal = shelf.reduce((acc, curr) => acc + (curr.lastReadDate === todayStr ? (curr.todayPages || 0) : 0), 0);
    const dailyGoalPace = 25;
    const todayGoalPct = Math.min(100, Math.round((todayPagesTotal / dailyGoalPace) * 100));

    // Filtered list based on active tab
    const filteredShelf = shelf.filter(entry => {
        if (activeFilter === "all") return true;
        return entry.status === activeFilter;
    });

    // Currently selected book for the right panel
    const selectedEntry = filteredShelf.find(e => e.id === selectedId) || filteredShelf[0] || null;
    const selectedBook = selectedEntry ? selectedEntry.Book : null;
    const selectedVelocity = selectedEntry
        ? calculateVelocity(selectedEntry.currentPage, selectedEntry.totalPages, selectedEntry.pagesPerDay || 25)
        : null;
    const selectedNotes = selectedEntry && Array.isArray(selectedEntry.notes) ? selectedEntry.notes : [];

    return (
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px 24px" }}>

            {/* Streamlined Header: Title + Inline Telemetry Badges + Daily Streak */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px",
                marginBottom: "14px"
            }}>
                <div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "2px", color: "var(--accent-cyan)", textTransform: "uppercase" }}>
                        TELEMETRY & READING PROGRESS
                    </span>
                    <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "28px", fontWeight: 400, color: "var(--text-primary)", margin: "2px 0 0 0" }}>
                        My Reading Shelf
                    </h1>
                </div>

                {/* Sleek inline telemetry pills & Daily Goal Tracker */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {/* Today's Goal Tracker */}
                    <div style={{ background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.25)", borderRadius: "20px", padding: "6px 14px", fontSize: "12px", fontFamily: "var(--font-mono)", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ color: "var(--accent-cyan)" }}>🎯 TODAY:</span>
                        <strong style={{ color: "#fff" }}>{todayPagesTotal} / {dailyGoalPace} pgs</strong>
                        <span style={{ color: todayGoalPct >= 100 ? "var(--accent-green)" : "var(--accent-cyan)", fontSize: "11px" }}>({todayGoalPct}%)</span>
                    </div>

                    <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-hairline)", borderRadius: "20px", padding: "6px 14px", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
                        <span style={{ color: "var(--text-muted)" }}>VOLUMES: </span><strong style={{ color: "var(--text-primary)" }}>{totalVolumes}</strong>
                    </div>
                    <div style={{ background: "rgba(74, 222, 128, 0.08)", border: "1px solid rgba(74, 222, 128, 0.2)", borderRadius: "20px", padding: "6px 14px", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
                        <span style={{ color: "var(--accent-green)" }}>COMPLETED: </span><strong style={{ color: "#4ade80" }}>{finishedCount}</strong>
                    </div>
                    <div style={{ background: "rgba(212, 163, 89, 0.08)", border: "1px solid rgba(212, 163, 89, 0.2)", borderRadius: "20px", padding: "6px 14px", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
                        <span style={{ color: "var(--accent-gold)" }}>PAGES READ: </span><strong style={{ color: "var(--accent-gold)" }}>{totalPagesRead.toLocaleString()}</strong>
                    </div>
                </div>
            </div>

            {/* Compact Filter Tabs */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px", borderBottom: "1px solid var(--border-hairline)", paddingBottom: "12px" }}>
                {[
                    { key: "all", label: `All Books (${totalVolumes})` },
                    { key: "reading", label: `Currently Reading (${readingCount})` },
                    { key: "want-to-read", label: `Want to Read (${shelf.filter(s => s.status === "want-to-read").length})` },
                    { key: "finished", label: `Finished (${finishedCount})` }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => {
                            setActiveFilter(tab.key);
                            const next = shelf.filter(e => tab.key === "all" ? true : e.status === tab.key);
                            if (next.length > 0) setSelectedId(next[0].id);
                        }}
                        style={{
                            padding: "6px 14px",
                            borderRadius: "16px",
                            fontSize: "12px",
                            fontFamily: "var(--font-sans)",
                            fontWeight: activeFilter === tab.key ? 600 : 400,
                            background: activeFilter === tab.key ? "var(--text-primary)" : "transparent",
                            color: activeFilter === tab.key ? "var(--bg-primary)" : "var(--text-secondary)",
                            border: activeFilter === tab.key ? "1px solid var(--text-primary)" : "1px solid var(--border-hairline)",
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Empty Shelf Notice */}
            {filteredShelf.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 20px", background: "var(--bg-card)", borderRadius: "16px", border: "1px solid var(--border-hairline)" }}>
                    <p style={{ fontSize: "18px", color: "var(--text-primary)", marginBottom: "10px", fontFamily: "var(--font-serif)" }}>No books in this view.</p>
                    <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "20px" }}>Browse the catalog and add titles to your personal shelf.</p>
                    <Link to="/" style={{ color: "var(--accent-cyan)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>← Browse 9,800+ Catalog Volumes</Link>
                </div>
            ) : (
                /* Master-Detail Split Screen Layout */
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "clamp(280px, 30%, 360px) 1fr",
                    gap: "24px",
                    alignItems: "start"
                }}>

                    {/* ==================================================== */}
                    {/* LEFT COLUMN: Individual Books Selector Cards */}
                    {/* ==================================================== */}
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        maxHeight: "82vh",
                        overflowY: "auto",
                        paddingRight: "6px"
                    }}>
                        <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "2px" }}>
                            SELECT BOOK ({filteredShelf.length})
                        </div>

                        {filteredShelf.map(entry => {
                            const b = entry.Book;
                            if (!b) return null;
                            const isSelected = selectedEntry && selectedEntry.id === entry.id;
                            const pct = entry.progress || 0;
                            const noteCount = Array.isArray(entry.notes) ? entry.notes.length : 0;

                            return (
                                <div
                                    key={entry.id}
                                    onClick={() => setSelectedId(entry.id)}
                                    style={{
                                        display: "flex",
                                        gap: "12px",
                                        padding: "12px",
                                        borderRadius: "10px",
                                        cursor: "pointer",
                                        background: isSelected ? "rgba(255, 255, 255, 0.05)" : "var(--bg-card)",
                                        border: isSelected ? "1px solid var(--accent-gold)" : "1px solid var(--border-hairline)",
                                        boxShadow: isSelected ? "0 4px 18px rgba(212, 163, 89, 0.12)" : "none",
                                        transition: "all 0.2s ease"
                                    }}
                                >
                                    {/* Mini Cover */}
                                    <div style={{ width: "55px", flexShrink: 0 }}>
                                        <BookCover
                                            title={b.title}
                                            author={b.author}
                                            genre={b.genre}
                                            coverImageUrl={b.coverImageUrl}
                                            height="80px"
                                        />
                                    </div>

                                    {/* Book info snippet */}
                                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                        <div>
                                            <h4 style={{
                                                margin: "0 0 3px 0",
                                                fontSize: "13px",
                                                fontWeight: 600,
                                                color: isSelected ? "#fff" : "var(--text-primary)",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis"
                                            }}>
                                                {b.title}
                                            </h4>
                                            <p style={{
                                                margin: "0 0 6px 0",
                                                fontSize: "11px",
                                                color: "var(--text-muted)",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis"
                                            }}>
                                                {b.author}
                                            </p>
                                        </div>

                                        {/* Status Tag & Progress Bar */}
                                        <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: "3px" }}>
                                                <span style={{
                                                    color: entry.status === "finished" ? "var(--accent-green)" : entry.status === "reading" ? "var(--accent-cyan)" : "var(--text-muted)"
                                                }}>
                                                    {entry.status === "finished" ? "✓ Finished" : entry.status === "reading" ? "● Reading" : "○ Want to Read"}
                                                </span>
                                                <span>
                                                    {noteCount > 0 && <span style={{ marginRight: "6px", color: "var(--accent-gold)" }}>📝 {noteCount}</span>}
                                                    {pct}%
                                                </span>
                                            </div>
                                            <div style={{ width: "100%", height: "3px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "2px", overflow: "hidden" }}>
                                                <div style={{
                                                    width: `${pct}%`,
                                                    height: "100%",
                                                    background: entry.status === "finished" ? "var(--accent-green)" : "var(--accent-cyan)"
                                                }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ==================================================== */}
                    {/* RIGHT COLUMN: Elevated Studio Panel & Book Controls */}
                    {/* ==================================================== */}
                    {selectedEntry && selectedBook ? (
                        <div style={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-hairline)",
                            borderRadius: "16px",
                            padding: "24px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "20px"
                        }}>
                            {/* Unified Top Cockpit: Cover + Book Metadata + Controls */}
                            <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", flexWrap: "wrap" }}>

                                {/* Cover & Catalog Link */}
                                <div style={{ width: "105px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <BookCover
                                        title={selectedBook.title}
                                        author={selectedBook.author}
                                        genre={selectedBook.genre}
                                        coverImageUrl={selectedBook.coverImageUrl}
                                        height="150px"
                                    />
                                    <Link
                                        to={`/books/${selectedBook.id}`}
                                        style={{
                                            fontSize: "11px",
                                            fontFamily: "var(--font-mono)",
                                            color: "var(--accent-cyan)",
                                            textDecoration: "none",
                                            textAlign: "center",
                                            display: "block"
                                        }}
                                    >
                                        Catalog Page →
                                    </Link>
                                </div>

                                {/* Book Details + Controls & Live Stats */}
                                <div style={{ flex: 1, minWidth: "260px" }}>
                                    {/* Title & Metadata */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "6px" }}>
                                        <div>
                                            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "22px", color: "var(--text-primary)", margin: "0 0 4px 0", lineHeight: 1.25 }}>
                                                {selectedBook.title}
                                            </h2>

                                            {/* Author with Spotlight Button */}
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "0 0 10px 0" }}>
                                                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                                                    by <strong>{selectedBook.author}</strong>
                                                </span>
                                                <button
                                                    onClick={() => setSpotlightAuthor(selectedBook.author)}
                                                    style={{
                                                        background: "rgba(56, 189, 248, 0.08)",
                                                        border: "1px solid rgba(56, 189, 248, 0.25)",
                                                        color: "var(--accent-cyan)",
                                                        fontSize: "11px",
                                                        fontFamily: "var(--font-mono)",
                                                        padding: "3px 10px",
                                                        borderRadius: "12px",
                                                        cursor: "pointer",
                                                        transition: "all 0.2s"
                                                    }}
                                                >
                                                    👤 Author Bio & Works ↗
                                                </button>
                                            </div>
                                        </div>

                                        {selectedBook.genre && (
                                            <span style={{
                                                fontSize: "10px",
                                                fontFamily: "var(--font-mono)",
                                                background: "rgba(255, 255, 255, 0.06)",
                                                padding: "3px 8px",
                                                borderRadius: "10px",
                                                color: "var(--accent-gold)",
                                                whiteSpace: "nowrap"
                                            }}>
                                                {selectedBook.genre.split(",")[0]}
                                            </span>
                                        )}
                                    </div>

                                    {/* Elevated Reading Controls: Total Pages, Current Page, Status */}
                                    <div style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                                        gap: "12px",
                                        margin: "14px 0 12px 0",
                                        background: "rgba(255, 255, 255, 0.02)",
                                        padding: "12px",
                                        borderRadius: "10px",
                                        border: "1px solid var(--border-hairline)"
                                    }}>
                                        {/* Total Edition Pages */}
                                        <div>
                                            <label style={{ display: "block", fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: "4px" }}>
                                                TOTAL EDITION PAGES
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={selectedEntry.totalPages || 320}
                                                onChange={e => handleUpdateProgress(selectedEntry.id, { totalPages: e.target.value })}
                                                style={{
                                                    width: "100%",
                                                    background: "rgba(255, 255, 255, 0.05)",
                                                    border: "1px solid var(--border-hairline)",
                                                    borderRadius: "6px",
                                                    padding: "6px 10px",
                                                    color: "var(--text-primary)",
                                                    fontFamily: "var(--font-mono)",
                                                    fontSize: "14px",
                                                    outline: "none",
                                                    boxSizing: "border-box"
                                                }}
                                            />
                                        </div>

                                        {/* Current Page Read */}
                                        <div>
                                            <label style={{ display: "block", fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: "4px" }}>
                                                CURRENT PAGE READ
                                            </label>
                                            <div style={{ display: "flex", gap: "4px" }}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={selectedEntry.totalPages || 320}
                                                    value={selectedEntry.currentPage || 0}
                                                    onChange={e => handleUpdateProgress(selectedEntry.id, { currentPage: e.target.value })}
                                                    style={{
                                                        flex: 1,
                                                        background: "rgba(255, 255, 255, 0.05)",
                                                        border: "1px solid var(--border-hairline)",
                                                        borderRadius: "6px",
                                                        padding: "6px 8px",
                                                        color: "var(--accent-cyan)",
                                                        fontWeight: 600,
                                                        fontFamily: "var(--font-mono)",
                                                        fontSize: "14px",
                                                        outline: "none",
                                                        boxSizing: "border-box"
                                                    }}
                                                />
                                                <button
                                                    onClick={() => handleUpdateProgress(selectedEntry.id, {
                                                        currentPage: Math.min(selectedEntry.totalPages || 320, (selectedEntry.currentPage || 0) + 10)
                                                    })}
                                                    title="Add 10 pages"
                                                    style={{
                                                        background: "rgba(255, 255, 255, 0.06)",
                                                        border: "1px solid var(--border-hairline)",
                                                        color: "var(--text-secondary)",
                                                        borderRadius: "6px",
                                                        padding: "0 8px",
                                                        fontSize: "11px",
                                                        fontFamily: "var(--font-mono)",
                                                        cursor: "pointer"
                                                    }}
                                                >
                                                    +10
                                                </button>
                                            </div>
                                        </div>

                                        {/* Status Selector */}
                                        <div>
                                            <label style={{ display: "block", fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: "4px" }}>
                                                SHELF STATUS
                                            </label>
                                            <select
                                                value={selectedEntry.status}
                                                onChange={e => handleUpdateProgress(selectedEntry.id, { status: e.target.value })}
                                                style={{
                                                    width: "100%",
                                                    background: "rgba(255, 255, 255, 0.05)",
                                                    border: "1px solid var(--border-hairline)",
                                                    color: selectedEntry.status === "finished" ? "var(--accent-green)" : selectedEntry.status === "reading" ? "var(--accent-cyan)" : "var(--text-secondary)",
                                                    borderRadius: "6px",
                                                    padding: "6px 8px",
                                                    fontSize: "12px",
                                                    fontFamily: "var(--font-mono)",
                                                    cursor: "pointer",
                                                    outline: "none",
                                                    boxSizing: "border-box"
                                                }}
                                            >
                                                <option value="want-to-read" style={{ background: "#121216", color: "#fff" }}>Want to Read</option>
                                                <option value="reading" style={{ background: "#121216", color: "#38bdf8" }}>Reading</option>
                                                <option value="finished" style={{ background: "#121216", color: "#4ade80" }}>Finished</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Scrubber Progress Slider */}
                                    <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: "4px" }}>
                                            <span>SCRUB PROGRESS</span>
                                            <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>
                                                {selectedEntry.currentPage || 0} / {selectedEntry.totalPages || 320} pgs ({selectedEntry.progress || 0}%)
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max={selectedEntry.totalPages || 320}
                                            value={selectedEntry.currentPage || 0}
                                            onChange={e => handleUpdateProgress(selectedEntry.id, { currentPage: parseInt(e.target.value) })}
                                            style={{ width: "100%", accentColor: "var(--accent-cyan)", cursor: "pointer", height: "4px" }}
                                        />
                                    </div>

                                    {/* Real-time ReadVelocity Banner */}
                                    <div style={{
                                        marginTop: "10px",
                                        padding: "8px 12px",
                                        background: selectedEntry.status === "finished" ? "rgba(74, 222, 128, 0.08)" : "rgba(56, 189, 248, 0.06)",
                                        border: selectedEntry.status === "finished" ? "1px solid rgba(74, 222, 128, 0.2)" : "1px solid rgba(56, 189, 248, 0.15)",
                                        borderRadius: "6px",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        gap: "8px",
                                        fontSize: "11px",
                                        fontFamily: "var(--font-mono)"
                                    }}>
                                        {selectedEntry.status === "finished" ? (
                                            <span style={{ color: "var(--accent-green)" }}>✓ Edition complete ({selectedEntry.totalPages || 320} pages read)</span>
                                        ) : (
                                            <>
                                                <span style={{ color: "var(--text-secondary)" }}>⏱ ~{selectedVelocity.hoursLeft}h left ({selectedVelocity.remainingPages} pgs)</span>
                                                <span style={{ color: "var(--accent-cyan)" }}>Target finish: {selectedVelocity.finishDateStr} @ 25 pgs/day</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ==================================================== */}
                            {/* STUDIO TABS: [ Synopsis & Overview ] | [ Notes & Quotes ] */}
                            {/* ==================================================== */}
                            <div style={{ borderTop: "1px solid var(--border-hairline)", paddingTop: "16px" }}>

                                {/* Tab Switches */}
                                <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                                    <button
                                        onClick={() => setStudioTab("synopsis")}
                                        style={{
                                            background: studioTab === "synopsis" ? "rgba(255, 255, 255, 0.08)" : "transparent",
                                            border: studioTab === "synopsis" ? "1px solid var(--border-hairline)" : "1px solid transparent",
                                            color: studioTab === "synopsis" ? "var(--text-primary)" : "var(--text-muted)",
                                            padding: "6px 14px",
                                            borderRadius: "8px",
                                            fontSize: "12px",
                                            fontFamily: "var(--font-mono)",
                                            cursor: "pointer",
                                            transition: "all 0.2s"
                                        }}
                                    >
                                        📖 Synopsis & Overview
                                    </button>

                                    <button
                                        onClick={() => setStudioTab("notes")}
                                        style={{
                                            background: studioTab === "notes" ? "rgba(212, 163, 89, 0.1)" : "transparent",
                                            border: studioTab === "notes" ? "1px solid rgba(212, 163, 89, 0.3)" : "1px solid transparent",
                                            color: studioTab === "notes" ? "var(--accent-gold)" : "var(--text-muted)",
                                            padding: "6px 14px",
                                            borderRadius: "8px",
                                            fontSize: "12px",
                                            fontFamily: "var(--font-mono)",
                                            cursor: "pointer",
                                            transition: "all 0.2s"
                                        }}
                                    >
                                        📝 Notes & Quotes ({selectedNotes.length})
                                    </button>
                                </div>

                                {/* TAB 1: Synopsis Container */}
                                {studioTab === "synopsis" && (
                                    <div style={{
                                        background: "rgba(255, 255, 255, 0.015)",
                                        border: "1px solid var(--border-hairline)",
                                        borderRadius: "10px",
                                        padding: "18px 22px",
                                        maxHeight: "320px",
                                        overflowY: "auto"
                                    }}>
                                        <p style={{
                                            margin: 0,
                                            fontSize: "15px",
                                            lineHeight: "1.8",
                                            color: "var(--text-secondary)",
                                            fontFamily: "var(--font-sans)",
                                            whiteSpace: "pre-line",
                                            letterSpacing: "0.2px"
                                        }}>
                                            {selectedBook.description || "No full synopsis provided for this edition yet. You can read reviews or add notes for this book in the catalog view."}
                                        </p>
                                    </div>
                                )}

                                {/* TAB 2: Notes & Quotes Log */}
                                {studioTab === "notes" && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                                        {/* New Note Input Form */}
                                        <form onSubmit={handleAddNote} style={{
                                            background: "rgba(255, 255, 255, 0.02)",
                                            border: "1px solid var(--border-hairline)",
                                            borderRadius: "10px",
                                            padding: "16px",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "12px"
                                        }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                                                {/* Type Selector */}
                                                <div style={{ display: "flex", gap: "6px" }}>
                                                    {[
                                                        { key: "note", label: "💡 Reflection" },
                                                        { key: "quote", label: "❝ Memorable Quote" },
                                                        { key: "insight", label: "🎯 Key Takeaway" }
                                                    ].map(t => (
                                                        <button
                                                            key={t.key}
                                                            type="button"
                                                            onClick={() => setNoteType(t.key)}
                                                            style={{
                                                                background: noteType === t.key ? "rgba(255, 255, 255, 0.08)" : "transparent",
                                                                border: noteType === t.key ? "1px solid var(--accent-gold)" : "1px solid var(--border-hairline)",
                                                                color: noteType === t.key ? "var(--accent-gold)" : "var(--text-muted)",
                                                                padding: "4px 10px",
                                                                borderRadius: "6px",
                                                                fontSize: "11px",
                                                                fontFamily: "var(--font-mono)",
                                                                cursor: "pointer"
                                                            }}
                                                        >
                                                            {t.label}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Optional Page Number */}
                                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                    <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>PG #</span>
                                                    <input
                                                        type="number"
                                                        placeholder="e.g. 42"
                                                        value={notePage}
                                                        onChange={e => setNotePage(e.target.value)}
                                                        style={{
                                                            width: "70px",
                                                            background: "rgba(255, 255, 255, 0.05)",
                                                            border: "1px solid var(--border-hairline)",
                                                            borderRadius: "6px",
                                                            padding: "4px 8px",
                                                            color: "var(--text-primary)",
                                                            fontFamily: "var(--font-mono)",
                                                            fontSize: "12px",
                                                            outline: "none"
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Text Area */}
                                            <textarea
                                                rows="3"
                                                placeholder={noteType === "quote" ? "Paste a memorable quote from the book..." : "Record a thought, reflection, or chapter insight..."}
                                                value={noteContent}
                                                onChange={e => setNoteContent(e.target.value)}
                                                style={{
                                                    width: "100%",
                                                    background: "rgba(0, 0, 0, 0.2)",
                                                    border: "1px solid var(--border-hairline)",
                                                    borderRadius: "6px",
                                                    padding: "10px 12px",
                                                    color: "var(--text-primary)",
                                                    fontFamily: noteType === "quote" ? "var(--font-serif)" : "var(--font-sans)",
                                                    fontSize: "14px",
                                                    lineHeight: "1.6",
                                                    outline: "none",
                                                    resize: "vertical",
                                                    boxSizing: "border-box"
                                                }}
                                            />

                                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                                <button
                                                    type="submit"
                                                    disabled={submittingNote || !noteContent.trim()}
                                                    style={{
                                                        background: "var(--text-primary)",
                                                        color: "var(--bg-primary)",
                                                        border: "none",
                                                        padding: "6px 16px",
                                                        borderRadius: "6px",
                                                        fontSize: "12px",
                                                        fontFamily: "var(--font-mono)",
                                                        fontWeight: 600,
                                                        cursor: "pointer",
                                                        opacity: noteContent.trim() ? 1 : 0.5
                                                    }}
                                                >
                                                    {submittingNote ? "Saving..." : "+ Save to Reading Journal"}
                                                </button>
                                            </div>
                                        </form>

                                        {/* Saved Notes & Quotes Timeline List */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto" }}>
                                            {selectedNotes.length === 0 ? (
                                                <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px", fontFamily: "var(--font-mono)" }}>
                                                    No reflections or quotes recorded yet. Capture your first thought as you read!
                                                </div>
                                            ) : (
                                                selectedNotes.map(n => (
                                                    <div
                                                        key={n.id}
                                                        style={{
                                                            background: n.type === "quote" ? "rgba(212, 163, 89, 0.03)" : "rgba(255, 255, 255, 0.015)",
                                                            border: n.type === "quote" ? "1px solid rgba(212, 163, 89, 0.2)" : "1px solid var(--border-hairline)",
                                                            borderRadius: "8px",
                                                            padding: "12px 14px",
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            gap: "6px"
                                                        }}
                                                    >
                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                                                <span style={{
                                                                    fontSize: "10px",
                                                                    fontFamily: "var(--font-mono)",
                                                                    padding: "2px 6px",
                                                                    borderRadius: "4px",
                                                                    background: n.type === "quote" ? "rgba(212, 163, 89, 0.15)" : "rgba(56, 189, 248, 0.1)",
                                                                    color: n.type === "quote" ? "var(--accent-gold)" : "var(--accent-cyan)"
                                                                }}>
                                                                    {n.type === "quote" ? "❝ QUOTE" : n.type === "insight" ? "🎯 INSIGHT" : "💡 REFLECTION"}
                                                                </span>

                                                                {n.page && (
                                                                    <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                                                                        Page {n.page}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <button
                                                                onClick={() => handleDeleteNote(n.id)}
                                                                title="Delete note"
                                                                style={{
                                                                    background: "transparent",
                                                                    border: "none",
                                                                    color: "var(--text-muted)",
                                                                    cursor: "pointer",
                                                                    fontSize: "12px"
                                                                }}
                                                                onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                                                                onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>

                                                        <p style={{
                                                            margin: 0,
                                                            fontSize: n.type === "quote" ? "15px" : "14px",
                                                            fontStyle: n.type === "quote" ? "italic" : "normal",
                                                            fontFamily: n.type === "quote" ? "var(--font-serif)" : "var(--font-sans)",
                                                            lineHeight: "1.6",
                                                            color: n.type === "quote" ? "#fef08a" : "var(--text-secondary)"
                                                        }}>
                                                            {n.type === "quote" ? `“${n.content}”` : n.content}
                                                        </p>

                                                        <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                                                            {new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer: Remove button */}
                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                <button
                                    onClick={() => handleRemoveBook(selectedEntry.id)}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        color: "var(--text-muted)",
                                        fontSize: "11px",
                                        fontFamily: "var(--font-mono)",
                                        cursor: "pointer",
                                        transition: "color 0.2s"
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                                    onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                                >
                                    ✕ Remove Book from Shelf
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Global Author Spotlight Modal */}
            <AuthorModal
                authorName={spotlightAuthor}
                onClose={() => setSpotlightAuthor(null)}
            />
        </div>
    );
}

export default Shelf;
