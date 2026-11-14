from textblob import TextBlob

def get_sentiment_score(reviews):
    if not reviews:
        return 0.5  # Neutral score for no reviews
    
    scores = []
    for review in reviews:
        blob = TextBlob(review)
        # TextBlob polarity is -1 to 1. Map it to 0 to 1.
        normalized_score = (blob.sentiment.polarity + 1) / 2
        scores.append(normalized_score)

    return sum(scores) / len(scores)