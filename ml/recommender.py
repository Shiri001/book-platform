import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel
from data_prep import load_and_prep_data
import joblib

def build_recommender(df):
    """
    Fits TF-IDF on the content_soup and computes the pairwise cosine similarity matrix.
    """
    print("Vectorizing content soup with TF-IDF...")
    tfidf = TfidfVectorizer(stop_words='english')
    tfidf_matrix = tfidf.fit_transform(df['content_soup'])
    print(f"TF-IDF Matrix shape: {tfidf_matrix.shape} (books x vocabulary)")
    
    print("Computing cosine similarity matrix (float32)...")
    # Cast to float32 to reduce memory footprint from ~760MB to ~380MB
    cosine_sim = linear_kernel(tfidf_matrix, tfidf_matrix).astype(np.float32)
    return cosine_sim

def get_recommendations(title, df, cosine_sim, top_n=5):
    """
    Given a book title, finds top_n most similar books based on cosine similarity scores.
    """
    indices = pd.Series(df.index, index=df['title']).drop_duplicates()
    
    if title not in indices:
        print(f"❌ Book '{title}' not found in dataset!")
        return pd.DataFrame()
    
    idx = indices[title]
    sim_scores = list(enumerate(cosine_sim[idx]))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
    
    # Exclude index 0 (itself)
    sim_scores = sim_scores[1:top_n + 1]
    book_indices = [i[0] for i in sim_scores]
    
    results = df[['book_id', 'title', 'authors', 'genres']].iloc[book_indices].copy()
    results['similarity_score'] = [round(float(i[1]), 4) for i in sim_scores]
    return results

def save_model_artifacts(df, cosine_sim, filepath="tfidf_model.joblib"):
    indices = pd.Series(df.index, index=df['title']).drop_duplicates()
    artifacts = {
        'cosine_sim': cosine_sim,
        'indices': indices,
        'books': df[['book_id', 'title', 'authors', 'genres']]
    }
    print(f"Saving artifacts to {filepath} (compressed)...")
    joblib.dump(artifacts, filepath, compress=3)
    print(f"✅ TF-IDF Artifacts successfully saved to {filepath}!")

def load_model_artifacts(filepath="tfidf_model.joblib"):
    print(f"Loading artifacts from {filepath}...")
    artifacts = joblib.load(filepath)
    print(f"✅ Loaded {len(artifacts['books'])} books from artifact!")
    return artifacts

if __name__ == "__main__":
    # 1. Train on the full 10k catalog
    df = load_and_prep_data("goodreads_10k.csv")
    cosine_sim = build_recommender(df)
    
    # 2. Serialize artifacts
    save_model_artifacts(df, cosine_sim, "tfidf_model.joblib")
    
    # 3. Test production load & inference
    print("\n--- Testing Production Inference ---")
    model = load_model_artifacts("tfidf_model.joblib")
    
    test_book = "Pride and Prejudice"
    print(f"\n--- Top 5 Recommendations for '{test_book}' ---")
    recs = get_recommendations(test_book, model['books'], model['cosine_sim'], top_n=5)
    print(recs.to_string(index=False))
