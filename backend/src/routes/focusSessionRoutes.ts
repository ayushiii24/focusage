import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
    create,
    getAll,
} from "../controllers/focusSessionController.js";

const router = Router();

// Record a completed focus session.
router.post("/", authMiddleware, create);

// Get the authenticated user's focus sessions.
router.get("/", authMiddleware, getAll);

export default router;