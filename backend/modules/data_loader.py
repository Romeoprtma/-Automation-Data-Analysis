import pandas as pd


def _read_csv_safely(uploaded_file):
    """
    Baca CSV dengan beberapa strategi:
    1. Parsing normal (koma)
    2. Auto-detect delimiter (; atau tab) + lewati baris rusak
    Mengembalikan (df, jumlah_baris_dilewati).
    """
    # Coba beberapa encoding, karena CSV dari Excel sering bukan UTF-8 murni
    for encoding in ("utf-8", "utf-8-sig", "latin-1"):
        # Percobaan 1: parsing normal
        try:
            uploaded_file.seek(0)
            df = pd.read_csv(uploaded_file, encoding=encoding)
            return df, 0
        except UnicodeDecodeError:
            continue
        except pd.errors.ParserError:
            pass

        # Percobaan 2: auto-detect delimiter, lewati baris yang rusak
        skipped = []

        def handle_bad_line(fields):
            skipped.append(fields)
            return None  # None = baris dibuang

        try:
            uploaded_file.seek(0)
            df = pd.read_csv(
                uploaded_file,
                sep=None,
                engine="python",
                encoding=encoding,
                on_bad_lines=handle_bad_line,
            )
            return df, len(skipped)
        except UnicodeDecodeError:
            continue

    raise ValueError("Encoding file tidak dikenali.")


def load_file(uploaded_file):
    """
    Membaca file Excel atau CSV.
    """
    filename = uploaded_file.name.lower()

    try:
        skipped_rows = 0

        if filename.endswith(".csv"):
            df, skipped_rows = _read_csv_safely(uploaded_file)

        elif filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(uploaded_file)

        else:
            raise ValueError("Format file tidak didukung.")

        if df.empty:
            raise ValueError("File tidak memiliki data.")

        # Rapikan nama kolom
        df.columns = [str(col).strip() for col in df.columns]

        # Simpan info baris yang dilewati supaya bisa ditampilkan di UI
        df.attrs["skipped_rows"] = skipped_rows

        return df

    except Exception as e:
        raise ValueError(f"Gagal membaca file: {e}")


def get_column_names(df):
    """
    Mengambil daftar nama kolom.
    """
    return df.columns.tolist()


def get_preview(df, rows=10):
    """
    Mengambil preview data.
    """
    return df.head(rows)