import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        return {
          maximumSizeInBytes: 150 * 1024 * 1024, // 150 MB limit
          allowedContentTypes: [
            "text/csv",
            "text/tab-separated-values",
            "text/plain",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/octet-stream"
          ],
          tokenPayload: JSON.stringify({ userId }),
        };
      },
      onUploadCompleted: async () => {
        // Database save is handled by the client to ensure localhost compatibility
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Token generation failed";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}