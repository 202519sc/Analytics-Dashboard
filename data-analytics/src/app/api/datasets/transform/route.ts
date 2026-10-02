import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Dataset } from "@/models/Dataset";
import { Metadata } from "@/models/Metadata";
import { ProcessingLog } from "@/models/ProcessingLog";
import { put } from "@vercel/blob";
import Papa from "papaparse";

const NULL_VALUES = new Set(["", "na", "n/a", "null", "?", "-", "undefined"]);

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
    if (!dataset) return NextResponse.json({ error: "Dataset not found" }, { status: 404 });

    const metadata = await Metadata.findOne({ datasetId });
    if (!metadata) return NextResponse.json({ error: "Metadata not found" }, { status: 404 });

    const currentVersionRecord = dataset.versions.find((v: any) => v.versionNumber === dataset.currentVersion);
    if (!currentVersionRecord) return NextResponse.json({ error: "Current version not found" }, { status: 404 });

    const fileRes = await fetch(currentVersionRecord.fileUrl);
    if (!fileRes.ok) throw new Error("Failed to download source file from Blob storage");
    
    const csvText = await fileRes.text();
    const parsed = Papa.parse(csvText, { header: true, dynamicTyping: true, skipEmptyLines: true });
    let rows: any[] = parsed.data;

    const columnsToDrop = new Set<string>();
    const imputedColumns = new Set<string>();
    let dropDuplicates = false;
    const imputeValues: Record<string, any> = {};
    const coerceColumns = new Set<string>();

    for (const action of actions) {
      if (action.action === "DROP_DUPLICATES") {
        dropDuplicates = true;
      } else if (action.column) {
        const colStat = metadata.columns.find((c: any) => c.name === action.column);
        switch (action.action) {
          case "DROP_COLUMN":
          case "DROP_CONSTANT":
            columnsToDrop.add(action.column);
            break;
          case "IMPUTE_MEAN":
            if (colStat?.mean !== undefined) imputeValues[action.column] = colStat.mean;
            imputedColumns.add(action.column);
            break;
          case "IMPUTE_MODE":
            imputeValues[action.column] = "Unknown"; 
            imputedColumns.add(action.column);
            break;
          case "COERCE_NUMERIC":
            coerceColumns.add(action.column);
            break;
        }
      }
    }

    const seenHashes = new Set<string>();
    const transformedRows = [];

    for (const row of rows) {
      let isDuplicate = false;
      if (dropDuplicates) {
        const rowHash = Object.values(row).join("");
        if (seenHashes.has(rowHash)) {
          isDuplicate = true;
        } else {
          seenHashes.add(rowHash);
        }
      }

      if (!isDuplicate) {
        const newRow: any = {};
        for (const [key, val] of Object.entries(row)) {
          if (columnsToDrop.has(key)) continue;

          let finalVal = val;
          const valStr = String(val).trim().toLowerCase();

          if (val === null || val === undefined || NULL_VALUES.has(valStr)) {
            if (key in imputeValues) finalVal = imputeValues[key];
            else finalVal = null;
          } else if (coerceColumns.has(key)) {
            const num = Number(val);
            finalVal = isNaN(num) ? (key in imputeValues ? imputeValues[key] : null) : num;
          }

          newRow[key] = finalVal;
        }
        transformedRows.push(newRow);
      }
    }

    const transformedCsv = Papa.unparse(transformedRows);
    const newFileSize = new Blob([transformedCsv]).size;

    const newVersionNumber = dataset.currentVersion + 1;
    const newFileName = `datasets/${Date.now()}-v${newVersionNumber}-${dataset.originalFileName}`;
    
    const blobResponse = await put(newFileName, transformedCsv, {
      access: 'public',
      contentType: 'text/csv',
    });

    dataset.versions.push({
      versionNumber: newVersionNumber,
      label: `Cleaned Version ${newVersionNumber}`,
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
      actionType: "cleaning_missing",
      description: `Applied ${actions.length} cleaning transformations.`,
      previousVersion: newVersionNumber - 1,
      newVersion: newVersionNumber,
      timestamp: new Date(),
    });

    // 7. Instant Metadata Update 
    if (dropDuplicates) metadata.duplicateRows = 0;
    metadata.totalRows = transformedRows.length;
    
    let newTotalMissing = 0;
    const remainingColumns = [];

    for (const col of metadata.columns) {
      if (columnsToDrop.has(col.name)) continue;

      if (imputedColumns.has(col.name)) {
        col.missingCount = 0;
        col.missingPercentage = 0;
      }
      if (coerceColumns.has(col.name)) {
        col.inconsistentCount = 0;
        col.dataType = "numeric";
      }

      newTotalMissing += col.missingCount;
      remainingColumns.push(col);
    }

    metadata.columns = remainingColumns;
    metadata.totalColumns = remainingColumns.length;

   const totalCells = metadata.totalRows * metadata.totalColumns;
    const missingPenalty = totalCells > 0 ? (newTotalMissing / totalCells) * 100 : 0;
    const duplicatePenalty = metadata.totalRows > 0 ? (metadata.duplicateRows / metadata.totalRows) * 50 : 0;
    
    let qualityScore = Math.max(0, Math.round(100 - missingPenalty - duplicatePenalty));
    
    if ((newTotalMissing > 0 || metadata.duplicateRows > 0) && qualityScore === 100) {
      qualityScore = 99;
    }
    metadata.qualityScore = qualityScore;

    metadata.markModified('columns');
    await metadata.save();
    
    return NextResponse.json({ success: true, newVersion: newVersionNumber, url: blobResponse.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to transform dataset" }, { status: 500 });
  }
}