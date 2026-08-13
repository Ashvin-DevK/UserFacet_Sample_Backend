import "dotenv/config";

import app from "./app.js";
import connectDB from "./config/db.js";
import {
    startReservationJob
} from "../jobs/reservation.job.js";

import {
    startOverdueJob
} from "../jobs/overdue.job.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();
startReservationJob();
startOverdueJob();
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();