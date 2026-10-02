import Papa from "papaparse";

export interface ColumnStat {
  name: string;
  dataType: "numeric" | "categorical" | "unknown";
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  min: number | null;
  max: number | null;
  mean: number | null;
}

export interface ExtractedMetadata {
  totalRows: number;
  totalColumns: number;
  columns: ColumnStat[];
}

export async function extractMetadataClientSide(file: File): Promise<ExtractedMetadata> {
  return new Promise((resolve, reject) => {
    let totalRows = 0;
    let headers: string[] = [];
    const colStats: Record<string, any> = {};

    Papa.parse(file, {
      header: true,
      dynamicTyping: true, // Automatically converts numbers
      skipEmptyLines: true,
      chunk: (results) => {
        // Initialize column trackers on first chunk
        if (totalRows === 0 && results.meta.fields) {
          headers = results.meta.fields;
          headers.forEach((h) => {
            colStats[h] = { type: "unknown", missing: 0, uniques: new Set(), sum: 0, count: 0, min: null, max: null };
          });
        }

        // Process chunk rows
        results.data.forEach((row: any) => {
          totalRows++;
          headers.forEach((h) => {
            const val = row[h];
            const stat = colStats[h];

            if (val === null || val === undefined || val === "") {
              stat.missing++;
            } else {
              // Infer type on first valid value
              if (stat.type === "unknown") {
                stat.type = typeof val === "number" ? "numeric" : "categorical";
              }
              // Cap unique tracking to prevent browser OOM on massive files
              if (stat.uniques.size < 1000) {
                stat.uniques.add(val);
              }
              // Compute numeric running stats
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
        const columns = headers.map((h) => {
          const stat = colStats[h];
          return {
            name: h,
            dataType: stat.type === "unknown" ? "categorical" : stat.type,
            missingCount: stat.missing,
            missingPercentage: parseFloat(((stat.missing / totalRows) * 100).toFixed(2)),
            uniqueCount: stat.uniques.size === 1000 ? 9999 : stat.uniques.size, // 9999 indicates high cardinality
            mean: stat.count > 0 ? parseFloat((stat.sum / stat.count).toFixed(4)) : null,
            min: stat.min,
            max: stat.max,
          };
        });

        resolve({ totalRows, totalColumns: headers.length, columns });
      },
      error: (err) => reject(err),
    });
  });
}