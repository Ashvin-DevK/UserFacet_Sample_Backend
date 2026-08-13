import {
    createReservation,
    getMyReservations,
    cancelReservation
} from "../services/reservation.service.js";

export const reserve = async (
    req,
    res,
    next
) => {
    try {
        const reservation =
            await createReservation(
                req.user.id,
                req.params.bookId
            );

        res.status(201).json({
            success: true,
            message: "Book reserved successfully",
            data: reservation
        });
    } catch (error) {
        next(error);
    }
};

export const getMine = async (
    req,
    res,
    next
) => {
    try {
        const reservations =
            await getMyReservations(
                req.user.id
            );

        res.status(200).json({
            success: true,
            data: reservations
        });
    } catch (error) {
        next(error);
    }
};

export const cancel = async (
    req,
    res,
    next
) => {
    try {
        const reservation =
            await cancelReservation(
                req.user.id,
                req.params.reservationId
            );

        res.status(200).json({
            success: true,
            message: "Reservation cancelled",
            data: reservation
        });
    } catch (error) {
        next(error);
    }
};