
import os
import torch

from functools import lru_cache
from transformers import pipeline
from dotenv import load_dotenv

load_dotenv()

MODEL_NAME = os.getenv(
    "HF_MODEL",
    "w11wo/indonesian-roberta-base-sentiment-classifier"
)

# Mapping label sentimen
LABEL_MAPPING = {
    "positive": "positive",
    "neutral": "neutral",
    "negative": "negative",
    "label_0": "negative",
    "label_1": "neutral",
    "label_2": "positive",
}


@lru_cache(maxsize=1)
def load_sentiment_model():
    """Memuat model sentimen satu kali."""

    device = 0 if torch.cuda.is_available() else -1

    classifier = pipeline(
        task="text-classification",
        model=MODEL_NAME,
        tokenizer=MODEL_NAME,
        device=device
    )

    return classifier


def analyze_sentiment(texts, batch_size=16):
    """Menganalisis sentimen kumpulan teks berita."""

    if not texts:
        return []

    classifier = load_sentiment_model()

    results = classifier(
        texts,
        batch_size=batch_size,
        truncation=True,
        max_length=512
    )

    if len(results) != len(texts):
        raise ValueError(
            "Jumlah hasil prediksi tidak sesuai dengan jumlah teks."
        )

    output = []

    for text, result in zip(texts, results):

        raw_label = str(result["label"]).lower()

        sentiment = LABEL_MAPPING.get(raw_label)

        if sentiment is None:
            raise ValueError(
                f"Label sentimen tidak dikenal: {raw_label}"
            )

        confidence = float(result["score"])

        if not 0 <= confidence <= 1:
            raise ValueError(
                f"Confidence tidak valid: {confidence}"
            )

        output.append({
            "text": text,
            "sentiment": sentiment,
            "confidence": round(confidence, 4),
            "needs_review": confidence < 0.60
        })

    return output
