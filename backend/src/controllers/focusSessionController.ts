
import { Request, Response } from "express";
import ApiError from "../errors/apiError.js";
import {
    createFocusSession,
    getFocusSessions,
} from "../services/focusSessionService.js";

// POST: Save a completed focus session.
export const create = async (req: Request, res: Response) => {
    const { durationMinutes } = req.body;

    // Reject missing, non-numeric, or invalid durations.
    if (
        typeof durationMinutes !== "number" ||
        !Number.isInteger(durationMinutes) ||
        durationMinutes < 1 ||
        durationMinutes > 25
    ) {
        throw new ApiError(400, "Invalid focus session duration");
    }

    // Get the user ID from authenticated JWT middleware,
    // never from the request body.
    const session = await createFocusSession(
        req.user!.userId,
        durationMinutes
    );

    res.status(201).json({
        message: "Focus session recorded successfully",
        session,
    });
};

// GET: Retrieve the authenticated user's focus sessions.
export const getAll = async (req: Request, res: Response) => {
    const sessions = await getFocusSessions(req.user!.userId);

    res.status(200).json({
        sessions,
    });
};
