
import { Request, Response } from "express";
import ApiError from "../errors/apiError.js";
import {
    startFocusSession,
    pauseFocusSession,
    abandonFocusSession,
    resumeFocusSession,
    completeFocusSession,
    getFocusSessions,
} from "../services/focusSessionService.js";

export const start = async (req: Request, res: Response) => {
    const { taskId } = req.body;
    if (taskId !== undefined && typeof taskId !== "string") throw new ApiError(400, "Invalid taskId");
    const session = await startFocusSession(req.user!.userId, taskId);
    res.status(201).json({ message: "Focus session started", session });
};

export const pause = async (req: Request, res: Response) => {
    const session = await pauseFocusSession(req.user!.userId);
    res.status(200).json({ message: "Focus session paused", session });
};

export const abandon = async (req: Request, res: Response) => {
    await abandonFocusSession(req.user!.userId);
    res.status(200).json({ message: "Active focus session cleared" });
};

export const resume = async (req: Request, res: Response) => {
    const session = await resumeFocusSession(req.user!.userId);
    res.status(200).json({ message: "Focus session resumed", session });
};

export const complete = async (req: Request, res: Response) => {
    const session = await completeFocusSession(req.user!.userId);
    res.status(200).json({ message: "Focus session recorded successfully", session });
};

// GET: Retrieve the authenticated user's focus sessions.
export const getAll = async (req: Request, res: Response) => {
    const sessions = await getFocusSessions(req.user!.userId);

    res.status(200).json({
        sessions,
    });
};
