import Task from "../models/taskModel.js";
import ApiError from "../errors/apiError.js";
import mongoose from "mongoose";

export const createTask = async (
    userId: string,
    title: string,
    deadline: Date,
    priority: "low" | "medium" | "high"  //ts union types
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
    // Only return tasks belonging to the authenticated user.
    const filter: {
        user: string;
        completed?: boolean;
        priority?: "low" | "medium" | "high";
    } = {
        user: userId,
    };

    // Filter by completion status when requested.
    if (status === "completed") {
        filter.completed = true;
    }

    if (status === "pending") {
        filter.completed = false;
    }

    // Filter by priority when requested.
    if (priority) {
        filter.priority = priority;
    }

    // Default: earliest deadline first.
    let sortOption: Record<string, 1 | -1> = {
        deadline: 1,
    };

    // Optional: newest tasks first.
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
    const task = await Task.findOneAndUpdate(
        {
            _id: taskId,
            user: userId,
        },
        updates,
        {
            new: true,
            runValidators: true,
        }
    );
    if (!task) {
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