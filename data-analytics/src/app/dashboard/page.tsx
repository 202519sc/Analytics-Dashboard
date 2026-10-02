"use client";

import { useState, useEffect, useCallback } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { extractMetadataClientSide } from "@/lib/engines/metadataExtractor";

interface UploadResult {
  url?: string;
  name?: string;
  error?: string;
}

interface DatasetRecord {
  _id: string;
  name: string;
  fileFormat: string;
  createdAt: string;
  versions: { fileSize: number }[];
}

export default function DashboardPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  
  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);

  const fetchDatasets = useCallback(async () => {
    try {
      setLoadingDatasets(true);
      const res = await fetch("/api/datasets/list");
      if (res.ok) {
        const data = await res.json();
        setDatasets(data.datasets || []);
      }
    } catch (error) {
      console.error("Failed to fetch datasets:", error);
    } finally {
      setLoadingDatasets(false);
    }
  }, []);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    if (file.size > 150 * 1024 * 1024) {
      setResult({ error: "File exceeds the 150MB limit." });
      return;
    }

    setResult(null);

    try {
      // 1. Extract metadata locally BEFORE uploading
      setUploadStatus("Extracting dataset metadata (this may take a moment)...");
      const metadata = await extractMetadataClientSide(file);

      // 2. Stream to Vercel Blob
      setUploadStatus("Streaming directly to Blob...");
      const newBlob = await upload(`datasets/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/datasets/upload-token",
        multipart: true,
      });

      // 3. Save everything to MongoDB
      setUploadStatus("Saving to database...");
      const dbRes = await fetch("/api/datasets/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newBlob.url,
          pathname: newBlob.pathname,
          size: file.size,
          metadata, // Inject the extracted JSON payload here
        }),
      });

      if (!dbRes.ok) {
        const dbError = await dbRes.json();
        throw new Error(dbError.error || "Failed to save database record");
      }

      setUploadStatus(null);
      setResult({
        name: file.name,
        url: newBlob.url,
      });
      
      fetchDatasets();
      setFile(null);
      
    } catch (err: unknown) {
      setUploadStatus(null);
      const msg = err instanceof Error ? err.message : "Upload failed";
      setResult({ error: msg });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

      <main className="max-w-5xl mx-auto p-8 space-y-8">
        
        {/* Upload Section */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-sm">
          <h2 className="text-xl font-bold">Ingest New Dataset</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Upload CSV, TSV, or Excel files up to 150MB.
          </p>

          <form onSubmit={handleUpload} className="mt-6 flex flex-col gap-4 border border-dashed border-zinc-300 dark:border-zinc-700 p-6 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
            <input
              type="file"
              accept=".csv, .tsv, .xls, .xlsx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-zinc-700 dark:file:text-zinc-200 cursor-pointer"
            />

            <button
              type="submit"
              disabled={!file || !!uploadStatus}
              className="w-fit rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 cursor-pointer transition-colors"
            >
              {uploadStatus ? uploadStatus : "Upload Dataset"}
            </button>
          </form>

          {result?.error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-mono text-red-600 dark:border-red-900/50 dark:bg-red-900/10 dark:text-red-400">
              <span className="font-bold">Error:</span> {result.error}
            </div>
          )}
        </section>

        {/* Dataset Library Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Your Datasets</h2>
          
          {loadingDatasets ? (
            <div className="text-sm text-zinc-500">Loading datasets...</div>
          ) : datasets.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-500 bg-white dark:bg-zinc-900">
              No datasets uploaded yet. Ingest your first file above!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {datasets.map((dataset) => (
                <Link href={`/dashboard/dataset/${dataset._id}`} key={dataset._id}>
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm hover:border-blue-500 transition-colors cursor-pointer flex flex-col justify-between h-36">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-600 dark:text-zinc-300">
                          {dataset.fileFormat}
                        </span>
                      </div>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={dataset.name}>
                        {dataset.name}
                      </h3>
                    </div>
                    <div className="flex justify-between items-end text-xs text-zinc-500">
                      <span>{formatBytes(dataset.versions[0]?.fileSize || 0)}</span>
                      <span>{new Date(dataset.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}