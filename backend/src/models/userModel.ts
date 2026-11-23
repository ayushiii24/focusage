import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        username: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            minlength: 3,
            maxlength: 20,
            match: /^[a-z0-9_]+$/,
        },

        // Set only when a legacy username needs a safe unique replacement.
        legacyUsername: {
            type: String,
            select: false,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        passwordHash: {
            type: String,
            required: true,
        },

        activityStatus: {
            type: String,
            enum: ["Focusing", "On Break", "Offline"],
            default: "Offline",
        },

        lastActiveAt: {
            type: Date,
            default: Date.now,
        },
        shareTasks: {
            type: Boolean,
            default: false,
        },
        sharedTaskIds: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
            default: [],
        },
    },
    {
        timestamps: true,
        autoIndex: false,
    }
);

userSchema.index(
    { username: 1 },
    {
        unique: true,
        collation: { locale: "en", strength: 2 },
        partialFilterExpression: { username: { $type: "string" } },
    }
);

const User = mongoose.model("User", userSchema);

export default User;
