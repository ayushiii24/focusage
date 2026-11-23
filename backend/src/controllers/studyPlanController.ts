import { Request, Response } from "express";
import ApiError from "../errors/apiError.js";
import StudyPlan from "../models/studyPlanModel.js";
import Task from "../models/taskModel.js";
import {
    generateDailyStudyPlan,
    adaptStudyPlan,
    breakdownTaskWithAI,
    computeProductivityInsights,
} from "../services/aiPlannerService.js";

//generate or regenerate daily plan
export const generatePlan = async (req: Request, res: Response) => {
    const { availableMinutes, targetDate } = req.body;
    if (
        availableMinutes !== undefined &&
        (!Number.isInteger(availableMinutes) || availableMinutes < 15 || availableMinutes > 960)
    ) {
        throw new ApiError(400, "availableMinutes must be an integer from 15 to 960");
    }

    const plan = await generateDailyStudyPlan({
        userId: req.user!.userId,
        availableMinutes: availableMinutes ?? 120,
        targetDate: typeof targetDate === "string" ? targetDate : new Date().toISOString().slice(0, 10),
    });

    res.status(200).json({
        message: "Study plan generated successfully",
        plan,
    });
};

//get todays plan
export const getTodayPlan = async (req: Request, res: Response) => {
    const today = new Date().toISOString().slice(0, 10);
    const plan = await StudyPlan.findOne({
        user: req.user!.userId,
        date: today,
    }).populate("items.task");

    res.status(200).json({
        plan: plan || null,
    });
};

//adapt plan based on actual progress
export const adaptPlan = async (req: Request<{ id: string }>, res: Response) => {
    const { reason } = req.body;

    const result = await adaptStudyPlan(
        req.user!.userId,
        req.params.id,
        typeof reason === "string" ? reason : "Session deviation"
    );

    res.status(200).json({
        message: "Study plan adapted successfully",
        ...result,
    });
};

//update an individual plan item (status, actual minutes....)
export const updatePlanItem = async (
    req: Request<{ id: string; itemId: string }>,
    res: Response
) => {
    const { status, actualMinutes } = req.body;

    const plan = await StudyPlan.findOne({
        _id: req.params.id,
        user: req.user!.userId,
    });

    if (!plan) {
        throw new ApiError(404, "Study plan not found");
    }

    const item = plan.items.find((it) => it._id && it._id.toString() === req.params.itemId);
    if (!item) {
        throw new ApiError(404, "Plan item not found");
    }

    if (status && ["pending", "in_progress", "completed", "skipped"].includes(status)) {
        item.status = status;
        //if item completed, also update referenced task if present
        if (status === "completed" && item.task) {
            await Task.findOneAndUpdate(
                { _id: item.task, user: req.user!.userId },
                { completed: true, completedAt: new Date() }
            );
        }
    }

    if (typeof actualMinutes === "number" && actualMinutes >= 0) {
        item.actualMinutes = actualMinutes;
    }

    await plan.save();

    res.status(200).json({
        message: "Plan item updated",
        plan,
    });
};

//get productivity insights
export const getInsights = async (req: Request, res: Response) => {
    const insights = await computeProductivityInsights(req.user!.userId);
    res.status(200).json(insights);
};

//smart task breakdown
export const breakdownTask = async (req: Request, res: Response) => {
    const { taskId, importAsTasks } = req.body;

    if (!taskId) {
        throw new ApiError(400, "taskId is required");
    }

    const breakdown = await breakdownTaskWithAI(req.user!.userId, taskId);

    //if user confirms to add subtasks directly to their task list
    if (importAsTasks === true) {
        const task = await Task.findOne({ _id: taskId, user: req.user!.userId });
        const defaultDeadline = task?.deadline || new Date(Date.now() + 24 * 60 * 60 * 1000);
        if (defaultDeadline.getTime() <= Date.now()) {
            throw new ApiError(400, "Deadline must be later than the current time");
        }

        const createdTasks = await Promise.all(
            breakdown.subtasks.map((st) =>
                Task.create({
                    user: req.user!.userId,
                    title: st.title,
                    deadline: defaultDeadline,
                    priority: st.priority,
                })
            )
        );

        return res.status(201).json({
            message: "Sub-tasks added to task list",
            breakdown,
            createdTasks,
        });
    }

    res.status(200).json({
        breakdown,
    });
};
