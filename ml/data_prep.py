import pandas as pd

def load_and_prep_data(filepath):
    """
    Loads the dataset and creates the 'content_soup' feature.
    """
    print(f"Loading data from {filepath}...")
    df = pd.read_csv(filepath)
    
    # Check what columns we have and if there are missing values
    print("\nDataset Info:")
    print(df.info())

    features = ['authors', 'genres', 'description']
    for feature in features:
        df[feature] = df[feature].fillna('')
    
    df['genre_clean'] = df['genres'].apply(lambda x: x.replace(',', ' '))

    df['content_soup'] = ((df['authors'] + ' ') * 3 + (df['genre_clean'] + ' ') * 2 + df['description'])
    
    return df

if __name__ == "__main__":
    # Test our function
    df = load_and_prep_data("goodreads_sample.csv")

    print("\n--- SAMPLE CONTENT SOUP (First Book) ---")
    print(f"Title: {df['title'].iloc[0]}")
    print(f"Soup:  {df['content_soup'].iloc[0]}")
