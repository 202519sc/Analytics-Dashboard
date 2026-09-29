import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProcessingLog extends Document {
  datasetId: mongoose.Types.ObjectId;
  userId: string;
  actionType:
    | "upload"
    | "cleaning_missing"
    | "cleaning_duplicates"
    | "preprocess_encoding"
    | "preprocess_feature_selection"
    | "visualization_generated";
  description: string;
  parametersApplied?: Record<string, unknown>;
  previousVersion: number;
  newVersion: number;
  timestamp: Date;
}

const ProcessingLogSchema = new Schema<IProcessingLog>(
  {
    datasetId: {
      type: Schema.Types.ObjectId,
      ref: "Dataset",
      required: true,
      index: true,
    },
    userId: { type: String, required: true, index: true },
    actionType: {
      type: String,
      enum: [
        "upload",
        "cleaning_missing",
        "cleaning_duplicates",
        "preprocess_encoding",
        "preprocess_feature_selection",
        "visualization_generated",
      ],
      required: true,
    },
    description: { type: String, required: true },
    parametersApplied: { type: Schema.Types.Mixed },
    previousVersion: { type: Number, required: true },
    newVersion: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
  }
);

ProcessingLogSchema.index({ datasetId: 1, timestamp: -1 });

export const ProcessingLog: Model<IProcessingLog> =
  mongoose.models.ProcessingLog ||
  mongoose.model<IProcessingLog>("ProcessingLog", ProcessingLogSchema);