import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { create, getAll,getOne,update,remove } from "../controllers/taskController.js";
const router = Router();

router.post("/", authMiddleware, create);
router.get("/", authMiddleware, getAll);
router.get("/:id", authMiddleware, getOne);
router.patch("/:id", authMiddleware, update);
router.delete("/:id", authMiddleware, remove);

export default router;