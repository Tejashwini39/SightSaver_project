import pandas as pd
import requests
import os
from time import sleep

# Create images folder
os.makedirs("dataset/images", exist_ok=True)

# Load CSV
df = pd.read_csv("dataset/images.csv", encoding='latin1')

# Limit number of images (change if needed)
LIMIT = 100

success = 0
failed = 0

for i, row in df.head(LIMIT).iterrows():
    filename = row["filename"]
    url = row["link"]

    file_path = f"dataset/images/{filename}"

    # Skip if already exists
    if os.path.exists(file_path):
        print(f"Already exists: {filename}")
        continue

    try:
        response = requests.get(url, timeout=5)

        if response.status_code == 200:
            with open(file_path, "wb") as f:
                f.write(response.content)

            print(f"Downloaded: {filename}")
            success += 1
        else:
            print(f"Failed (status): {filename}")
            failed += 1

    except Exception as e:
        print(f"Error downloading {filename}: {e}")
        failed += 1

    sleep(0.2)  # small delay to avoid server blocking

print("\nDownload Completed!")
print(f"Success: {success}")
print(f"Failed: {failed}")