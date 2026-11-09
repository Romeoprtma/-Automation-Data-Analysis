import pandas as pd
import re


def clean_text(text):
    """
    Membersihkan teks berita tanpa
    menghilangkan konteks penting.
    """

    if pd.isna(text):
        return ""

    text = str(text)

    # Hapus URL
    text = re.sub(
        r"https?://\S+|www\.\S+",
        "",
        text
    )

    # Rapikan whitespace
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def preprocess_data(
    df,
    text_column,
    account_column=None,
    date_column=None
):
    """
    Preprocessing dataset berita.
    """

    df = df.copy()

    initial_rows = len(df)

    # Simpan teks asli
    df["teks_asli"] = df[text_column].fillna("").astype(str)

    # Buat teks hasil preprocessing
    df["teks_bersih"] = df["teks_asli"].apply(clean_text)

    # Hapus teks kosong atau kurang dari 3 karakter
    empty_mask = df["teks_bersih"].str.len() < 3

    removed_empty = int(empty_mask.sum())

    df = df.loc[~empty_mask].copy()

    # Hapus duplikat
    if account_column and account_column in df.columns:
        duplicate_columns = [
            "teks_bersih",
            account_column
        ]
    else:
        duplicate_columns = ["teks_bersih"]

    before_dedup = len(df)

    df = df.drop_duplicates(
        subset=duplicate_columns
    )

    removed_duplicates = before_dedup - len(df)

    # Normalisasi tanggal jika tersedia
    unreadable_dates = 0

    if date_column and date_column in df.columns:
        df["waktu"] = pd.to_datetime(
            df[date_column],
            errors="coerce",
            dayfirst=True
        )

        unreadable_dates = int(df["waktu"].isna().sum())

    # Reset index
    df = df.reset_index(drop=True)

    # Statistik validasi
    validation_summary = {
        "total_awal": initial_rows,
        "dibuang_kosong": removed_empty,
        "dibuang_duplikat": removed_duplicates,
        "tanggal_tidak_terbaca": unreadable_dates,
        "total_lolos": len(df)
    }

    return df, validation_summary