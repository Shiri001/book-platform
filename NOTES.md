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

### Day 9: ML Workspace Setup & Weighted Feature Engineering
- **ML Environment Setup**:
  - Initialized isolated ML environment in `ml/` with `pandas`, `numpy`, and `scikit-learn`.
  - Configured `.gitignore` to cleanly exclude `venv/`, `__pycache__/`, and serialized model artifacts (`*.pkl`, `*.joblib`).
  - Added `ml/requirements.txt` for reproducibility.
- **Data Ingestion & Cleaning (`ml/data_prep.py`)**:
  - Built `load_and_prep_data` pipeline.
  - Handled missing values (`NaN`) using `.fillna('')` across text columns to prevent null-poisoning during concatenation.
  - Normalized genre tags by replacing comma delimiters with whitespace.
- **Weighted "Content Soup" Feature Engineering**:
  - *Dilemma*: Plot descriptions average ~80 words while author and genres average 2-4 words. Naive bag-of-words / TF-IDF would allow noisy plot vocabulary to overpower author/genre affinity.
  - *Solution*: Implemented Option B (Weighted Keywords):
    $$\text{content\_soup} = (\text{Author} \times 3) + (\text{Genres} \times 2) + (\text{Description} \times 1)$$
  - *Mathematical Impact*: Artificially increases Term Frequency (TF) for high-intent attributes, multiplying their contribution in cosine similarity dot products without requiring multiple vector spaces.
  - Verified pipeline output on `ml/goodreads_sample.csv`.

### Day 10: TF-IDF Vectorization, Cosine Similarity & Model Serialization
- **TF-IDF Pipeline (`ml/recommender.py`)**:
  - Implemented `TfidfVectorizer(stop_words='english')` across the weighted `content_soup`.
  - Matrix dimensions: `(N_books, Vocabulary_size)` (e.g., $10 \times 131$).
- **Optimized Similarity Computation (`linear_kernel`)**:
  - *Engineering Decision*: Used `linear_kernel` instead of `cosine_similarity`.
  - *Mathematical Defense*: `TfidfVectorizer` outputs L2-normalized vectors ($\|A\| = 1$). Cosine similarity simplifies to the pure dot product ($A \cdot B$), saving redundant norm calculations and reducing latency/memory overhead.
- **Recommendation Retrieval Engine (`get_recommendations`)**:
  - Reverse index mapping via `pd.Series(df.index, index=df['title'])` for $\mathcal{O}(1)$ title-to-index lookup.
  - Slices `sim_scores[1:top_n+1]` to intentionally exclude index 0 (a book's trivial self-similarity of $1.0$).
- **Model Artifact Persistence (`joblib`)**:
  - Bundled `cosine_sim`, `indices`, and `books` metadata into a unified dictionary and serialized to `tfidf_model.joblib`.
  - Enables sub-millisecond cold starts for the future FastAPI service without re-reading CSVs or recomputing matrix transformations.
- **Scalability Trade-Off Drill**:
  - Full matrix space complexity is $\mathcal{O}(N^2)$. Viable for catalogs up to ~50,000 items in memory; large-scale catalogs ($10^6$ items) require vector indexing (ANN / FAISS / HNSW).

### Day 11: Dense Semantic Embeddings (`all-MiniLM-L6-v2`) & Lexical Gap Benchmarking
- **SentenceTransformers Pipeline (`ml/embeddings_recommender.py`)**:
  - Integrated `all-MiniLM-L6-v2` (6 transformer layers, 384-dimensional dense latent vectors).
  - Encoded `content_soup` via mean-pooling into dense continuous vector space $\mathbb{R}^{384}$.
  - Computed pairwise cosine similarity across continuous representations.
  - Serialized model artifacts to `embeddings_model.joblib`.
- **Side-by-Side Benchmark (`ml/benchmark.py`)**:
  - Engineered dual-model evaluation harness comparing TF-IDF vs SentenceTransformer retrieval.
  - *Key Empirical Finding*: Discovered TF-IDF's failure on semantic synonyms ("Lexical Gap"). 
    - For *The Hunger Games*, TF-IDF ranked *The Book Thief* and *Harry Potter* due to surface word overlap (*"death"*, *"young adult"*).
    - SentenceTransformers ranked *Animal Farm* (#1, 0.335 similarity) by capturing latent thematic concepts of totalitarian oppression, propaganda, and dystopian rebellion despite completely disjoint plot vocabularies.
  - *Sparsity Collapse Observation*: On unique vocabularies (*The Hitchhiker's Guide to the Galaxy*), TF-IDF similarity scores degraded to near-zero (~0.04-0.05) due to high-dimensional orthogonality, while dense embeddings maintained stable similarity geometry (~0.25-0.27).
- **Placement Defense Takeaway**:
  - Sparse lexical matching provides exact keyword precision and $\mathcal{O}(1)$ CPU inference; dense embeddings provide thematic semantic recall. In production, this justifies modern **Hybrid Search** (combining sparse BM25/TF-IDF with dense vector search).

---

## 🎯 3. Upcoming Milestones & System Architecture

### Phase A: Recommender Productionization (Days 12–13)
- **Day 12**: Generalization Validation & Integration against the 440-book PostgreSQL Catalog (Hybrid scaling).
- **Day 13**: FastAPI Recommendation Microservice serving serialized transformer and TF-IDF models with in-memory caching.

### Phase B: Authentication & User Isolation (Days 14–15)
- **Google OAuth 2.0 Sign-In**: Direct Google Login integration issuing JWT sessions.
- **Relational User Modeling**: Connect shelves and reading history specifically to authenticated `userId`s in PostgreSQL (replacing anonymous test shelf).

### Phase C: Generative AI RAG Chatbot (Days 16–17)
- **RAG Architecture**:
  - *Retriever*: Our `all-MiniLM-L6-v2` dense embeddings pipeline retrieving top $K$ relevant book dossiers.
  - *Generator*: Google Gemini LLM API grounded on retrieved catalog context.
- **Two Chat Modes**:
  1. *Catalog Concierge*: Natural-language discovery queries across the whole catalog.
  2. *Literary Companion*: Grounded Q&A on specific book pages (themes, plot analysis, character motivations).

### Phase D: Frontend Experience & UI Assembly (Days 18–21)
- **Collaborative Flow**: User drives UX/visual direction; AI implements React components; User masters the core state/data flow basics.
- **Key Features**:
  - Clean discovery feed & recommendation carousels.
  - Persistent auth state with Google Avatar/Profile.
  - Interactive AI Chat drawer.
  - Personal Shelf manager with reading status tabs (*Want to Read*, *Reading*, *Finished*).