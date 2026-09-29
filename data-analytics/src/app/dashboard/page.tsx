"use client";

import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

interface UploadResponse {
  success?: boolean;
  dataset?: {
    id: string;
    name: string;
    originalFileUrl: string;
    currentVersion: number;
  };
  error?: string;
}

export default function DashboardPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      // Send raw file stream directly with filename in query params
      const res = await fetch(
        `/api/datasets/upload?filename=${encodeURIComponent(file.name)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        }
      );

      const data: UploadResponse = await res.json();
      setResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setResult({ error: msg });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100">
      <header className="flex h-16 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-bold text-lg text-zinc-900 dark:text-white">
            DataAnalytics
          </Link>
          <span className="text-xs text-zinc-500">| User Workspace</span>
        </div>
        <div className="flex items-center gap-4">
          <UserButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-8">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-sm">
          <h1 className="text-xl font-bold">Test Dataset Ingestion Pipeline</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Upload a test CSV, TSV, or Excel file to test Vercel Blob storage and MongoDB record creation.
          </p>

          <form onSubmit={handleUpload} className="mt-6 flex flex-col gap-4">
            <input
              type="file"
              accept=".csv, .tsv, .xls, .xlsx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-zinc-800 dark:file:text-zinc-200"
            />

            <button
              type="submit"
              disabled={!file || uploading}
              className="w-fit rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
            >
              {uploading ? "Streaming to Blob & Saving to MongoDB..." : "Upload Dataset"}
            </button>
          </form>

          {/* Result Output */}
          {result && (
            <div className="mt-6 rounded-xl border p-4 text-xs font-mono">
              {result.error ? (
                <div className="text-red-600 dark:text-red-400">
                  <span className="font-bold">Error:</span> {result.error}
                </div>
              ) : (
                <div className="text-emerald-700 dark:text-emerald-400 flex flex-col gap-1">
                  <span className="font-bold text-sm">✅ Upload &amp; Record Successful!</span>
                  <div>Dataset ID: {result.dataset?.id}</div>
                  <div>Name: {result.dataset?.name}</div>
                  <div>Version: {result.dataset?.currentVersion}</div>
                  <div className="break-all">
                    Blob Storage URL:{" "}
                    <a
                      href={result.dataset?.originalFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-blue-600 dark:text-blue-400"
                    >
                      {result.dataset?.originalFileUrl}
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}