import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import json

with open("products.json") as f:
    products = json.load(f)

def find_similar(query_feature):
    similarities = []

    for product in products:
        stored_feature = np.array(product["features"])
        sim = cosine_similarity([query_feature], [stored_feature])[0][0]
        similarities.append((product, sim))

    similarities.sort(key=lambda x: x[1], reverse=True)
    return similarities[:3]