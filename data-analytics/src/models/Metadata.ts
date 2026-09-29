import mongoose, { Schema, Document, Model } from "mongoose";

export interface IColumnSummary {
  name: string;
  dataType: "numeric" | "categorical" | "datetime" | "boolean" | "text";
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  stats?: {
    mean?: number;
    std?: number;
    min?: number;
    max?: number;
    median?: number;
  };
}

export interface IMetadata extends Document {
  datasetId: mongoose.Types.ObjectId;
  versionNumber: number;
  userId: string;
  totalRows: number;
  totalColumns: number;
  duplicateRows: number;
  columns: IColumnSummary[];
  createdAt: Date;
}

const ColumnSummarySchema = new Schema<IColumnSummary>(
  {
    name: { type: String, required: true },
    dataType: {
      type: String,
      enum: ["numeric", "categorical", "datetime", "boolean", "text"],
      required: true,
    },
    missingCount: { type: Number, default: 0 },
    missingPercentage: { type: Number, default: 0 },
    uniqueCount: { type: Number, default: 0 },
    stats: {
      mean: { type: Number },
      std: { type: Number },
      min: { type: Number },
      max: { type: Number },
      median: { type: Number },
    },
  },
  { _id: false }
);

const MetadataSchema = new Schema<IMetadata>(
  {
    datasetId: {
      type: Schema.Types.ObjectId,
      ref: "Dataset",
      required: true,
      index: true,
    },
    versionNumber: { type: Number, required: true },
    userId: { type: String, required: true, index: true },
    totalRows: { type: Number, required: true },
    totalColumns: { type: Number, required: true },
    duplicateRows: { type: Number, default: 0 },
    columns: [ColumnSummarySchema],
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

MetadataSchema.index({ datasetId: 1, versionNumber: 1 }, { unique: true });

export const Metadata: Model<IMetadata> =
  mongoose.models.Metadata || mongoose.model<IMetadata>("Metadata", MetadataSchema);