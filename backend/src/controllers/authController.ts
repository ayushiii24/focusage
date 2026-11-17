import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/authService.js";
import User from "../models/userModel.js";

export const register = async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    const user = await registerUser(name, email, password);

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