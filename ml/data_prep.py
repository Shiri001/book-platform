import pandas as pd
import re

def clean_genres(raw):
    if not isinstance(raw, str):
        return "Fiction"
    # Strips brackets, quotes, and punctuation so words like "Sci-Fi" and "Fantasy" stand out
    cleaned = re.sub(r"[\[\]'\",]", " ", raw)
    return " ".join(cleaned.split())

def load_and_prep_data(filepath="goodreads_10k.csv"):
    """
    Loads goodreads_10k.csv, cleans rows to match PostgreSQL database,
    and builds the weighted content_soup.
    """
    print(f"Loading data from {filepath}...")
    df = pd.read_csv(filepath)

    # 1. Hygiene filter: drop empty descriptions (< 15 chars)
    df = df.dropna(subset=['Book', 'Description'])
    df = df[df['Description'].astype(str).str.strip().str.len() >= 15]

    # 2. Deduplicate identical title + author
    df['dedup_key'] = (
        df['Book'].astype(str).str.strip() + '::' + 
        df['Author'].fillna('Unknown').astype(str).str.strip()
    ).str.lower()
    df = df.drop_duplicates(subset=['dedup_key']).reset_index(drop=True)

    # 3. Standardize column names
    df = df.rename(columns={
        'Book': 'title',
        'Author': 'authors',
        'Description': 'description',
        'Avg_Rating': 'average_rating'
    })

    # 4. Align with Neon PostgreSQL primary key (1-indexed)
    df['book_id'] = df.index + 1

    # 5. Clean genres
    df['genre_clean'] = df['Genres'].apply(clean_genres)
    df['genres'] = df['genre_clean']


    # 6. Weighted Content Soup: Author (x3) + Genre (x2) + Description (x1)
    df['content_soup'] = (
        (df['authors'].fillna('') + ' ') * 3 +
        (df['genre_clean'] + ' ') * 2 +
        df['description'].fillna('')
    )

    print(f"✅ Prepared {len(df)} books successfully.")
    return df

if __name__ == "__main__":
    df = load_and_prep_data("goodreads_10k.csv")
    print(f"\n--- First Book (ID: {df['book_id'].iloc[0]}) ---")
    print(f"Title:  {df['title'].iloc[0]}")
    print(f"Author: {df['authors'].iloc[0]}")
    print(f"Genres: {df['genre_clean'].iloc[0]}")
    print(f"Soup preview: {df['content_soup'].iloc[0][:150]}...")
