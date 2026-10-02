import { connectToDatabase } from "@/lib/mongodb";
import { Dataset } from "@/models/Dataset";
import { Metadata } from "@/models/Metadata";
import Link from "next/link";
import { notFound } from "next/navigation";
import { generateCleaningRecommendations } from "@/lib/engines/cleaningEngine";
import { runExpertSystem } from "@/lib/engines/preprocessingEngine";
import SidebarTabs from "@/components/SidebarTabs";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DatasetDetailsPage({ params }: Props) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  await connectToDatabase();

  const dataset = await Dataset.findById(id).lean();
  if (!dataset) {
    console.error("Dataset not found in DB for ID:", id);
    notFound(); 
  }

  const metadata = await Metadata.findOne({ datasetId: id }).lean();
  const cleaningRecs = metadata ? generateCleaningRecommendations(metadata as any) : [];
  const prepRecs = metadata ? runExpertSystem(metadata as any) : [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-end pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <Link href="/dashboard" className="text-sm text-blue-600 hover:underline mb-2 block">
              &larr; Back to Workspace
            </Link>
            <h1 className="text-3xl font-bold">{dataset.name}</h1>
            <p className="text-zinc-500 mt-1">
              Active Version: <span className="font-bold text-zinc-900 dark:text-white">v{dataset.currentVersion}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/dataset/${id}/visualize`} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-500 transition-colors flex items-center gap-2">
              <span>📊</span> Visualize Data
            </Link>
            <a href={dataset.versions[dataset.currentVersion - 1].fileUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-semibold hover:opacity-80 transition-opacity">
              Download v{dataset.currentVersion} File
            </a>
          </div>
        </div>

        {/* Top-Level Stats */}
        {metadata ? (
          <div className="grid grid-cols-4 gap-4">
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="text-sm text-zinc-500">Total Rows</div>
              <div className="text-2xl font-bold">{(metadata.totalRows || 0).toLocaleString()}</div>
            </div>
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="text-sm text-zinc-500">Total Columns</div>
              <div className="text-2xl font-bold">{metadata.totalColumns || 0}</div>
            </div>
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="text-sm text-zinc-500">Duplicate Rows</div>
              <div className="text-2xl font-bold text-red-500">{(metadata.duplicateRows || 0).toLocaleString()}</div>
            </div>
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="text-sm text-zinc-500">Dataset Size</div>
              <div className="text-2xl font-bold">{(dataset.versions[dataset.currentVersion - 1].fileSize / 1024 / 1024).toFixed(2)} MB</div>
            </div>
          </div>
        ) : (
          <div className="p-8 border border-dashed rounded-xl border-amber-300 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-700 text-amber-700 dark:text-amber-400">
            <span className="font-bold">Metadata extraction pending or failed.</span>
          </div>
        )}

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
                      <th className="px-4 py-3">Unique</th>
                      <th className="px-4 py-3">Min / Max</th>
                      <th className="px-4 py-3 rounded-tr-lg">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metadata?.columns?.map((col: any) => (
                      <tr key={col.name} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                        <td className="px-4 py-3 font-medium">{col.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${
                            col.dataType === 'mixed' 
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                            {col.dataType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {col.missingCount > 0 ? (
                            <span className="text-red-500 font-semibold">{col.missingPercentage}%</span>
                          ) : (
                            <span className="text-emerald-500">0%</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{col.uniqueCount === 9999 ? "1000+" : col.uniqueCount}</td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                          {col.min !== null && col.min !== undefined ? `${Number(col.min).toFixed(1)} / ${Number(col.max).toFixed(1)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {(col.inconsistentCount || 0) > 0 && (
                            <span className="text-amber-600 dark:text-amber-400">{col.inconsistentCount} invalid types</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar Engines - NOW TABBED */}
          <div className="space-y-6">
            <SidebarTabs 
              datasetId={id}
              cleaningRecs={cleaningRecs}
              qualityScore={metadata?.qualityScore || 100}
              prepRecs={prepRecs}
            />
          </div>

        </div>
      </div>
    </div>
  );
}