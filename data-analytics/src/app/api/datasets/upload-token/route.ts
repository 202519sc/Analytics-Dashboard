import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Dataset } from "@/models/Dataset";
import { ProcessingLog } from "@/models/ProcessingLog";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const { userId } = await auth();

        if (!userId) {
          throw new Error("Unauthorized");
        }

        // Validate file extension
        const extension = pathname.split(".").pop()?.toLowerCase();
        const validFormats = ["csv", "tsv", "xls", "xlsx"];
        if (!extension || !validFormats.includes(extension)) {
          throw new Error("Invalid file format");
        }

        return {
          allowedContentTypes: [
            "text/csv",
            "text/tab-separated-values",
            "text/plain",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50MB limit
          tokenPayload: JSON.stringify({ userId, extension }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (!tokenPayload) return;

        const { userId, extension } = JSON.parse(tokenPayload);
        const fileName = blob.pathname.split("/").pop() || "dataset";
        const datasetName = fileName.replace(/\.[^/.]+$/, "").replace(/^\d+-/, "");

        await connectToDatabase();

        const dataset = await Dataset.create({
          userId,
          name: datasetName,
          originalFileName: fileName.replace(/^\d+-/, ""),
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

        await ProcessingLog.create({
          datasetId: dataset._id,
          userId,
          actionType: "upload",
          description: `Uploaded dataset ${fileName}`,
          previousVersion: 0,
          newVersion: 1,
          timestamp: new Date(),
        });
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upload error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}