import cron from "node-cron";
import Borrow from "../src/models/borrow.model.js";

const FINE_PER_DAY = 10;

const calculateFine = (
    dueAt,
    date = new Date()
) => {

    const overdueMilliseconds =
        date.getTime() -
        dueAt.getTime();

    if (overdueMilliseconds <= 0) {
        return 0;
    }

    const overdueDays = Math.ceil(
        overdueMilliseconds /
        (1000 * 60 * 60 * 24)
    );

    return overdueDays * FINE_PER_DAY;
};


export const startOverdueJob = () => {

    cron.schedule(
        "0 * * * *",
        async () => {

            try {

                const now =
                    new Date();

                const overdueBorrows =
                    await Borrow.find({
                        status: "borrowed",
                        dueAt: {
                            $lt: now
                        }
                    });


                for (
                    const borrow
                    of overdueBorrows
                ) {

                    borrow.status =
                        "overdue";

                    borrow.fine =
                        calculateFine(
                            borrow.dueAt,
                            now
                        );

                    borrow.fineCalculatedAt =
                        now;

                    await borrow.save();
                }


                if (
                    overdueBorrows.length > 0
                ) {

                    console.log(
                        `Marked ${overdueBorrows.length} borrowing(s) as overdue`
                    );
                }

            } catch (error) {

                console.error(
                    "Overdue job failed:",
                    error
                );
            }
        }
    );


    console.log(
        "Overdue management job started"
    );
};