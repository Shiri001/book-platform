import os
import re
import sys
import joblib
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer
from data_prep import load_and_prep_data

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def build_embeddings(df, model_name='all-MiniLM-L6-v2'):
    print(f"Loading SentenceTransformer: {model_name}...")
    model = SentenceTransformer(model_name)
    
    print("Encoding 9,806 book descriptions into dense semantic vectors...")
    embeddings = model.encode(
        df['content_soup'].tolist(), 
        batch_size=64, 
        show_progress_bar=True, 
        normalize_embeddings=True
    ).astype(np.float32)
    
    print(f"✅ Embeddings matrix shape: {embeddings.shape} (books x dimensions)")
    return model, embeddings

def get_recommendations(target, df, embeddings, top_n=5, mode="discover"):
    """
    Finds top_n books using fast vectorized dot product (<1ms).
    
    Modes:
      - 'more_like_this': Pure similarity (includes same author & series sequels).
      - 'discover': Serendipity mode! Diversifies recommendations by filtering out
                    the same author and series titles.
    """
    # 1. Resolve target to DataFrame row index
    if isinstance(target, int):
        matches = df[df['book_id'] == target].index
        if len(matches) == 0:
            print(f"❌ book_id {target} not found!")
            return pd.DataFrame()
        idx = matches[0]
    else:
        matches = df[df['title'].str.lower() == target.lower()].index
        if len(matches) == 0:
            matches = df[df['title'].str.contains(target, case=False, na=False)].index
        if len(matches) == 0:
            print(f"❌ Book '{target}' not found in dataset!")
            return pd.DataFrame()
        idx = matches[0]

    target_title = df.loc[idx, 'title']
    target_author = df.loc[idx, 'authors'].strip().lower()
    # Extract base title before any '(' or '#' for series detection
    base_title = re.split(r"[\(#]", target_title)[0].strip().lower()

    print(f"\n🔍 Target: \"{target_title}\" by {df.loc[idx, 'authors']} [Mode: '{mode}']")

    # 2. Vectorized dot product in <1ms
    target_vec = embeddings[idx]
    sim_scores = np.dot(embeddings, target_vec)
    sorted_indices = np.argsort(sim_scores)[::-1]

    selected_indices = []
    
    for candidate_idx in sorted_indices:
        # Never recommend the book to itself
        if candidate_idx == idx:
            continue

        cand_author = df.loc[candidate_idx, 'authors'].strip().lower()
        cand_title = df.loc[candidate_idx, 'title'].lower()

        if mode == "discover":
            # Filter out same author
            if cand_author == target_author:
                continue
            # Filter out same series / franchise root title
            if len(base_title) > 3 and base_title in cand_title:
                continue

        selected_indices.append(candidate_idx)
        if len(selected_indices) == top_n:
            break

    results = df[['book_id', 'title', 'authors', 'genres']].iloc[selected_indices].copy()
    results['similarity_score'] = [round(float(sim_scores[i]), 4) for i in selected_indices]
    return results

def save_embeddings_artifacts(df, embeddings, filepath="embeddings_model.joblib"):
    indices = pd.Series(df.index, index=df['title']).drop_duplicates()
    artifacts = {
        'embeddings': embeddings,
        'indices': indices,
        'books': df[['book_id', 'title', 'authors', 'genres']]
    }
    print(f"Saving 15MB embedding artifact to {filepath}...")
    joblib.dump(artifacts, filepath, compress=3)
    print(f"✅ Embedding artifacts saved to {filepath}!")

def load_embeddings_artifacts(filepath="embeddings_model.joblib"):
    print(f"Loading embedding artifacts from {filepath}...")
    artifacts = joblib.load(filepath)
    print(f"✅ Loaded {len(artifacts['books'])} books and embeddings matrix {artifacts['embeddings'].shape}!")
    return artifacts

if __name__ == "__main__":
    artifact_path = "embeddings_model.joblib"

    # Only train if artifact does not exist yet
    if not os.path.exists(artifact_path):
        print("Model artifact not found. Building from scratch...")
        df = load_and_prep_data("goodreads_10k.csv")
        model, embeddings = build_embeddings(df)
        save_embeddings_artifacts(df, embeddings, artifact_path)
    else:
        print(f"⚡ Found existing {artifact_path}. Skipping encoding!")

    artifacts = load_embeddings_artifacts(artifact_path)
    
    # Compare both modes on 'The Hunger Games'
    test_target = "Hunger Games"

    print("\n" + "="*50)
    print("MODE 1: MORE LIKE THIS (Series & Author included)")
    print("="*50)
    recs_similar = get_recommendations(test_target, artifacts['books'], artifacts['embeddings'], top_n=5, mode="more_like_this")
    print(recs_similar.to_string(index=False))

    print("\n" + "="*50)
    print("MODE 2: DISCOVER SOMETHING NEW (Diversified authors & themes)")
    print("="*50)
    recs_discover = get_recommendations(test_target, artifacts['books'], artifacts['embeddings'], top_n=5, mode="discover")
    print(recs_discover.to_string(index=False))
