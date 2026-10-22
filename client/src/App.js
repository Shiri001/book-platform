import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import BookList from './BookList';
import BookDetail from './BookDetail';
import Shelf from './Shelf';

function Navigation() {
  const location = useLocation();

  return (
    <header style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      backdropFilter: "blur(16px)",
      backgroundColor: "rgba(5, 5, 5, 0.8)",
      borderBottom: "1px solid var(--border-hairline)",
      padding: "16px 32px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }}>
      {/* Brand Logo in Bodoni Moda Serif */}
      <Link to="/" style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
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

      {/* Nav Links */}
      <nav style={{ display: "flex", gap: "24px", alignItems: "center" }}>
        <Link
          to="/"
          style={{
            fontSize: "14px",
            color: location.pathname === "/" ? "var(--text-primary)" : "var(--text-muted)",
            fontWeight: location.pathname === "/" ? 600 : 400,
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
          marginLeft: "12px",
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
      </nav>
    </header>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: "100vh", position: "relative" }}>
        <Navigation />
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
