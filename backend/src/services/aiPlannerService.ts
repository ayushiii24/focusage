import Task from "../models/taskModel.js";
import FocusSession from "../models/focusSessionModel.js";
import StudyPlan, { IStudyPlanItem } from "../models/studyPlanModel.js";
import ApiError from "../errors/apiError.js";

interface GeneratePlanOptions {
    userId: string;
    availableMinutes?: number;
    targetDate?: string; 
}

interface BreakdownSubTask {
    title: string;
    estimatedMinutes: number;
    priority: "low" | "medium" | "high";
}

interface PlanEnhancement {
    summary: string;
    aiRecommendation: string;
    items: Array<{ title: string; plannedMinutes: number; notes: string }>;
}

const GEMINI_MODEL = "gemini-3.8-flash";
const GEMINI_REQUEST_TIMEOUT_MS = 15_000;

export async function callGemini(
    prompt: string,
    systemInstruction: string,
    timeoutMs = GEMINI_REQUEST_TIMEOUT_MS
): Promise<string | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
            },
            signal: AbortSignal.timeout(timeoutMs),
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: systemInstruction }],
                },
                contents: [
                    {
                        role: "user",
                        parts: [{ text: prompt }],
                    },
                ],
                generationConfig: {
                    temperature: 0.3,
                    response_mime_type: "application/json",
                },
            }),
        });

        if (!response.ok) {
            console.warn(`Gemini API error ${response.status}; using deterministic fallback.`);
            return null;
        }

        const data = await response.json() as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return text || null;
    } catch (err) {
        console.warn("Gemini API invocation failed; using deterministic fallback:", err);
        return null;
    }
}

function parseJsonObject(text: string): Record<string, unknown> | null {
    try {
        const value: unknown = JSON.parse(text);
        return value !== null && typeof value === "object" && !Array.isArray(value)
            ? value as Record<string, unknown>
            : null;
    } catch {
        return null;
    }
}

export function parsePlanEnhancement(text: string, expectedItems: IStudyPlanItem[]): PlanEnhancement | null {
    const parsed = parseJsonObject(text);
    if (!parsed || typeof parsed.summary !== "string" || !parsed.summary.trim() || parsed.summary.length > 500 ||
        typeof parsed.aiRecommendation !== "string" || !parsed.aiRecommendation.trim() || parsed.aiRecommendation.length > 1000 ||
        !Array.isArray(parsed.items) || parsed.items.length !== expectedItems.length) {
        return null;
    }

    const aiItems: PlanEnhancement["items"] = [];
    for (let index = 0; index < parsed.items.length; index++) {
        const candidate: unknown = parsed.items[index];
        if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
        const item = candidate as Record<string, unknown>;
        const expected = expectedItems[index];
        if (typeof item.title !== "string" || item.title.trim() !== expected.title ||
            !Number.isInteger(item.plannedMinutes) || item.plannedMinutes !== expected.plannedMinutes ||
            typeof item.notes !== "string" || !item.notes.trim() || item.notes.length > 500) {
            return null;
        }
        aiItems.push({ title: item.title, plannedMinutes: item.plannedMinutes as number, notes: item.notes.trim() });
    }

    return {
        summary: parsed.summary.trim(),
        aiRecommendation: parsed.aiRecommendation.trim(),
        items: aiItems,
    };
}

export function applyPlanEnhancement(
    text: string | null,
    deterministicItems: IStudyPlanItem[],
    summary: string,
    aiRecommendation: string
) {
    const enhancement = text ? parsePlanEnhancement(text, deterministicItems) : null;
    if (!enhancement) return { items: deterministicItems, summary, aiRecommendation };

    return {
        summary: enhancement.summary,
        aiRecommendation: enhancement.aiRecommendation,
        items: deterministicItems.map((item, index) => ({ ...item, notes: enhancement.items[index].notes })),
    };
}

export function parseBreakdownResponse(text: string): BreakdownSubTask[] | null {
    const parsed = parseJsonObject(text);
    if (!parsed || !Array.isArray(parsed.subtasks) || parsed.subtasks.length < 3 || parsed.subtasks.length > 4) {
        return null;
    }

    const subtasks: BreakdownSubTask[] = [];
    for (const candidate of parsed.subtasks) {
        if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
        const item = candidate as Record<string, unknown>;
        if (typeof item.title !== "string" || !item.title.trim() || item.title.trim().length > 160 ||
            !Number.isInteger(item.estimatedMinutes) || (item.estimatedMinutes as number) < 15 || (item.estimatedMinutes as number) > 45 ||
            (item.priority !== "low" && item.priority !== "medium" && item.priority !== "high")) {
            return null;
        }
        subtasks.push({
            title: item.title.trim(),
            estimatedMinutes: item.estimatedMinutes as number,
            priority: item.priority,
        });
    }
    return subtasks;
}

export const generateDailyStudyPlan = async ({
    userId,
    availableMinutes = 120,
    targetDate = new Date().toISOString().slice(0, 10),
}: GeneratePlanOptions) => {
    //fetching users pending and completed tasks
    const tasks = await Task.find({ user: userId, completed: false }).sort({ deadline: 1 });

    if (tasks.length === 0) {
        throw new ApiError(400, "No pending tasks found. Please add tasks before generating a study plan.");
    }

    //fetch recent focus session history
    const recentSessions = await FocusSession.find({ user: userId, status: "completed", verified: true })
        .sort({ completedAt: -1 })
        .limit(20);

    const totalRecentMinutes = recentSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const avgSessionMinutes = recentSessions.length > 0 ? Math.round(totalRecentMinutes / recentSessions.length) : 25;

    //schedule calculation (always run first as bedrock)
    const now = new Date();
    const rankedTasks = tasks.map((t) => {
        const deadlineDate = new Date(t.deadline);
        const hoursUntilDeadline = Math.max(0.5, (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60));
        const priorityWeight = t.priority === "high" ? 3 : t.priority === "medium" ? 2 : 1;
        //urgency score: higher priority + closer deadline = higher score
        const urgencyScore = (100 / hoursUntilDeadline) * priorityWeight;
        return {
            task: t,
            urgencyScore,
            estimated: 30,
        };
    });

    rankedTasks.sort((a, b) => b.urgencyScore - a.urgencyScore);

    //distribute available mins across tasks in focus blocks (20-45 mins)
    let remainingMinutes = availableMinutes;
    let items: IStudyPlanItem[] = [];
    let orderIndex = 1;

    for (const item of rankedTasks) {
        if (remainingMinutes <= 0) break;
        const taskMinutes = Math.min(item.estimated, remainingMinutes);
        if (taskMinutes >= 10) {
            items.push({
                task: item.task._id,
                title: item.task.title,
                priority: item.task.priority as "low" | "medium" | "high",
                plannedMinutes: taskMinutes,
                actualMinutes: 0,
                order: orderIndex++,
                status: "pending",
                notes: `Target: Complete core objectives. Due by ${new Date(item.task.deadline).toLocaleDateString()}.`,
            });
            remainingMinutes -= taskMinutes;
        }
    }

    //fallback if tasks were all larger than available time
    if (items.length === 0 && rankedTasks.length > 0) {
        items.push({
            task: rankedTasks[0].task._id,
            title: rankedTasks[0].task.title,
            priority: rankedTasks[0].task.priority as "low" | "medium" | "high",
            plannedMinutes: availableMinutes,
            actualMinutes: 0,
            order: 1,
            status: "pending",
            notes: "Focused progress block.",
        });
    }

    let summary = `Personalized daily study plan allocating ${availableMinutes} minutes across ${items.length} focus sessions.`;
    let aiRecommendation = `Paced for steady progress. Average past focus session: ${avgSessionMinutes} minutes. Take 5-minute pauses between blocks.`;

    //augment with gemini if API key available
    const geminiPrompt = JSON.stringify({
        availableMinutes,
        tasks: rankedTasks.map((rt) => ({
            title: rt.task.title,
            priority: rt.task.priority,
            deadline: rt.task.deadline,
            estimatedMinutes: rt.estimated,
        })),
        pastFocusStats: {
            recentSessionCount: recentSessions.length,
            averageSessionMinutes: avgSessionMinutes,
        },
        plannedItems: items.map((item) => ({
            title: item.title,
            plannedMinutes: item.plannedMinutes,
        })),
    });

    const systemInstruction = `You are the Focusage Adaptive AI Study Planner.
Given the user's available time and ranked tasks, provide an optimized study plan in JSON format.
Return exactly one item for each entry in plannedItems, in the same order. Keep each title and plannedMinutes unchanged; add concise notes only.
Output schema:
{
  "summary": string,
  "aiRecommendation": string,
  "items": [
    {
      "title": string,
      "plannedMinutes": number,
      "notes": string
    }
  ]
}
Rules:
- Do not change task selection, order, or plannedMinutes; these are fixed by the deterministic scheduler.
- Keep item notes concise, tactical, and actionable.
- Be encouraging, realistic, and avoid overloading.`;

    const aiResponse = await callGemini(geminiPrompt, systemInstruction);
    ({ items, summary, aiRecommendation } = applyPlanEnhancement(
        aiResponse,
        items,
        summary,
        aiRecommendation
    ));

    //upsert the plan for targetdate
    const existingPlan = await StudyPlan.findOne({ user: userId, date: targetDate });
    if (existingPlan) {
        existingPlan.availableMinutes = availableMinutes;
        existingPlan.items = items as unknown as typeof existingPlan.items;
        existingPlan.summary = summary;
        existingPlan.aiRecommendation = aiRecommendation;
        await existingPlan.save();
        return existingPlan;
    }

    const newPlan = await StudyPlan.create({
        user: userId,
        date: targetDate,
        availableMinutes,
        items,
        summary,
        aiRecommendation,
    });

    return newPlan;
};

//adapt study plan when a session deviates (like studied 75m instead of planned 50m)
export const adaptStudyPlan = async (
    userId: string,
    planId: string,
    reason: string
) => {
    const plan = await StudyPlan.findOne({ _id: planId, user: userId });
    if (!plan) {
        throw new ApiError(404, "Study plan not found");
    }

    //calculate actual mins vs planned mins
    const totalPlanned = plan.items.reduce((s, it) => s + it.plannedMinutes, 0);
    const totalActual = plan.items.reduce((s, it) => s + (it.actualMinutes || 0), 0);
    const deviation = totalActual - totalPlanned;

    let adjustmentSummary = "";

    if (deviation > 15) {
        //user spent significantly more time: compress or postpone later pending items
        const pendingItems = plan.items.filter((it) => it.status === "pending");
        if (pendingItems.length > 1) {
            const lastItem = pendingItems[pendingItems.length - 1];
            lastItem.plannedMinutes = Math.max(15, lastItem.plannedMinutes - Math.min(deviation, 30));
            lastItem.notes = `${lastItem.notes} (Adjusted: reduced duration due to extra deep work on prior session).`;
            adjustmentSummary = `Compensated for ${deviation} extra focus minutes by lightening later study block: "${lastItem.title}".`;
        } else {
            adjustmentSummary = `You dedicated ${deviation} bonus minutes to deep focus. Remaining items retained with gentle pacing.`;
        }
    } else if (deviation < -15) {
        adjustmentSummary = `Prior session ended earlier than planned. Remaining items can proceed with full focus.`;
    } else {
        adjustmentSummary = `Pacing is on track with scheduled plan. Keep up the steady cadence!`;
    }

    //record adjustment in plan history
    plan.adaptationHistory.push({
        createdAt: new Date(),
        reason: reason || "Session time deviation detected",
        adjustmentSummary,
        accepted: true,
    });

    plan.aiRecommendation = `Updated recommendation: ${adjustmentSummary}`;
    await plan.save();

    return {
        plan,
        adjustmentSummary,
    };
};

//smart task breakdown
export const breakdownTaskWithAI = async (
    userId: string,
    taskId: string
): Promise<{ originalTaskTitle: string; subtasks: BreakdownSubTask[] }> => {
    const task = await Task.findOne({ _id: taskId, user: userId });
    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    //rule-based fallback breakdown
    const defaultSubtasks: BreakdownSubTask[] = [
        {
            title: `Review foundations & outline key concepts for ${task.title}`,
            estimatedMinutes: 25,
            priority: task.priority as "low" | "medium" | "high",
        },
        {
            title: `Deep-dive study & solve practice problems for ${task.title}`,
            estimatedMinutes: 45,
            priority: task.priority as "low" | "medium" | "high",
        },
        {
            title: `Self-test & consolidate summary notes for ${task.title}`,
            estimatedMinutes: 25,
            priority: "medium",
        },
    ];

    const systemInstruction = `You are a learning science expert assistant on Focusage.
Given a task title, break it down into 3 to 4 sequential, highly actionable sub-tasks.
Output JSON format:
{
  "subtasks": [
    {
      "title": string,
      "estimatedMinutes": number,
      "priority": "low" | "medium" | "high"
    }
  ]
}
Rules:
- Each subtask must be specific, concrete and manageable in 15-45 minutes.
- Total estimatedMinutes should be reasonable.
- Use clear action verbs.`;

    const aiResponse = await callGemini(
        `Task to break down: "${task.title}". Priority: ${task.priority}. Deadline: ${task.deadline}.`,
        systemInstruction
    );
    const validatedSubtasks = aiResponse ? parseBreakdownResponse(aiResponse) : null;
    if (validatedSubtasks) {
        return {
            originalTaskTitle: task.title,
            subtasks: validatedSubtasks,
        };
    }

    return {
        originalTaskTitle: task.title,
        subtasks: defaultSubtasks,
    };
};

//compute honest productivity insights from real data
export const computeProductivityInsights = async (userId: string) => {
    const sessions = await FocusSession.find({ user: userId, status: "completed", verified: true }).sort({ completedAt: -1 });
    const tasks = await Task.find({ user: userId });

    const totalMinutes = sessions.reduce((s, it) => s + it.durationMinutes, 0);
    const totalSessions = sessions.length;
    const completedTasks = tasks.filter((t) => t.completed).length;

    //time-of-day distribution
    const hourBuckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    sessions.forEach((s) => {
        if (!s.completedAt) return;
        const hour = new Date(s.completedAt).getHours();
        if (hour >= 5 && hour < 12) hourBuckets.morning += s.durationMinutes;
        else if (hour >= 12 && hour < 17) hourBuckets.afternoon += s.durationMinutes;
        else if (hour >= 17 && hour < 22) hourBuckets.evening += s.durationMinutes;
        else hourBuckets.night += s.durationMinutes;
    });

    const entries = Object.entries(hourBuckets);
    entries.sort((a, b) => b[1] - a[1]);
    const topPeriod = entries[0][1] > 0 ? entries[0][0] : null;

    const insights: Array<{ title: string; observation: string; type: "positive" | "neutral" | "tip" }> = [];

    if (totalSessions >= 3 && topPeriod) {
        insights.push({
            title: "Peak Focus Window",
            observation: `Your highest focus concentration occurs during the ${topPeriod} (${entries[0][1]} minutes recorded). Schedule your most challenging cognitive tasks in this window.`,
            type: "positive",
        });
    }

    if (totalSessions > 0) {
        const avg = Math.round(totalMinutes / totalSessions);
        insights.push({
            title: "Average Focus Session",
            observation: `You average ${avg} minutes per completed focus session. This aligns smoothly with the Pomodoro cadence.`,
            type: "neutral",
        });
    }

    if (tasks.length > 0) {
        const completionRate = Math.round((completedTasks / tasks.length) * 100);
        insights.push({
            title: "Task Completion Ratio",
            observation: `You have completed ${completedTasks} of ${tasks.length} tasks (${completionRate}% completion rate).`,
            type: completionRate >= 50 ? "positive" : "tip",
        });
    }

    if (insights.length === 0) {
        insights.push({
            title: "Building Your Baseline",
            observation: "Complete a few more focus sessions to unlock personalized focus window and study pacing insights.",
            type: "neutral",
        });
    }

    return {
        totalMinutes,
        totalSessions,
        completedTasks,
        totalTasks: tasks.length,
        peakWindow: topPeriod || "Not enough data yet",
        insights,
    };
};
