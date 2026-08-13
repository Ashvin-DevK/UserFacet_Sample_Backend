import User from "../models/user.model.js";
import Book from "../models/book.model.js";
import Borrow from "../models/borrow.model.js";
import Reservation from "../models/reservation.model.js";

export const getAdminAnalytics = async () => {
    const [
        totalUsers,
        activeUsers,
        totalBooks,
        activeBooks,
        totalBorrows,
        activeBorrows,
        overdueBorrows,
        returnedBorrows,
        totalReservations,
        waitingReservations,
        readyReservations,
        totalFineResult
    ] = await Promise.all([
        User.countDocuments(),

        User.countDocuments({
            isActive: true
        }),

        Book.countDocuments(),

        Book.countDocuments({
            isActive: true
        }),

        Borrow.countDocuments(),

        Borrow.countDocuments({
            status: {
                $in: ["borrowed", "overdue"]
            }
        }),

        Borrow.countDocuments({
            status: "overdue"
        }),

        Borrow.countDocuments({
            status: "returned"
        }),

        Reservation.countDocuments(),

        Reservation.countDocuments({
            status: "waiting"
        }),

        Reservation.countDocuments({
            status: "ready"
        }),

        Borrow.aggregate([
            {
                $group: {
                    _id: null,
                    total: {
                        $sum: "$fine"
                    }
                }
            }
        ])
    ]);

    return {
        users: {
            total: totalUsers,
            active: activeUsers
        },

        books: {
            total: totalBooks,
            active: activeBooks
        },

        borrowing: {
            total: totalBorrows,
            active: activeBorrows,
            overdue: overdueBorrows,
            returned: returnedBorrows
        },

        reservations: {
            total: totalReservations,
            waiting: waitingReservations,
            ready: readyReservations
        },

        fines: {
            total: totalFineResult[0]?.total || 0
        }
    };
};