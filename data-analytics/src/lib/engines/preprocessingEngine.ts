import { ExtractedMetadata, ColumnStat } from "./metadataExtractor";

export interface PreprocessingRecommendation {
  column: string;
  technique: "ONE_HOT_ENCODING" | "LABEL_ENCODING" | "FEATURE_SELECTION_DROP" | "PASS";
  reason: string;
}

// 1. THE KNOWLEDGE BASE (Rules defined by a human expert)
const KnowledgeBase = {
  isConstantFeature: (col: ColumnStat) => col.uniqueCount === 1,
  isHighlySparse: (col: ColumnStat) => col.missingPercentage > 40,
  isIdentifierColumn: (col: ColumnStat, totalRows: number) => col.uniqueCount === totalRows && totalRows > 0,
  isLowCardinalityCategorical: (col: ColumnStat) => col.dataType === "categorical" && col.uniqueCount > 1 && col.uniqueCount <= 10,
  isHighCardinalityCategorical: (col: ColumnStat) => col.dataType === "categorical" && col.uniqueCount > 10 && col.uniqueCount !== 9999,
};

// 2. THE INFERENCE ENGINE (Forward Chaining)
export function runExpertSystem(metadata: ExtractedMetadata): PreprocessingRecommendation[] {
  const recommendations: PreprocessingRecommendation[] = [];

  // --- ACADEMIC DEMO TRACE LOGGING ---
  console.log("\n==================================================");
  console.log("🧠 EXPERT SYSTEM: FORWARD-CHAINING INFERENCE START");
  console.log("==================================================");
  console.log(`[WORKING MEMORY] Loaded ${metadata.totalColumns} facts (columns) from dataset.`);

  metadata.columns.forEach((col) => {
    console.log(`\n▶ Evaluating Fact: Column '${col.name}' (Type: ${col.dataType}, Uniques: ${col.uniqueCount})`);

    // Evaluate Rule 1
    if (KnowledgeBase.isConstantFeature(col)) {
      console.log(`  ↳ [RULE FIRED] isConstantFeature = TRUE`);
      console.log(`  ↳ [CONCLUSION] Recommend FEATURE_SELECTION_DROP`);
      recommendations.push({
        column: col.name,
        technique: "FEATURE_SELECTION_DROP",
        reason: "Zero variance feature. Contains only a single constant value.",
      });
      return; 
    }

    // Evaluate Rule 2
    if (KnowledgeBase.isHighlySparse(col)) {
      console.log(`  ↳ [RULE FIRED] isHighlySparse = TRUE (${col.missingPercentage}% missing)`);
      console.log(`  ↳ [CONCLUSION] Recommend FEATURE_SELECTION_DROP`);
      recommendations.push({
        column: col.name,
        technique: "FEATURE_SELECTION_DROP",
        reason: `Feature sparsity exceeds threshold (${col.missingPercentage}% missing).`,
      });
      return;
    }

    // Evaluate Rule 3
    if (KnowledgeBase.isIdentifierColumn(col, metadata.totalRows)) {
      console.log(`  ↳ [RULE FIRED] isIdentifierColumn = TRUE`);
      console.log(`  ↳ [CONCLUSION] Recommend FEATURE_SELECTION_DROP`);
      recommendations.push({
        column: col.name,
        technique: "FEATURE_SELECTION_DROP",
        reason: "100% uniqueness detected. Likely an ID or Index column with no predictive value.",
      });
      return;
    }

    // Evaluate Rule 4
    if (KnowledgeBase.isLowCardinalityCategorical(col)) {
      console.log(`  ↳ [RULE FIRED] isLowCardinalityCategorical = TRUE`);
      console.log(`  ↳ [CONCLUSION] Recommend ONE_HOT_ENCODING`);
      recommendations.push({
        column: col.name,
        technique: "ONE_HOT_ENCODING",
        reason: `Categorical data with low cardinality (${col.uniqueCount} unique values). Optimal for One-Hot Encoding.`,
      });
      return;
    }

    // Evaluate Rule 5
    if (KnowledgeBase.isHighCardinalityCategorical(col) || (col.dataType === "categorical" && col.uniqueCount === 9999)) {
      console.log(`  ↳ [RULE FIRED] isHighCardinalityCategorical = TRUE`);
      console.log(`  ↳ [CONCLUSION] Recommend LABEL_ENCODING`);
      recommendations.push({
        column: col.name,
        technique: "LABEL_ENCODING",
        reason: `Categorical data with high cardinality. Use Label/Target Encoding to avoid dimensionality explosion.`,
      });
      return;
    }

    console.log(`  ↳ [DEFAULT] No preprocessing rules matched. Passing feature as-is.`);
  });

  console.log("\n==================================================");
  console.log(`✅ INFERENCE COMPLETE. Generated ${recommendations.length} recommendations.`);
  console.log("==================================================\n");

  return recommendations;
}