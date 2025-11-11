import kagglehub
import pandas as pd
import os

def fetch_kaggle_data():
    print("Downloading dataset from Kaggle...")
    path = kagglehub.dataset_download("minnikeswarrao/british-airways-customer-booking")
    print("✅ Dataset downloaded to:", path)

    # Look for CSV or Excel files
    for root, _, files in os.walk(path):
        for f in files:
            if f.endswith((".csv", ".xlsx", ".xls")):
                full = os.path.join(root, f)
                print(f"Processing {full}...")
                try:
                    if f.endswith(".csv"):
                        try:
                            df = pd.read_csv(full, encoding="utf-8")
                        except UnicodeDecodeError:
                            df = pd.read_csv(full, encoding="latin1")
                    else:
                        df = pd.read_excel(full)
                    print("✅ Loaded successfully:", df.shape)
                    print("Columns:", list(df.columns))
                except Exception as e:
                    print("⚠️ Error reading file:", e)
    return path

if __name__ == "__main__":
    fetch_kaggle_data()
