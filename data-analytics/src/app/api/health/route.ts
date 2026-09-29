import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const mongooseInstance = await connectToDatabase();
    const isConnected = mongooseInstance.connection.readyState === 1;

    return NextResponse.json({
      status: "ok",
      database: isConnected ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to connect to MongoDB";
    return NextResponse.json(
      {
        status: "error",
        message,
      },
      { status: 500 }
    );
  }
}