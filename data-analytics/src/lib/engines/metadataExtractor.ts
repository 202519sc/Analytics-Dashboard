import Papa from "papaparse";

export interface ColumnStat {
  name: string;
  dataType: "numeric" | "categorical" | "mixed" | "unknown";
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  inconsistentCount: number;
}

export interface ExtractedMetadata {
  totalRows: number;
  totalColumns: number;
  duplicateRows: number;
  qualityScore: number;
  columns: ColumnStat[];
}

// Fast hash function to detect duplicates without keeping massive strings in memory
const hashRow = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return hash;
};

const NULL_VALUES = new Set(["", "na", "n/a", "null", "?", "-", "undefined"]);

export async function extractMetadataClientSide(file: File): Promise<ExtractedMetadata> {
  return new Promise((resolve, reject) => {
    let totalRows = 0;
    let duplicateRows = 0;
    let headers: string[] = [];
    const colStats: Record<string, any> = {};
    const rowHashes = new Set<number>();

    Papa.parse(file, {
      header: true,
      dynamicTyping: true, // Automatically converts numbers
      skipEmptyLines: true,
      chunk: (results) => {
        if (totalRows === 0 && results.meta.fields) {
          headers = results.meta.fields;
          headers.forEach((h) => {
            colStats[h] = { 
              type: "unknown", missing: 0, uniques: new Set(), 
              sum: 0, count: 0, min: null, max: null, 
              numberCount: 0, stringCount: 0 
            };
          });
        }

        results.data.forEach((row: any) => {
          totalRows++;
          
          // Duplicate detection (hash the row values)
          const rowString = Object.values(row).join("");
          const hash = hashRow(rowString);
          if (rowHashes.has(hash)) {
            duplicateRows++;
          } else if (rowHashes.size < 500000) { 
            // Cap Set size to prevent browser OOM on massive files
            rowHashes.add(hash);
          }

          headers.forEach((h) => {
            const val = row[h];
            const stat = colStats[h];
            const valStr = String(val).trim().toLowerCase();

            // 1. Missing Value Detection
            if (val === null || val === undefined || NULL_VALUES.has(valStr)) {
              stat.missing++;
            } else {
              // Track Types for Inconsistency Detection
              if (typeof val === "number") stat.numberCount++;
              else if (typeof val === "string") stat.stringCount++;

              if (stat.uniques.size < 1000) stat.uniques.add(val);

              if (typeof val === "number") {
                stat.sum += val;
                stat.count++;
                if (stat.min === null || val < stat.min) stat.min = val;
                if (stat.max === null || val > stat.max) stat.max = val;
              }
            }
          });
        });
      },
      complete: () => {
        let totalMissing = 0;
        let totalCells = totalRows * headers.length;

        // Explicitly type the mapped array to ColumnStat[]
        const columns: ColumnStat[] = headers.map((h) => {
          const stat = colStats[h];
          totalMissing += stat.missing;
          
          // STRICT TYPING: Force TypeScript to acknowledge this is a valid literal
          let finalType: "numeric" | "categorical" | "mixed" | "unknown" = "categorical";
          let inconsistentCount = 0;
          
          if (stat.numberCount > 0 && stat.stringCount === 0) finalType = "numeric";
          else if (stat.numberCount > 0 && stat.stringCount > 0) {
            finalType = stat.numberCount > stat.stringCount ? "mixed" : "categorical";
            inconsistentCount = stat.numberCount > stat.stringCount ? stat.stringCount : 0;
          }

          return {
            name: h,
            dataType: finalType,
            missingCount: stat.missing,
            missingPercentage: parseFloat(((stat.missing / totalRows) * 100).toFixed(2)),
            uniqueCount: stat.uniques.size === 1000 ? 9999 : stat.uniques.size,
            mean: stat.count > 0 ? parseFloat((stat.sum / stat.count).toFixed(4)) : null,
            min: stat.min,
            max: stat.max,
            inconsistentCount
          };
        });

        // Compute Quality Score (100 - penalties)
        const missingPenalty = (totalMissing / totalCells) * 100;
        const duplicatePenalty = (duplicateRows / totalRows) * 50; // Heavily penalize duplicates
        const qualityScore = Math.max(0, Math.round(100 - missingPenalty - duplicatePenalty));

        resolve({ totalRows, totalColumns: headers.length, duplicateRows, qualityScore, columns });
      },
      error: (err) => reject(err),
    });
  });
}