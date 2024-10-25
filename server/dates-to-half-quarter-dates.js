function roundToNearestHalfQuarter(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // getMonth() is zero-based

    // Define the half-quarter dates (as [month, day] pairs)
    const halfQuarters = [
        [1, 1], [2, 15],  // Q1
        [4, 1], [5, 15],  // Q2
        [7, 1], [8, 15],  // Q3
        [10, 1], [11, 15] // Q4
    ];

    // Convert date to time and find the closest half-quarter
    const targetTime = date.getTime();
    let nearestDate = null;
    let minDifference = Infinity;

    for (const [month, day] of halfQuarters) {
        const candidate = new Date(year, month - 1, day);
        const diff = Math.abs(candidate.getTime() - targetTime);

        if (diff < minDifference) {
            minDifference = diff;
            nearestDate = candidate;
        }
    }

    return nearestDate;
}

// Middleware to handle startDate and dueDate
module.exports = function dateRoundingMiddleware(req, res, next) {
    try {
        const { startDate, dueDate } = req.body;

        let roundedStart = null;
        let roundedDue = null;

        // If startDate is provided and valid, round it
        if (startDate) {
            const start = new Date(startDate);
            if (isNaN(start)) {
                return res.status(400).json({ error: 'Invalid startDate format. Use "YYYY-MM-DD".' });
            }
            roundedStart = roundToNearestHalfQuarter(start);
        }

        // If dueDate is provided and valid, round it
        if (dueDate) {
            const due = new Date(dueDate);
            if (isNaN(due)) {
                return res.status(400).json({ error: 'Invalid dueDate format. Use "YYYY-MM-DD".' });
            }
            roundedDue = roundToNearestHalfQuarter(due);
        }

        // Ensure that dueDate is at least the next half-quarter if both round to the same one
        if (roundedStart && roundedDue && roundedStart.getTime() === roundedDue.getTime()) {
            const halfQuarters = [
                [1, 1], [2, 15],
                [4, 1], [5, 15],
                [7, 1], [8, 15],
                [10, 1], [11, 15]
            ];

            const nextHalfQuarterIndex = (halfQuarters.findIndex(
                ([m, d]) => m === roundedDue.getMonth() + 1 && d === roundedDue.getDate()
            ) + 1) % halfQuarters.length;

            const [nextMonth, nextDay] = halfQuarters[nextHalfQuarterIndex];
            roundedDue = new Date(roundedDue.getFullYear(), nextMonth - 1, nextDay);
        }

        // Attach the rounded dates to the request body

        return res.json({
            roundedStart: roundedStart ? roundedStart.toISOString().split('T')[0] : null,
            roundedDue: roundedDue ? roundedDue.toISOString().split('T')[0] : null
        });

    } catch (error) {
        next(error);
    }
}
