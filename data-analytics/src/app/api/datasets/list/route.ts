import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Dataset } from "@/models/Dataset";
import { ProcessingLog } from "@/models/ProcessingLog";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Query datasets belonging ONLY to this user (BR-REQ-1)
    const datasets = await Dataset.find({ userId }).sort({ createdAt: -1 }).lean();
    const logs = await ProcessingLog.find({ userId }).sort({ timestamp: -1 }).limit(10).lean();

    return NextResponse.json({
      success: true,
      count: datasets.length,
      datasets,
      recentLogs: logs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Query failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}