import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDatasetVersion {
  versionNumber: number;
  label: string; // e.g. "Original Upload", "Imputed Missing Values", "One-Hot Encoded"
  fileUrl: string; // Vercel Blob permanent URL
  fileSize: number;
  rowCount: number;
  columnCount: number;
  createdAt: Date;
}

export interface IDataset extends Document {
  userId: string; // Clerk user ID for isolation
  name: string;
  originalFileName: string;
  fileFormat: "csv" | "tsv" | "xls" | "xlsx";
  originalFileUrl: string;
  currentVersion: number;
  versions: IDatasetVersion[];
  createdAt: Date;
  updatedAt: Date;
}

const DatasetVersionSchema = new Schema<IDatasetVersion>(
  {
    versionNumber: { type: Number, required: true },
    label: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number, required: true },
    rowCount: { type: Number, default: 0 },
    columnCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DatasetSchema = new Schema<IDataset>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    originalFileName: { type: String, required: true },
    fileFormat: {
      type: String,
      enum: ["csv", "tsv", "xls", "xlsx"],
      required: true,
    },
    originalFileUrl: { type: String, required: true },
    currentVersion: { type: Number, default: 1 },
    versions: [DatasetVersionSchema],
  },
  {
    timestamps: true,
  }
);

DatasetSchema.index({ userId: 1, createdAt: -1 });

export const Dataset: Model<IDataset> =
  mongoose.models.Dataset || mongoose.model<IDataset>("Dataset", DatasetSchema);