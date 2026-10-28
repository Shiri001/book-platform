"""
Sentiment Analysis and Review Intelligence Engine.
Uses NLTK VADER (Valence Aware Dictionary and sEntiment Reasoner)
with contextual rating dissonance detection.
"""

import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer

# Ensure VADER lexicon is downloaded
try:
    nltk.data.find("sentiment/vader_lexicon.zip")
except LookupError:
    nltk.download("vader_lexicon", quiet=True)

# Initialize global analyzer in memory for sub-millisecond scoring (<1ms)
_analyzer = SentimentIntensityAnalyzer()


def analyze_review_sentiment(text: str, rating: int = None) -> dict:
    """
    Analyzes review text polarity and checks for rating-sentiment dissonance.
    
    Args:
        text (str): The review content.
        rating (int, optional): User's numerical star rating (1 to 5).
        
    Returns:
        dict: Sentiment metrics, classification, and dissonance alerts.
    """
    if not text or not text.strip():
        return {
            "polarity": 0.0,
            "label": "NEUTRAL",
            "scores": {"pos": 0.0, "neu": 1.0, "neg": 0.0, "compound": 0.0},
            "dissonance": False,
            "dissonanceReason": None
        }

    # 1. Compute VADER polarity scores
    scores = _analyzer.polarity_scores(text)
    compound = round(scores["compound"], 3)  # Range: -1.0 to +1.0

    # 2. Determine categorical label
    if compound >= 0.05:
        label = "POSITIVE"
    elif compound <= -0.05:
        label = "NEGATIVE"
    else:
        label = "NEUTRAL"

    # 3. Rating vs. Sentiment Dissonance Detection
    dissonance = False
    dissonance_reason = None

    if rating is not None and 1 <= rating <= 5:
        # Normalize star rating from [1, 5] to [-1.0, +1.0]:
        # 1 -> -1.0 | 2 -> -0.5 | 3 -> 0.0 | 4 -> +0.5 | 5 -> +1.0
        normalized_star = (rating - 3) / 2.0
        delta = abs(normalized_star - compound)

        # Discrepancy threshold: gap >= 1.0 indicates strong disagreement
        if delta >= 1.0:
            dissonance = True
            if rating >= 4 and compound < 0:
                dissonance_reason = "High star rating with critical text tone (potential sarcasm or typo)"
            elif rating <= 2 and compound > 0:
                dissonance_reason = "Low star rating with praising text tone (external issue or misclick)"
            else:
                dissonance_reason = "Significant divergence between rating and written sentiment"

    return {
        "polarity": compound,
        "label": label,
        "scores": {
            "pos": round(scores["pos"], 3),
            "neu": round(scores["neu"], 3),
            "neg": round(scores["neg"], 3),
            "compound": compound
        },
        "dissonance": dissonance,
        "dissonanceReason": dissonance_reason
    }
