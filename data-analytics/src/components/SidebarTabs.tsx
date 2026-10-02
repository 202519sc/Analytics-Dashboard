"use client";

import { useState } from "react";
import CleaningStagingArea from "./CleaningStagingArea";

interface SidebarTabsProps {
  datasetId: string;
  cleaningRecs: any[];
  qualityScore: number;
  prepRecs: any[]; // Contains both Encodings and Feature Selection
}

export default function SidebarTabs({ datasetId, cleaningRecs, qualityScore, prepRecs }: SidebarTabsProps) {
  const [activeTab, setActiveTab] = useState<"cleaning" | "features" | "encodings">("cleaning");
  
  // Split the Expert System recommendations into two distinct buckets
  const featureSelectionRecs = prepRecs.filter(r => r.technique === "FEATURE_SELECTION_DROP");
  const encodingRecs = prepRecs.filter(r => r.technique !== "FEATURE_SELECTION_DROP");

  // Isolated State for Each Bucket
  const [stagedFeatures, setStagedFeatures] = useState<Set<number>>(new Set(featureSelectionRecs.map((_, i) => i)));
  const [stagedEncodings, setStagedEncodings] = useState<Set<number>>(new Set(encodingRecs.map((_, i) => i)));
  
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const toggleFeature = (index: number) => {
    const newStaged = new Set(stagedFeatures);
    if (newStaged.has(index)) newStaged.delete(index);
    else newStaged.add(index);
    setStagedFeatures(newStaged);
  };

  const toggleEncoding = (index: number) => {
    const newStaged = new Set(stagedEncodings);
    if (newStaged.has(index)) newStaged.delete(index);
    else newStaged.add(index);
    setStagedEncodings(newStaged);
  };

  const handleCommit = async (type: "features" | "encodings") => {
    const selectedActions = type === "features" 
      ? featureSelectionRecs.filter((_, i) => stagedFeatures.has(i))
      : encodingRecs.filter((_, i) => stagedEncodings.has(i));

    if (selectedActions.length === 0) return;
    setIsCommitting(true);
    setCommitResult(null);

    try {
      const res = await fetch("/api/datasets/preprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId, actions: selectedActions }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Processing failed");

      setCommitResult({ 
        success: true, 
        message: `${type === 'features' ? 'Columns dropped' : 'Encodings applied'} successfully! Reloading...` 
      });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setCommitResult({ success: false, message: err.message });
      setIsCommitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] space-y-4">
      {/* 3-Tab Navigation Controls */}
      <div className="flex p-1 bg-zinc-200/50 dark:bg-zinc-800/80 rounded-xl shrink-0">
        <button
          onClick={() => setActiveTab("cleaning")}
          className={`flex-1 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all ${
            activeTab === "cleaning"
              ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white"
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          🧹 Clean
        </button>
        <button
          onClick={() => setActiveTab("features")}
          className={`flex-1 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all ${
            activeTab === "features"
              ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white"
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          ✂️ Features
        </button>
        <button
          onClick={() => setActiveTab("encodings")}
          className={`flex-1 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all ${
            activeTab === "encodings"
              ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white"
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          ⚙️ Encode
        </button>
      </div>

      {/* Active Tab Content */}
      <div className="flex-1 overflow-hidden">
        
        {/* TAB 1: DATA CLEANING */}
        {activeTab === "cleaning" && (
          <CleaningStagingArea 
            datasetId={datasetId} 
            recommendations={cleaningRecs} 
            qualityScore={qualityScore} 
          />
        )}

        {/* TAB 2: FEATURE SELECTION (DROPPING) */}
        {activeTab === "features" && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 h-full flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span>✂️</span> Feature Selection
                </h2>
                <p className="text-xs text-zinc-500 mt-1">Select noisy or redundant columns to drop</p>
              </div>
            </div>

            {featureSelectionRecs.length > 0 ? (
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-6">
                {featureSelectionRecs.map((rec: any, idx: number) => (
                  <label 
                    key={idx} 
                    className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                      stagedFeatures.has(idx) 
                        ? "border-rose-500 bg-rose-50 dark:bg-rose-900/10 dark:border-rose-800" 
                        : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 hover:border-rose-300"
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      className="mt-1 w-4 h-4 text-rose-600 rounded border-zinc-300 focus:ring-rose-500"
                      checked={stagedFeatures.has(idx)}
                      onChange={() => toggleFeature(idx)}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{rec.column}</span>
                        <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 text-right">
                          DROP COLUMN
                        </span>
                      </div>
                      <div className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed">{rec.reason}</div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl mb-6 p-6 text-center">
                <span className="text-3xl mb-2">✨</span>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">All features look relevant!</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500">No highly sparse, constant, or ID columns detected.</p>
              </div>
            )}

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
              {commitResult && (
                <div className={`text-sm mb-3 p-3 rounded-lg ${commitResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {commitResult.message}
                </div>
              )}
              <button
                onClick={() => handleCommit("features")}
                disabled={stagedFeatures.size === 0 || isCommitting || featureSelectionRecs.length === 0}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                  (stagedFeatures.size === 0 || isCommitting || featureSelectionRecs.length === 0)
                    ? "bg-zinc-200 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600"
                    : "bg-rose-600 text-white hover:bg-rose-500"
                }`}
              >
                {isCommitting ? "Processing..." : `Drop ${stagedFeatures.size} Features`}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: ENCODINGS */}
        {activeTab === "encodings" && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 h-full flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span>⚙️</span> Data Encodings
                </h2>
                <p className="text-xs text-zinc-500 mt-1">Convert text columns to machine-learning numeric arrays</p>
              </div>
            </div>

            {encodingRecs.length > 0 ? (
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-6">
                {encodingRecs.map((rec: any, idx: number) => (
                  <label 
                    key={idx} 
                    className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                      stagedEncodings.has(idx) 
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10 dark:border-indigo-800" 
                        : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 hover:border-indigo-300"
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      className="mt-1 w-4 h-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500"
                      checked={stagedEncodings.has(idx)}
                      onChange={() => toggleEncoding(idx)}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{rec.column}</span>
                        <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 text-right">
                          {rec.technique.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed">{rec.reason}</div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl mb-6 p-6 text-center">
                <span className="text-3xl mb-2">✨</span>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Data is ready for ML!</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500">No additional encodings needed.</p>
              </div>
            )}

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
              {commitResult && (
                <div className={`text-sm mb-3 p-3 rounded-lg ${commitResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {commitResult.message}
                </div>
              )}
              <button
                onClick={() => handleCommit("encodings")}
                disabled={stagedEncodings.size === 0 || isCommitting || encodingRecs.length === 0}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                  (stagedEncodings.size === 0 || isCommitting || encodingRecs.length === 0)
                    ? "bg-zinc-200 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600"
                    : "bg-indigo-600 text-white hover:bg-indigo-500"
                }`}
              >
                {isCommitting ? "Processing..." : `Commit ${stagedEncodings.size} Encodings`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}