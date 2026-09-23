# 📚 Book Platform — Discovery & Intelligent Recommender

> A full-stack, multi-service book discovery platform powered by semantic recommendations, review sentiment analysis, and personal reading analytics.

---

## 🌟 Architecture Overview

This project is architected as a distributed multi-service application to reflect real-world production systems:

```
┌─────────────────────────────────────────────────────────────┐
│                       React Frontend                        │
│             (Browse, Book Details, Shelf View)              │
└──────────────┬───────────────────────────────▲──────────────┘
               │ HTTP Requests                 │ Hydrated Data
┌──────────────▼───────────────────────────────┴──────────────┐
│                    Node.js + Express API                    │
│      (App Orchestration, Relational Data & Routing)         │
└──────────────┬───────────────────────────────▲──────────────┘
               │                               │
       SQL /   │                               │ Recommendations &
       Queries │                               │ Sentiment Scores
┌──────────────▼─────────────┐   ┌─────────────┴──────────────┐
│     PostgreSQL Database    │   │      FastAPI ML Service    │
│  (Books, Reviews, Shelves) │   │ (all-MiniLM-L6-v2, VADER)  │
└────────────────────────────┘   └────────────────────────────┘
```

---

## 🛠️ Tech Stack & Technical Rationales

| Layer | Technology | Engineering Rationale |
| :--- | :--- | :--- |
| **Frontend** | **React (SPA)** | Manages interconnected state (catalog, book detail, shelf) with reactive UI updates and seamless client-side routing via `react-router-dom`. |
| **App Backend** | **Node.js + Express** | Handles core business logic, API orchestration, and DB transactions; mirrors industry pattern of separating product APIs from ML compute services. |
| **Database** | **PostgreSQL + Sequelize** | Relational schema (`Books` 1-to-many `Reviews`, `Shelves` referencing `Books`) allows true relational `JOIN` operations rather than document-store workarounds. |
| **ML Service** *(Upcoming)* | **FastAPI (Python)** | Native Python runtime for ML models (`scikit-learn`, `sentence-transformers`), async concurrency, and in-memory vector similarity calculations. |
| **Data Strategy** | **Hybrid Ingestion** | Google Books API for live browsable catalog (440 curated books); separate Goodreads corpus for offline ML recommendation training. |

---

## 🚀 Current Project Status

- [x] **Day 1**: Express basics, routing, params vs query, 404 middleware.
- [x] **Day 2**: Connected React frontend to Express backend, solved CORS.
- [x] **Day 3**: Integrated `react-router-dom` for list-to-detail routing.
- [x] **Day 4**: Detail-page 404 error handling & tech stack documentation.
- [x] **Day 5**: PostgreSQL connected via Sequelize, relational Book & Review models.
- [x] **Day 6**: Google Books API data ingestion pipeline (normalization, quality filtering, deduplication via `Set`, bulk insert of 440 books).
- [x] **Day 7**: SQL pagination (`findAndCountAll`), case-insensitive genre filtering (`Op.iLike`), relational Shelf model.
- [x] **Day 8**: Full-stack Shelf flow (React `POST /api/shelf`, optimistic state feedback, `Shelf.js` page rendering relational JOINs, DB maintenance utilities).
- [ ] **Day 9–13**: Offline ML Recommender (Goodreads dataset, TF-IDF baseline vs `all-MiniLM-L6-v2` dense embeddings, catalog generalization validation).
- [ ] **Day 14–16**: FastAPI microservice serving recommendations with in-memory caching.
- [ ] **Day 17–19**: Express hydration layer & React recommendation carousel.
- [ ] **Day 20–23**: Sentiment analysis pipeline (VADER vs DistilBERT) & "Rating vs Sentiment Mismatch" detection.
- [ ] **Day 24–28**: Deployment across Render/Railway, Vercel, and Neon PostgreSQL.

---

## ⚙️ Running Locally

### 1. Backend Server
```bash
cd server
npm install
node index.js
# Runs on http://localhost:3000
```

### 2. Frontend Client
```bash
cd client
npm install
npm start
# Runs on http://localhost:3000 (or http://localhost:3001)
```
