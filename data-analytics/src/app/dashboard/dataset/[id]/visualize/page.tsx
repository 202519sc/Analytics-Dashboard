import { connectToDatabase } from "@/lib/mongodb";
import { Dataset } from "@/models/Dataset";
import { Metadata } from "@/models/Metadata";
import Link from "next/link";
import { notFound } from "next/navigation";
import VisualizationCanvas from "@/components/VisualizationCanvas";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function VisualizePage({ params }: Props) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  await connectToDatabase();

  const dataset = await Dataset.findById(id).lean();
  if (!dataset) notFound();

  const metadata = await Metadata.findOne({ datasetId: id }).lean();
  if (!metadata) notFound();

  const activeVersion = dataset.versions.find((v: any) => v.versionNumber === dataset.currentVersion);
  if (!activeVersion) notFound();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 p-8 flex flex-col">
      <div className="max-w-[1600px] w-full mx-auto flex-1 flex flex-col space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-end pb-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div>
            <Link href={`/dashboard/dataset/${id}`} className="text-sm text-indigo-600 hover:underline mb-2 block">
              &larr; Back to Dataset Details
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span>📊</span> Visualization Studio
            </h1>
            <p className="text-zinc-500 mt-1">
              {dataset.name} <span className="text-zinc-300 dark:text-zinc-700">|</span> Version {dataset.currentVersion}
            </p>
          </div>
        </div>

        {/* Client-Side Canvas */}
        <VisualizationCanvas 
          datasetId={id}
          fileUrl={activeVersion.fileUrl} 
          columns={JSON.parse(JSON.stringify(metadata.columns))} 
        />
        
      </div>
    </div>
  );
}