import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { connectToDatabase } from "@/lib/mongodb";
import { Dataset } from "@/models/Dataset";
import { ProcessingLog } from "@/models/ProcessingLog";

const VALID_FORMATS = ["csv", "tsv", "xls", "xlsx"] as const;
type ValidFormat = (typeof VALID_FORMATS)[number];

function isValidFormat(ext: string | undefined): ext is ValidFormat {
  return VALID_FORMATS.includes(ext as ValidFormat);
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("filename") || req.headers.get("x-filename");

    if (!fileName) {
      return NextResponse.json({ error: "No filename provided" }, { status: 400 });
    }

    const extension = fileName.split(".").pop()?.toLowerCase();

    if (!isValidFormat(extension)) {
      return NextResponse.json(
        { error: "Invalid format. Only CSV, TSV, XLS, and XLSX are supported." },
        { status: 400 }
      );
    }

    if (!req.body) {
      return NextResponse.json({ error: "File body is empty" }, { status: 400 });
    }

    await connectToDatabase();

    // Upload to Vercel Blob with private access
    const blobPath = `datasets/${userId}/${Date.now()}-${fileName}`;
    const blob = await put(blobPath, req.body, {
      access: "private",
    });

    const datasetName = fileName.replace(/\.[^/.]+$/, "");

    // Persist dataset record in MongoDB Atlas
    const dataset = await Dataset.create({
      userId,
      name: datasetName,
      originalFileName: fileName,
      fileFormat: extension,
      originalFileUrl: blob.url,
      currentVersion: 1,
      versions: [
        {
          versionNumber: 1,
          label: "Original Upload",
          fileUrl: blob.url,
          fileSize: 0,
          rowCount: 0,
          columnCount: 0,
          createdAt: new Date(),
        },
      ],
    });

    // Record upload in Processing History
    await ProcessingLog.create({
      datasetId: dataset._id,
      userId,
      actionType: "upload",
      description: `Uploaded dataset ${fileName}`,
      previousVersion: 0,
      newVersion: 1,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      dataset: {
        id: dataset._id,
        name: dataset.name,
        originalFileUrl: dataset.originalFileUrl,
        currentVersion: dataset.currentVersion,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}