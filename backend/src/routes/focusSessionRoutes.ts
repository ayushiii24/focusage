import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
    start,
    pause,
    abandon,
    resume,
    complete,
    getAll,
} from "../controllers/focusSessionController.js";

const router = Router();

router.post("/start", authMiddleware, start);
router.post("/pause", authMiddleware, pause);
router.post("/abandon", authMiddleware, abandon);
router.post("/resume", authMiddleware, resume);
router.post("/complete", authMiddleware, complete);

//get the authenticated users focus sessions
router.get("/", authMiddleware, getAll);

export default router;
