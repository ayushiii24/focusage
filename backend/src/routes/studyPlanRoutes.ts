import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
    generatePlan,
    getTodayPlan,
    adaptPlan,
    updatePlanItem,
    getInsights,
    breakdownTask,
} from "../controllers/studyPlanController.js";

const router = Router();

//all study plan routes are protected
router.post("/generate", authMiddleware, generatePlan);
router.get("/today", authMiddleware, getTodayPlan);
router.post("/:id/adapt", authMiddleware, adaptPlan);
router.patch("/:id/item/:itemId", authMiddleware, updatePlanItem);
router.get("/insights", authMiddleware, getInsights);
router.post("/breakdown", authMiddleware, breakdownTask);

export default router;
