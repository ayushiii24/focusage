import { Request, Response } from "express";
import ApiError from "../errors/apiError.js";
import { registerUser, loginUser } from "../services/authService.js";
import User from "../models/userModel.js";

export const register = async (req: Request, res: Response) => {
    const { name, email, password, username } = req.body;

    if (typeof name !== "string" || !name.trim()) {
        throw new ApiError(400, "Name is required");
    }
    if (typeof email !== "string" || !email.trim()) {
        throw new ApiError(400, "Email is required");
    }
    if (typeof password !== "string" || !password) {
        throw new ApiError(400, "Password is required");
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        throw new ApiError(400, "Password must be at least 8 characters and include a letter and a number");
    }
    if (username !== undefined && (typeof username !== "string" || !/^[a-zA-Z0-9_]{3,20}$/.test(username.trim()))) {
        throw new ApiError(400, "Username must be 3–20 letters, numbers, or underscores");
    }

    const user = await registerUser(name, email, password, username);

    res.status(201).json({
        message: "User registered successfully",
        user,
    });
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const result = await loginUser(email, password);

    res.status(200).json(result);
};

export const getMe = async (req: Request, res: Response) => {
    const user = await User.findById(req.user?.userId).select("-passwordHash");

    if (!user) {
        return res.status(404).json({
            message: "User not found",
        });
    }

    res.status(200).json({user,});
};
