import mongoose from "mongoose";

const focusSessionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        durationMinutes: {
            type: Number,
            required: true,
            min: 1,
        },
        completedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

const FocusSession = mongoose.model("FocusSession", focusSessionSchema);

export default FocusSession;