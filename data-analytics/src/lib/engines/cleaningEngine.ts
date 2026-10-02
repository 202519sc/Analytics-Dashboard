import { ExtractedMetadata, ColumnStat } from "./metadataExtractor";

export interface CleaningRecommendation {
  column: string;
  action: "DROP_COLUMN" | "IMPUTE_MEAN" | "IMPUTE_MODE" | "DROP_CONSTANT" | "NO_ACTION";
  reason: string;
}

export function generateCleaningRecommendations(metadata: ExtractedMetadata): CleaningRecommendation[] {
  const recommendations: CleaningRecommendation[] = [];

  metadata.columns.forEach((col: ColumnStat) => {
    // Rule 1: Extreme missing data (> 40%)
    if (col.missingPercentage > 40) {
      recommendations.push({
        column: col.name,
        action: "DROP_COLUMN",
        reason: `${col.missingPercentage}% of data is missing. Too sparse to reliably impute.`,
      });
      return; // Skip further rules for this column
    }

    // Rule 2: Constant values (Zero variance)
    if (col.uniqueCount === 1) {
      recommendations.push({
        column: col.name,
        action: "DROP_CONSTANT",
        reason: "Column contains only a single constant value. Provides no variance for ML models.",
      });
      return;
    }

    // Rule 3: Minor missing data (1% - 40%)
    if (col.missingCount > 0) {
      if (col.dataType === "numeric") {
        recommendations.push({
          column: col.name,
          action: "IMPUTE_MEAN",
          reason: `Contains ${col.missingCount} missing values. Recommend imputing with the column mean (${col.mean}).`,
        });
      } else {
        recommendations.push({
          column: col.name,
          action: "IMPUTE_MODE",
          reason: `Contains ${col.missingCount} missing categorical values. Recommend imputing with the mode.`,
        });
      }
    }
  });

  return recommendations;
}