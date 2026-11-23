import Task from "../models/taskModel.js";
import ApiError from "../errors/apiError.js";
import mongoose from "mongoose";

export const createTask = async (
    userId: string,
    title: string,
    deadline: Date,
    priority: "low" | "medium" | "high"
) => {
    const task = await Task.create({
        user: userId,
        title,
        deadline,
        priority,
    });

    return task;
};

export const getTasks = async (
    userId: string,
    status?: string,
    priority?: "low" | "medium" | "high",
    sort?: string
) => {
    //return tasks belonging to authenticated user
    const filter: {
        user: string;
        completed?: boolean;
        priority?: "low" | "medium" | "high";
    } = {
        user: userId,
    };

    //filter by completion status when asked
    if (status === "completed") {
        filter.completed = true;
    }

    if (status === "pending") {
        filter.completed = false;
    }

    //filter by priority when asked
    if (priority) {
        filter.priority = priority;
    }

    //default: earliest deadline first
    let sortOption: Record<string, 1 | -1> = {
        deadline: 1,
    };

    //optional: newest tasks first
    if (sort === "created") {
        sortOption = {
            createdAt: -1,
        };
    }

    const tasks = await Task.find(filter).sort(sortOption);

    return tasks;
};
export const getTaskById = async (
    taskId: string,
    userId: string
) => {
    const task = await Task.findOne({
        _id: taskId,
        user: userId,
    });

    if (!task) {
        throw new ApiError(404, "Task not found");
    }
    return task;
};

export const updateTask = async (
    taskId: string,
    userId: string,
    updates: {
        title?: string;
        deadline?: Date;
        priority?: "low" | "medium" | "high";
        completed?: boolean;
    }
) => {
    const updateFilter: { _id: string; user: string; deadline?: Date } = {
        _id: taskId,
        user: userId,
    };
    let keepExistingExpiredDeadline = false;
    if (updates.deadline && updates.deadline.getTime() <= Date.now()) {
        const existing = await Task.findOne({ _id: taskId, user: userId });
        if (!existing) throw new ApiError(404, "Task not found");
        const isUnchangedDeadline = existing.deadline.getTime() === updates.deadline.getTime();
        if (!isUnchangedDeadline) {
            throw new ApiError(400, "Deadline must be later than the current time");
        }
        updateFilter.deadline = existing.deadline;
        keepExistingExpiredDeadline = true;
    }

    const finalUpdates: typeof updates & { completedAt?: Date | null } = { ...updates };
    if (keepExistingExpiredDeadline) delete finalUpdates.deadline;
    if (updates.completed === true) {
        finalUpdates.completedAt = new Date();
    } else if (updates.completed === false) {
        finalUpdates.completedAt = null;
    }

    const task = await Task.findOneAndUpdate(
        {
            ...updateFilter,
        },
        finalUpdates,
        {
            new: true,
            runValidators: true,
        }
    );
    if (!task) {
        if (updateFilter.deadline) throw new ApiError(409, "Task changed while the deadline was being updated");
        throw new ApiError(404, "Task not found");
    }
    return task;
};

export const deleteTask = async (
    taskId: string,
    userId: string
) => {
    const task = await Task.findOneAndDelete({
        _id: taskId,
        user: userId,
    });

    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    return task;
};
