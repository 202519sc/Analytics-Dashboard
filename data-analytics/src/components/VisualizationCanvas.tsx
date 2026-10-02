"use client";

import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import html2canvas from "html2canvas";
import { 
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";

interface Props {
  datasetId: string;
  fileUrl: string;
  columns: any[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function VisualizationCanvas({ datasetId, fileUrl, columns }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Chart Controls
  const [chartType, setChartType] = useState<"bar" | "line" | "scatter" | "pie">("bar");
  const [xAxis, setXAxis] = useState<string>("");
  const [yAxis, setYAxis] = useState<string>("");
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);

const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Download and parse the raw data for charting
    fetch(fileUrl)
      .then(res => res.text())
      .then(csvText => {
        const parsed = Papa.parse(csvText, { header: true, dynamicTyping: true, skipEmptyLines: true });
        setData(parsed.data);
        if (columns.length > 0) setXAxis(columns[0].name);
        setLoading(false);
      });
  }, [fileUrl, columns]);

  const handleDownloadImage = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: '#ffffff' });
    const image = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = image;
    link.download = `visualization-${Date.now()}.png`;
    link.click();
  };

  const askGemini = async () => {
    setIsGeminiLoading(true);
    // We will build the actual Gemini API call in the next step!
    setTimeout(() => {
      alert("Gemini Integration coming in the next step!");
      setIsGeminiLoading(false);
    }, 1000);
  };

  // Prepare Data for Rendering
  const getChartData = () => {
    if (!xAxis || data.length === 0) return [];
    
    // If no Y-axis, assume the user wants a COUNT of X-axis categories
    if (!yAxis || chartType === "pie") {
      const counts: Record<string, number> = {};
      data.forEach(row => {
        const val = row[xAxis] !== null && row[xAxis] !== undefined ? String(row[xAxis]) : "Unknown";
        counts[val] = (counts[val] || 0) + 1;
      });
      // Sort and limit to top 20 for readability
      return Object.entries(counts)
        .map(([name, count]) => ({ [xAxis]: name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    }

    // If both X and Y exist, render raw scatter/line points (limit 100 for performance)
    return data.filter(r => r[xAxis] != null && r[yAxis] != null).slice(0, 100);
  };

  const chartData = getChartData();
  const yDataKey = yAxis || "count";

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
      
      {/* LEFT SIDEBAR: CONTROLS */}
      <div className="lg:col-span-1 space-y-6 flex flex-col">
        {/* Gemini Engine Block */}
        <div className="p-5 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-200 dark:border-indigo-900/50 rounded-xl">
          <h3 className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2 mb-2">
            <span>✨</span> AI Graph Assistant
          </h3>
          <p className="text-xs text-indigo-700 dark:text-indigo-400 mb-4">
            Let Gemini analyze your metadata and recommend the most insightful visualizations.
          </p>
          <button 
            onClick={askGemini}
            disabled={isGeminiLoading || loading}
            className="w-full py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
          >
            {isGeminiLoading ? "Analyzing Data..." : "Generate Insights"}
          </button>
        </div>

        {/* Manual Controls */}
        <div className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl flex-1">
          <h3 className="font-bold mb-4">Manual Config</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">Chart Type</label>
              <select value={chartType} onChange={(e) => setChartType(e.target.value as any)} className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm">
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="scatter">Scatter Plot</option>
                <option value="pie">Pie Chart (Distribution)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">X-Axis (Category / Time)</label>
              <select value={xAxis} onChange={(e) => setXAxis(e.target.value)} className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm">
                {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            {chartType !== "pie" && (
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Y-Axis (Numeric value)</label>
                <select value={yAxis} onChange={(e) => setYAxis(e.target.value)} className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm">
                  <option value="">Count of {xAxis} (Auto-Aggregate)</option>
                  {columns.filter(c => c.dataType === "numeric").map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MAIN STAGE: CANVAS */}
      <div className="lg:col-span-3 flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden relative">
        <div className="flex justify-between items-center p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="font-bold">Canvas Preview</h2>
          <button onClick={handleDownloadImage} disabled={loading} className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-sm font-semibold transition-colors flex items-center gap-2">
            <span>📥</span> Export PNG
          </button>
        </div>
        
        <div className="flex-1 p-6" ref={chartRef} style={{ background: 'inherit' }}>
          {loading ? (
            <div className="h-full w-full flex items-center justify-center text-zinc-400">Loading massive dataset into memory...</div>
          ) : chartData.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-zinc-400">Not enough data to plot.</div>
          ) : (
            <ResponsiveContainer width="100%" height={500}>
              {chartType === "bar" ? (
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey={xAxis} angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', color: 'black' }} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey={yDataKey} fill="#6366f1" radius={[4, 4, 0, 0]} name={yAxis || "Count"} />
                </BarChart>
              ) : chartType === "line" ? (
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey={xAxis} angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip contentStyle={{ borderRadius: '8px', color: 'black' }} />
                  <Legend verticalAlign="top" height={36} />
                  <Line type="monotone" dataKey={yDataKey} stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name={yAxis || "Count"} />
                </LineChart>
              ) : chartType === "scatter" ? (
                <ScatterChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey={xAxis} name={xAxis} />
                  <YAxis dataKey={yDataKey} name={yAxis || "Count"} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '8px', color: 'black' }} />
                  <Legend verticalAlign="top" height={36} />
                  <Scatter name={`${xAxis} vs ${yAxis || "Count"}`} data={chartData} fill="#ec4899" />
                </ScatterChart>
              ) : (
                <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <Tooltip contentStyle={{ borderRadius: '8px', color: 'black' }} />
                  <Legend verticalAlign="bottom" height={36} />
                  <Pie data={chartData} dataKey={yDataKey} nameKey={xAxis} cx="50%" cy="50%" outerRadius={180} label>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>
      
    </div>
  );
}