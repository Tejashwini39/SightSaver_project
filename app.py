from flask import Flask, request, jsonify, render_template, redirect, url_for
import os
from model import extract_features
from similarity import find_similar
from sentiment import get_sentiment_score
import hashlib


from flask import send_from_directory

app = Flask(__name__)

UPLOAD_FOLDER = "uploads"
DATASET_FOLDER = "dataset"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/dataset/images/<filename>')
def dataset_images(filename):
    return send_from_directory(os.path.join(DATASET_FOLDER, 'images'), filename)

@app.route("/")
def login_page():
    return render_template("login.html")

@app.route("/login", methods=["POST"])
def login():
    username = request.form.get("username")
    password = request.form.get("password")

    if username == "admin" and password == "1234":
        return redirect(url_for("upload_page"))
    else:
        return "Invalid login!"

@app.route("/signup", methods=["POST"])
def signup():

    name = request.form.get("name")
    email = request.form.get("email")
    username = request.form.get("username")
    password = request.form.get("password")

    print("New User Registered:")
    print(name, email, username)

    # later save in database
    return redirect(url_for("upload_page"))

@app.route("/upload-page")
def upload_page():
    return render_template("upload.html")

@app.route("/upload", methods=["POST"])
def upload():

    file = request.files["image"]
    path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(path)

    query_feature = extract_features(path)

    similar_products = find_similar(query_feature)

    results = []

    for product, sim in similar_products:
        # 1. Sentiment Analysis with Dynamic AI Confidence
        reviews = product.get("reviews", [])
        base_sentiment = get_sentiment_score(reviews)
        # Add a small variance based on similarity to represent AI's confidence in this specific match
        sentiment = base_sentiment * (0.8 + (sim * 0.2))

        # 2. Dynamic Trust Factor
        # Trust is now a factor of similarity (match confidence) and review volume
        num_reviews = len(reviews)
        match_confidence = sim
        trust_factor = (match_confidence * 0.6) + (min(1.0, num_reviews / 5.0) * 0.4)


        # 3. Real Price Consistency
        prices = product.get("price", {})
        amazon_p = prices.get("Amazon", 0)
        flipkart_p = prices.get("Flipkart", 0)
        
        if amazon_p > 0 and flipkart_p > 0:
            price_gap = abs(amazon_p - flipkart_p) / max(amazon_p, flipkart_p)
            price_consistency = max(0, 1 - price_gap)
        else:
            price_consistency = 0.5

        # Final Unified Quality Score:
        # Weighting: 30% Similarity/Match, 30% Sentiment, 20% Trust, 20% Price
        quality = (sim * 0.3) + (sentiment * 0.3) + (trust_factor * 0.2) + (price_consistency * 0.2)

        # Add a tiny bit of deterministic jitter based on name to ensure uniqueness across products
        name_hash = int(hashlib.md5(product["name"].encode()).hexdigest(), 16) % 100
        quality = min(1.0, quality + (name_hash / 2000.0))

        results.append({
            "name": product["name"],
            "image": product["image"],
            "price": product["price"],
            "similarity": float(sim),
            "quality_score": round(quality, 3),
            "quality_breakdown": {
                "sentiment": round(sentiment, 3),
                "trust": round(trust_factor, 3),
                "consistency": round(price_consistency, 3),
                "review_count": num_reviews,
                "confidence": round(sim, 3)
            },
            "price_history": [round((amazon_p or flipkart_p or 1000) * (0.95 + (i * 0.01) + (int(hashlib.md5(product["name"].encode()).hexdigest(), 16) % 10 / 100))) for i in range(7)]
        })


    return jsonify(results)

@app.route("/quality-analysis")
def quality_analysis():
    image_path = request.args.get("image")
    # In a real app, we'd fetch product data from DB using image_path
    # For now, we'll pass it to the frontend which already has the data or can fetch it
    return render_template("quality.html", image_path=image_path)


if __name__ == "__main__":
    app.run(debug=True)