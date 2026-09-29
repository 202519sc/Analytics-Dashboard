import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Dataset } from "@/models/Dataset";
import { ProcessingLog } from "@/models/ProcessingLog";

const VALID_FORMATS = ["csv", "tsv", "xls", "xlsx"] as const;
type ValidFormat = (typeof VALID_FORMATS)[number];

function getValidFormat(ext: string | undefined): ValidFormat {
  if (ext && VALID_FORMATS.includes(ext as ValidFormat)) {
    return ext as ValidFormat;
  }
  return "csv";
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url, pathname, size } = await request.json();
    if (!url || !pathname) {
      return NextResponse.json({ error: "Missing file data" }, { status: 400 });
    }

    const rawName = pathname.split("/").pop() || "dataset";
    const originalFileName = rawName.replace(/^\d+-/, "");
    const rawExtension = (originalFileName.split(".").pop() || "csv").toLowerCase();
    const extension: ValidFormat = getValidFormat(rawExtension);
    const datasetName = originalFileName.replace(/\.[^/.]+$/, "");

    await connectToDatabase();

    const dataset = await Dataset.create({
      userId,
      name: datasetName,
      originalFileName,
      fileFormat: extension,
      originalFileUrl: url,
      currentVersion: 1,
      versions: [
        {
          versionNumber: 1,
          label: "Original Upload",
          fileUrl: url,
          fileSize: size || 0,
          rowCount: 0,
          columnCount: 0,
          createdAt: new Date(),
        },
      ],
    });

    await ProcessingLog.create({
      datasetId: dataset._id,
      userId,
      actionType: "upload",
      description: `Uploaded dataset ${originalFileName}`,
      previousVersion: 0,
      newVersion: 1,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true, datasetId: dataset._id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}