"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import Link from "next/link";

interface UploadedFileState {
  file: File;
  name: string;
  size: string;
  extension: string;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<UploadedFileState | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedFormats = [".csv", ".tsv", ".xls", ".xlsx"];

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const validateAndProcessFile = (file: File) => {
    setUploadError(null);
    const fileName = file.name.toLowerCase();
    const isValidFormat = supportedFormats.some((ext) => fileName.endsWith(ext));

    if (!isValidFormat) {
      setUploadError(
        "Unsupported format. Please upload a valid CSV, TSV, or Excel (.xls, .xlsx) dataset."
      );
      setSelectedFile(null);
      return;
    }

    setSelectedFile({
      file,
      name: file.name,
      size: formatFileSize(file.size),
      extension: file.name.split(".").pop()?.toUpperCase() || "DATA",
    });
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-[#09090b] dark:text-zinc-100 flex flex-col font-sans transition-colors">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-[#09090b]/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 font-bold text-lg shadow-sm">
              D
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                DataAnalytics
              </span>
              <span className="ml-1.5 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                AI + BI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-14 pb-12 sm:pt-20 sm:pb-16 border-b border-zinc-200/70 dark:border-zinc-800/70">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Instant Pre-Login Metadata Analysis
              </span>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-white sm:text-5xl lg:text-6xl">
                Smart Dataset Analytics &amp; Machine Learning Prep
              </h1>
              <p className="mt-5 text-base sm:text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
                Import your tabular data, detect structural anomalies, extract comprehensive
                statistical metadata, and streamline ML feature preprocessing through a code-free platform.
              </p>
            </div>

            {/* File Upload Component */}
            <div className="mx-auto mt-10 max-w-2xl">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".csv, .tsv, .xls, .xlsx"
                onChange={handleFileChange}
              />

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all cursor-pointer shadow-sm ${
                  dragActive
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                    : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/60 dark:hover:border-zinc-600"
                }`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 mb-4">
                  <svg
                    className="h-7 w-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>

                <div className="text-zinc-900 dark:text-zinc-100 font-semibold text-base sm:text-lg">
                  Drop your dataset here, or{" "}
                  <span className="text-blue-600 dark:text-blue-400 underline underline-offset-2">
                    browse files
                  </span>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                  Supported formats: CSV, TSV, XLS, XLSX (Max recommended: 50MB)
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    .CSV
                  </span>
                  <span className="inline-flex items-center rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    .TSV
                  </span>
                  <span className="inline-flex items-center rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    .XLS / .XLSX
                  </span>
                </div>
              </div>

              {/* Upload Error Banner */}
              {uploadError && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{uploadError}</span>
                  </div>
                  <button
                    onClick={() => setUploadError(null)}
                    className="text-xs font-semibold hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Staged File Card (Awaiting Metadata Extractor Hook) */}
              {selectedFile && (
                <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {selectedFile.extension}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-white truncate max-w-xs sm:max-w-md">
                          {selectedFile.name}
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {selectedFile.size} • Ready for extraction
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 text-left dark:border-amber-900/40 dark:bg-amber-950/20">
                    <div className="flex items-start gap-2.5">
                      <svg
                        className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-200">
                          Metadata Extraction Pipeline Pending
                        </p>
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                          File successfully validated and staged. The automated statistical metadata engine (row/column counts, missing values, duplicate detection, and distributions) will execute here once the backend extractor module is linked.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Features Unlocked Upon Login (SRS Sections 4.1 to 4.7) */}
        <section className="py-16 sm:py-24 bg-white dark:bg-[#09090b]">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Full Platform Capabilities
              </h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
                What you unlock when you sign in
              </p>
              <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
                Log in or create an account to persist your datasets, perform intelligent cleaning,
                apply machine learning preprocessing, and generate reports.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1: Workspace & Datasets */}
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7c0-2 1-3 3-3h10c2 0 3 1 3 3M4 7h16m-5 4h.01M9 11h.01" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">
                  Persistent Dataset Workspace
                </h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Store and organize multiple datasets securely. Always maintain your original uploaded dataset alongside newly transformed versions.
                </p>
                <div className="mt-4 text-xs font-medium text-blue-600 dark:text-blue-400">
                  SRS 4.2: Dataset Management →
                </div>
              </div>

              {/* Feature 2: Data Cleaning */}
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">
                  Automated Data Cleaning
                </h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Detect missing values, eliminate duplicate records, and receive intelligent recommendations for statistical imputation or deletion.
                </p>
                <div className="mt-4 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  SRS 4.4: Data Cleaning →
                </div>
              </div>

              {/* Feature 3: ML Preprocessing */}
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">
                  ML Preprocessing Suite
                </h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Encode categorical variables via Label or One-Hot encoding, and conduct automated target-based feature selection for training models.
                </p>
                <div className="mt-4 text-xs font-medium text-purple-600 dark:text-purple-400">
                  SRS 4.5: Data Preprocessing →
                </div>
              </div>

              {/* Feature 4: Interactive Visualisation */}
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">
                  Interactive Dashboards
                </h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Generate bar charts, line plots, heatmaps, box plots, and histograms dynamically with interactive Axis and color mapping controls.
                </p>
                <div className="mt-4 text-xs font-medium text-amber-600 dark:text-amber-400">
                  SRS 4.6: Data Visualisation →
                </div>
              </div>

              {/* Feature 5: Audit Trail & Processing History */}
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500 text-white shadow-sm">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">
                  Full Processing History
                </h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Maintain a strict chronological log of every transformation, cleaning rule, and filter applied with timestamps and rollback support.
                </p>
                <div className="mt-4 text-xs font-medium text-rose-600 dark:text-rose-400">
                  SRS 4.7: Audit History →
                </div>
              </div>

              {/* Feature 6: Report Generation & Export */}
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">
                  Exportable Analytical Reports
                </h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Export prepared datasets in clean CSV format and generate comprehensive summary reports detailing your complete analytical workflow.
                </p>
                <div className="mt-4 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  SRS 4.7: Report Generation →
                </div>
              </div>
            </div>

            {/* Bottom Call To Action Banner */}
            <div className="mt-16 rounded-3xl bg-zinc-950 p-8 sm:p-12 text-center text-white dark:bg-zinc-900 border border-zinc-800 shadow-xl">
              <h3 className="text-2xl font-bold sm:text-3xl">
                Ready to analyze and prepare your datasets?
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-zinc-400">
                Create your account in seconds to save your progress, unlock automated cleaning, and generate ML-ready features.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors shadow-sm"
                >
                  Create Free Account
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl border border-zinc-700 bg-zinc-800/80 px-6 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  Log into Account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-8 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-[#09090b] dark:text-zinc-400">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Data Analytics Dashboard • MITWPU PBL Software Engineering &amp; AI</p>
          <div className="flex gap-6">
            <span className="text-zinc-400 dark:text-zinc-600">CSV, TSV, XLS, XLSX Ready</span>
            <span className="text-zinc-400 dark:text-zinc-600">FastAPI &amp; MongoDB Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
}