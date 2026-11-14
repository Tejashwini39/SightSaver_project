import pandas as pd
import json
import os
from model import extract_features

# Load CSVs
images_df = pd.read_csv("dataset/images.csv", encoding='latin1')

styles_df = pd.read_csv(
    "dataset/styles.csv",
    usecols=["id", "productDisplayName"],   # only needed columns
    on_bad_lines='skip',
    encoding='latin1',
    engine='python'
)

products = []

for i, row in images_df.head(100).iterrows():
    filename = row["filename"]
    img_path = f"dataset/images/{filename}"
    if not os.path.exists(img_path):
        continue
    try:
        product_id = int(filename.split(".")[0])
    except:
        continue
    match = styles_df[styles_df["id"] == product_id]
    if not match.empty:
        name = match.iloc[0]["productDisplayName"]
    else:
        name = filename  # fallback
    try:
        features = extract_features(img_path)
        products.append({
            "name": name,
            "image": img_path,
            "price": {
                "Amazon": 1000 + i * 10,
                "Flipkart": 900 + i * 10
            },
            "reviews": [
                "Good quality",
                "Nice product",
                "Worth buying"
            ],
            "features": features.tolist()
        })
        print("Processed:", name)
    except Exception as e:
        print("Error:", e)
with open("products.json", "w") as f:
    json.dump(products, f, indent=4)
print("✅ Features generated successfully!")