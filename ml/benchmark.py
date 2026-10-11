import joblib
import pandas as pd

def load_artifacts():
    print("Loading models into memory...")
    tfidf = joblib.load("tfidf_model.joblib")
    embeds = joblib.load("embeddings_model.joblib")
    return tfidf, embeds

def compare_recommendations(title, tfidf, embeds, top_n=3):
    print(f"\n" + "="*80)
    print(f"QUERY BOOK: {title}")
    print("="*80)
    
    # 1. TF-IDF lookup
    idx = tfidf['indices'][title]
    sim_scores_tfidf = list(enumerate(tfidf['cosine_sim'][idx]))
    sim_scores_tfidf = sorted(sim_scores_tfidf, key=lambda x: x[1], reverse=True)[1:top_n+1]
    
    # 2. Embeddings lookup
    sim_scores_embeds = list(enumerate(embeds['cosine_sim'][idx]))
    sim_scores_embeds = sorted(sim_scores_embeds, key=lambda x: x[1], reverse=True)[1:top_n+1]
    
    # Print side-by-side comparison
    print(f"{'RANK':<5} | {'TF-IDF (Keyword Matching)':<35} | {'TRANSFORMER (Semantic)':<35}")
    print("-" * 80)
    
    for rank in range(top_n):
        idx_t, score_t = sim_scores_tfidf[rank]
        idx_e, score_e = sim_scores_embeds[rank]
        
        book_t = f"{tfidf['books'].iloc[idx_t]['title']} by {tfidf['books'].iloc[idx_t]['authors']} ({score_t:.3f})"
        book_e = f"{embeds['books'].iloc[idx_e]['title']} by {embeds['books'].iloc[idx_e]['authors']} ({score_e:.3f})"
        
        print(f"#{rank+1:<4} | {book_t:<35} | {book_e:<35}")

if __name__ == "__main__":
    tfidf, embeds = load_artifacts()
    
    # Benchmark 3 completely different genres:
    compare_recommendations("The Hunger Games", tfidf, embeds)
    compare_recommendations("Pride and Prejudice", tfidf, embeds)
    compare_recommendations("The Hitchhiker's Guide to the Galaxy", tfidf, embeds)
