import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Dataset } from "@/models/Dataset";
import { Metadata } from "@/models/Metadata";
import { ProcessingLog } from "@/models/ProcessingLog";
import { put } from "@vercel/blob";
import Papa from "papaparse";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { datasetId, actions } = await request.json();
    if (!datasetId || !actions || actions.length === 0) {
      return NextResponse.json({ error: "Missing dataset ID or actions" }, { status: 400 });
    }

    await connectToDatabase();
    const dataset = await Dataset.findOne({ _id: datasetId, userId });
    const metadata = await Metadata.findOne({ datasetId });
    if (!dataset || !metadata) return NextResponse.json({ error: "Dataset/Metadata not found" }, { status: 404 });

    const currentVersionRecord = dataset.versions.find((v: any) => v.versionNumber === dataset.currentVersion);
    
    if (!currentVersionRecord) {
      return NextResponse.json({ error: "Current version not found" }, { status: 404 });
    }

    const fileRes = await fetch(currentVersionRecord.fileUrl);
    const csvText = await fileRes.text();
    const parsed = Papa.parse(csvText, { header: true, dynamicTyping: true, skipEmptyLines: true });
    let rows: any[] = parsed.data;

    // 1. Build distinct value dictionaries for Encodings
    const colDistinctValues: Record<string, string[]> = {};
    for (const action of actions) {
      if (action.technique === "LABEL_ENCODING" || action.technique === "ONE_HOT_ENCODING") {
        const uniqueVals = new Set<string>();
        for (const r of rows) {
          if (r[action.column] !== null && r[action.column] !== undefined) {
            uniqueVals.add(String(r[action.column]));
          }
        }
        colDistinctValues[action.column] = Array.from(uniqueVals);
      }
    }

    // 2. Apply Transformations Row by Row
    const transformedRows = [];
    for (const row of rows) {
      const newRow: any = { ...row };

      for (const action of actions) {
        const val = newRow[action.column];
        const valStr = val !== null && val !== undefined ? String(val) : "Unknown";

        if (action.technique === "FEATURE_SELECTION_DROP") {
          delete newRow[action.column];
        } 
        else if (action.technique === "LABEL_ENCODING") {
          const idx = colDistinctValues[action.column].indexOf(valStr);
          newRow[action.column] = idx !== -1 ? idx : 0; // Map string to integer
        } 
        else if (action.technique === "ONE_HOT_ENCODING") {
          // Create a binary column for every unique category
          for (const distinct of colDistinctValues[action.column]) {
            const cleanName = distinct.replace(/[^a-zA-Z0-9]/g, '_');
            const newColName = `${action.column}_${cleanName}`;
            newRow[newColName] = (valStr === distinct) ? 1 : 0;
          }
          delete newRow[action.column]; // Drop original categorical column
        }
      }
      transformedRows.push(newRow);
    }

    // 3. Upload new version to Blob
    const transformedCsv = Papa.unparse(transformedRows);
    const newFileSize = new Blob([transformedCsv]).size;
    const newVersionNumber = dataset.currentVersion + 1;
    const newFileName = `datasets/${Date.now()}-v${newVersionNumber}-encoded.csv`;
    
    const blobResponse = await put(newFileName, transformedCsv, {
      access: 'public',
      contentType: 'text/csv',
    });

    dataset.versions.push({
      versionNumber: newVersionNumber,
      label: `Encoded Version ${newVersionNumber}`,
      fileUrl: blobResponse.url,
      fileSize: newFileSize,
      rowCount: transformedRows.length,
      columnCount: Object.keys(transformedRows[0] || {}).length,
      createdAt: new Date(),
    });
    
    dataset.currentVersion = newVersionNumber;
    await dataset.save();

    await ProcessingLog.create({
      datasetId,
      userId,
      actionType: "preprocess_encoding",
      description: `Applied ${actions.length} ML preprocessing encodings.`,
      previousVersion: newVersionNumber - 1,
      newVersion: newVersionNumber,
      timestamp: new Date(),
    });

    // 4. Update Metadata Schema dynamically
    let updatedColumns = [...metadata.columns];
    
    for (const action of actions) {
      if (action.technique === "FEATURE_SELECTION_DROP") {
        updatedColumns = updatedColumns.filter((c: any) => c.name !== action.column);
      } 
      else if (action.technique === "LABEL_ENCODING") {
        const col = updatedColumns.find((c: any) => c.name === action.column);
        if (col) {
          col.dataType = "numeric";
          col.min = 0;
          col.max = colDistinctValues[action.column].length - 1;
        }
      } 
      else if (action.technique === "ONE_HOT_ENCODING") {
        updatedColumns = updatedColumns.filter((c: any) => c.name !== action.column);
        for (const distinct of colDistinctValues[action.column]) {
          const cleanName = distinct.replace(/[^a-zA-Z0-9]/g, '_');
          updatedColumns.push({
            name: `${action.column}_${cleanName}`,
            dataType: "numeric",
            missingCount: 0,
            missingPercentage: 0,
            uniqueCount: 2,
            min: 0,
            max: 1,
            inconsistentCount: 0
          });
        }
      }
    }

    metadata.columns = updatedColumns;
    metadata.totalColumns = updatedColumns.length;
    metadata.markModified('columns');
    await metadata.save();
    
    return NextResponse.json({ success: true, url: blobResponse.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to preprocess" }, { status: 500 });
  }
}