import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";

// Initialize the official Gemini SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { columns } = await request.json();
    if (!columns || columns.length === 0) {
      return NextResponse.json({ error: "Missing dataset metadata" }, { status: 400 });
    }

    // 1. Prepare the exact facts to send to Gemini
    const schemaFacts = columns.map((col: any) => 
      `- ${col.name} (Type: ${col.dataType}, Uniques: ${col.uniqueCount}, Min/Max: ${col.min}/${col.max})`
    ).join("\n");

    // 2. The Prompt Engineering
    const systemPrompt = `You are a Senior Data Scientist. Analyze the following dataset schema and recommend exactly 3 highly insightful charts to visualize this data. 

Available chart types: "bar", "line", "scatter", "pie".
Rules:
- For "pie" and "bar" charts, yAxis must be an empty string "" (we auto-aggregate counts).
- For "line" and "scatter", you must provide both an xAxis and a numeric yAxis.

Schema:
${schemaFacts}

Respond ONLY with a valid JSON array of objects in this exact format, with no markdown formatting or backticks:
[
  {
    "chartType": "bar",
    "xAxis": "column_name",
    "yAxis": "",
    "reason": "Brief explanation of what this chart reveals."
  }
]`;

    // 3. Call the Gemini API with Exponential Backoff Retry
    let response;
    let retries = 3;
    let delay = 1000; // Start with 1 second delay

    for (let i = 0; i < retries; i++) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: systemPrompt,
          config: { temperature: 0.2 }
        });
        break; // If successful, exit the loop immediately
      } catch (error: any) {
        // If it is the last retry, or a different kind of error, throw it to the frontend
        if (i === retries - 1 || !error.message?.includes("503")) {
          throw error; 
        }
        
        console.warn(`Model busy (503). Retrying in ${delay}ms... Attempt ${i + 1} of ${retries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Double the delay for the next attempt (1s -> 2s)
      }
    }

    const rawText = response?.text || "[]";
    
    // Clean markdown blocks if Gemini accidentally adds them
    const cleanJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const recommendations = JSON.parse(cleanJsonText);

    return NextResponse.json({ success: true, recommendations });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate insights" }, { status: 500 });
  }
}