import uuid
from io import BytesIO
from datetime import datetime
from typing import Optional, Dict, Any

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
import pandas as pd

from config import APP_NAME
from modules.data_loader import load_file, get_preview, get_column_names
from modules.column_detector import detect_columns
from modules.preprocessing import preprocess_data
from modules.sentiment_analysis import analyze_dataset, get_sentiment_summary
from reporting.llm_report import generate_summary
from reporting.pdf_generator import generate_pdf_report

app = FastAPI(
    title=f"{APP_NAME} API",
    description="REST API for Automated Indonesian News Sentiment Analysis",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows localhost:3000 and any port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for recent analysis results (to allow instant PDF export)
ANALYSIS_CACHE: Dict[str, Dict[str, Any]] = {}


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "app": APP_NAME,
        "timestamp": datetime.now().isoformat()
    }


@app.post("/api/preview")
async def preview_dataset(file: UploadFile = File(...)):
    """
    Upload file and return dataset preview and auto-detected columns.
    """
    filename = file.filename or "dataset.csv"
    ext = filename.lower().split(".")[-1]
    if ext not in ["csv", "xlsx", "xls"]:
        raise HTTPException(
            status_code=400,
            detail="Format file tidak didukung. Harap upload file .csv, .xlsx, atau .xls."
        )

    try:
        content = await file.read()
        bio = BytesIO(content)
        bio.name = filename

        df = load_file(bio)

        # Detect columns with graceful fallback
        detected = {
            "text_column": None,
            "account_column": None,
            "date_column": None
        }
        try:
            detected = detect_columns(df)
        except Exception:
            # If auto-detection fails, user can manually select columns
            pass

        # Prepare preview (convert NaN to None for JSON serialization)
        preview_df = get_preview(df, rows=15)
        preview_data = preview_df.where(pd.notnull(preview_df), None).to_dict(orient="records")

        return {
            "success": True,
            "filename": filename,
            "total_rows": len(df),
            "columns": get_column_names(df),
            "detected_columns": detected,
            "skipped_rows": df.attrs.get("skipped_rows", 0),
            "preview": preview_data
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal memproses file: {str(e)}")


@app.post("/api/analyze")
async def analyze_news_dataset(
    file: UploadFile = File(...),
    text_column: Optional[str] = Form(None),
    account_column: Optional[str] = Form(None),
    date_column: Optional[str] = Form(None)
):
    """
    Execute end-to-end news sentiment analysis pipeline:
    1. Preprocessing & Validation
    2. Model Inference (IndoRoBERTa Sentiment Analysis)
    3. Gemini AI Executive Summary & Insights
    4. Trend & Distribution Aggregations
    """
    filename = file.filename or "dataset.csv"
    ext = filename.lower().split(".")[-1]
    if ext not in ["csv", "xlsx", "xls"]:
        raise HTTPException(status_code=400, detail="Format file tidak didukung.")

    try:
        content = await file.read()
        bio = BytesIO(content)
        bio.name = filename

        df = load_file(bio)

        # Determine column mappings
        if not text_column:
            try:
                auto_detected = detect_columns(df)
                text_column = auto_detected.get("text_column")
                if not account_column:
                    account_column = auto_detected.get("account_column")
                if not date_column:
                    date_column = auto_detected.get("date_column")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Gagal mengenali kolom teks: {str(e)}")

        if not text_column or text_column not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"Kolom teks '{text_column}' tidak ditemukan dalam dataset."
            )

        # Clean optional column names if empty string
        account_column = account_column if account_column and account_column in df.columns else None
        date_column = date_column if date_column and date_column in df.columns else None

        # Step 1: Preprocessing & Validation
        processed_df, validation_summary = preprocess_data(
            df=df,
            text_column=text_column,
            account_column=account_column,
            date_column=date_column
        )

        if processed_df.empty:
            raise HTTPException(
                status_code=400,
                detail="Tidak ada data yang lolos proses pembersihan/validasi."
            )

        # Step 2: Sentiment Analysis
        results_df = analyze_dataset(processed_df, text_column="teks_bersih")

        # Step 3: Sentiment Summary & Metrics
        sentiment_summary = get_sentiment_summary(results_df)

        counts = results_df["sentiment"].value_counts().to_dict()
        total_valid = len(results_df)
        avg_confidence = (
            round(float(results_df["confidence"].mean()) * 100, 2)
            if "confidence" in results_df.columns else 0.0
        )
        needs_review_count = int(results_df["needs_review"].sum()) if "needs_review" in results_df.columns else 0

        # Step 4: Trend Analysis (if date exists)
        trends = []
        if "waktu" in results_df.columns:
            valid_dates = results_df.dropna(subset=["waktu"]).copy()
            if not valid_dates.empty:
                valid_dates["tanggal"] = valid_dates["waktu"].dt.strftime("%Y-%m-%d")
                trend_grouped = (
                    valid_dates.groupby(["tanggal", "sentiment"])
                    .size()
                    .reset_index(name="count")
                )
                trends = trend_grouped.to_dict(orient="records")

        # Step 5: Gemini AI Summary
        try:
            ai_summary = generate_summary(results_df)
        except Exception as e:
            ai_summary = f"Summary AI gagal dibuat: {str(e)}"

        # Generate unique analysis ID and cache results for instant PDF download
        analysis_id = str(uuid.uuid4())
        ANALYSIS_CACHE[analysis_id] = {
            "results_df": results_df,
            "ai_summary": ai_summary,
            "dataset_name": filename,
            "created_at": datetime.now()
        }

        # Keep cache manageable (max 10 recent analyses)
        if len(ANALYSIS_CACHE) > 10:
            oldest_key = next(iter(ANALYSIS_CACHE))
            ANALYSIS_CACHE.pop(oldest_key, None)

        # Format rows for JSON response (limit to top 500 for fast transfer, include all needed fields)
        safe_df = results_df.copy()
        if "waktu" in safe_df.columns:
            safe_df["waktu"] = safe_df["waktu"].dt.strftime("%Y-%m-%d %H:%M:%S")

        serialized_rows = (
            safe_df.where(pd.notnull(safe_df), None)
            .head(1000)
            .to_dict(orient="records")
        )

        return {
            "success": True,
            "analysis_id": analysis_id,
            "filename": filename,
            "detected_columns": {
                "text_column": text_column,
                "account_column": account_column,
                "date_column": date_column
            },
            "validation_summary": validation_summary,
            "sentiment_summary": sentiment_summary,
            "metrics": {
                "total": total_valid,
                "positive": int(counts.get("positive", 0)),
                "positive_pct": round(int(counts.get("positive", 0)) / total_valid * 100, 1) if total_valid else 0,
                "neutral": int(counts.get("neutral", 0)),
                "neutral_pct": round(int(counts.get("neutral", 0)) / total_valid * 100, 1) if total_valid else 0,
                "negative": int(counts.get("negative", 0)),
                "negative_pct": round(int(counts.get("negative", 0)) / total_valid * 100, 1) if total_valid else 0,
                "avg_confidence": avg_confidence,
                "needs_review": needs_review_count
            },
            "trends": trends,
            "ai_summary": ai_summary,
            "rows": serialized_rows,
            "total_analyzed": total_valid
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan saat analisis: {str(e)}")


@app.get("/api/report/pdf/{analysis_id}")
def download_pdf_report(analysis_id: str):
    """
    Generate and stream the PDF report for a given analysis ID.
    """
    if analysis_id not in ANALYSIS_CACHE:
        raise HTTPException(
            status_code=404,
            detail="Hasil analisis tidak ditemukan atau sesi telah kedaluwarsa. Silakan jalankan analisis ulang."
        )

    cached = ANALYSIS_CACHE[analysis_id]
    try:
        pdf_bytes = generate_pdf_report(
            results=cached["results_df"],
            ai_summary=cached["ai_summary"],
            dataset_name=cached["dataset_name"]
        )

        filename = f"news_sentiment_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal membuat laporan PDF: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

