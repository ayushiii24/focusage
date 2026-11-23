
import FocusSession from "../models/focusSessionModel.js";
import Task from "../models/taskModel.js";
import ApiError from "../errors/apiError.js";
import mongoose from "mongoose";

export const POMODORO_MINUTES = 25;

async function validateTask(userId: string, taskId?: string) {
    if (!taskId) return undefined;
    if (!mongoose.isValidObjectId(taskId)) throw new ApiError(400, "Invalid taskId");
    const task = await Task.exists({ _id: taskId, user: userId });
    if (!task) throw new ApiError(404, "Task not found");
    return taskId;
}

export const startFocusSession = async (userId: string, taskId?: string) => {
    const ownedTaskId = await validateTask(userId, taskId);
    const current = await FocusSession.findOne({ user: userId, status: "active" });
    if (current) throw new ApiError(409, "A focus session is already active");

    try {
        return await FocusSession.create({
            user: userId,
            task: ownedTaskId,
            status: "active",
            durationMinutes: POMODORO_MINUTES,
            startedAt: new Date(),
            completedAt: null,
        });
    } catch (error) {
        if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
            throw new ApiError(409, "A focus session is already active");
        }
        throw error;
    }
};

export const pauseFocusSession = async (userId: string) => {
    const session = await FocusSession.findOneAndUpdate(
        { user: userId, status: "active", pausedAt: null },
        { pausedAt: new Date() },
        { new: true }
    );
    if (!session) throw new ApiError(404, "No running focus session found");
    return session;
};

export const abandonFocusSession = async (userId: string) => {
    return FocusSession.findOneAndUpdate(
        { user: userId, status: "active" },
        { status: "abandoned", verified: false, completedAt: null, pausedAt: null },
        { new: true, runValidators: true }
    );
};

export const resumeFocusSession = async (userId: string) => {
    const now = new Date();
    const session = await FocusSession.findOne({ user: userId, status: "active", pausedAt: { $ne: null } });
    if (!session || !session.pausedAt) throw new ApiError(404, "No paused focus session found");
    session.pausedDurationMs += Math.max(0, now.getTime() - session.pausedAt.getTime());
    session.pausedAt = null;
    await session.save();
    return session;
};

export const completeFocusSession = async (userId: string) => {
    const now = new Date();
    const session = await FocusSession.findOne({ user: userId, status: "active" });
    if (!session) throw new ApiError(404, "No active focus session found");
    if (session.pausedAt) throw new ApiError(409, "Resume the focus session before completing it");

    const workedMs = now.getTime() - session.startedAt.getTime() - session.pausedDurationMs;
    if (workedMs < POMODORO_MINUTES * 60_000) {
        throw new ApiError(400, "The focus session has not reached 25 minutes");
    }

    const completed = await FocusSession.findOneAndUpdate(
        { _id: session._id, user: userId, status: "active", pausedAt: null },
        { status: "completed", verified: true, completedAt: now, durationMinutes: POMODORO_MINUTES },
        { new: true }
    );
    if (!completed) throw new ApiError(409, "Focus session was already completed");
    return completed;
};

//retrieve only the authenticated users focus sessions
export const getFocusSessions = async (userId: string) => {
    const sessions = await FocusSession.find({
        user: userId,
        status: "completed",
        verified: true,
        completedAt: { $ne: null },
    }).sort({
        completedAt: -1, //most recent sessions first
    });

    return sessions;
};
