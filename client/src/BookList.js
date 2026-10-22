import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import BookCover from './BookCover';

const GENRES = ["All", "Classics", "Fiction", "Historical Fiction", "Dystopia", "Fantasy", "Romance", "Science Fiction"];

function BookList() {
  const [books, setBooks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [loading, setLoading] = useState(true);

  const LIMIT = 18; // 18 books per page fits a clean 3x6 or 2x9 grid

  useEffect(() => {
    setLoading(true);
    const genreParam = selectedGenre === "All" ? "" : `&genre=${encodeURIComponent(selectedGenre)}`;

    fetch(`http://localhost:3000/api/books?page=${page}&limit=${LIMIT}${genreParam}`)
      .then(res => res.json())
      .then(data => {
        setBooks(data.books || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch books:", err);
        setLoading(false);
      });
  }, [page, selectedGenre]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 24px" }}>

      {/* 1. Dramatic Hero Section */}
      <section style={{ textAlign: "center", marginBottom: "48px", paddingTop: "20px" }}>
        <p style={{
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          letterSpacing: "3px",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          marginBottom: "12px"
        }}>
          Semantic Literary Intelligence
        </p>

        <h1 style={{
          fontFamily: "var(--font-serif)",
          fontSize: "clamp(36px, 5vw, 64px)",
          fontWeight: 400,
          letterSpacing: "-0.5px",
          lineHeight: 1.1,
          color: "var(--text-primary)",
          marginBottom: "16px"
        }}>
          Stories Bound by Semantic Gravity.
        </h1>

        <p style={{
          fontSize: "16px",
          color: "var(--text-secondary)",
          maxWidth: "600px",
          margin: "0 auto 32px auto",
          lineHeight: 1.6
        }}>
          Explore 9,806 volumes mapped across a 384-dimensional vector space. Discover literature not by keyword, but by conceptual valence.
        </p>

        {/* Live System Metrics Bar */}
        <div style={{
          display: "inline-flex",
          gap: "32px",
          padding: "12px 24px",
          background: "var(--bg-card)",
          border: "1px solid var(--border-hairline)",
          borderRadius: "8px",
          fontFamily: "var(--font-mono)",
          fontSize: "12px"
        }}>
          <div>
            <span style={{ color: "var(--text-muted)" }}>CATALOG: </span>
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{total.toLocaleString()} Books</span>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>LATENCY: </span>
            <span style={{ color: "var(--accent-green)", fontWeight: 600 }}>&lt;1ms Vector Search</span>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>MODEL: </span>
            <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>all-MiniLM-L6-v2</span>
          </div>
        </div>
      </section>

      {/* 2. Genre Filter Pills */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        justifyContent: "center",
        marginBottom: "40px"
      }}>
        {GENRES.map(g => (
          <button
            key={g}
            onClick={() => { setSelectedGenre(g); setPage(1); }}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
              padding: "8px 16px",
              borderRadius: "20px",
              border: selectedGenre === g ? "1px solid var(--text-primary)" : "1px solid var(--border-hairline)",
              background: selectedGenre === g ? "var(--text-primary)" : "var(--bg-card)",
              color: selectedGenre === g ? "var(--bg-primary)" : "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {g}
          </button>
        ))}
      </div>

      {/* 3. The Book Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
          Loading catalog volumes...
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "24px",
          marginBottom: "48px"
        }}>
          {books.map(book => (
            <Link
              key={book.id}
              to={`/books/${book.id}`}
              style={{
                display: "flex",
                flexDirection: "column",
                background: "var(--bg-card)",
                border: "1px solid var(--border-hairline)",
                borderRadius: "10px",
                overflow: "hidden",
                transition: "transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease",
                padding: "12px"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-6px)";
                e.currentTarget.style.borderColor = "var(--border-focus)";
                e.currentTarget.style.boxShadow = "0 12px 30px rgba(0, 0, 0, 0.6)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "var(--border-hairline)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Luxury Physical Book Cover with Inset 3D Spine & Velvet Genre Gradients */}
              <BookCover
                title={book.title}
                author={book.author}
                genre={book.genre}
                coverImageUrl={book.coverImageUrl}
                height="320px"
              />

              {/* Minimalist Card Footer — Clean metadata without duplicate title text */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "12px",
                paddingLeft: "4px",
                paddingRight: "4px",
                fontFamily: "var(--font-mono)",
                fontSize: "11px"
              }}>
                <span style={{
                  color: "var(--text-muted)",
                  maxWidth: "160px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}>
                  {book.genre ? book.genre.split(',')[0].trim() : "Fiction"}
                </span>

                <span style={{ color: "var(--accent-gold)", fontWeight: 600 }}>
                  ★ {book.averageRating ? book.averageRating.toFixed(2) : "4.00"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 4. Minimalist Pagination */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "16px",
        fontFamily: "var(--font-mono)",
        fontSize: "13px"
      }}>
        <button
          disabled={page <= 1}
          onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          style={{
            padding: "8px 16px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-hairline)",
            color: page <= 1 ? "var(--text-muted)" : "var(--text-primary)",
            borderRadius: "6px",
            cursor: page <= 1 ? "default" : "pointer"
          }}
        >
          ← Previous
        </button>

        <span style={{ color: "var(--text-muted)" }}>
          Page <strong style={{ color: "var(--text-primary)" }}>{page}</strong> of {totalPages || 1}
        </span>

        <button
          disabled={page >= totalPages}
          onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          style={{
            padding: "8px 16px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-hairline)",
            color: page >= totalPages ? "var(--text-muted)" : "var(--text-primary)",
            borderRadius: "6px",
            cursor: page >= totalPages ? "default" : "pointer"
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default BookList;
