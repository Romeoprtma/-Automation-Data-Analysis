# News Sentiment Analysis & Media Monitoring System

Sistem analisis sentimen berita otomatis berbahasa Indonesia dengan integrasi model NLP Hugging Face (IndoRoBERTa), ringkasan eksekutif berbasis Google Gemini AI (gemini-3.8-flash), dan antarmuka modern berbasis Next.js 16 + Tailwind CSS.

---

## 🏛️ Arsitektur Proyek

```
.
├── backend/                  # Layer Python Machine Learning & API
│   ├── .venv/                # Virtual environment Python
│   ├── app.py                # REST API Server (FastAPI) untuk Frontend Next.js
│   ├── config.py             # Konfigurasi model & threshold
│   ├── modules/
│   │   ├── column_detector.py    # Deteksi otomatis kolom teks, akun, tanggal
│   │   ├── data_loader.py        # Pembaca fleksibel CSV/Excel & multi-encoding
│   │   ├── preprocessing.py      # Pembersihan teks & validasi deduplikasi
│   │   └── sentiment_analysis.py # Pipeline inferensi sentimen & rekap
│   ├── models/
│   │   └── sentiment_model.py    # Hugging Face Transformer pipeline
│   └── reporting/
│       ├── llm_report.py         # Google Gemini AI Executive Summary
│       └── pdf_generator.py      # Generator Laporan PDF ReportLab
│
├── frontend/                 # Modern Web Dashboard (Next.js 16 App Router)
│   ├── app/
│   │   ├── page.tsx          # Dashboard UI utama: Upload, Preview, Chart, AI Summary, Table, PDF Download
│   │   ├── layout.tsx        # Shell layout & metadata
│   │   └── globals.css       # Tailwind CSS v4 styling
│   ├── .env.local            # NEXT_PUBLIC_API_URL=http://localhost:8000
│   └── package.json          # Dependencies Next.js, React 19, Lucide Icons
```

---

## 🚀 Cara Menjalankan Proyek

### 1. Menjalankan Backend API (Port 8000)
jalankan perintah berikut di terminal:
```bash
cd backend
.\.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
* Backend API akan aktif di: `http://localhost:8000`
* Dokumentasi Swagger interaktif: `http://localhost:8000/docs`

### 2. Menjalankan Frontend Next.js (Port 3000)
jalankan perintah berikut di terminal:
```bash
cd frontend
npm run dev
```
* Buka browser di: **`http://localhost:3000`**

---

## 🔌 Endpoint API Utama (`backend/main_api.py`)

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/health` | Cek status kesehatan server backend |
| `POST` | `/api/preview` | Upload dataset (CSV/XLSX), deteksi kolom otomatis & pratinjau 15 baris |
| `POST` | `/api/analyze` | Eksekusi pipeline analisis sentimen IndoRoBERTa + AI Summary Gemini |
| `GET` | `/api/report/pdf/{analysis_id}` | Mengunduh file laporan PDF lengkap |
