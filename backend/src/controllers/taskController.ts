import { Request, Response } from "express";
import ApiError from "../errors/apiError.js";
import { createTask, getTasks, getTaskById, updateTask, deleteTask } from "../services/taskService.js";


export const create = async (req: Request, res: Response) => {
    const { title, deadline, priority } = req.body;
    if (!title || typeof title !== "string") {
        throw new ApiError(400, "Title is required");
    }

    if (!deadline || isNaN(new Date(deadline).getTime())) { //new Date(deadline) turns incoming value into js date
        //.getTime() gives a timestamp
        throw new ApiError(400, "Valid deadline is required");
    }

    if (!["low", "medium", "high"].includes(priority)) {
        throw new ApiError(400, "Invalid priority");
    }

    const task = await createTask(req.user!.userId, title, new Date(deadline), priority);

    res.status(201).json({
        message: "Task created successfully",
        task,
    });
};

export const getAll = async (req: Request, res: Response) => {
    const { status, priority, sort } = req.query;
    //only these values are allowed
    if (
        status !== undefined &&
        status !== "pending" &&
        status !== "completed"
    ) {
        throw new ApiError(400, "Invalid status");
    }

    if (
        priority !== undefined &&
        priority !== "low" &&
        priority !== "medium" &&
        priority !== "high"
    ) {
        throw new ApiError(400, "Invalid priority");
    }

    //only these sorting options
    if (sort !== undefined && sort !== "created") {
        throw new ApiError(400, "Invalid sort option");
    }

    const tasks = await getTasks(
        req.user!.userId,
        status as string | undefined,
        priority as "low" | "medium" | "high" | undefined,
        sort as string | undefined
    );

    res.status(200).json({
        tasks,
    });
};

export const getOne = async (req: Request<{ id: string }>, res: Response) => {
    const task = await getTaskById(
        req.params.id,
        req.user!.userId
    );

    res.status(200).json({
        task,
    });
};

export const update = async (req: Request<{ id: string }>, res: Response) => {
    const { title, deadline, priority, completed } = req.body;

    if (title !== undefined && typeof title !== "string") {
        throw new ApiError(400, "Title must be a string");
    }

    if (deadline !== undefined && isNaN(new Date(deadline).getTime())) {
        throw new ApiError(400, "Invalid deadline");
    }

    if (priority !== undefined && !["low", "medium", "high"].includes(priority)) {
        throw new ApiError(400, "Invalid priority");
    }

    if (completed !== undefined && typeof completed !== "boolean") {
        throw new ApiError(400, "Completed must be a boolean");
    }

    const task = await updateTask(
        req.params.id,
        req.user!.userId,
        {
            title,
            deadline: deadline !== undefined ? new Date(deadline) : undefined,
            priority,
            completed,
        }
    );

    res.status(200).json({
        message: "Task updated successfully",
        task,
    });
};

export const remove = async (
    req: Request<{ id: string }>,
    res: Response
) => {
    const task = await deleteTask(
        req.params.id,
        req.user!.userId
    );

    res.status(200).json({
        message: "Task deleted successfully",
        task,
    });
};