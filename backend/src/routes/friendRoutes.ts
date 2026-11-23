import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
    search,
    requestFriend,
    respond,
    remove,
    getOverview,
    getLeaderboard,
    getSharedTasks,
    updateStatus,
    getMyDailyStats,
    getSharingSettings,
    updateSharingSettings,
} from "../controllers/friendController.js";

const router = Router();

//all friend routes are protected
router.get("/", authMiddleware, getOverview);
router.get("/search", authMiddleware, search);
router.post("/request", authMiddleware, requestFriend);
router.post("/respond/:id", authMiddleware, respond);
router.delete("/:id", authMiddleware, remove);
router.get("/leaderboard", authMiddleware, getLeaderboard);
router.get("/sharing", authMiddleware, getSharingSettings);
router.patch("/sharing", authMiddleware, updateSharingSettings);
router.get("/:friendId/tasks", authMiddleware, getSharedTasks);
router.post("/activity-status", authMiddleware, updateStatus);
router.get("/my-daily-stats", authMiddleware, getMyDailyStats);

export default router;
