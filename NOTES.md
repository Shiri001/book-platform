### Tech Stack Justification — Book Platform

Frontend — React

Why: The app has multiple interconnected views (browse, detail, shelf) sharing data and state — React's component model handles this cleanly versus manually wiring up DOM updates in plain JS.
Alternative considered: Plain HTML/JS — viable for something this size, but would mean re-building state management React already provides. Vue/Angular are comparable technically; React is chosen for its dominant industry adoption and interview relevance.

App Backend — Node.js + Express

Why: Deliberately separates the "product" layer (routes, book/review/shelf logic) from the ML layer. This mirrors a real industry pattern — Python owns ML, a JS/Java/Go service owns the app — and gives you hands-on Node/Express reps specifically because your university's recruiters test full-stack skills directly, not just ML.
Alternative considered: Doing everything in FastAPI alone — technically simpler and would still work, but removes the one place in this project generating deliberate JS backend practice. Since full-stack readiness is an explicit goal, the added complexity here is intentional, not accidental.

ML Service — FastAPI (Python)

Why: Your recommender and sentiment models are Python-native (scikit-learn, sentence-transformers) — FastAPI serves them directly with no cross-language translation. It also has async support, automatic request validation (Pydantic), and auto-generated docs (/docs), all useful for testing and demoing.
Alternative considered: Flask — older, no built-in validation or async, generally considered less current for 2026-era ML serving.

Database — PostgreSQL

Why: Chosen specifically after examining the actual data shape: books have many reviews, shelf entries reference books — genuine one-to-many relational structure. PostgreSQL lets you write real JOINs (e.g., a book with its reviews and average sentiment in one query), which is both a more natural fit for this data and better interview-relevant practice than MongoDB's .populate() workaround for the same relationship.
Alternative considered: MongoDB — would work, but your data doesn't need its core strength (variable-shape, deeply nested documents); using it here would just be doing a relational job with the wrong tool.

Deployment — Render/Railway (Node + FastAPI), Vercel/Netlify (React)

Why: Free-tier friendly, straightforward for multi-service deployment without needing to manage your own infrastructure, and gives you a real, shareable, live link for your resume rather than a local-only demo.

## Final Architecture Decision

- React → frontend
- Node.js + Express → application backend
- PostgreSQL → primary database
- FastAPI + Python → ML service
- Render/Railway → backend deployment
- Vercel/Netlify → frontend deployment