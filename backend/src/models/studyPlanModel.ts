import mongoose from "mongoose";

export interface IStudyPlanItem {
    _id?: mongoose.Types.ObjectId;
    task?: mongoose.Types.ObjectId;
    title: string;
    priority: "low" | "medium" | "high";
    plannedMinutes: number;
    actualMinutes: number;
    order: number;
    status: "pending" | "in_progress" | "completed" | "skipped";
    notes?: string;
}

export interface IAdaptationRecord {
    createdAt: Date;
    reason: string;
    adjustmentSummary: string;
    accepted: boolean;
}

const studyPlanItemSchema = new mongoose.Schema({
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
        required: false,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium",
    },
    plannedMinutes: {
        type: Number,
        required: true,
        min: 5,
    },
    actualMinutes: {
        type: Number,
        default: 0,
        min: 0,
    },
    order: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "in_progress", "completed", "skipped"],
        default: "pending",
    },
    notes: {
        type: String,
        default: "",
    },
});

const adaptationRecordSchema = new mongoose.Schema({
    createdAt: {
        type: Date,
        default: Date.now,
    },
    reason: {
        type: String,
        required: true,
    },
    adjustmentSummary: {
        type: String,
        required: true,
    },
    accepted: {
        type: Boolean,
        default: true,
    },
});

const studyPlanSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        date: {
            type: String, // Format: YYYY-MM-DD
            required: true,
        },
        availableMinutes: {
            type: Number,
            required: true,
            default: 120,
            min: 15,
            max: 960,
            validate: {
                validator: Number.isInteger,
                message: "Available minutes must be an integer",
            },
        },
        items: [studyPlanItemSchema],
        summary: {
            type: String,
            default: "",
        },
        aiRecommendation: {
            type: String,
            default: "",
        },
        adaptationHistory: [adaptationRecordSchema],
    },
    {
        timestamps: true,
    }
);

//unique compound index so a user has one plan per day (can be regenerated/adapted)
studyPlanSchema.index({ user: 1, date: 1 }, { unique: true });

const StudyPlan = mongoose.model("StudyPlan", studyPlanSchema);

export default StudyPlan;
