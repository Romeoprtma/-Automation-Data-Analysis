
import re
import unicodedata


# =====================================
# NORMALISASI NAMA KOLOM
# =====================================

def normalize_column_name(name):
    name = str(name).strip().lower()

    name = unicodedata.normalize("NFKD", name)
    name = "".join(
        char for char in name
        if not unicodedata.combining(char)
    )

    name = re.sub(r"[^a-z0-9]+", "_", name)

    return name.strip("_")


# =====================================
# DAFTAR ALIAS KOLOM
# =====================================

COLUMN_ALIASES = {
    "text": [
        "teks_berita",
        "isi_berita",
        "berita",
        "judul_berita",
        "judul",
        "content",
        "full_text",
        "tweet_text",
        "text",
        "article",
        "headline",
    ],

    "account": [
        "akun",
        "nama_akun",
        "username",
        "account",
        "source",
        "publisher",
        "media",
        "author",
    ],

    "date": [
        "tanggal",
        "tanggal_berita",
        "tanggal_publikasi",
        "waktu",
        "date",
        "published_at",
        "created_at",
        "timestamp",
        "publish_date",
    ],
}


# =====================================
# DETEKSI KOLOM
# =====================================

def detect_column(df, column_type):

    aliases = COLUMN_ALIASES[column_type]

    normalized_columns = {
        normalize_column_name(col): col
        for col in df.columns
    }

    # Prioritaskan kecocokan nama secara langsung
    for alias in aliases:
        if alias in normalized_columns:
            return normalized_columns[alias]

    # Coba pencocokan berdasarkan kata
    for normalized, original in normalized_columns.items():
        for alias in aliases:
            if (
                normalized.startswith(alias + "_")
                or normalized.endswith("_" + alias)
            ):
                return original

    return None


# =====================================
# DETEKSI SELURUH KOLOM DATASET
# =====================================

def detect_columns(df):

    if df is None or df.empty:
        raise ValueError("Dataset kosong atau tidak valid.")

    detected = {
        "text_column": detect_column(df, "text"),
        "account_column": detect_column(df, "account"),
        "date_column": detect_column(df, "date"),
    }

    # Kolom teks wajib tersedia
    if detected["text_column"] is None:

        raise ValueError(
            "Kolom teks berita tidak ditemukan. "
            "Gunakan nama kolom seperti "
            "'berita', 'judul', 'content', atau 'text'."
        )

    return detected
