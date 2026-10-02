import mongoose from "mongoose";

const ColumnMetadataSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dataType: { type: String, enum: ["numeric", "categorical", "datetime", "mixed", "unknown"], required: true },
  missingCount: { type: Number, required: true },
  missingPercentage: { type: Number, required: true },
  uniqueCount: { type: Number, required: true },
  min: { type: Number, default: null },
  max: { type: Number, default: null },
  mean: { type: Number, default: null },
  inconsistentCount: { type: Number, default: 0 }, // Tracks mixed type rows (e.g., text in a number column)
});

const MetadataSchema = new mongoose.Schema({
  datasetId: { type: mongoose.Schema.Types.ObjectId, ref: "Dataset", required: true },
  totalRows: { type: Number, required: true },
  totalColumns: { type: Number, required: true },
  duplicateRows: { type: Number, default: 0 },
  qualityScore: { type: Number, required: true }, // Out of 100
  columns: [ColumnMetadataSchema],
  extractedAt: { type: Date, default: Date.now },
});

export const Metadata = mongoose.models.Metadata || mongoose.model("Metadata", MetadataSchema);