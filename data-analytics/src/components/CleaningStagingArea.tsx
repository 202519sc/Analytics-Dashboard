"use client";

import { useState } from "react";

export interface CleaningRecommendation {
  column?: string;
  action: string;
  reason: string;
  impact: string;
}

interface Props {
  datasetId: string;
  recommendations: CleaningRecommendation[];
  qualityScore: number;
}

export default function CleaningStagingArea({ datasetId, recommendations, qualityScore }: Props) {
  const [stagedActions, setStagedActions] = useState<Set<number>>(
    new Set(recommendations.map((_, i) => i))
  );
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const toggleAction = (index: number) => {
    const newStaged = new Set(stagedActions);
    if (newStaged.has(index)) newStaged.delete(index);
    else newStaged.add(index);
    setStagedActions(newStaged);
  };

  const handleCommit = async () => {
    if (stagedActions.size === 0) return;
    setIsCommitting(true);
    setCommitResult(null);

    const actionsToApply = recommendations.filter((_, i) => stagedActions.has(i));

    try {
      const res = await fetch("/api/datasets/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId, actions: actionsToApply }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transformation failed");

      setCommitResult({ success: true, message: "Version generated successfully! Reloading..." });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setCommitResult({ success: false, message: err.message });
      setIsCommitting(false);
    }
  };

  // Determine if there is actually anything to clean
  const isPerfectlyClean = qualityScore === 100 || recommendations.length === 0;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col h-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span>🧹</span> Data Cleaning Pipeline
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Select actions to apply to Version 2</p>
        </div>
        
        <div className="flex flex-col items-end">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Health Score</span>
          <div className={`text-2xl font-black ${qualityScore >= 80 ? 'text-emerald-500' : qualityScore >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
            {qualityScore}/100
          </div>
        </div>
      </div>

      {isPerfectlyClean ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl mb-6 p-6 text-center space-y-2">
          <span className="text-3xl">✨</span>
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Dataset is 100% Clean!</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500">No missing values, duplicates, or anomalies detected.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-6">
          {recommendations.map((rec, idx) => (
            <label 
              key={idx} 
              className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                stagedActions.has(idx) 
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800" 
                  : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 hover:border-blue-300"
              }`}
            >
              <input 
                type="checkbox" 
                className="mt-1 w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500"
                checked={stagedActions.has(idx)}
                onChange={() => toggleAction(idx)}
              />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    {rec.column || "Dataset-Level"}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    {rec.action}
                  </span>
                </div>
                <div className="text-xs text-zinc-700 dark:text-zinc-300 mb-1">{rec.reason}</div>
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">↳ {rec.impact}</div>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Commit Bar */}
      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
        {commitResult && (
          <div className={`text-sm mb-3 p-3 rounded-lg ${commitResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {commitResult.message}
          </div>
        )}
        <button
          onClick={handleCommit}
          disabled={stagedActions.size === 0 || isCommitting || isPerfectlyClean}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
            (stagedActions.size === 0 || isCommitting || isPerfectlyClean)
              ? "bg-zinc-200 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600"
              : "bg-blue-600 text-white hover:bg-blue-500"
          }`}
        >
          {isPerfectlyClean ? "No Changes Required" : isCommitting ? "Applying transformations..." : `Commit ${stagedActions.size} Changes`}
        </button>
      </div>
    </div>
  );
}