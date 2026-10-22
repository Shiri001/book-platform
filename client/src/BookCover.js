import React from 'react';

// Generates rich velvet genre palettes matching Noir Cinema aesthetic
function getGenreStyle(genre = "") {
  const g = genre.toLowerCase();
  if (g.includes("classic") || g.includes("literature")) {
    return {
      gradient: "linear-gradient(145deg, #0f172a 0%, #1e1b4b 100%)",
      accent: "#e5c07b", // warm gold
      badge: "CLASSIC"
    };
  }
  if (g.includes("thriller") || g.includes("mystery") || g.includes("crime") || g.includes("horror")) {
    return {
      gradient: "linear-gradient(145deg, #260909 0%, #0a0404 100%)",
      accent: "#f87171", // muted crimson
      badge: "NOIR"
    };
  }
  if (g.includes("sci-fi") || g.includes("science fiction") || g.includes("dystopia")) {
    return {
      gradient: "linear-gradient(145deg, #03201f 0%, #061118 100%)",
      accent: "#38bdf8", // cyan
      badge: "SPECULATIVE"
    };
  }
  if (g.includes("romance")) {
    return {
      gradient: "linear-gradient(145deg, #2a0a1e 0%, #0f040b 100%)",
      accent: "#f472b6", // rose
      badge: "ROMANCE"
    };
  }
  if (g.includes("history") || g.includes("biography") || g.includes("nonfiction")) {
    return {
      gradient: "linear-gradient(145deg, #241607 0%, #0d0a06 100%)",
      accent: "#fbbf24", // amber
      badge: "HISTORICAL"
    };
  }
  // Default Velvet Charcoal
  return {
    gradient: "linear-gradient(145deg, #181822 0%, #0a0a0f 100%)",
    accent: "#cbd5e1",
    badge: "EDITION"
  };
}

// Converts standard Goodreads & OpenLibrary thumbnail URLs to Crystal-Clear Large HD
function getHighResUrl(url) {
  if (!url) return null;
  // Upgrade Goodreads from 'm/' (100px) to 'l/' (400px+ HD)
  if (url.includes("gr-assets.com/books/")) {
    return url.replace(/m\/(\d+\.jpg)$/, "l/$1");
  }
  // Upgrade Open Library from '-M.jpg' to '-L.jpg' (HD)
  if (url.includes("covers.openlibrary.org/")) {
    return url.replace("-M.jpg", "-L.jpg");
  }
  // Upgrade Google Books from zoom=1 to zoom=2
  if (url.includes("books.google.com/")) {
    return url.replace("zoom=1", "zoom=2").replace("&edge=curl", "");
  }
  return url;
}

function BookCover({ title, author, genre, coverImageUrl, height = "280px" }) {
  const [imgError, setImgError] = React.useState(false);
  const highRes = getHighResUrl(coverImageUrl);

  if (highRes && !imgError) {
    return (
      <div style={{
        height,
        width: "100%",
        borderRadius: "6px",
        overflow: "hidden",
        boxShadow: "0 10px 25px rgba(0,0,0,0.7)",
        backgroundColor: "#0d0d12",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <img
          src={highRes}
          alt={title}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  const style = getGenreStyle(genre);

  return (
    <div style={{
      height,
      width: "100%",
      borderRadius: "6px",
      background: style.gradient,
      position: "relative",
      padding: "20px 18px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      overflow: "hidden",
      // 3D tactile book spine shadow on the left edge:
      boxShadow: "inset 7px 0 12px rgba(0,0,0,0.7), 0 8px 20px rgba(0,0,0,0.6)",
      border: "1px solid rgba(255, 255, 255, 0.08)"
    }}>
      {/* Decorative inner hairline frame */}
      <div style={{
        position: "absolute",
        top: "8px",
        left: "14px",
        right: "8px",
        bottom: "8px",
        border: "1px solid rgba(255, 255, 255, 0.07)",
        borderRadius: "4px",
        pointerEvents: "none"
      }} />

      {/* Top Header: Imprint Badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 1 }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          letterSpacing: "2px",
          color: style.accent,
          textTransform: "uppercase",
          fontWeight: 600
        }}>
          PAGEVALENCE
        </span>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: "8px",
          letterSpacing: "1px",
          color: "rgba(255,255,255,0.4)",
          border: "1px solid rgba(255,255,255,0.15)",
          padding: "1px 5px",
          borderRadius: "3px"
        }}>
          {style.badge}
        </span>
      </div>

      {/* Center: Elegant Dramatic Title in Bodoni Moda */}
      <div style={{ zIndex: 1, marginTop: "auto", marginBottom: "auto" }}>
        <h2 style={{
          fontFamily: "var(--font-serif)",
          fontSize: title.length > 30 ? "17px" : "20px",
          fontWeight: 600,
          lineHeight: 1.25,
          color: "#fff",
          letterSpacing: "-0.2px",
          display: "-webkit-box",
          WebkitLineClamp: 4,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textShadow: "0 2px 8px rgba(0,0,0,0.8)"
        }}>
          {title}
        </h2>
        <div style={{
          width: "24px",
          height: "2px",
          backgroundColor: style.accent,
          marginTop: "12px",
          opacity: 0.8
        }} />
      </div>

      {/* Bottom: Author byline */}
      <div style={{ zIndex: 1 }}>
        <p style={{
          fontFamily: "var(--font-sans)",
          fontSize: "12px",
          fontWeight: 500,
          color: "rgba(255,255,255,0.75)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis"
        }}>
          {author}
        </p>
      </div>
    </div>
  );
}

export default BookCover;
