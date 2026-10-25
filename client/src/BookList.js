import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import BookCover from './BookCover';

const GENRES = ["All", "Classics", "Fiction", "Historical Fiction", "Dystopia", "Fantasy", "Romance", "Science Fiction"];

function BookList() {
  const [books, setBooks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [loading, setLoading] = useState(true);

  const LIMIT = 18; // 18 books per page fits a clean 3x6 or 2x9 grid
  const { isAuthenticated, user, openAuthModal, loginWithGoogle } = useAuth();


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

      {/* 1. Goodreads-Inspired Editorial Split Hero */}
      <section style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "48px",
        alignItems: "center",
        marginBottom: "64px",
        padding: "40px 0 20px 0"
      }}>
        {/* Left Column: Literary Invitation & Call to Action */}
        <div>
          <p style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "3px",
            color: "var(--accent-gold)",
            textTransform: "uppercase",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span style={{ display: "inline-block", width: "18px", height: "1px", backgroundColor: "var(--accent-gold)" }} />
            Literary Discovery & Reading Shelves
          </p>

          <h1 style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(34px, 4.2vw, 56px)",
            fontWeight: 400,
            letterSpacing: "-0.5px",
            lineHeight: 1.15,
            color: "var(--text-primary)",
            marginBottom: "20px"
          }}>
            Books chosen for how they resonate, not just what they're called.
          </h1>

          <p style={{
            fontSize: "16px",
            color: "var(--text-secondary)",
            lineHeight: 1.7,
            marginBottom: "32px",
            maxWidth: "520px"
          }}>
            Tell us what moved you, and our semantic engine finds works that share the same soul, themes, and emotional depth across 9,800+ volumes.
          </p>

          {/* Action Buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center" }}>
            <button
              onClick={() => {
                const el = document.getElementById("catalog-grid");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                padding: "12px 26px",
                background: "var(--text-primary)",
                color: "var(--bg-primary)",
                border: "none",
                borderRadius: "30px",
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
                transition: "opacity 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              Browse Catalog ↓
            </button>

            {!isAuthenticated && (
              <button
                onClick={() => openAuthModal("signup")}
                style={{
                  padding: "12px 24px",
                  background: "transparent",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-hairline)",
                  borderRadius: "30px",
                  fontFamily: "var(--font-sans)",
                  fontWeight: 500,
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-focus)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-hairline)"}
              >
                Create Account →
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Goodreads-Style Onboarding Card */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{
            width: "100%",
            maxWidth: "380px",
            background: "linear-gradient(180deg, #121218 0%, #0d0d12 100%)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "18px",
            padding: "32px 28px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)"
          }}>
            {isAuthenticated ? (
              /* If User is already signed in: Welcome Back Card */
              <div style={{ textAlign: "center" }}>
                <div style={{ marginBottom: "16px" }}>
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      style={{ width: "56px", height: "56px", borderRadius: "50%", border: "2px solid var(--border-focus)" }}
                    />
                  ) : (
                    <div style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      background: "var(--accent-gold)",
                      color: "#000",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      fontWeight: 700
                    }}>
                      {user.name?.[0]}
                    </div>
                  )}
                </div>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", color: "var(--text-primary)", marginBottom: "6px" }}>
                  Welcome back, {user.name?.split(" ")[0]}
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px" }}>
                  Your personal library is waiting. Track what you've read and get recommendations.
                </p>
                <Link
                  to="/shelf"
                  style={{
                    display: "block",
                    padding: "12px",
                    background: "var(--text-primary)",
                    color: "var(--bg-primary)",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "14px",
                    textDecoration: "none"
                  }}
                >
                  View My Reading Shelf →
                </Link>
              </div>
            ) : (
              /* If Guest: Goodreads Onboarding Card with Google + Email */
              <div>
                <h3 style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "22px",
                  fontWeight: 400,
                  color: "var(--text-primary)",
                  marginBottom: "8px"
                }}>
                  Discover & read more
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "24px" }}>
                  Save books to your reading shelf, explore 9,800+ titles, and discover semantic neighbors.
                </p>

                {/* 1. Continue with Google */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                  <GoogleLogin
                    onSuccess={loginWithGoogle}
                    onError={() => console.error("Google Login Failed")}
                    theme="filled_black"
                    shape="pill"
                    size="large"
                    text="continue_with"
                  />
                </div>

                {/* Divider */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  margin: "18px 0",
                  color: "var(--text-muted)",
                  fontSize: "11px",
                  fontFamily: "var(--font-mono)"
                }}>
                  <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-hairline)" }} />
                  <span>OR</span>
                  <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-hairline)" }} />
                </div>

                {/* 2. Sign Up with Email Button */}
                <button
                  onClick={() => openAuthModal("signup")}
                  style={{
                    width: "100%",
                    padding: "11px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid var(--border-hairline)",
                    color: "var(--text-primary)",
                    borderRadius: "30px",
                    fontFamily: "var(--font-sans)",
                    fontWeight: 500,
                    fontSize: "13px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.borderColor = "var(--border-focus)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.06)";
                    e.currentTarget.style.borderColor = "var(--border-hairline)";
                  }}
                >
                  ✉ Sign up with email
                </button>

                {/* 3. Already a member? Sign In */}
                <p style={{ marginTop: "20px", textAlign: "center", fontSize: "12px", color: "var(--text-muted)" }}>
                  Already a member?{" "}
                  <button
                    onClick={() => openAuthModal("signin")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--accent-cyan)",
                      cursor: "pointer",
                      fontWeight: 600,
                      padding: 0
                    }}
                  >
                    Sign In
                  </button>
                </p>
              </div>
            )}
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
        <div id="catalog-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "24px" }}>
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
