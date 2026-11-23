import Friendship from "../models/friendshipModel.js";
import User from "../models/userModel.js";
import FocusSession from "../models/focusSessionModel.js";
import Task from "../models/taskModel.js";
import ApiError from "../errors/apiError.js";
import mongoose from "mongoose";

//helper to determine day start & end respecting client timezone offset in minutes (if provided)
//client timezone offset is in minutes (-330 for ist +05:30): offset = -330 => local time = UTC-offset
function getDayBounds(clientOffsetMinutes?: number): { start: Date; end: Date } {
    const now = new Date();
    if (typeof clientOffsetMinutes === "number" && !isNaN(clientOffsetMinutes)) {
        //local client time in ms
        const localNowMs = now.getTime() - clientOffsetMinutes * 60 * 1000;
        const localDate = new Date(localNowMs);
        const y = localDate.getUTCFullYear();
        const m = localDate.getUTCMonth();
        const d = localDate.getUTCDate();

        //local midnight converted back to UTC
        const localMidnightUtcMs = Date.UTC(y, m, d) + clientOffsetMinutes * 60 * 1000;
        const start = new Date(localMidnightUtcMs);
        const end = new Date(localMidnightUtcMs + 24 * 60 * 60 * 1000 - 1);
        return { start, end };
    }

    //default UTC / server local day boundary
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

//returns start of the week (Monday)
function getWeekStart(date: Date = new Date(), clientOffsetMinutes?: number): Date {
    const { start: dayStart } = getDayBounds(clientOffsetMinutes);
    const d = new Date(dayStart);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
}

//compute streak for a given user from actual focus sessions
async function computeUserStreak(userId: mongoose.Types.ObjectId | string, clientOffsetMinutes?: number): Promise<number> {
    const sessions = await FocusSession.find({ user: userId, status: "completed", verified: true }).sort({ completedAt: -1 });
    if (sessions.length === 0) return 0;

    //convert session timestamps to localized date string 
    const daysWithSession = new Set<string>();
    sessions.forEach((s) => {
        if (!s.completedAt) return;
        const t = new Date(s.completedAt);
        if (typeof clientOffsetMinutes === "number") {
            const localized = new Date(t.getTime() - clientOffsetMinutes * 60 * 1000);
            daysWithSession.add(localized.toISOString().slice(0, 10));
        } else {
            daysWithSession.add(t.toISOString().slice(0, 10));
        }
    });

    let streak = 0;
    const now = new Date();
    const cursor = typeof clientOffsetMinutes === "number"
        ? new Date(now.getTime() - clientOffsetMinutes * 60 * 1000)
        : new Date(now);

    while (true) {
        const key = cursor.toISOString().slice(0, 10);
        if (daysWithSession.has(key)) {
            streak++;
            cursor.setUTCDate(cursor.getUTCDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

//calculate comprehensive, verified daily stats for a user
export async function computeUserDailyStats(userId: mongoose.Types.ObjectId | string, clientOffsetMinutes?: number) {
    const { start: dayStart, end: dayEnd } = getDayBounds(clientOffsetMinutes);
    const weekStart = getWeekStart(new Date(), clientOffsetMinutes);

    //focus sessions
    const sessions = await FocusSession.find({ user: userId, status: "completed", verified: true });

    const todaySessions = sessions.filter((s) => s.completedAt && s.completedAt >= dayStart && s.completedAt <= dayEnd);
    const todayMinutes = todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0);

    const weeklySessions = sessions.filter((s) => s.completedAt && s.completedAt >= weekStart);
    const weeklyMinutes = weeklySessions.reduce((sum, s) => sum + s.durationMinutes, 0);

    const streak = await computeUserStreak(userId, clientOffsetMinutes);

    //task statistics
    //all tasks belonging to user
    const tasks = await Task.find({ user: userId });

    //tasks scheduled for today: deadline is b/w dayStart and dayEnd
    const scheduledToday = tasks.filter((t) => t.deadline >= dayStart && t.deadline <= dayEnd);

    //tasks completed today:
    //uses completedAt timestamp if present and completed is true;
    // or if completed is true and updatedAt was today (for backwards compatibility)
    const completedToday = tasks.filter((t) => {
        if (!t.completed) return false;
        const taskCompletedAt = (t as unknown as { completedAt?: Date }).completedAt;
        if (taskCompletedAt) {
            return taskCompletedAt >= dayStart && taskCompletedAt <= dayEnd;
        }
        //fallback for older tasks marked completed today before completedAt schema addition
        const updated = t.updatedAt;
        return updated >= dayStart && updated <= dayEnd;
    });

    //total tasks for today calculation:
    //tasks scheduled for today plus any tasks completed today (in case a task due another day was finished today)
    const totalTodayTaskIds = new Set<string>();
    scheduledToday.forEach((t) => totalTodayTaskIds.add(t._id.toString()));
    completedToday.forEach((t) => totalTodayTaskIds.add(t._id.toString()));

    const totalTasksToday = totalTodayTaskIds.size;
    const tasksCompletedToday = completedToday.length;
    const completionPercentage = totalTasksToday > 0 ? Math.round((tasksCompletedToday / totalTasksToday) * 100) : 0;

    return {
        todayMinutes,
        weeklyMinutes,
        todaySessionsCount: todaySessions.length,
        totalSessionsCount: sessions.length,
        streak,
        totalTasksToday,
        tasksCompletedToday,
        completionPercentage,
    };
}

//compute dynamic activity status for a user
export async function determineActivityStatus(user: { activityStatus?: string; lastActiveAt?: Date }): Promise<"Focusing" | "On Break" | "Offline"> {
    if (!user.lastActiveAt) return "Offline";

    const diffMinutes = (Date.now() - new Date(user.lastActiveAt).getTime()) / (1000 * 60);

    //if no heartbeat for > 15 minutes, automatically treat as Offline
    if (diffMinutes > 15) {
        return "Offline";
    }

    if (user.activityStatus === "Focusing") return "Focusing";
    if (user.activityStatus === "On Break") return "On Break";
    return "Offline";
}

//search users (not exposes pvt emails)
export const searchUsers = async (currentUserId: string, query: string) => {
    if (!query || query.trim().length < 2) return [];

    const cleanQuery = query.trim().replace(/^@/, "");
    if (cleanQuery.length < 2) return [];
    const escapedQuery = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const users = await User.find({
        _id: { $ne: currentUserId },
        username: { $regex: escapedQuery, $options: "i" },
    })
        .select("_id name username")
        .limit(10);

    return users;
};

export const sendFriendRequest = async (currentUserId: string, targetUserId: string) => {
    if (!mongoose.isValidObjectId(targetUserId)) {
        throw new ApiError(400, "Invalid user ID");
    }
    const normalizedCurrentId = new mongoose.Types.ObjectId(currentUserId).toString();
    const normalizedTargetId = new mongoose.Types.ObjectId(targetUserId).toString();
    if (normalizedCurrentId === normalizedTargetId) {
        throw new ApiError(400, "You cannot send a friend request to yourself");
    }

    const targetUser = await User.findById(normalizedTargetId);
    if (!targetUser) {
        throw new ApiError(404, "User not found");
    }

    //check if fs already exists in either direction
    const existing = await Friendship.findOne({
        $or: [
            { requester: normalizedCurrentId, recipient: normalizedTargetId },
            { requester: normalizedTargetId, recipient: normalizedCurrentId },
        ],
    });

    if (existing) {
        if (existing.status === "accepted") {
            throw new ApiError(400, "You are already friends with this user");
        }
        if (existing.status === "pending") {
            throw new ApiError(400, "A friend request is already pending with this user");
        }
        //if rejected previously, allow re request
        existing.requester = new mongoose.Types.ObjectId(normalizedCurrentId);
        existing.recipient = new mongoose.Types.ObjectId(normalizedTargetId);
        existing.set("pairKey", [normalizedCurrentId, normalizedTargetId].sort().join(":"));
        existing.status = "pending";
        try {
            await existing.save();
        } catch (error) {
            if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
                throw new ApiError(400, "A friend request already exists with this user");
            }
            throw error;
        }
        return existing;
    }

    let request;
    try {
        request = await Friendship.create({
            requester: normalizedCurrentId,
            recipient: normalizedTargetId,
            pairKey: [normalizedCurrentId, normalizedTargetId].sort().join(":"),
            status: "pending",
        });
    } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
            throw new ApiError(400, "A friend request already exists with this user");
        }
        throw error;
    }

    return request;
};

//respond to friend request
export const respondToFriendRequest = async (
    currentUserId: string,
    requestId: string,
    accept: boolean
) => {
    const friendship = await Friendship.findOne({
        _id: requestId,
        recipient: currentUserId,
        status: "pending",
    });

    if (!friendship) {
        throw new ApiError(404, "Friend request not found or not authorized to respond");
    }

    if (accept) {
        friendship.status = "accepted";
        await friendship.save();
        return friendship;
    } else {
        await Friendship.findByIdAndDelete(requestId);
        return { message: "Friend request declined" };
    }
};


export const removeFriend = async (currentUserId: string, friendshipId: string) => {
    const friendship = await Friendship.findOneAndDelete({
        _id: friendshipId,
        $or: [{ requester: currentUserId }, { recipient: currentUserId }],
    });

    if (!friendship) {
        throw new ApiError(404, "Friendship not found or unauthorized");
    }

    return friendship;
};

//get friends data: confirmed friends, incoming requests, outgoing requests
export const getFriendsOverview = async (currentUserId: string, clientOffsetMinutes?: number) => {
    //confirmed fs
    const friendships = await Friendship.find({
        $or: [{ requester: currentUserId }, { recipient: currentUserId }],
        status: "accepted",
    })
        .populate("requester", "_id name createdAt activityStatus lastActiveAt")
        .populate("recipient", "_id name createdAt activityStatus lastActiveAt");

    //map confirmed friends with complete productivity metrics & live status
    const friendsWithStats = await Promise.all(
        friendships.map(async (f) => {
            const isRequester = f.requester._id.toString() === currentUserId;
            const friend = isRequester ? f.recipient : f.requester;
            const friendObj = friend as unknown as {
                _id: mongoose.Types.ObjectId;
                name: string;
                createdAt: Date;
                activityStatus?: "Focusing" | "On Break" | "Offline";
                lastActiveAt?: Date;
            };

            const stats = await computeUserDailyStats(friendObj._id, clientOffsetMinutes);
            const liveActivityStatus = await determineActivityStatus(friendObj);

            return {
                friendshipId: f._id,
                user: {
                    _id: friendObj._id,
                    name: friendObj.name,
                    joinedAt: friendObj.createdAt,
                    activityStatus: liveActivityStatus,
                },
                stats: {
                    todayMinutes: stats.todayMinutes,
                    weeklyMinutes: stats.weeklyMinutes,
                    todaySessions: stats.todaySessionsCount,
                    totalSessions: stats.totalSessionsCount,
                    streak: stats.streak,
                    tasksCompletedToday: stats.tasksCompletedToday,
                    totalTasksToday: stats.totalTasksToday,
                    completionPercentage: stats.completionPercentage,
                },
            };
        })
    );

    //incoming reqs
    const incoming = await Friendship.find({
        recipient: currentUserId,
        status: "pending",
    }).populate("requester", "_id name createdAt");

    //outgoing reqs
    const outgoing = await Friendship.find({
        requester: currentUserId,
        status: "pending",
    }).populate("recipient", "_id name createdAt");

    return {
        friends: friendsWithStats,
        incomingRequests: incoming.map((r) => ({
            _id: r._id,
            requester: r.requester,
            createdAt: (r as unknown as { createdAt: Date }).createdAt,
        })),
        outgoingRequests: outgoing.map((r) => ({
            _id: r._id,
            recipient: r.recipient,
            createdAt: (r as unknown as { createdAt: Date }).createdAt,
        })),
    };
};

export const getStudyLeaderboard = async (currentUserId: string, clientOffsetMinutes?: number) => {
    //gather all accepted friend user ids + current user id
    const friendships = await Friendship.find({
        $or: [{ requester: currentUserId }, { recipient: currentUserId }],
        status: "accepted",
    });

    const userIds = new Set<string>();
    userIds.add(currentUserId);

    friendships.forEach((f) => {
        userIds.add(f.requester.toString());
        userIds.add(f.recipient.toString());
    });

    const idList = Array.from(userIds);
    const users = await User.find({ _id: { $in: idList } }).select("_id name activityStatus lastActiveAt");

    //compute verified metrics
    const participants = await Promise.all(
        users.map(async (u) => {
            const stats = await computeUserDailyStats(u._id, clientOffsetMinutes);
            const liveActivityStatus = await determineActivityStatus(u);

            return {
                userId: u._id,
                name: u.name,
                isCurrentUser: u._id.toString() === currentUserId,
                todayMinutes: stats.todayMinutes,
                weeklyMinutes: stats.weeklyMinutes,
                streak: stats.streak,
                todaySessions: stats.todaySessionsCount,
                totalSessions: stats.totalSessionsCount,
                tasksCompletedToday: stats.tasksCompletedToday,
                activityStatus: liveActivityStatus,
            };
        })
    );

    //sorting rankings
    const dailyRankings = [...participants]
        .sort((a, b) => b.todayMinutes - a.todayMinutes || b.weeklyMinutes - a.weeklyMinutes)
        .map((p, idx) => ({ ...p, rank: idx + 1 }));

    const weeklyRankings = [...participants]
        .sort((a, b) => b.weeklyMinutes - a.weeklyMinutes || b.todayMinutes - a.todayMinutes)
        .map((p, idx) => ({ ...p, rank: idx + 1 }));

    const userDailyRank = dailyRankings.find((p) => p.isCurrentUser)?.rank || 1;
    const userWeeklyRank = weeklyRankings.find((p) => p.isCurrentUser)?.rank || 1;

    return {
        daily: dailyRankings,
        weekly: weeklyRankings,
        myRanks: {
            daily: userDailyRank,
            weekly: userWeeklyRank,
            totalCompetitors: participants.length,
        },
    };
};

//checking if two users are confirmed accepted friend
export async function areFriends(userA: string, userB: string): Promise<boolean> {
    if (userA === userB) return false;
    const count = await Friendship.countDocuments({
        $or: [
            { requester: userA, recipient: userB, status: "accepted" },
            { requester: userB, recipient: userA, status: "accepted" },
        ],
    });
    return count > 0;
}

//get friends shared task list read only
export const getFriendSharedTasks = async (currentUserId: string, friendUserId: string) => {
    if (!mongoose.isValidObjectId(friendUserId)) {
        throw new ApiError(400, "Invalid friend ID");
    }
    //backend security authorization verify accepted friendship
    const isFriend = await areFriends(currentUserId, friendUserId);
    if (!isFriend) {
        throw new ApiError(403, "You do not have permission to view this user's tasks. Accepted friendship required.");
    }

    const friend = await User.findById(friendUserId).select("_id name shareTasks sharedTaskIds");
    if (!friend) {
        throw new ApiError(404, "User not found");
    }

    const tasks = friend.shareTasks ? await Task.find({
        user: friendUserId,
        _id: { $in: friend.sharedTaskIds },
    })
        .select("_id title completed priority deadline")
        .sort({ completed: 1, deadline: 1 }) : [];

    return {
        friend: {
            _id: friend._id,
            name: friend.name,
        },
        tasks,
    };
};

export const getTaskSharingSettings = async (userId: string) => {
    const user = await User.findById(userId).select("shareTasks sharedTaskIds");
    if (!user) throw new ApiError(404, "User not found");
    return {
        enabled: user.shareTasks ?? false,
        taskIds: (user.sharedTaskIds ?? []).map((id: mongoose.Types.ObjectId) => id.toString()),
    };
};

export const updateTaskSharingSettings = async (
    userId: string,
    enabled: boolean,
    taskIds?: string[]
) => {
    let selectedIds = taskIds;
    if (selectedIds === undefined) {
        const current = await User.findById(userId).select("sharedTaskIds");
        if (!current) throw new ApiError(404, "User not found");
        selectedIds = (current.sharedTaskIds ?? []).map((id: mongoose.Types.ObjectId) => id.toString());
    }

    if (selectedIds.some((id) => !mongoose.isValidObjectId(id))) {
        throw new ApiError(400, "Invalid task ID in sharing selection");
    }
    selectedIds = [...new Set(selectedIds)];
    const ownedTaskCount = selectedIds.length === 0 ? 0 : await Task.countDocuments({
        _id: { $in: selectedIds },
        user: userId,
    });
    if (ownedTaskCount !== selectedIds.length) {
        throw new ApiError(400, "Sharing selection contains a task you do not own");
    }

    const user = await User.findByIdAndUpdate(
        userId,
        { $set: { shareTasks: enabled, sharedTaskIds: selectedIds } },
        { new: true }
    ).select("shareTasks sharedTaskIds");
    if (!user) throw new ApiError(404, "User not found");
    return {
        enabled: user.shareTasks,
        taskIds: user.sharedTaskIds.map((id: mongoose.Types.ObjectId) => id.toString()),
    };
};

//update activity status
export const updateUserActivityStatus = async (
    userId: string,
    activityStatus: "Focusing" | "On Break" | "Offline"
) => {
    if (!["Focusing", "On Break", "Offline"].includes(activityStatus)) {
        throw new ApiError(400, "Invalid activityStatus");
    }

    await User.findByIdAndUpdate(userId, {
        activityStatus,
        lastActiveAt: new Date(),
    });

    return { status: activityStatus };
};
