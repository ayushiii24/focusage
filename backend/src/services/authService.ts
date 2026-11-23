import bcrypt from "bcrypt";
import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import ApiError from "../errors/apiError.js";
import mongoose from "mongoose";

function makeGeneratedUsername(name: string, id: mongoose.Types.ObjectId): string {
    const base = name.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 7) || "student";
    return `${base}_${id.toString().slice(-12)}`;
}

export const registerUser = async (name: string, email: string, password: string, requestedUsername?: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();
    const username = requestedUsername?.trim().toLowerCase();
    const userId = new mongoose.Types.ObjectId();
    const finalUsername = username || makeGeneratedUsername(normalizedName, userId);

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        throw new ApiError(400, "Password must be at least 8 characters and include a letter and a number");
    }
    if (requestedUsername !== undefined && !/^[a-z0-9_]{3,20}$/.test(finalUsername)) {
        throw new ApiError(400, "Username must be 3–20 letters, numbers, or underscores");
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
        throw new ApiError(409, "User already exists");
    }

    const existingUsername = await User.findOne({ username: finalUsername })
        .collation({ locale: "en", strength: 2 });
    if (existingUsername) {
        throw new ApiError(409, "Username is already taken");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let user;
    try {
        user = await User.create({
            _id: userId,
            name: normalizedName,
            email: normalizedEmail,
            username: finalUsername,
            passwordHash,
        });
    } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
            const duplicate = error as { keyPattern?: Record<string, unknown> };
            if (duplicate.keyPattern?.username) throw new ApiError(409, "Username is already taken");
            if (duplicate.keyPattern?.email) throw new ApiError(409, "User already exists");
        }
        throw error;
    }

    return {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
    };
};

export const loginUser = async ( email: string, password: string) => {
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
        throw new ApiError(401, "Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare( password, user.passwordHash );

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid email or password");
    }

    const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
    );

    return {
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            username: user.username,
        },
    };
};
