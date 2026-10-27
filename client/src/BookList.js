import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import BookCover from './BookCover';

const GENRES = ["All", "Classics", "Fiction", "Historical Fiction", "Dystopia", "Fantasy", "Romance", "Science Fiction"];

function BookList() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state initialization
  const urlSearch = searchParams.get('search') || '';
  const urlGenre = searchParams.get('genre') || 'All';
  const urlAuthor = searchParams.get('author') || '';
  const urlSort = searchParams.get('sortBy') || 'featured';

  const [books, setBooks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedGenre, setSelectedGenre] = useState(urlGenre);
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
  const [authorFilter, setAuthorFilter] = useState(urlAuthor);
  const [sortBy, setSortBy] = useState(urlSort);
  const [loading, setLoading] = useState(true);

  const LIMIT = 18;
  const { isAuthenticated, user, openAuthModal, loginWithGoogle } = useAuth();

  // Sync state if navbar search or URL params change externally
  useEffect(() => {
    const s = searchParams.get('search') || '';
    const g = searchParams.get('genre') || 'All';
    const a = searchParams.get('author') || '';
    const sort = searchParams.get('sortBy') || 'featured';

    setSearchQuery(s);
    setDebouncedSearch(s);
    setSelectedGenre(g);
    setAuthorFilter(a);
    setSortBy(sort);
    setPage(1);
  }, [searchParams]);

  // Debounce search input typing by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch catalog with search, genre, author, sortBy, and pagination
  useEffect(() => {
    setLoading(true);

    const params = new URLSearchParams();
    params.set('page', page);
    params.set('limit', LIMIT);

    if (selectedGenre && selectedGenre !== "All") params.set('genre', selectedGenre);
    if (debouncedSearch && debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (authorFilter && authorFilter.trim()) params.set('author', authorFilter.trim());
    if (sortBy && sortBy !== "featured") params.set('sortBy', sortBy);

    fetch(`http://localhost:3000/api/books?${params.toString()}`)
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
  }, [page, selectedGenre, debouncedSearch, authorFilter, sortBy]);

  // Helper to reset all search/filter controls
  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedGenre('All');
    setAuthorFilter('');
    setSortBy('featured');
    setPage(1);
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(
    (searchQuery && searchQuery.trim()) ||
    (selectedGenre && selectedGenre !== 'All') ||
    (authorFilter && authorFilter.trim()) ||
    sortBy !== 'featured'
  );

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 24px" }}>

      {/* 1. Goodreads-Inspired Editorial Split Hero */}
      <section style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "48px",
        alignItems: "center",
        marginBottom: "48px",
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
                const el = document.getElementById("catalog-console");
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
              Search & Browse Catalog ↓
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
                Create Free Reading Account
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Dynamic User Card or Guest Onboarding */}
        <div>
          <div style={{
            background: "linear-gradient(145deg, rgba(22, 22, 28, 0.7), rgba(12, 12, 16, 0.9))",
            border: "1px solid var(--border-hairline)",
            borderRadius: "16px",
            padding: "36px 32px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(12px)",
            position: "relative"
          }}>
            {isAuthenticated ? (
              <div>
                <p style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--accent-cyan)",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  marginBottom: "8px"
                }}>
                  Active Reader
                </p>
                <h3 style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "24px",
                  fontWeight: 400,
                  color: "var(--text-primary)",
                  marginBottom: "12px"
                }}>
                  Welcome back, {user?.name || "Reader"}
                </h3>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "24px" }}>
                  Your personal library is waiting. Track page goals, capture reading reflections, and browse semantic recommendations.
                </p>
                <Link
                  to="/shelf"
                  style={{
                    display: "inline-block",
                    padding: "12px 24px",
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

      {/* 2. Cinema Search Console */}
      <section
        id="catalog-console"
        style={{
          background: "linear-gradient(180deg, rgba(20, 20, 26, 0.7) 0%, rgba(10, 10, 14, 0.8) 100%)",
          border: "1px solid var(--border-hairline)",
          borderRadius: "16px",
          padding: "24px 28px",
          marginBottom: "36px",
          boxShadow: "0 12px 30px rgba(0, 0, 0, 0.35)",
          backdropFilter: "blur(12px)"
        }}
      >
        {/* Main Search Input Row */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          background: "rgba(5, 5, 8, 0.7)",
          border: "1px solid var(--border-hairline)",
          borderRadius: "12px",
          padding: "10px 18px",
          marginBottom: "20px",
          transition: "border-color 0.2s, box-shadow 0.2s"
        }}>
          {/* Magnifying Glass Icon */}
          <span style={{ fontSize: "18px", color: "var(--text-muted)", userSelect: "none" }}>
            ⌕
          </span>

          {/* Search Input */}
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by title, author, or description keywords (e.g. Orwell, Dystopia, Gatsby)..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: "15px",
              fontFamily: "var(--font-sans)"
            }}
          />

          {/* Clear Button */}
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setDebouncedSearch(''); setPage(1); }}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "none",
                color: "var(--text-muted)",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Controls Row: Genre Pills & Sort Dropdown */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px"
        }}>
          {/* Genre Pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "1.5px",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              marginRight: "4px"
            }}>
              Genre:
            </span>
            {GENRES.map(g => (
              <button
                key={g}
                onClick={() => { setSelectedGenre(g); setPage(1); }}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "12px",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: selectedGenre === g ? "1px solid var(--text-primary)" : "1px solid var(--border-hairline)",
                  background: selectedGenre === g ? "var(--text-primary)" : "rgba(255, 255, 255, 0.03)",
                  color: selectedGenre === g ? "var(--bg-primary)" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontWeight: selectedGenre === g ? 600 : 400,
                  transition: "all 0.2s"
                }}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Sort By Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "1.5px",
              color: "var(--text-muted)",
              textTransform: "uppercase"
            }}>
              Sort:
            </label>
            <select
              value={sortBy}
              onChange={e => { setSortBy(e.target.value); setPage(1); }}
              style={{
                background: "rgba(5, 5, 8, 0.8)",
                border: "1px solid var(--border-hairline)",
                borderRadius: "8px",
                color: "var(--text-primary)",
                padding: "6px 12px",
                fontSize: "13px",
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
                outline: "none"
              }}
            >
              <option value="featured">Featured & Top Rated</option>
              <option value="rating">Highest Rated ★</option>
              <option value="title">Title (A → Z)</option>
            </select>
          </div>
        </div>

        {/* Active Filters Bar & Result Counter */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginTop: "18px",
          paddingTop: "14px",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)"
        }}>
          {/* Result count */}
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-secondary)" }}>
            {loading ? (
              <span>Searching catalog...</span>
            ) : (
              <span>
                Showing <strong style={{ color: "var(--text-primary)" }}>{books.length}</strong> of <strong style={{ color: "var(--text-primary)" }}>{total}</strong> volumes
                {debouncedSearch && <span> matching "<span style={{ color: "var(--accent-cyan)" }}>{debouncedSearch}</span>"</span>}
                {selectedGenre !== "All" && <span> in <span style={{ color: "var(--accent-gold)" }}>{selectedGenre}</span></span>}
              </span>
            )}
          </div>

          {/* Active Filter Tags & Reset All */}
          {hasActiveFilters && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {debouncedSearch && (
                <span style={{
                  fontSize: "11px",
                  background: "rgba(56, 189, 248, 0.12)",
                  color: "var(--accent-cyan)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}>
                  Search: "{debouncedSearch}"
                  <button
                    onClick={() => { setSearchQuery(''); setDebouncedSearch(''); setPage(1); }}
                    style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0 }}
                  >
                    ✕
                  </button>
                </span>
              )}

              {selectedGenre !== "All" && (
                <span style={{
                  fontSize: "11px",
                  background: "rgba(234, 179, 8, 0.12)",
                  color: "var(--accent-gold)",
                  border: "1px solid rgba(234, 179, 8, 0.3)",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}>
                  Genre: {selectedGenre}
                  <button
                    onClick={() => { setSelectedGenre('All'); setPage(1); }}
                    style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0 }}
                  >
                    ✕
                  </button>
                </span>
              )}

              <button
                onClick={handleResetFilters}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  textDecoration: "underline",
                  cursor: "pointer",
                  marginLeft: "4px"
                }}
              >
                Reset All
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 3. The Book Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
          Loading catalog volumes...
        </div>
      ) : books.length === 0 ? (
        /* Empty State */
        <div style={{
          textAlign: "center",
          padding: "60px 20px",
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px dashed var(--border-hairline)",
          borderRadius: "16px",
          marginBottom: "40px"
        }}>
          <p style={{ fontSize: "28px", marginBottom: "12px" }}>📖</p>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", color: "var(--text-primary)", marginBottom: "8px" }}>
            No volumes found
          </h3>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px", maxWidth: "420px", margin: "0 auto 20px auto" }}>
            We couldn't find any books matching your current search or genre filter. Try adjusting your search query or reset your filters.
          </p>
          <button
            onClick={handleResetFilters}
            style={{
              padding: "8px 20px",
              background: "var(--text-primary)",
              color: "var(--bg-primary)",
              border: "none",
              borderRadius: "20px",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            Clear All Filters
          </button>
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
                e.currentTarget.style.boxShadow = "0 12px 28px rgba(0, 0, 0, 0.6)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "var(--border-hairline)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{
                position: "relative",
                width: "100%",
                aspectRatio: "2 / 3",
                marginBottom: "12px",
                borderRadius: "6px",
                overflow: "hidden"
              }}>
                <BookCover
                  coverImageUrl={book.coverImageUrl}
                  title={book.title}
                  author={book.author}
                  genre={book.genre}
                  height="100%"
                />
              </div>


              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <h4 style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "4px",
                  lineHeight: 1.3,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}>
                  {book.title}
                </h4>

                <p style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  marginBottom: "8px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}>
                  {book.author}
                </p>

                <div style={{
                  marginTop: "auto",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "11px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)"
                }}>
                  <span style={{
                    color: "var(--accent-gold)",
                    border: "1px solid rgba(234, 179, 8, 0.2)",
                    padding: "2px 6px",
                    borderRadius: "4px"
                  }}>
                    ★ {book.averageRating ? Number(book.averageRating).toFixed(1) : "N/A"}
                  </span>
                  <span style={{
                    maxWidth: "110px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}>
                    {book.genre || "Literary"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 4. Catalog Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "12px",
          marginTop: "48px",
          paddingTop: "24px",
          borderTop: "1px solid var(--border-hairline)"
        }}>
          <button
            disabled={page === 1}
            onClick={() => {
              setPage(p => p - 1);
              const el = document.getElementById("catalog-console");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            style={{
              padding: "8px 16px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-hairline)",
              borderRadius: "6px",
              color: page === 1 ? "var(--text-muted)" : "var(--text-primary)",
              cursor: page === 1 ? "not-allowed" : "pointer"
            }}
          >
            ← Previous
          </button>

          <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-secondary)" }}>
            Page {page} of {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => {
              setPage(p => p + 1);
              const el = document.getElementById("catalog-console");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            style={{
              padding: "8px 16px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-hairline)",
              borderRadius: "6px",
              color: page === totalPages ? "var(--text-muted)" : "var(--text-primary)",
              cursor: page === totalPages ? "not-allowed" : "pointer"
            }}
          >
            Next →
          </button>
        </div>
      )}

    </div>
  );
}

export default BookList;
