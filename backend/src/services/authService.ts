import bcrypt from "bcrypt";
import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import ApiError from "../errors/apiError.js";

export const registerUser = async (name: string, email: string, password: string ) => {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw new ApiError(409, "User already exists");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, passwordHash});

    return {
        id: user._id,
        name: user.name,
        email: user.email,
    };
};

export const loginUser = async ( email: string, password: string) => {
    const user = await User.findOne({ email });

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
        },
    };
};