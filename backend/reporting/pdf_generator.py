
import re
import html
from io import BytesIO
from datetime import datetime

import pandas as pd

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm

from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle
)

from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart


# =====================================
# MARKDOWN CONVERTER
# =====================================

def markdown_to_paragraphs(markdown, styles):

    elements = []

    for line in str(markdown).splitlines():

        line = line.strip()

        if not line:
            elements.append(Spacer(1, 6))
            continue

        line = html.escape(line)

        line = re.sub(
            r"\*\*(.*?)\*\*",
            r"<b>\1</b>",
            line
        )

        line = re.sub(
            r"`(.*?)`",
            r"<font name='Courier'>\1</font>",
            line
        )

        if line.startswith("### "):
            elements.append(
                Paragraph(line[4:], styles["Heading3"])
            )

        elif line.startswith("## "):
            elements.append(
                Paragraph(line[3:], styles["Heading2"])
            )

        elif line.startswith("# "):
            elements.append(
                Paragraph(line[2:], styles["Heading1"])
            )

        elif line.startswith(("- ", "* ")):
            elements.append(
                Paragraph(
                    "&#8226; " + line[2:],
                    styles["BodyText"]
                )
            )

        else:
            elements.append(
                Paragraph(line, styles["BodyText"])
            )

    return elements


# =====================================
# PDF GENERATOR
# =====================================

def generate_pdf_report(
    results,
    ai_summary,
    dataset_name="Dataset Berita"
):

    if results is None or results.empty:
        raise ValueError("Tidak ada hasil analisis untuk dibuat PDF.")

    if "sentiment" not in results.columns:
        raise ValueError("Kolom sentiment tidak ditemukan.")

    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm
    )

    styles = getSampleStyleSheet()

    styles.add(
        ParagraphStyle(
            name="ReportTitle",
            parent=styles["Title"],
            fontSize=20,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#1E3A8A"),
            spaceAfter=10
        )
    )

    styles.add(
        ParagraphStyle(
            name="Section",
            parent=styles["Heading2"],
            textColor=colors.HexColor("#1E3A8A"),
            spaceBefore=14,
            spaceAfter=8
        )
    )

    elements = []

    # =====================================
    # REPORT HEADER
    # =====================================

    elements.append(
        Paragraph(
            "NEWS SENTIMENT ANALYSIS REPORT",
            styles["ReportTitle"]
        )
    )

    elements.append(
        Paragraph(
            f"Generated: {datetime.now().strftime('%d %B %Y, %H:%M')}",
            styles["Normal"]
        )
    )

    elements.append(Spacer(1, 10))

    # =====================================
    # SENTIMENT CALCULATION
    # =====================================

    sentiment = (
        results["sentiment"]
        .astype(str)
        .str.lower()
    )

    counts = sentiment.value_counts()

    positive = int(counts.get("positive", 0))
    neutral = int(counts.get("neutral", 0))
    negative = int(counts.get("negative", 0))

    total = len(results)

    # =====================================
    # DATASET OVERVIEW
    # =====================================

    elements.append(
        Paragraph("1. Dataset Overview", styles["Section"])
    )

    overview_data = [
        ["Dataset", str(dataset_name)],
        ["Total News", str(total)],
        ["Positive", str(positive)],
        ["Neutral", str(neutral)],
        ["Negative", str(negative)]
    ]

    overview_table = Table(
        overview_data,
        colWidths=[5 * cm, 11 * cm]
    )

    overview_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (0, -1),
             colors.HexColor("#E8EEF9")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("PADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE")
        ])
    )

    elements.append(overview_table)

    # =====================================
    # SENTIMENT STATISTICS
    # =====================================

    elements.append(
        Paragraph("2. Sentiment Statistics", styles["Section"])
    )

    statistics = [
        ["Sentiment", "Total", "Percentage"],
        ["Positive", positive,
         f"{positive / total * 100:.2f}%" if total else "0%"],
        ["Neutral", neutral,
         f"{neutral / total * 100:.2f}%" if total else "0%"],
        ["Negative", negative,
         f"{negative / total * 100:.2f}%" if total else "0%"]
    ]

    stat_table = Table(
        statistics,
        colWidths=[6 * cm, 5 * cm, 5 * cm]
    )

    stat_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0),
             colors.HexColor("#1E3A8A")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("PADDING", (0, 0), (-1, -1), 8)
        ])
    )

    elements.append(stat_table)

    # =====================================
    # SENTIMENT VISUALIZATION
    # =====================================

    elements.append(
        Paragraph("3. Sentiment Visualization", styles["Section"])
    )

    if positive + neutral + negative > 0:

        drawing = Drawing(400, 190)

        pie = Pie()
        pie.x = 115
        pie.y = 15
        pie.width = 150
        pie.height = 150

        pie.data = [positive, neutral, negative]

        pie.labels = [
            "Positive",
            "Neutral",
            "Negative"
        ]

        pie.slices.strokeWidth = 0.5

        pie.slices[0].fillColor = colors.HexColor("#22C55E")
        pie.slices[1].fillColor = colors.HexColor("#EAB308")
        pie.slices[2].fillColor = colors.HexColor("#EF4444")

        drawing.add(pie)
        elements.append(drawing)

        chart_drawing = Drawing(400, 200)

        chart = VerticalBarChart()

        chart.x = 55
        chart.y = 35
        chart.width = 300
        chart.height = 130

        chart.data = [[positive, neutral, negative]]

        chart.categoryAxis.categoryNames = [
            "Positive",
            "Neutral",
            "Negative"
        ]

        chart.categoryAxis.labels.boxAnchor = "ne"
        chart.valueAxis.valueMin = 0

        chart.valueAxis.valueMax = max(
            max(positive, neutral, negative) * 1.2,
            1
        )

        chart.valueAxis.valueStep = max(
            1,
            int(chart.valueAxis.valueMax / 5)
        )

        chart.bars[0].fillColor = colors.HexColor("#2563EB")

        chart_drawing.add(chart)
        elements.append(chart_drawing)

    else:

        elements.append(
            Paragraph(
                "Tidak tersedia data sentimen untuk visualisasi.",
                styles["BodyText"]
            )
        )

    # =====================================
    # AI SUMMARY
    # =====================================

    elements.append(
        Paragraph("4. AI Summary & Insights", styles["Section"])
    )

    elements.extend(
        markdown_to_paragraphs(ai_summary, styles)
    )

    # =====================================
    # MODEL CONFIDENCE
    # =====================================

    elements.append(
        Paragraph("5. Model Confidence", styles["Section"])
    )

    if "confidence" in results.columns:

        confidence = pd.to_numeric(
            results["confidence"],
            errors="coerce"
        ).dropna()

        if not confidence.empty:

            avg_confidence = confidence.mean() * 100

            elements.append(
                Paragraph(
                    f"Average Confidence: {avg_confidence:.2f}%",
                    styles["BodyText"]
                )
            )

        else:

            elements.append(
                Paragraph(
                    "Confidence tidak tersedia.",
                    styles["BodyText"]
                )
            )

    # =====================================
    # ANALYSIS DETAILS
    # =====================================

    elements.append(
        Paragraph(
            "6. Analysis Details (Sample)",
            styles["Section"]
        )
    )

    text_column = next(
        (
            col for col in ["teks_asli", "teks_bersih"]
            if col in results.columns
        ),
        None
    )

    if text_column:

        detail_data = [
            ["No.", "News Text", "Sentiment"]
        ]

        for index, row in enumerate(
            results.head(10).itertuples(index=False)
        ):

            news = str(
                getattr(row, text_column)
            )[:180]

            sentiment_value = str(
                getattr(row, "sentiment", "Unknown")
            ).capitalize()

            detail_data.append([
                str(index + 1),
                Paragraph(
                    html.escape(news),
                    styles["BodyText"]
                ),
                sentiment_value
            ])

        detail_table = Table(
            detail_data,
            colWidths=[1 * cm, 12 * cm, 3 * cm],
            repeatRows=1
        )

        detail_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0),
                 colors.HexColor("#1E3A8A")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("PADDING", (0, 0), (-1, -1), 6)
            ])
        )

        elements.append(detail_table)

    # =====================================
    # FOOTER
    # =====================================

    def add_footer(canvas, doc):

        canvas.saveState()

        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.grey)

        canvas.drawCentredString(
            A4[0] / 2,
            1 * cm,
            f"News Sentiment Analysis | Page {doc.page}"
        )

        canvas.restoreState()

    doc.build(
        elements,
        onFirstPage=add_footer,
        onLaterPages=add_footer
    )

    buffer.seek(0)

    return buffer.getvalue()
