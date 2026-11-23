import mongoose from "mongoose";

const focusSessionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            required: false,
        },
        durationMinutes: {
            type: Number,
            required: true,
            min: 1,
        },
        status: {
            type: String,
            enum: ["active", "completed", "abandoned"],
            default: "completed",
            required: true,
        },
        verified: {
            type: Boolean,
            default: false,
            required: true,
        },
        startedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
        pausedAt: {
            type: Date,
            default: null,
        },
        pausedDurationMs: {
            type: Number,
            default: 0,
            min: 0,
        },
        completedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

//at most one active pomodoro can exist for a user including while paused
focusSessionSchema.index(
    { user: 1 },
    { unique: true, partialFilterExpression: { status: "active" } }
);

const FocusSession = mongoose.model("FocusSession", focusSessionSchema);

export default FocusSession;
