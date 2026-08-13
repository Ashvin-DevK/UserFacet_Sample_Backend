import {
    getAdminAnalytics
} from "../services/admin-analytics.service.js";

export const getAnalytics = async (
    req,
    res,
    next
) => {
    try {
        const analytics =
            await getAdminAnalytics();

        res.status(200).json({
            success: true,
            data: analytics
        });
    } catch (error) {
        next(error);
    }
};