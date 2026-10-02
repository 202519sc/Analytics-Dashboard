import { connectToDatabase } from "@/lib/mongodb";
import { Dataset } from "@/models/Dataset";
import { Metadata } from "@/models/Metadata";
import Link from "next/link";
import { notFound } from "next/navigation";
import { generateCleaningRecommendations } from "@/lib/engines/cleaningEngine";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DatasetDetailsPage({ params }: Props) {
  // 1. Await the params Promise (Next.js 15 requirement)
  const resolvedParams = await params;
  const { id } = resolvedParams;

  await connectToDatabase();

  // 2. Safely find the dataset using the resolved ID
  const dataset = await Dataset.findById(id).lean();
  if (!dataset) {
    console.error("Dataset not found in DB for ID:", id);
    notFound(); 
  }

  // Fetch the metadata we extracted via PapaParse
  const metadata = await Metadata.findOne({ datasetId: id }).lean();
  
  // Generate cleaning rules instantly on the server
  const cleaningRecs = metadata ? generateCleaningRecommendations(metadata as any) : [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-end pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <Link href="/dashboard" className="text-sm text-blue-600 hover:underline mb-2 block">
              &larr; Back to Workspace
            </Link>
            <h1 className="text-3xl font-bold">{dataset.name}</h1>
            <p className="text-zinc-500 mt-1">Uploaded {new Date(dataset.createdAt).toLocaleDateString()}</p>
          </div>
          <a href={dataset.originalFileUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-semibold hover:opacity-80 transition-opacity">
            Download Raw File
          </a>
        </div>

        {/* Top-Level Stats */}
        {metadata ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="text-sm text-zinc-500">Total Rows</div>
              <div className="text-2xl font-bold">{metadata.totalRows.toLocaleString()}</div>
            </div>
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="text-sm text-zinc-500">Total Columns</div>
              <div className="text-2xl font-bold">{metadata.totalColumns}</div>
            </div>
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="text-sm text-zinc-500">Dataset Size</div>
              <div className="text-2xl font-bold">{(dataset.versions[0].fileSize / 1024 / 1024).toFixed(2)} MB</div>
            </div>
          </div>
        ) : (
          <div className="p-8 border border-dashed rounded-xl border-amber-300 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-700 text-amber-700 dark:text-amber-400">
            <span className="font-bold">Metadata extraction pending or failed.</span> The file was saved, but the parser couldn't extract the statistics.
          </div>
        )}

        {/* 3-Engine Interface Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
          
          {/* Main Content Area (Metadata Schema) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
              <h2 className="text-lg font-bold mb-4">Schema & Column Profile</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-800/50">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Column</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Missing</th>
                      <th className="px-4 py-3 rounded-tr-lg">Unique</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metadata?.columns.map((col: any) => (
                      <tr key={col.name} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                        <td className="px-4 py-3 font-medium">{col.name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-[10px] uppercase font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                            {col.dataType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {col.missingCount > 0 ? (
                            <span className="text-red-500 font-semibold">{col.missingPercentage}%</span>
                          ) : (
                            <span className="text-emerald-500">Clean</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{col.uniqueCount === 9999 ? "1000+" : col.uniqueCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar Engines */}
          <div className="space-y-6">
            
            {/* Cleaning Engine UI */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span>🧹</span> Data Cleaning
              </h2>
              {cleaningRecs.length > 0 ? (
                <ul className="space-y-4">
                  {cleaningRecs.map((rec, idx) => (
                    <li key={idx} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-sm">
                      <div className="font-bold mb-1 text-zinc-900 dark:text-zinc-100">{rec.column}</div>
                      <div className="text-xs font-mono text-amber-600 dark:text-amber-400 mb-1">{rec.action}</div>
                      <div className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed">{rec.reason}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                  Dataset is perfectly clean! No actions required.
                </div>
              )}
            </div>

            {/* Preprocessing Engine Skeleton */}
            <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-6 opacity-60">
              <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                <span>⚙️</span> Expert System
              </h2>
              <p className="text-xs text-zinc-500">Forward-chaining inference engine loading...</p>
            </div>

            {/* Visualization Engine Skeleton */}
            <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-6 opacity-60">
              <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                <span>📊</span> AI Visualization
              </h2>
              <p className="text-xs text-zinc-500">Gemini generative chart recommendations loading...</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}