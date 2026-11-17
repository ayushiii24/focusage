
import FocusSession from "../models/focusSessionModel.js";

// Save a completed focus session for the authenticated user.
export const createFocusSession = async (
    userId: string,
    durationMinutes: number
) => {
    const session = await FocusSession.create({
        user: userId,
        durationMinutes,
        // The model supplies completedAt automatically.
        // Mongoose also supplies createdAt and updatedAt.
    });

    return session;
};

// Retrieve only the authenticated user's focus sessions.
export const getFocusSessions = async (userId: string) => {
    const sessions = await FocusSession.find({
        user: userId,
    }).sort({
        completedAt: -1, // Most recent sessions first.
    });

    return sessions;
};
