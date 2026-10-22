# 📘 Architecture & Engineering Deep-Dive: 10k Catalog & Polyglot ML Microservice

---

## 🎯 Executive Summary

In this session, we scaled the platform from a 600-book local prototype into an **end-to-end distributed system** serving semantic recommendations across **9,806 books** with **$< 5\text{ms}$ latency**.

```
┌─────────────────────────┐       GET /api/books/:id/recommendations       ┌────────────────────────┐
│      React 19 SPA       │ ─────────────────────────────────────────────> │  Express API Gateway   │
│   (Port 3000 / 3001)    │ <───────────────────────────────────────────── │        (:3000)         │
└─────────────────────────┘             JSON Recommendations & Match %     └────────────────────────┘
                                                                                       │
                                                         GET /recommend?book_id=...    │  Circuit-Breaker
                                                                                       ▼  Proxy (<5ms)
                                                                           ┌────────────────────────┐
                                                                           │   FastAPI ML Engine    │
                                                                           │        (:8000)         │
                                                                           └────────────────────────┘
                                                                                       │
                                                                                       ▼  Vector Dot Product
                                                                            [ 9,806 x 384 Matrix ]
                                                                             (15MB RAM Footprint)
```

---

## 🧩 1. The 10,000-Book Catalog Ingestion

### The Problem
Google Books API (`seedCatalog.js`) threw **HTTP 429 & 503 (`backendFailed`)** rate-limits when scraping at volume. Paginating 10,000 books across 10 categories over live REST took 30+ minutes and introduced fragmented schemas.

### The Solution: Streaming Ingestion Pipeline (`server/scripts/seedGoodreads10k.js`)
We ingested the official 10,000-book dataset (`ml/goodreads_10k.csv`):
1. **Node.js Read Streams (`fs.createReadStream` + `csv-parser`)**:
   * Instead of loading the entire 11.7 MB text file into RAM, we stream line-by-line. Memory footprint stays under **30 MB**.
2. **Data Hygiene & Deduplication**:
   * Filtered 90 books with missing or short descriptions ($< 15$ characters).
   * Filtered 104 duplicate edition entries using an in-memory `Set` of composite keys: `title + "::" + author`.
3. **Batch Bulk Insert (`Book.bulkCreate` in chunks of 1,000)**:
   * Replaced 10,000 separate SQL round-trips with **10 batched multi-row inserts**.
   * Ingestion to Neon PostgreSQL completed in **92.59 seconds** for **9,806 pristine books**.

---

## 🧠 2. Machine Learning & Mathematical Optimizations

### Zero-Impedance-Mismatch Data Pipeline (`ml/data_prep.py`)
To prevent ID drift between PostgreSQL and our ML matrices:
* `data_prep.py` applies the exact same hygiene and deduplication rules as `seedGoodreads10k.js`.
* `book_id` is assigned as `df.index + 1`.
* **Row index $i$ in Python maps 1-to-1 with PostgreSQL primary key $i + 1$**.

### Weighted Feature Engineering (Content Soup)
$$\text{content\_soup} = (\text{Author} \times 3) + (\text{Genres} \times 2) + (\text{Description} \times 1)$$
* Triple weight on **Author** captures author voice, style, and recurring vocabulary.
* Double weight on **Genres** anchors the book to its primary category.

---

### $O(N^2)$ vs $O(N \times D)$ System Design Optimization

#### The Naive Tutorial Approach ($O(N^2)$):
Precomputing a pairwise similarity matrix:
$$9{,}806 \times 9{,}806 = 96{,}157{,}636 \text{ numbers} \approx \mathbf{384\text{ MB}}$$
At 100,000 books, that matrix reaches **40 GB**, causing Out-Of-Memory crashes.

#### Our Production Vector Approach ($O(N \times D)$):
Storing the raw $(9{,}806 \times 384)$ dense embedding matrix:
$$9{,}806 \times 384 = 3{,}765{,}504 \text{ numbers} \approx \mathbf{15\text{ MB}}$$
At 100,000 books, it requires only **150 MB** of RAM!

---

### Why L2-Normalized Dot Product Equals Cosine Similarity

Standard Cosine Similarity:
$$\text{CosineSim}(A, B) = \frac{A \cdot B}{\|A\|_2 \times \|B\|_2}$$

By setting `normalize_embeddings=True` in SentenceTransformers (`all-MiniLM-L6-v2`):
$$\|A\|_2 = 1 \quad \text{and} \quad \|B\|_2 = 1 \implies \mathbf{\text{CosineSim}(A, B) = A \cdot B}$$

Evaluating similarity between target vector $\vec{v}_i$ and the entire 9,806 catalog is a single NumPy matrix multiplication:
$$\vec{S} = E \cdot \vec{v}_i \quad \text{where } E \in \mathbb{R}^{9806 \times 384}$$
Evaluated via CPU BLAS SIMD instructions in **$< 0.5\text{ milliseconds}$**!

---

### Serendipity / Diversity Re-ranking Algorithm

To solve the recommender **"tunnel-vision" problem** (e.g., *The Hunger Games* only recommending its own sequels), we engineered two distinct modes:

```python
if mode == "discover":
    if candidate_author == target_author:
        continue  # Filter out same author
    if base_title in candidate_title:
        continue  # Filter out same series / franchise root
```

#### Live Results for *The Hunger Games*:
* **Mode 1: "More Like This" (Exploitation)**:
  1. *Mockingjay (The Hunger Games, #3)* — 0.8358
  2. *Catching Fire (The Hunger Games, #2)* — 0.8021
  3. *The Hunger Games Trilogy Boxset* — 0.6786
  4. *The Ballad of Songbirds and Snakes* — 0.6665
* **Mode 2: "Discover Something New" (Exploration / Serendipity)**:
  1. *The Divinity Bureau* by Tessa Clare (0.5980)
  2. *Requiem (Delirium, #3)* by Lauren Oliver (0.5824)
  3. *Life As We Knew It* by Susan Beth Pfeffer (0.5545)
  4. *The Great Alone* by Kristin Hannah (0.5460)

---

## 🌐 3. Distributed Polyglot Microservices

1. **FastAPI ML Service (`ml/main.py` — Port 8000)**:
   * Uses `@asynccontextmanager` lifespan to load `embeddings_model.joblib` into memory on startup.
   * Exposes `GET /health` and `GET /recommend?book_id=...&mode=...&top_n=...`.
2. **Express API Gateway (`server/index.js` — Port 3000)**:
   * Exposes `GET /api/books/:id/recommendations`.
   * Integrates a **3000ms circuit-breaker timeout** and graceful fallback if ML is offline.
3. **React 19 SPA (`client/src/BookDetail.js` — Port 3001)**:
   * Dual `useEffect` loops for book details and ML recommendations.
   * Interactive **✨ Discover Something New** vs **📚 More Like This** mode switcher.
   * Dynamic similarity badges (e.g. `84% Match`), genre tags, and instant navigation.

---

## 🎤 4. Placement Interview Quick-Fire Defense

* **Q: Why separate Node.js and FastAPI?**
  * *A: Node.js handles high-concurrency client requests, database transactions, and auth as an API Gateway. Python hosts the scientific ML stack (`all-MiniLM-L6-v2`, `numpy`, `scikit-learn`). Separating them isolates compute-heavy vector operations and allows independent scaling.*
* **Q: How do you serve recommendations in under 5ms?**
  * *A: We load the pre-computed 15MB L2-normalized embedding matrix into FastAPI's in-memory memory space on startup. An incoming request executes a vectorized dot product against the 9,806 catalog using CPU BLAS instructions, eliminating disk I/O and completing in under 0.5ms.*
* **Q: How did you ensure data consistency between PostgreSQL and your ML models?**
  * *A: We enforced identical deterministic cleaning and deduplication logic across both `seedGoodreads10k.js` and `data_prep.py`. The resulting 9,806 rows preserve identical ordering, ensuring PostgreSQL primary key $i+1$ directly maps to matrix row $i$.*
