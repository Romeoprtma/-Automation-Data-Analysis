"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  Upload,
  FileSpreadsheet,
  Download,
  RotateCcw,
  BarChart2,
  TrendingUp,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Loader2,
  FileText,
  Lightbulb,
  AlertTriangle,
  Target,
  Layers,
  ArrowUpRight,
  Calendar,
  Building2,
  SlidersHorizontal,
} from "lucide-react";

interface DetectedColumns {
  text_column: string | null;
  account_column: string | null;
  date_column: string | null;
}

interface SentimentMetrics {
  total: number;
  positive: number;
  positive_pct: number;
  neutral: number;
  neutral_pct: number;
  negative: number;
  negative_pct: number;
  avg_confidence: number;
  needs_review: number;
}

interface ValidationSummary {
  total_awal: number;
  dibuang_kosong: number;
  dibuang_duplikat: number;
  tanggal_tidak_terbaca: number;
  total_lolos: number;
}

interface TrendPoint {
  tanggal: string;
  sentiment: string;
  count: number;
}

interface AnalysisResult {
  analysis_id: string;
  filename: string;
  detected_columns?: DetectedColumns;
  validation_summary: ValidationSummary;
  sentiment_summary: {
    sentiment: string;
    total: number;
    percentage: number;
  }[];
  metrics: SentimentMetrics;
  trends: TrendPoint[];
  ai_summary: string;
  rows: Record<string, any>[];
  total_analyzed: number;
}

interface AiSection {
  id: string;
  title: string;
  type: "executive" | "insights" | "positive" | "negative" | "recommendations" | "general";
  content: string;
}

function parseSummarySections(rawText: string): AiSection[] {
  if (!rawText) return [];

  const regex = /(?:^|\n)(?:#{1,6}\s*)?(?:\*\*)?(?:([1-5])[\.\)]\s*)?(EXECUTIVE SUMMARY|KEY INSIGHTS|POSITIVE INSIGHTS|NEGATIVE INSIGHTS|RECOMMENDATIONS)(?:\*\*)?[^\n]*/gi;
  const matches = Array.from(rawText.matchAll(regex));

  if (matches.length === 0) {
    return [
      {
        id: "general-0",
        title: "Executive Overview",
        type: "general",
        content: rawText,
      },
    ];
  }

  const sections: AiSection[] = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const categoryUpper = (match[2] || "").toUpperCase();
    const startIndex = (match.index || 0) + match[0].length;
    const endIndex = i < matches.length - 1 ? matches[i + 1].index : rawText.length;
    const content = rawText.slice(startIndex, endIndex).trim();

    let type: AiSection["type"] = "general";
    let title = categoryUpper;

    if (categoryUpper.includes("EXECUTIVE")) {
      type = "executive";
      title = "Executive Summary";
    } else if (categoryUpper.includes("KEY")) {
      type = "insights";
      title = "Key Insights";
    } else if (categoryUpper.includes("POSITIVE")) {
      type = "positive";
      title = "Positive Drivers";
    } else if (categoryUpper.includes("NEGATIVE")) {
      type = "negative";
      title = "Critical Concerns";
    } else if (categoryUpper.includes("RECOMMENDATION")) {
      type = "recommendations";
      title = "Strategic Recommendations";
    }

    sections.push({
      id: `${i}-${type}`,
      title,
      type,
      content,
    });
  }

  return sections;
}

export default function SentimentAnalysisDashboard() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<"ALL" | "positive" | "neutral" | "negative" | "review">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 12;

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/health`);
        if (res.ok) {
          setBackendStatus("online");
        } else {
          setBackendStatus("offline");
        }
      } catch {
        setBackendStatus("offline");
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 20000);
    return () => clearInterval(interval);
  }, [API_BASE]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const processSelectedFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMsg(null);
    setAnalysisResult(null);
    setIsAnalyzing(true);
    setAnalysisStage("Validating file and detecting schema...");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const timer1 = setTimeout(() => {
        setAnalysisStage("Running IndoRoBERTa text classification...");
      }, 2000);

      const timer2 = setTimeout(() => {
        setAnalysisStage("Synthesizing executive intelligence via Gemini LLM...");
      }, 6500);

      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        body: formData,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Unable to complete dataset analysis.");
      }

      setAnalysisResult(data);
      setCurrentPage(1);
    } catch (err: any) {
      setErrorMsg(err.message || "Analysis failed. Please verify the dataset format and server status.");
      setFile(null);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStage("");
    }
  };

  const handleReset = () => {
    setFile(null);
    setAnalysisResult(null);
    setErrorMsg(null);
    setSearchQuery("");
    setSentimentFilter("ALL");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownloadPDF = () => {
    if (!analysisResult) return;
    window.open(`${API_BASE}/api/report/pdf/${analysisResult.analysis_id}`, "_blank");
  };

  const accountCol = analysisResult?.detected_columns?.account_column;
  const dateCol = analysisResult?.detected_columns?.date_column;

  const filteredRows = (analysisResult?.rows || []).filter((row) => {
    const text = String(row.teks_bersih || row.teks_asli || "").toLowerCase();
    const account = accountCol ? String(row[accountCol] || "").toLowerCase() : "";
    const query = searchQuery.toLowerCase().trim();

    const matchesSearch = query === "" || text.includes(query) || account.includes(query);
    if (!matchesSearch) return false;

    if (sentimentFilter === "ALL") return true;
    if (sentimentFilter === "review") return row.needs_review === true;
    return row.sentiment === sentimentFilter;
  });

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;
  const paginatedRows = filteredRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const circumference = 251.327;
  const posLength = ((analysisResult?.metrics.positive_pct || 0) / 100) * circumference;
  const neuLength = ((analysisResult?.metrics.neutral_pct || 0) / 100) * circumference;
  const negLength = ((analysisResult?.metrics.negative_pct || 0) / 100) * circumference;
  const neuOffset = -posLength;
  const negOffset = -(posLength + neuLength);

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Global Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-mono text-sm font-semibold tracking-wider">
              NS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-tight text-slate-900">
                  News Sentiment Intelligence
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/70">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-slate-500">Indonesian News Monitoring & Analysis</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
              <span
                className={`h-2 w-2 rounded-full ${
                  backendStatus === "online"
                    ? "bg-emerald-600"
                    : backendStatus === "checking"
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
              />
              <span className="font-medium">
                {backendStatus === "online"
                  ? "Operational"
                  : backendStatus === "checking"
                  ? "Connecting..."
                  : "Disconnected"}
              </span>
            </div>

            {analysisResult && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-md transition-colors shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md transition-colors shadow-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                  <span>New Upload</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Workspace */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col gap-6">
        {/* Error Notice */}
        {errorMsg && (
          <div className="rounded-lg bg-rose-50 border border-rose-200/80 p-4 text-rose-900 flex items-start justify-between gap-3 text-sm">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-950">Action Failed</p>
                <p className="text-xs text-rose-800 mt-0.5">{errorMsg}</p>
              </div>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* STATE 1: UPLOAD WORKSPACE */}
        {!analysisResult && (
          <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full my-auto py-12">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Analyze News Sentiment
              </h1>
              <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                Upload a news dataset in CSV or Excel format. The system automatically inspects column schemas, normalizes text, classifies sentiments via IndoRoBERTa, and generates executive briefing notes.
              </p>
            </div>

            {!isAnalyzing ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`group relative rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all bg-white flex flex-col items-center justify-center gap-4 ${
                  isDragging
                    ? "border-slate-900 bg-slate-50/80 ring-4 ring-slate-100"
                    : "border-slate-300 hover:border-slate-400 hover:bg-slate-50/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="h-12 w-12 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200/80 group-hover:scale-105 transition-transform">
                  <Upload className="h-5 w-5" />
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    Click to browse or drag and drop dataset file
                  </p>
                  <p className="text-xs text-slate-500">
                    Supports <span className="font-mono text-slate-700">.csv</span>,{" "}
                    <span className="font-mono text-slate-700">.xlsx</span>, and{" "}
                    <span className="font-mono text-slate-700">.xls</span>
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 px-3 py-1 rounded-md border border-slate-200">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" />
                  Auto-detects text, source, and timestamps
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-xs flex flex-col items-center justify-center gap-5 text-center">
                <Loader2 className="h-8 w-8 text-slate-800 animate-spin" />
                <div className="space-y-1.5 max-w-sm">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Processing Dataset
                  </h3>
                  <p className="text-xs font-mono text-slate-600 bg-slate-100 py-1 px-3 rounded inline-block">
                    {analysisStage}
                  </p>
                  <p className="text-xs text-slate-500 pt-2 leading-relaxed">
                    Executing data validation, transformer model inference, and executive summarization.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STATE 2: RESULTS DASHBOARD */}
        {analysisResult && (
          <div className="flex flex-col gap-6">
            {/* Header Context & Primary Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">
                    Analysis Completed
                  </span>
                </div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  {analysisResult.filename}
                </h1>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200/60 font-mono">
                    Text: {analysisResult.detected_columns?.text_column || "text"}
                  </span>
                  {accountCol && (
                    <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200/60 font-mono">
                      Source: {accountCol}
                    </span>
                  )}
                  {dateCol && (
                    <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200/60 font-mono">
                      Date: {dateCol}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 sm:px-5 py-2.5 rounded-lg transition-all shadow-sm hover:shadow"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Laporan PDF</span>
                </button>
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg transition-colors shadow-2xs"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                  <span>Upload Baru</span>
                </button>
              </div>
            </div>

            {/* Structured KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {/* Metric 1 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-500">Total Analyzed</span>
                <div className="mt-2 text-2xl font-semibold font-mono tracking-tight text-slate-900">
                  {analysisResult.metrics.total.toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-500 mt-1">100% valid rows</span>
              </div>

              {/* Metric 2 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Positive</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                </div>
                <div className="mt-2 text-2xl font-semibold font-mono tracking-tight text-emerald-700">
                  {analysisResult.metrics.positive_pct}%
                </div>
                <span className="text-[11px] text-slate-500 mt-1 font-mono">
                  {analysisResult.metrics.positive.toLocaleString()} records
                </span>
              </div>

              {/* Metric 3 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Neutral</span>
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                </div>
                <div className="mt-2 text-2xl font-semibold font-mono tracking-tight text-slate-700">
                  {analysisResult.metrics.neutral_pct}%
                </div>
                <span className="text-[11px] text-slate-500 mt-1 font-mono">
                  {analysisResult.metrics.neutral.toLocaleString()} records
                </span>
              </div>

              {/* Metric 4 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Negative</span>
                  <span className="h-2 w-2 rounded-full bg-rose-600" />
                </div>
                <div className="mt-2 text-2xl font-semibold font-mono tracking-tight text-rose-700">
                  {analysisResult.metrics.negative_pct}%
                </div>
                <span className="text-[11px] text-slate-500 mt-1 font-mono">
                  {analysisResult.metrics.negative.toLocaleString()} records
                </span>
              </div>

              {/* Metric 5 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-500">Avg. Confidence</span>
                <div className="mt-2 text-2xl font-semibold font-mono tracking-tight text-slate-900">
                  {analysisResult.metrics.avg_confidence}%
                </div>
                <span className="text-[11px] text-slate-500 mt-1">IndoRoBERTa</span>
              </div>

              {/* Metric 6 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-500">Needs Review</span>
                <div className="mt-2 text-2xl font-semibold font-mono tracking-tight text-amber-700">
                  {analysisResult.metrics.needs_review}
                </div>
                <span className="text-[11px] text-slate-500 mt-1">Score &lt; 60%</span>
              </div>
            </div>

            {/* Analytics & Executive Briefing Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (5 cols): Distribution & Timeline */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                {/* Donut Chart Component */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-700 flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-slate-500" />
                      Sentiment Distribution
                    </h2>
                    <span className="text-xs font-mono text-slate-500">
                      Total: {analysisResult.metrics.total}
                    </span>
                  </div>

                  <div className="py-6 flex flex-col items-center justify-center">
                    <div className="relative w-40 h-40">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          stroke="#f1f5f9"
                          strokeWidth="14"
                        />
                        {/* Positive */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          stroke="#059669"
                          strokeWidth="14"
                          strokeDasharray={`${posLength.toFixed(1)} ${circumference.toFixed(1)}`}
                          strokeDashoffset="0"
                        />
                        {/* Neutral */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          stroke="#64748b"
                          strokeWidth="14"
                          strokeDasharray={`${neuLength.toFixed(1)} ${circumference.toFixed(1)}`}
                          strokeDashoffset={neuOffset.toFixed(1)}
                        />
                        {/* Negative */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          stroke="#e11d48"
                          strokeWidth="14"
                          strokeDasharray={`${negLength.toFixed(1)} ${circumference.toFixed(1)}`}
                          strokeDashoffset={negOffset.toFixed(1)}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
                          {analysisResult.metrics.total}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                          Records
                        </span>
                      </div>
                    </div>

                    {/* Structured Legend Table */}
                    <div className="w-full mt-6 pt-4 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 shrink-0" />
                          <span className="font-medium text-slate-800">Positive</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-slate-500 text-[11px]">
                            {analysisResult.metrics.positive} records
                          </span>
                          <span className="font-semibold text-slate-900 w-12 text-right">
                            {analysisResult.metrics.positive_pct}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-slate-500 shrink-0" />
                          <span className="font-medium text-slate-800">Neutral</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-slate-500 text-[11px]">
                            {analysisResult.metrics.neutral} records
                          </span>
                          <span className="font-semibold text-slate-900 w-12 text-right">
                            {analysisResult.metrics.neutral_pct}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-rose-600 shrink-0" />
                          <span className="font-medium text-slate-800">Negative</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-slate-500 text-[11px]">
                            {analysisResult.metrics.negative} records
                          </span>
                          <span className="font-semibold text-slate-900 w-12 text-right">
                            {analysisResult.metrics.negative_pct}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Temporal Breakdown (if dates exist) */}
                {analysisResult.trends && analysisResult.trends.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                      <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-700 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        Temporal Distribution
                      </h2>
                      <span className="text-[11px] text-slate-500">By publication date</span>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {Array.from(new Set(analysisResult.trends.map((t) => t.tanggal))).map((date) => {
                        const dayData = analysisResult.trends.filter((t) => t.tanggal === date);
                        const pos = dayData.find((t) => t.sentiment === "positive")?.count || 0;
                        const neu = dayData.find((t) => t.sentiment === "neutral")?.count || 0;
                        const neg = dayData.find((t) => t.sentiment === "negative")?.count || 0;
                        const totalDay = pos + neu + neg || 1;

                        return (
                          <div key={date} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 text-xs">
                            <div className="flex items-center justify-between font-mono mb-1.5">
                              <span className="font-medium text-slate-900">{date}</span>
                              <span className="text-slate-500 text-[11px]">{totalDay} items</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 rounded-full flex overflow-hidden">
                              <div style={{ width: `${(pos / totalDay) * 100}%` }} className="bg-emerald-600" />
                              <div style={{ width: `${(neu / totalDay) * 100}%` }} className="bg-slate-500" />
                              <div style={{ width: `${(neg / totalDay) * 100}%` }} className="bg-rose-600" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column (7 cols): AI Executive Intelligence */}
              <div className="lg:col-span-7 flex flex-col">
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex-1 flex flex-col">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                    <div className="space-y-0.5">
                      <h2 className="text-sm font-semibold tracking-tight text-slate-900 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-600" />
                        Executive Intelligence & Synthesis
                      </h2>
                      <p className="text-xs text-slate-500">
                        Structured narrative summary generated by Google Gemini
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Gemini 3.8 Flash
                      </span>
                      <button
                        onClick={handleDownloadPDF}
                        title="Download Laporan PDF"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded transition-colors shadow-2xs"
                      >
                        <Download className="h-3 w-3" />
                        <span>Unduh PDF</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3.5 max-h-[580px] overflow-y-auto pr-2">
                    {parseSummarySections(analysisResult.ai_summary).map((sec, idx) => {
                      const isExec = sec.type === "executive";
                      const isInsights = sec.type === "insights";
                      const isPos = sec.type === "positive";
                      const isNeg = sec.type === "negative";
                      const isRec = sec.type === "recommendations";

                      const borderAccent = isExec
                        ? "border-l-blue-600"
                        : isInsights
                        ? "border-l-amber-600"
                        : isPos
                        ? "border-l-emerald-600"
                        : isNeg
                        ? "border-l-rose-600"
                        : isRec
                        ? "border-l-indigo-600"
                        : "border-l-slate-400";

                      const SectionIcon = isExec
                        ? FileText
                        : isInsights
                        ? Lightbulb
                        : isPos
                        ? TrendingUp
                        : isNeg
                        ? AlertTriangle
                        : isRec
                        ? Target
                        : Layers;

                      return (
                        <div
                          key={sec.id || idx}
                          className={`rounded-lg border border-slate-200/90 border-l-4 ${borderAccent} bg-white p-4 shadow-2xs`}
                        >
                          <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-100">
                            <SectionIcon className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                            <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-800">
                              {sec.title}
                            </h3>
                          </div>

                          <div className="text-xs text-slate-600 leading-relaxed">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => (
                                  <p className="mb-2 last:mb-0 text-slate-700 leading-relaxed text-xs">
                                    {children}
                                  </p>
                                ),
                                ul: ({ children }) => (
                                  <ul className="space-y-1.5 my-2 list-none pl-0">{children}</ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="space-y-1.5 my-2 list-decimal pl-4">{children}</ol>
                                ),
                                li: ({ children }) => (
                                  <li className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                                    <div className="flex-1">{children}</div>
                                  </li>
                                ),
                                strong: ({ children }) => (
                                  <strong className="font-semibold text-slate-900">{children}</strong>
                                ),
                                em: ({ children }) => (
                                  <em className="italic text-slate-800">{children}</em>
                                ),
                              }}
                            >
                              {sec.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: Data Explorer Table */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                    Dataset Records Explorer
                  </h2>
                  <p className="text-xs text-slate-500">
                    Showing {filteredRows.length} of {analysisResult.total_analyzed} classified records
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Search Bar */}
                  <div className="relative w-full sm:w-60">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter records by text..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                    />
                  </div>

                  {/* Segmented Sentiment Filter */}
                  <div className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs">
                    {(
                      [
                        { key: "ALL", label: "All" },
                        { key: "positive", label: "Positive" },
                        { key: "neutral", label: "Neutral" },
                        { key: "negative", label: "Negative" },
                        { key: "review", label: "Review" },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => {
                          setSentimentFilter(tab.key);
                          setCurrentPage(1);
                        }}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                          sentimentFilter === tab.key
                            ? "bg-white text-slate-900 shadow-2xs font-semibold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5 w-12 text-center font-mono">#</th>
                      <th className="px-4 py-2.5">Headline & Content</th>
                      {accountCol && <th className="px-4 py-2.5 w-36">Publisher</th>}
                      {dateCol && <th className="px-4 py-2.5 w-32 font-mono">Date</th>}
                      <th className="px-4 py-2.5 w-24 text-center">Sentiment</th>
                      <th className="px-4 py-2.5 w-24 text-center font-mono">Confidence</th>
                      <th className="px-4 py-2.5 w-20 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-slate-500 text-xs">
                          No matching records found for the active filter criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((row, idx) => {
                        const globalIndex = (currentPage - 1) * rowsPerPage + idx + 1;
                        const isPos = row.sentiment === "positive";
                        const isNeg = row.sentiment === "negative";

                        return (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-2.5 text-center text-slate-400 font-mono text-[11px]">
                              {globalIndex}
                            </td>
                            <td className="px-4 py-2.5 max-w-md">
                              <p className="line-clamp-2 text-slate-800 leading-normal">
                                {row.teks_bersih || row.teks_asli || "-"}
                              </p>
                            </td>
                            {accountCol && (
                              <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 font-medium">
                                {row[accountCol] || "-"}
                              </td>
                            )}
                            {dateCol && (
                              <td className="px-4 py-2.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                                {row.waktu || row[dateCol] || "-"}
                              </td>
                            )}
                            <td className="px-4 py-2.5 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                                  isPos
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : isNeg
                                    ? "bg-rose-50 text-rose-800 border-rose-200"
                                    : "bg-slate-50 text-slate-700 border-slate-200"
                                }`}
                              >
                                {isPos ? "Positive" : isNeg ? "Negative" : "Neutral"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center whitespace-nowrap font-mono text-slate-700 text-[11px]">
                              {(Number(row.confidence || 0) * 100).toFixed(1)}%
                            </td>
                            <td className="px-4 py-2.5 text-center whitespace-nowrap">
                              {row.needs_review ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                  Review
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                                  Valid
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-1 text-xs text-slate-600">
                  <div>
                    Page <span className="font-semibold text-slate-900">{currentPage}</span> of{" "}
                    <span className="font-semibold text-slate-900">{totalPages}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1 font-medium text-slate-700"
                    >
                      <ChevronLeft className="h-3 w-3" /> Previous
                    </button>

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1 font-medium text-slate-700"
                    >
                      Next <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Minimalist Professional Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
        News Sentiment Intelligence • Enterprise Media Monitoring System
      </footer>
    </div>
  );
}
