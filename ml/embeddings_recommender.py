import joblib
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from data_prep import load_and_prep_data


def build_embeddings_recommender(df, model_name='all-MiniLM-L6-v2'):
    """
    Encodes the content_soup into 384-dimensional dense vectors
    and computes the pairwise cosine similarity matrix.
    """
    print(f"Loading SentenceTransformer model: {model_name}...")
    model = SentenceTransformer(model_name)
    
    print("Encoding book descriptions into dense semantic vectors...")
    # model.encode() converts list of texts into a 2D numpy array of shape (N_books, 384)
    embeddings = model.encode(df['content_soup'].tolist(), show_progress_bar=True)
    
    print(f"Dense Embeddings matrix shape: {embeddings.shape} (books x dimensions)")
    
    print("Computing cosine similarity matrix...")
    cosine_sim = cosine_similarity(embeddings, embeddings)
    
    return model, embeddings, cosine_sim

def get_recommendations(title, df, cosine_sim, top_n=3):
    """
    Finds top_n most similar books using cosine similarity.
    """
    indices = pd.Series(df.index, index=df['title']).drop_duplicates()
    
    if title not in indices:
        print(f"Book '{title}' not found in dataset!")
        return []
    
    idx = indices[title]
    sim_scores = list(enumerate(cosine_sim[idx]))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
    
    # Exclude index 0 (the book itself)
    sim_scores = sim_scores[1:top_n + 1]
    book_indices = [i[0] for i in sim_scores]
    
    results = df[['title', 'authors', 'genres']].iloc[book_indices].copy()
    results['similarity_score'] = [round(i[1], 4) for i in sim_scores]
    return results

def save_embeddings_artifacts(df, embeddings, cosine_sim, filepath="embeddings_model.joblib"):
    indices = pd.Series(df.index, index=df['title']).drop_duplicates()
    artifacts = {
        'embeddings': embeddings,
        'cosine_sim': cosine_sim,
        'indices': indices,
        'books': df[['book_id', 'title', 'authors', 'genres']]
    }
    joblib.dump(artifacts, filepath)
    print(f"Embedding artifacts saved to {filepath}!")


if __name__ == "__main__":
    df = load_and_prep_data("goodreads_sample.csv")
    model, embeddings, cosine_sim = build_embeddings_recommender(df)
    
    save_embeddings_artifacts(df, embeddings, cosine_sim, "embeddings_model.joblib")
    
    test_book = "The Hunger Games"
    print(f"\n--- Top 3 Neural Embedding Recommendations for '{test_book}' ---")
    recommendations = get_recommendations(test_book, df, cosine_sim, top_n=3)
    print(recommendations)
