
import pandas as pd
from models.sentiment_model import analyze_sentiment


# =====================================
# SENTIMENT ANALYSIS
# =====================================

def analyze_dataset(df, text_column="teks_bersih"):
    """
    Melakukan analisis sentimen seluruh dataset.
    """

    if df is None or df.empty:
        raise ValueError("Dataset kosong.")

    if text_column not in df.columns:
        raise ValueError("Kolom teks tidak ditemukan.")

    texts = (
        df[text_column]
        .fillna("")
        .astype(str)
        .str.strip()
        .tolist()
    )

    if not texts or any(not text for text in texts):
        raise ValueError(
            "Masih terdapat teks kosong. "
            "Periksa kembali hasil preprocessing."
        )

    # Jalankan model Hugging Face
    results = analyze_sentiment(
        texts,
        batch_size=16
    )

    if len(results) != len(df):
        raise ValueError(
            "Jumlah hasil analisis tidak sesuai dengan jumlah data."
        )

    result_df = df.copy()

    result_df["sentiment"] = [
        result["sentiment"] for result in results
    ]

    result_df["confidence"] = [
        result["confidence"] for result in results
    ]

    result_df["needs_review"] = [
        result["needs_review"] for result in results
    ]

    return result_df


# =====================================
# SENTIMENT SUMMARY
# =====================================

def get_sentiment_summary(df):
    """
    Menghitung distribusi sentimen.
    """

    if df is None or df.empty:
        return []

    if "sentiment" not in df.columns:
        raise ValueError(
            "Kolom sentiment tidak ditemukan."
        )

    counts = (
        df["sentiment"]
        .value_counts()
        .reindex(
            ["positive", "neutral", "negative"],
            fill_value=0
        )
    )

    total = len(df)

    summary = []

    for sentiment, count in counts.items():

        summary.append({
            "sentiment": sentiment,
            "total": int(count),
            "percentage": round(
                (count / total) * 100, 2
            ) if total else 0
        })

    return summary
