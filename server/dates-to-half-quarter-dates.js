const HALF_QUARTERS = [
    [1, 1],  // Jan 1
    [2, 15], // Feb 15
    [4, 1],  // Apr 1
    [5, 15], // May 15
    [7, 1],  // Jul 1
    [8, 15], // Aug 15
    [10, 1], // Oct 1
    [11, 15] // Nov 15
];

/**
 * Rounds a date to the nearest start of a half-quarter.
 * @param {Date} date - The input date to round.
 * @returns {Date} - The nearest half-quarter start date.
 */
function roundToStartOfHalfQuarter(date) {
    const year = date.getFullYear();
    let nearestDate = null;
    let minDifference = Infinity;

    for (const [month, day] of HALF_QUARTERS) {
        const candidate = new Date(year, month - 1, day); // Months are 0-based

        // If the date is in December but the next half-quarter is in January, look ahead to the next year
        if (month === 1 && date.getMonth() === 11) {
            candidate.setFullYear(year + 1); // Move Jan 1 to next year if the date is in December
        }

        const diff = Math.abs(candidate - date);

        if (diff < minDifference) {
            minDifference = diff;
            nearestDate = candidate;
        }
    }

    return nearestDate;
}

/**
 * Rounds a date to the nearest end of a half-quarter.
 * The end of a half-quarter is the day before the next half-quarter starts.
 * @param {Date} date - The input date to round.
 * @returns {Date} - The nearest half-quarter end date.
 */
function roundToEndOfHalfQuarter(date) {
    const year = date.getFullYear();
    let nearestEndDate = null;
    let minDifference = Infinity;

    for (let i = 0; i < HALF_QUARTERS.length; i++) {
        const [month, day] = HALF_QUARTERS[i];
        const nextHalfQuarterStart = new Date(year, month - 1, day); // Start of the next half-quarter

        // Ensure the next start boundary considers year overflow (e.g., Dec -> Jan next year)
        if (month === 1 && date.getMonth() === 11) {
            nextHalfQuarterStart.setFullYear(year + 1);
        }

        // End of the current half-quarter is one day before the next start
        const candidateEnd = new Date(nextHalfQuarterStart.getTime() - 24 * 60 * 60 * 1000); // Subtract 1 day

        // Only consider this candidate if it is after or equal to the input date
        if (candidateEnd >= date) {
            const diff = Math.abs(candidateEnd - date);

            if (diff < minDifference) {
                minDifference = diff;
                nearestEndDate = candidateEnd;
            }
        }
    }

    return nearestEndDate;
}

/**
 * Ensures the rounded dueDate is valid.
 * If the rounded dueDate is before the rounded startDate, adjust it to the end of the startDate's half-quarter.
 * @param {Date} roundedStartDate - The rounded start date.
 * @param {Date} roundedDueDate - The rounded due date.
 * @returns {Date} - A valid due date.
 */
function ensureValidDueDate(roundedStartDate, roundedDueDate) {
    if (roundedDueDate < roundedStartDate) {
        // If dueDate is before startDate, set it to the end of the startDate's half-quarter
        return roundToEndOfHalfQuarter(roundedStartDate);
    }
    return roundedDueDate;
}

/**
 * Validates if a given value is a valid, parseable date.
 * @param {string} dateStr - The date string to validate.
 * @returns {boolean} - True if valid date, false otherwise.
 */
function isValidDate(dateStr) {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}

// Middleware to handle startDate and dueDate
module.exports = function dateRoundingMiddleware(req, res, next) {
    try {
        const { startDate, dueDate } = req.body;

        // Validate startDate and dueDate
        if (startDate && !isValidDate(startDate)) {
            return res.status(400).json({ error: 'Invalid startDate format. Use "YYYY-MM-DD".' });
        }
        if (dueDate && !isValidDate(dueDate)) {
            return res.status(400).json({ error: 'Invalid dueDate format. Use "YYYY-MM-DD".' });
        }

        const roundedStartDate = startDate ? roundToStartOfHalfQuarter(new Date(startDate)) : null;
        let roundedDueDate = dueDate ? roundToEndOfHalfQuarter(new Date(dueDate)) : null;

        // Ensure dueDate is valid if both startDate and dueDate are provided
        if (roundedStartDate && roundedDueDate) {
            roundedDueDate = ensureValidDueDate(roundedStartDate, roundedDueDate);
        }

        return res.json({
            roundedStartDate: roundedStartDate ? roundedStartDate.toISOString().split('T')[0] : null,
            roundedDueDate: roundedDueDate ? roundedDueDate.toISOString().split('T')[0] : null
        });

    } catch (error) {
        next(error);
    }
}
