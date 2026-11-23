import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";
import { migrateUsernames } from "./services/usernameMigration.js";

const PORT = Number(process.env.PORT) || 8000;

const startServer = async () => {
    await connectDB();
    await migrateUsernames();

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();
