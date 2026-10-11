import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel
from data_prep import load_and_prep_data
import joblib

def build_recommender(df):
    """
    Fits TF-IDF on the content_soup and computes the pairwise cosine similarity matrix.
    """
    print("Vectorizing content soup with TF-IDF...")
    
    # stop_words='english' strips out words like "the", "in", "and", "is"
    tfidf = TfidfVectorizer(stop_words='english')
    
    # tfidf_matrix shape will be (num_books, num_unique_words)
    tfidf_matrix = tfidf.fit_transform(df['content_soup'])
    print(f"TF-IDF Matrix shape: {tfidf_matrix.shape} (books x vocabulary)")
    
    print("Computing cosine similarity matrix...")
    # Computes an (N x N) similarity matrix where cell [i, j] is similarity between book i and book j
    cosine_sim = linear_kernel(tfidf_matrix, tfidf_matrix)
    
    return cosine_sim

def get_recommendations(title, df, cosine_sim, top_n=3):
    """
    Given a book title, finds the top_n most similar books based on cosine similarity scores.
    """
    # 1. Create a reverse mapping of title -> dataframe index
    # Example: "The Hunger Games" -> 0, "Harry Potter..." -> 1
    indices = pd.Series(df.index, index=df['title']).drop_duplicates()
    
    # Check if the requested book is in our dataset
    if title not in indices:
        print(f"Book '{title}' not found in dataset!")
        return []
    
    idx = indices[title]
    
    # 2. Get pairwise similarity scores for this book with all other books
    # enumerate() keeps track of the original book index: (book_index, similarity_score)
    sim_scores = list(enumerate(cosine_sim[idx]))
    
    # 3. Sort the books based on the similarity scores in descending order
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
    
    # 4. Grab the top_n books
    # WHY start at 1 instead of 0?
    # Because index 0 is the book itself (similarity = 1.0)! We don't want to recommend a book to itself.
    sim_scores = sim_scores[1:top_n + 1]
    
    # 5. Extract the book indices and retrieve their details
    book_indices = [i[0] for i in sim_scores]
    
    results = df[['title', 'authors', 'genres']].iloc[book_indices].copy()
    results['similarity_score'] = [round(i[1], 4) for i in sim_scores]
    
    return results

def save_model_artifacts(df, cosine_sim, filepath="tfidf_model.joblib"):
    """
    Serializes the similarity matrix, title index, and metadata
    so our future API service doesn't have to recompute on startup.
    """
    indices = pd.Series(df.index, index=df['title']).drop_duplicates()
    artifacts = {
        'cosine_sim': cosine_sim,
        'indices': indices,
        'books': df[['book_id', 'title', 'authors', 'genres']]
    }
    joblib.dump(artifacts, filepath)
    print(f"Artifacts successfully saved to {filepath}!")

def load_model_artifacts(filepath="tfidf_model.joblib"):
    """
    Loads precomputed artifacts from disk in milliseconds.
    """
    artifacts = joblib.load(filepath)
    print(f"Artifacts loaded from {filepath}!")
    return artifacts



if __name__ == "__main__":
    # 1. Train / Build
    df = load_and_prep_data("goodreads_sample.csv")
    cosine_sim = build_recommender(df)
    
    # 2. Save artifacts to disk
    save_model_artifacts(df, cosine_sim, "tfidf_model.joblib")
    
    # 3. Simulate production: Load artifacts and make a prediction
    print("\n--- Testing Production Load ---")
    model = load_model_artifacts("tfidf_model.joblib")
    
    test_book = "Pride and Prejudice"
    print(f"\n--- Top 3 Recommendations for '{test_book}' ---")
    recommendations = get_recommendations(test_book, model['books'], model['cosine_sim'], top_n=3)
    print(recommendations)

