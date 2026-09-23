# 📝 Book Platform — Engineering Notes & Daily Log

---

## 🏗️ 1. Tech Stack Justifications

### Frontend — React
- **Why**: The app has multiple interconnected views (browse, detail, shelf) sharing data and state — React's component model handles this cleanly versus manually wiring up DOM updates in plain JS.
- **Alternative considered**: Plain HTML/JS — viable for something this size, but would mean re-building state management React already provides. Vue/Angular are comparable technically; React is chosen for its dominant industry adoption and interview relevance.

### App Backend — Node.js + Express
- **Why**: Deliberately separates the "product" layer (routes, book/review/shelf logic) from the ML layer. This mirrors a real industry pattern — Python owns ML, a JS/Java/Go service owns the app — and gives hands-on Node/Express reps specifically because university recruiters test full-stack skills directly, not just ML.
- **Alternative considered**: Doing everything in FastAPI alone — technically simpler and would still work, but removes the one place in this project generating deliberate JS backend practice. Since full-stack readiness is an explicit goal, the added complexity here is intentional, not accidental.

### ML Service — FastAPI (Python)
- **Why**: The recommender and sentiment models are Python-native (`scikit-learn`, `sentence-transformers`) — FastAPI serves them directly with no cross-language translation. It also has native async support, automatic request validation (Pydantic), and auto-generated docs (`/docs`), all useful for testing and demoing.
- **Alternative considered**: Flask — older, no built-in validation or async, generally considered less current for modern ML serving.

### Database — PostgreSQL + Sequelize
- **Why**: Chosen specifically after examining the actual data shape: books have many reviews, shelf entries reference books — genuine one-to-many relational structure. PostgreSQL allows real `JOIN` queries (e.g., fetching a shelf entry alongside joined book details in a single query via Sequelize `include: Book`), which is both a more natural fit for this data and better interview-relevant practice than MongoDB's `.populate()` workaround.
- **Alternative considered**: MongoDB — would work, but data doesn't need variable-shape documents; using it here would mean forcing a relational model into a document store.

### Deployment — Render/Railway (Node + FastAPI), Vercel (React), Neon (Postgres)
- **Why**: Free-tier friendly, straightforward for multi-service deployment without managing raw VMs, and produces a live, shareable link for resumes.

---

## 📅 2. Daily Engineering Log

### Days 1–4: Backend Foundations & React Navigation
- **Day 1**: Express basics — routing, `req.params` vs `req.query`, global 404 middleware.
- **Day 2**: Connecting React to Express via `fetch`, configuring CORS (`cors` middleware).
- **Day 3**: Integrating `react-router-dom` (`<BrowserRouter>`, `<Routes>`, `<Route>`) for list-to-detail navigation.
- **Day 4**: Detail-page 404 handling (`book === "not-found"` state), tech-stack justification notes.

### Days 5–7: Relational Database & Data Pipeline
- **Day 5**: PostgreSQL + Sequelize setup; defined `Book` and `Review` models with `hasMany` / `belongsTo` foreign key associations.
- **Day 6**: Google Books API data ingestion pipeline (`server/scripts/seedCatalog.js`):
  - Fetched 10 diverse genres with pagination (`startIndex`).
  - Data normalization and quality filtering (omitting books without title or description).
  - In-memory deduplication via `Set` tracking `googleBooksId`.
  - Bulk insertion into PostgreSQL (`Book.bulkCreate(..., { ignoreDuplicates: true })`), seeding 440 real books.
- **Day 7**: API response pagination (`Book.findAndCountAll({ limit, offset })`), genre filtering (`Op.iLike`), and relational `Shelf` model definition.

### Day 8: Shelf Write-Read Loop & Resilient UI Feedback
- **POST /api/shelf**: Connected `BookDetail.js` to create shelf entries (`{ bookId, status: "want-to-read" }`).
- **UI State & Closures**:
  - Moved `addToShelf` inside `BookDetail` component to access React state.
  - Implemented `const [added, setAdded] = useState(false)` to trigger immediate UI feedback (`"Added to shelf"`) and disable button (`disabled={added}`) to prevent network spamming.
- **Relational Shelf Page (`Shelf.js`)**:
  - Created `client/src/Shelf.js` consuming `GET /api/shelf`.
  - Relational SQL hydration via `Shelf.findAll({ include: Book })`.
  - Added null-safety check (`{entry.Book ? <Link ...> : <span>Unknown Book</span>}`) to handle dangling foreign keys gracefully.
- **App Navigation**: Added persistent top `<nav>` linking between `/` (Catalog) and `/shelf` (My Shelf).
- **Database Maintenance**: Created `server/scripts/cleanShelf.js` using `Shelf.destroy({ where: {}, truncate: true, restartIdentity: true })` to safely reset shelf test state.
- **Edge Cases Identified for Future Auth Milestone**:
  - Currently single-user; duplicate additions are allowed. When JWT/Auth is added, enforce composite unique index `(userId, bookId)` or use Sequelize `findOrCreate`.
  - Future support for `PUT /api/shelf/:id` to transition reading progress (`want-to-read` -> `reading` -> `finished`).

---

## 🎯 3. Upcoming Milestones
- **Day 9**: Recommender Engine setup — Goodreads dataset curation, text cleaning, and `content_soup` feature engineering.
- **Day 10**: TF-IDF Baseline + Cosine Similarity computation.
- **Day 11**: Dense semantic embeddings with `all-MiniLM-L6-v2`.
- **Day 12**: Generalization validation against the 440-book PostgreSQL catalog.