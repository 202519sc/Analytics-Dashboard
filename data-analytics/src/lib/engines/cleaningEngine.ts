import { ExtractedMetadata, ColumnStat } from "./metadataExtractor";

export interface CleaningRecommendation {
  column?: string; // Optional because duplicate drops apply to the whole dataset
  action: "DROP_COLUMN" | "IMPUTE_MEAN" | "IMPUTE_MODE" | "DROP_CONSTANT" | "DROP_DUPLICATES" | "COERCE_NUMERIC";
  reason: string;
  impact: string;
}

export function generateCleaningRecommendations(metadata: ExtractedMetadata): CleaningRecommendation[] {
  const recommendations: CleaningRecommendation[] = [];

  // Pillar 3: Duplicate Removal (Dataset-level)
  if (metadata.duplicateRows > 0) {
    recommendations.push({
      action: "DROP_DUPLICATES",
      reason: `Found ${metadata.duplicateRows} exact duplicate rows.`,
      impact: `Reduces dataset size by ${((metadata.duplicateRows / metadata.totalRows) * 100).toFixed(2)}%.`
    });
  }

  metadata.columns.forEach((col: ColumnStat) => {
    // Pillar 4: Invalid/Inconsistent Data Handling
    if (col.dataType === "mixed" && col.inconsistentCount > 0) {
      recommendations.push({
        column: col.name,
        action: "COERCE_NUMERIC",
        reason: `Column is mostly numeric but contains ${col.inconsistentCount} text values.`,
        impact: "Converts text to null, which can then be imputed or dropped."
      });
    }

    // Pillar 1 & 2: Missing/Null Values
    if (col.missingPercentage > 40) {
      recommendations.push({
        column: col.name,
        action: "DROP_COLUMN",
        reason: `${col.missingPercentage}% of data is missing. Too sparse to reliably impute.`,
        impact: "Removes column from analysis entirely."
      });
      return; 
    }

    if (col.uniqueCount === 1) {
      recommendations.push({
        column: col.name,
        action: "DROP_CONSTANT",
        reason: "Column contains only a single constant value. Provides no variance.",
        impact: "Reduces dimensionality without losing information."
      });
      return;
    }

    if (col.missingCount > 0) {
      if (col.dataType === "numeric" || col.dataType === "mixed") {
        recommendations.push({
          column: col.name,
          action: "IMPUTE_MEAN",
          reason: `Contains ${col.missingCount} missing values.`,
          impact: `Replaces missing values with the column average (${col.mean}).`
        });
      } else {
        recommendations.push({
          column: col.name,
          action: "IMPUTE_MODE",
          reason: `Contains ${col.missingCount} missing categorical values.`,
          impact: "Replaces missing values with the most frequent category."
        });
      }
    }
  });

  return recommendations;
}