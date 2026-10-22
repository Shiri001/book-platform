# Book Platform (PageValence) — Discovery & Semantic Recommender

A full-stack book discovery and recommendation system powered by a React frontend, Node/Express API gateway on Neon PostgreSQL, and a Python FastAPI microservice serving dense vector embeddings across a 9,806-book catalog.

---

## Architecture Overview

```
                      ┌─────────────────────────────────────────┐
                      │            React 19 Frontend            │
                      │   (Catalog, Filters, Book Detail, Shelf)│
                      └────────────────────┬────────────────────┘
                                           │ HTTP (port 3001)
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │          Node.js / Express Gateway      │
                      │          (Port 3000, App Logic)         │
                      └─────────────┬─────────────────────┬─────┘
                                    │                     │
                  PostgreSQL / SQL  │                     │ HTTP proxy (3s timeout)
                  Sequelize ORM     │                     │ + Cover Hydration
                                    ▼                     ▼
           ┌─────────────────────────────┐   ┌─────────────────────────────┐
           │     Neon PostgreSQL DB      │   │     FastAPI ML Service      │
           │  - 9,806 books              │   │     (Python, Port 8000)     │
           │  - Multi-genre tags         │   │  - all-MiniLM-L6-v2 vectors │
           │  - Enriched cover art URLs  │   │  - Dual-mode re-ranking     │
           │  - Reading shelves          │   │  - In-memory 15MB matrix    │
           └─────────────────────────────┘   └─────────────────────────────┘
```

---

## Tech Stack & Design Decisions

| Layer | Technologies | Practical Role & Notes |
| :--- | :--- | :--- |
| **Frontend** | React 19, `react-router-dom` | Clean SPA with catalog browsing, genre filters, reading shelf, and book detail pages with recommendations. Includes a custom physical book cover component with left spine crease and genre gradient fallbacks. |
| **API Gateway** | Node.js, Express, Sequelize | Handles catalog pagination, multi-genre filtering, shelf CRUD, and acts as a gateway to the ML service with circuit-breaker timeouts and cover image hydration. |
| **ML Microservice** | Python 3, FastAPI, SentenceTransformers, scikit-learn | Serves 384-dimensional dense semantic vectors (`all-MiniLM-L6-v2`) over 9,806 books. Evaluates vector dot products in under 5ms using an in-memory normalized embedding matrix ($O(N \times D)$). |
| **Database** | PostgreSQL (Neon serverless), Sequelize ORM | Relational storage for catalog entries, reviews, and shelves. Uses `DataTypes.TEXT` for long descriptions and cover URLs, with partial index queries. |
| **Data Pipeline** | Node streaming parser (`csv-parser`), Goodreads CDN & Open Library | Cleaned and seeded 9,806 books from Goodreads 10k dataset; enriched 3,200+ titles with high-res cover artwork. |

---

## Key Features

1. **Catalog Exploration & Filtering**:
   - Paginated catalog browsing (20 books per page).
   - Multi-genre search using case-insensitive SQL wildcard matching (`ILIKE %genre%`), correctly handling compound genres (e.g. `Fantasy, Fiction, Young Adult`).
   - Priority ordering: queries sort books with valid `coverImageUrl` first so visual covers are prioritized on page 1.

2. **Dual-Mode Vector Recommender**:
   - **More Like This (Exploitation)**: Surfaces books with highest semantic similarity, including sequels and other works by the same author.
   - **Discover Something New (Exploration / Serendipity)**: Filters out the current author and same-series titles, surfacing thematic equivalents by different authors.
   - Recommendations are enriched with database cover images before being sent to the client.

3. **Personal Reading Shelf**:
   - Add books to a personal reading shelf (`POST /api/shelf`).
   - Relational joins (`Shelf.findAll({ include: Book })`) display saved items with links back to catalog entries.

4. **Resilient Microservice Integration**:
   - Express queries FastAPI with a 3-second timeout.
   - If the ML service is offline or restarting, Express catches `ECONNREFUSED` and returns a clean 503 fallback payload rather than crashing the client.

---

## Current Status & Progress Log

- [x] **Day 1–4**: Express server setup, REST routing, error middleware, React client scaffolding, and `react-router-dom` navigation.
- [x] **Day 5–7**: PostgreSQL integration with Sequelize, relational `Book` and `Review` schemas, pagination, and Google Books API ingestion experiment.
- [x] **Day 8**: Relational `Shelf` model, optimistic UI state handling, and database maintenance scripts.
- [x] **Day 9–10**: ML workspace setup, text normalization, weighted feature engineering (`content_soup`), TF-IDF baseline with `linear_kernel` cosine similarity.
- [x] **Day 11**: Dense semantic embeddings (`all-MiniLM-L6-v2`, 384-dim), lexical gap benchmark demonstrating semantic recall over TF-IDF.
- [x] **Day 12**: Schema migration to `TEXT` fields for long URLs/descriptions, multi-genre taxonomy design, and transition to Goodreads 10k dataset.
- [x] **Day 13**: Seeded 9,806 books into Neon PostgreSQL; built FastAPI microservice with lifespan in-memory model loading; built Express recommendation gateway.
- [x] **Day 14**: Enriched 3,200+ book covers via Goodreads CDN and Open Library; built custom book cover component; fixed multi-genre wildcard filtering and cover-first priority sorting; hydrated recommendation cover URLs.
- [ ] **Day 15–16**: User authentication (Google OAuth / JWT) and user-scoped shelves.
- [ ] **Day 17–18**: RAG-based AI chat assistant (Gemini API grounded with catalog embeddings).
- [ ] **Day 19–20**: Production deployment (Vercel, Render/Railway, Neon).

---

## Running Locally

### 1. Prerequisites
- Node.js (v18+)
- Python 3.10+
- PostgreSQL connection string (configured in `server/.env`)

### 2. ML Microservice (FastAPI)
```bash
cd ml
python -m venv venv

# Windows:
.\venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt

# Pre-train / cache the embeddings (if embeddings_model.joblib is not present):
python embeddings_recommender.py

# Start service on port 8000:
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Backend Gateway (Node / Express)
```bash
cd server
npm install

# Start with nodemon auto-reloading on port 3000:
npm run dev
```

### 4. Frontend Client (React)
```bash
cd client
npm install
npm start
# Opens in browser on http://localhost:3001 (or 3000)
```

---

## Directory Structure

```
book-platform/
├── client/                     # React 19 frontend
│   ├── src/
│   │   ├── App.js              # Shell layout & live ML service status
│   │   ├── BookList.js         # Catalog grid, genre filter pills, pagination
│   │   ├── BookDetail.js       # Book metadata, synopsis, recommendations grid
│   │   ├── BookCover.js        # Physical book cover with 3D spine & fallback gradients
│   │   ├── Shelf.js            # User shelf with relational Book hydration
│   │   └── index.css           # Design tokens, dark layout, typography
│   └── package.json
├── server/                     # Node.js + Express API gateway
│   ├── index.js                # REST API, DB queries, FastAPI gateway with cover hydration
│   ├── models/                 # Sequelize models (Book, Review, Shelf)
│   ├── scripts/                # Ingestion, enrichment, and maintenance scripts
│   └── package.json
├── ml/                         # Python ML microservice
│   ├── main.py                 # FastAPI app (GET /health, GET /recommend)
│   ├── embeddings_recommender.py # SentenceTransformers 384-dim pipeline
│   ├── recommender.py          # TF-IDF baseline recommender
│   ├── data_prep.py            # Text cleaning & weighted content soup
│   ├── benchmark.py            # TF-IDF vs Dense Embeddings evaluation
│   └── requirements.txt
├── NOTES.md                    # Detailed engineering notes and decision logs
└── README.md
```
