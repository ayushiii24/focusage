import express from "express";
import authRoutes from "./routes/authRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import focusSessionRoutes from "./routes/focusSessionRoutes.js";
import studyPlanRoutes from "./routes/studyPlanRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";
import cors from "cors";


const app = express();

//allowed frontend origins: comma-separated CLIENT_ORIGIN, defaults to the local Vite dev server
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/focus-sessions", focusSessionRoutes);
app.use("/api/study-plans", studyPlanRoutes);
app.use("/api/friends", friendRoutes);
app.use(errorHandler);

export default app;