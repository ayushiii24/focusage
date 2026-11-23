import { Request, Response } from "express";
import ApiError from "../errors/apiError.js";
import {
    searchUsers,
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    getFriendsOverview,
    getStudyLeaderboard,
    getFriendSharedTasks,
    updateUserActivityStatus,
    computeUserDailyStats,
    getTaskSharingSettings,
    updateTaskSharingSettings,
} from "../services/friendService.js";

function parseOffset(req: Request): number | undefined {
    const tzOffset = req.query.tzOffset;
    if (typeof tzOffset === "string") {
        const num = parseInt(tzOffset, 10);
        if (!isNaN(num)) return num;
    }
    return undefined;
}

export const search = async (req: Request, res: Response) => {
    const { q } = req.query;
    if (typeof q !== "string") {
        throw new ApiError(400, "Query parameter 'q' is required");
    }

    const results = await searchUsers(req.user!.userId, q);
    res.status(200).json({ results });
};

export const requestFriend = async (req: Request, res: Response) => {
    const { targetUserId } = req.body;
    if (!targetUserId || typeof targetUserId !== "string") {
        throw new ApiError(400, "targetUserId is required");
    }

    const request = await sendFriendRequest(req.user!.userId, targetUserId);
    res.status(201).json({
        message: "Friend request sent successfully",
        request,
    });
};

export const respond = async (req: Request<{ id: string }>, res: Response) => {
    const { action } = req.body; // 'accept' | 'reject'
    if (action !== "accept" && action !== "reject") {
        throw new ApiError(400, "action must be 'accept' or 'reject'");
    }

    const result = await respondToFriendRequest(
        req.user!.userId,
        req.params.id,
        action === "accept"
    );

    res.status(200).json({
        message: action === "accept" ? "Friend request accepted" : "Friend request declined",
        result,
    });
};

export const remove = async (req: Request<{ id: string }>, res: Response) => {
    await removeFriend(req.user!.userId, req.params.id);
    res.status(200).json({
        message: "Friend removed successfully",
    });
};

export const getOverview = async (req: Request, res: Response) => {
    const offset = parseOffset(req);
    const data = await getFriendsOverview(req.user!.userId, offset);
    res.status(200).json(data);
};

export const getLeaderboard = async (req: Request, res: Response) => {
    const offset = parseOffset(req);
    const leaderboard = await getStudyLeaderboard(req.user!.userId, offset);
    res.status(200).json(leaderboard);
};

export const getSharedTasks = async (req: Request<{ friendId: string }>, res: Response) => {
    const { friendId } = req.params;
    if (!friendId) {
        throw new ApiError(400, "friendId is required");
    }

    const data = await getFriendSharedTasks(req.user!.userId, friendId);
    res.status(200).json(data);
};

export const getSharingSettings = async (req: Request, res: Response) => {
    const sharing = await getTaskSharingSettings(req.user!.userId);
    res.status(200).json({ sharing });
};

export const updateSharingSettings = async (req: Request, res: Response) => {
    const { enabled, taskIds } = req.body;
    if (typeof enabled !== "boolean") throw new ApiError(400, "enabled must be a boolean");
    if (taskIds !== undefined && (!Array.isArray(taskIds) || taskIds.some((id: unknown) => typeof id !== "string"))) {
        throw new ApiError(400, "taskIds must be an array of task IDs");
    }
    const sharing = await updateTaskSharingSettings(req.user!.userId, enabled, taskIds);
    res.status(200).json({ sharing });
};

export const updateStatus = async (req: Request, res: Response) => {
    const { activityStatus } = req.body;
    if (!activityStatus || !["Focusing", "On Break", "Offline"].includes(activityStatus)) {
        throw new ApiError(400, "Valid activityStatus ('Focusing' | 'On Break' | 'Offline') is required");
    }

    const result = await updateUserActivityStatus(req.user!.userId, activityStatus);
    res.status(200).json(result);
};

export const getMyDailyStats = async (req: Request, res: Response) => {
    const offset = parseOffset(req);
    const stats = await computeUserDailyStats(req.user!.userId, offset);
    res.status(200).json({ stats });
};
