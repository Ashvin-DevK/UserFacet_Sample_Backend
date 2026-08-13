import cron from "node-cron";
import {
    expireReservations
} from "../src/services/reservation.service.js";

export const startReservationJob = () => {
    cron.schedule("*/5 * * * *", async () => {
        try {
            const expiredCount =
                await expireReservations();

            if (expiredCount > 0) {
                console.log(
                    `Expired ${expiredCount} reservation(s)`
                );
            }
        } catch (error) {
            console.error(
                "Reservation expiration job failed:",
                error
            );
        }
    });

    console.log(
        "Reservation expiration job started"
    );
};