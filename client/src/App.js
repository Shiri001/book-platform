import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import BookList from './BookList';
import BookDetail from './BookDetail';
import Shelf from './Shelf';
import { useAuth } from './AuthContext';
import AuthModal from './AuthModal';

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, openAuthModal } = useAuth();

  const [quickSearch, setQuickSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Submit quick search from top navigation
  const handleQuickSearch = (e) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      navigate(`/?search=${encodeURIComponent(quickSearch.trim())}`);
      // Smoothly scroll down to catalog console if already on home
      const el = document.getElementById("catalog-console");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      backdropFilter: "blur(16px)",
      backgroundColor: "rgba(5, 5, 5, 0.8)",
      borderBottom: "1px solid var(--border-hairline)",
      padding: "14px 32px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "24px"
    }}>
      {/* 1. Brand Logo in Bodoni Moda Serif */}
      <Link to="/" style={{ display: "flex", alignItems: "baseline", gap: "12px", textDecoration: "none", flexShrink: 0 }}>
        <span style={{
          fontFamily: "var(--font-serif)",
          fontSize: "22px",
          fontWeight: 700,
          letterSpacing: "2px",
          color: "var(--text-primary)"
        }}>
          PAGEVALENCE
        </span>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          letterSpacing: "1.5px",
          color: "var(--accent-cyan)",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          padding: "2px 6px",
          borderRadius: "4px"
        }}>
          384-DIM ML
        </span>
      </Link>

      {/* 2. Global Quick Search Bar */}
      <form
        onSubmit={handleQuickSearch}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: isFocused ? "rgba(20, 20, 26, 0.95)" : "rgba(255, 255, 255, 0.04)",
          border: isFocused ? "1px solid var(--border-focus)" : "1px solid var(--border-hairline)",
          borderRadius: "24px",
          padding: "6px 14px",
          width: "100%",
          maxWidth: isFocused ? "340px" : "260px",
          transition: "all 0.25s ease",
          boxShadow: isFocused ? "0 0 16px rgba(56, 189, 248, 0.15)" : "none"
        }}
      >
        <span style={{ fontSize: "14px", color: "var(--text-muted)", userSelect: "none" }}>
          ⌕
        </span>
        <input
          type="text"
          value={quickSearch}
          onChange={e => setQuickSearch(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Quick search catalog..."
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-primary)",
            fontSize: "13px",
            fontFamily: "var(--font-sans)",
            width: "100%"
          }}
        />
        {quickSearch && (
          <button
            type="button"
            onClick={() => setQuickSearch('')}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "11px",
              padding: 0
            }}
          >
            ✕
          </button>
        )}
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          color: "var(--text-muted)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "3px",
          padding: "1px 5px",
          userSelect: "none"
        }}>
          ↵
        </span>
      </form>

      {/* 3. Nav Links & Auth Area */}
      <nav style={{ display: "flex", gap: "24px", alignItems: "center", flexShrink: 0 }}>
        <Link
          to="/"
          style={{
            fontSize: "14px",
            color: location.pathname === "/" ? "var(--text-primary)" : "var(--text-muted)",
            fontWeight: location.pathname === "/" ? 600 : 400,
            textDecoration: "none",
            transition: "color 0.2s"
          }}
        >
          Catalog
        </Link>
        <Link
          to="/shelf"
          style={{
            fontSize: "14px",
            color: location.pathname === "/shelf" ? "var(--text-primary)" : "var(--text-muted)",
            fontWeight: location.pathname === "/shelf" ? 600 : 400,
            textDecoration: "none",
            transition: "color 0.2s"
          }}
        >
          My Shelf
        </Link>

        {/* ML Engine Status Dot */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "var(--accent-green)",
          marginLeft: "8px",
          paddingLeft: "16px",
          borderLeft: "1px solid var(--border-hairline)"
        }}>
          <span style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: "var(--accent-green)",
            boxShadow: "0 0 8px var(--accent-green)"
          }} />
          FASTAPI ONLINE
        </div>

        {/* Dynamic Auth Section */}
        <div style={{
          marginLeft: "12px",
          paddingLeft: "16px",
          borderLeft: "1px solid var(--border-hairline)",
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}>
          {isAuthenticated ? (
            /* Logged In State: Avatar + First Name + Sign Out */
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    border: "1px solid var(--border-focus)",
                    objectFit: "cover"
                  }}
                />
              ) : (
                <div style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "var(--accent-gold)",
                  color: "#000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 700
                }}>
                  {user.name?.[0]}
                </div>
              )}
              <span style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--text-primary)"
              }}>
                {user.name?.split(" ")[0]}
              </span>

              <button
                onClick={logout}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-hairline)",
                  color: "var(--text-muted)",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = "#f87171";
                  e.currentTarget.style.borderColor = "rgba(248, 113, 113, 0.4)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = "var(--text-muted)";
                  e.currentTarget.style.borderColor = "var(--border-hairline)";
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            /* Logged Out State: Opens AuthModal with Google + Email options! */
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                onClick={() => openAuthModal("signin")}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-hairline)",
                  color: "var(--text-primary)",
                  padding: "7px 16px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontFamily: "var(--font-sans)",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-focus)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-hairline)"}
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: "100vh", position: "relative" }}>
        <Navigation />
        <AuthModal /> {/* <-- Global Auth Modal */}
        <main>
          <Routes>
            <Route path="/" element={<BookList />} />
            <Route path="/books/:id" element={<BookDetail />} />
            <Route path="/shelf" element={<Shelf />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
