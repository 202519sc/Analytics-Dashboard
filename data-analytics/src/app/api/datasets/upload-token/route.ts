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
          throw new Error("Unauthorized: Please sign in first");
        }

        // Return token parameters for client upload
        return {
          maximumSizeInBytes: 100 * 1024 * 1024, // 100 MB max
          tokenPayload: JSON.stringify({ userId }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("Blob upload completed in Vercel:", blob.url);

        if (!tokenPayload) return;

        try {
          const { userId } = JSON.parse(tokenPayload);
          const rawName = blob.pathname.split("/").pop() || "dataset";
          const originalFileName = rawName.replace(/^\d+-/, "");
          const extension = (originalFileName.split(".").pop() || "csv").toLowerCase();
          const datasetName = originalFileName.replace(/\.[^/.]+$/, "");

          await connectToDatabase();

          const dataset = await Dataset.create({
            userId,
            name: datasetName,
            originalFileName,
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
            description: `Uploaded dataset ${originalFileName}`,
            previousVersion: 0,
            newVersion: 1,
            timestamp: new Date(),
          });

          console.log("Saved dataset to MongoDB Atlas successfully:", dataset._id);
        } catch (dbErr) {
          console.error("Failed to save dataset in MongoDB Atlas:", dbErr);
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Token generation failed";
    console.error("Error in upload-token route:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}