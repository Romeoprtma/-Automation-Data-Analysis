
import pandas as pd
from google import genai
import streamlit as st

from config import GEMINI_API_KEY, GEMINI_MODEL


def generate_summary(results):
    """
    Generate executive summary and insights
    from sentiment analysis results.
    """

    if results is None or results.empty:
        return "Tidak ada data untuk dianalisis."

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)

        # Menghitung distribusi sentimen
        sentiment_counts = (
            results["sentiment"]
            .value_counts()
            .to_dict()
        )

        total_data = len(results)

        sentiment_percentages = {
            sentiment: round(
                (count / total_data) * 100, 2
            )
            for sentiment, count in sentiment_counts.items()
        }

        # Menghitung rata-rata confidence
        avg_confidence = (
            round(results["confidence"].mean() * 100, 2)
            if "confidence" in results.columns
            else None
        )

        # Mengambil contoh berita
        text_column = (
            "teks_asli"
            if "teks_asli" in results.columns
            else "teks_bersih"
        )

        # Mengambil contoh berita yang seimbang dari setiap sentimen
        sample_dfs = []
        for s in ["negative", "positive", "neutral"]:
            sub = results[results["sentiment"] == s]
            if not sub.empty:
                sample_dfs.append(sub[["sentiment", text_column]].dropna().head(8))

        if sample_dfs:
            samples = pd.concat(sample_dfs).head(24)
        else:
            samples = results[["sentiment", text_column]].dropna().head(20)

        sample_text = samples.to_dict(orient="records")

        prompt = f"""
        Anda adalah analis data dan media monitoring profesional.

        Analisis hasil sentiment analysis berikut.

        DATA ANALISIS:
        Total berita: {total_data}
        Distribusi sentimen: {sentiment_counts}
        Persentase sentimen: {sentiment_percentages}
        Rata-rata confidence: {avg_confidence}%

        CONTOH BERITA:
        {sample_text}

        BUAT LAPORAN DENGAN FORMAT:

        1. EXECUTIVE SUMMARY
        Ringkasan kondisi sentimen keseluruhan.

        2. KEY INSIGHTS
        Temuan utama dari distribusi sentimen.

        3. POSITIVE INSIGHTS
        Hal positif yang terlihat dari data.

        4. NEGATIVE INSIGHTS
        Isu negatif yang perlu diperhatikan.

        5. RECOMMENDATIONS
        Rekomendasi berdasarkan hasil analisis.

        ATURAN:
        - Gunakan bahasa Indonesia profesional.
        - Gunakan data sebagai dasar analisis.
        - Jangan mengarang fakta atau angka.
        - Bedakan fakta data dan interpretasi.
        - Jangan menyimpulkan penyebab tanpa bukti.
        - Buat laporan ringkas dan mudah dipahami.
        """

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )

        return response.text

    except Exception as e:
        return f"Gagal membuat summary Gemini: {str(e)}"
