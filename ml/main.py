import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import pandas as pd

from embeddings_recommender import load_embeddings_artifacts, get_recommendations

# Windows console encoding fix
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# In-memory global state for pre-computed vector artifacts
ml_models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Loads ML artifacts into RAM on startup so inference takes <1ms per request.
    """
    artifact_path = os.path.join(os.path.dirname(__file__), "embeddings_model.joblib")
    if not os.path.exists(artifact_path):
        raise RuntimeError(f"❌ Model artifact not found at {artifact_path}. Run embeddings_recommender.py first!")

    print(f"🚀 [FastAPI] Loading embedding artifacts from {artifact_path} into RAM...")
    ml_models["artifacts"] = load_embeddings_artifacts(artifact_path)
    print(f"✅ [FastAPI] Ready! Serving {len(ml_models['artifacts']['books'])} books.\n")
    yield
    # Clean up on shutdown
    ml_models.clear()

app = FastAPI(
    title="Book Platform ML Recommendation Engine",
    description="High-performance vector similarity recommendation microservice (<5ms)",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local dev (Node.js Gateway :3000 & React :3001)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    """Health probe for container / service monitoring."""
    artifacts = ml_models.get("artifacts")
    if not artifacts:
        return {"status": "unhealthy", "message": "Model not loaded"}
    return {
        "status": "healthy",
        "service": "book-recommender-ml",
        "catalog_size": len(artifacts["books"]),
        "vector_dimensions": artifacts["embeddings"].shape[1]
    }

@app.get("/recommend")
def recommend_books(
    book_id: int = Query(None, description="The primary key ID of the target book (1 to 9806)"),
    title: str = Query(None, description="Alternative: book title to search for"),
    mode: str = Query("discover", regex="^(discover|more_like_this)$", description="'discover' (diverse authors) or 'more_like_this' (series & author)"),
    top_n: int = Query(5, ge=1, le=20, description="Number of recommendations to return")
):
    """
    Returns top_n similar books calculated via dense semantic embeddings and cosine similarity.
    """
    artifacts = ml_models.get("artifacts")
    if not artifacts:
        raise HTTPException(status_code=503, detail="Model is still initializing")

    target = book_id if book_id is not None else title
    if target is None:
        raise HTTPException(status_code=400, detail="Must provide either 'book_id' or 'title'")

    recs_df = get_recommendations(
        target=target,
        df=artifacts["books"],
        embeddings=artifacts["embeddings"],
        top_n=top_n,
        mode=mode
    )

    if recs_df.empty:
        raise HTTPException(status_code=404, detail=f"Book '{target}' not found in catalog")

    # Format output as clean JSON objects
    results = []
    for _, row in recs_df.iterrows():
        results.append({
            "bookId": int(row["book_id"]),
            "title": str(row["title"]),
            "author": str(row["authors"]),
            "genre": str(row["genres"]),
            "similarityScore": float(row["similarity_score"])
        })

    return {
        "query": {
            "target": target,
            "mode": mode,
            "topN": top_n
        },
        "count": len(results),
        "recommendations": results
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
