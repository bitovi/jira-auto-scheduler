const HOUR_IN_MS = 1000 * 60 * 60;
const DAY_IN_MS = 1000 * 60 * 60 * 24;

function getQuarter(date) {
    const month = date.getMonth();
    return Math.floor(month / 3) + 1;
}

function getYear(date) {
    return date.getFullYear();
}

export function getStartOfThisQuarter(date) {
    const quarter = getQuarter(date);
    const year = getYear(date);
    return new Date(year, (quarter - 1) * 3, 1);
}

export function getEndOfThisQuarter(date) {
    const quarter = getQuarter(date);
    const year = getYear(date);
    return new Date(year, quarter * 3, 0);
}

export function getStartOfNextQuarter(date) {
    const quarter = getQuarter(date);
    const year = getYear(date);
    if (quarter === 4) {
        return new Date(year + 1, 0, 1);
    } else {
        return new Date(year, quarter * 3, 1);
    }
}

export function getEndOfNextQuarter(date) {
    const quarter = getQuarter(date);
    const year = getYear(date);
    if (quarter === 4) {
        return new Date(year + 1, 3, 31);
    } else {
        return new Date(year, quarter * 3 + 2, 31);
    }
}


export function getBusinessDatesCount(startDate, endDate) {
    let count = 0;
    const curDate = new Date(startDate.getTime());
    while (curDate <= endDate) {
        const dayOfWeek = curDate.getDay();
        if(dayOfWeek !== 0 && dayOfWeek !== 6) count++;
        curDate.setDate(curDate.getDate() + 1);
    }
    return count;
}

function roundToNearestUTCDate(date) {
    // Extract the UTC date parts
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const hours = date.getUTCHours();
    
    // Create a date representing the start of the UTC day
    let roundedDate = new Date(Date.UTC(year, month, day));
    
    // If the time is 12:00 UTC or later, add one day
    if (hours >= 12) {
      roundedDate.setUTCDate(roundedDate.getUTCDate() + 1);
    }
    
    return roundedDate;
  }

// getEndDateFromStartDateAndBusinessDays( parseDateISOString("2022-01-01"), 2 ) //-> Jan 5

export function getEndDateFromStartDateAndBusinessDays(startDate, businessDays){
	const curDate = new Date(startDate.getTime());
	const startDay = curDate.getDay();

	// move to Monday ...
	if(startDay === 0 ) { // sunday
		curDate.setDate(curDate.getDate() + 1 );
	} else if(startDay === 6) { // saturday
		curDate.setDate(curDate.getDate() + 2 );
	}

	const weeksToMoveForward = Math.floor(businessDays / 5);
	const remainingDays =  businessDays % 5;

	curDate.setDate(curDate.getDate() + weeksToMoveForward*7 + remainingDays );

	const endDay = curDate.getDay();

	// move to Monday ...
	if(endDay === 0 ) { // sunday
		curDate.setDate(curDate.getDate() + 1 );
	} else if(endDay === 6) { // saturday
		curDate.setDate(curDate.getDate() + 2 );
	}

	return curDate;
}

export function getUTCEndDateFromStartDateAndBusinessDays(startDate, businessDays){
	const curDate = new Date(startDate.getTime());
	const startDay = curDate.getUTCDay();

	// move to Monday ...
	if(startDay === 0 ) { // sunday
		curDate.setUTCDate(curDate.getUTCDate() + 1 );
	} else if(startDay === 6) { // saturday
		curDate.setUTCDate(curDate.getUTCDate() + 2 );
	}

	const weeksToMoveForward = Math.floor(businessDays / 5);
	const remainingDays =  businessDays % 5;

	curDate.setUTCDate(curDate.getUTCDate() + weeksToMoveForward*7 + remainingDays );

	const endDay = curDate.getUTCDay();

	// move to Monday ...
	if(endDay === 0 ) { // sunday
		curDate.setUTCDate(curDate.getUTCDate() + 1 );
	} else if(endDay === 6) { // saturday
		curDate.setUTCDate(curDate.getUTCDate() + 2 );
	}

	return curDate;
}

export function getEndDateFromUTCStartDateAndBusinessDays(startDate, businessDays){
	const currentDate = new Date(startDate.getTime());
	const startingDate = startDate.getUTCDate();

	let addedDays = 1;
	while(addedDays < businessDays || (currentDate.getUTCDay() === 0 || currentDate.getUTCDay() === 6) ) {
		if (currentDate.getUTCDay() !== 0 && currentDate.getUTCDay() !== 6) {
			addedDays++;
		}
		currentDate.setUTCDate( currentDate.getUTCDate() + 1 );
	}

	return currentDate;
}

export function parseDateISOString(s) {
    if (!s) return s;

    // if this is a date already, assume we need to correct timezone
    if (s instanceof Date) {
        // fix timezone to UTC
        return new Date(s.getTime() + s.getTimezoneOffset() * 60 * 1000);
    }

    let ds = s.split(/\D/).map(s => parseInt(s));
    ds[1] = ds[1] - 1; // adjust month
    return new Date(...ds);
}

// ranges are [,)
const makeDateRanges = function(startDate, endDate) {
    const ranges = [];
    let cur = startDate;
    const endBusinessDay = getLastBusinessDay(endDate);

    while(cur <= endDate) {
        // there is no promise that this day is on a business day ...
        let startBusinessDayOfRange = getFirstBusinessDay(cur);
        let startOfNextRange = this.getStartOfNextRange(cur);
        let possibleEndBusinessDayOfRange = getPreviousBusinessDay(startOfNextRange);

        const endBusinessDayOfRange = startOfNextRange > endBusinessDay ? endBusinessDay : possibleEndBusinessDayOfRange,
            startDay = countBusinessDays(startDate, startBusinessDayOfRange), // n^2
            endDay = countBusinessDays(startDate, endBusinessDayOfRange);
        
        // sometimes the start and end would be the same day. 
        if(endDay - startDay !== 0 ) {
            ranges.push({
                get start(){
                    throw "nope";
                },
                get end(){
                    throw "nope";
                },
                startBusinessDay: startBusinessDayOfRange,
                prettyStart: this.prettyDate(startBusinessDayOfRange),

                endBusinessDay: endBusinessDayOfRange,
                prettyEnd: this.prettyDate(endBusinessDayOfRange),
                type: this.name,
                startDay,
                endDay,
                days:  endDay - startDay + 1,
                businessDays: countBusinessDays(startBusinessDayOfRange,  endBusinessDayOfRange)
            });
        }
        
        cur = startOfNextRange;
    }
    return ranges;
};

// keep moving one day 
// is this inclusive or exclusive?
// [inclusive, inclusive]
export function countBusinessDays(startDate, endDate) {
    var count = 0;
    var currentDate = new Date(startDate);

    // Loop over each day from startDate to endDate ... allow for 1 hr 
    // daylight savings difference ...
    while (endDate > currentDate ) {
        var dayOfWeek = currentDate.getUTCDay();

        // Check if it's a weekday (Monday = 1, ..., Friday = 5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            count++;
        }

        // Move to the next day
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    var dayOfWeek = currentDate.getUTCDay();

    // Check if it's a weekday (Monday = 1, ..., Friday = 5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        count++;
    }

    return count;
}

function getNextBusinessDay(date){
    // Create a new date object to avoid modifying the original date
    var nextDay = new Date(date);


    // Set time to the end of the current day
    nextDay.setUTCHours(23, 59, 59, 999);

    // Add 1 millisecond to move to the start of the next day
    nextDay.setTime(nextDay.getTime() + 1);
    if(nextDay.getUTCDay() === 0 || nextDay.getUTCDay() === 6) {
        return getNextBusinessDay(nextDay)
    }
    return nextDay;
}
function getFirstBusinessDay(date){
    if(date.getUTCDay() !== 0 && date.getUTCDay() !== 6) {
        return date;
    } else {
        return getNextBusinessDay(date);
    }
}

function getPreviousBusinessDay(date){
    // Create a new date object to avoid modifying the original date
    var prevDay = new Date(date);

    prevDay.setDate(prevDay.getDate() - 1);

    if(prevDay.getUTCDay() === 0 || prevDay.getUTCDay() === 6) {
        return getPreviousBusinessDay(prevDay)
    }
    return prevDay;
}

function getLastBusinessDay(date){
    if(date.getUTCDay() !== 0 && date.getUTCDay() !== 6) {
        return date;
    } else {
        return getPreviousBusinessDay(date);
    }
}

export const monthDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

const yearDateFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'UTC' });

const ranges = [
    {
        name: "days",
        aveDays: 1,
        getStartOfNextRange: getNextBusinessDay,
        dateRanges: makeDateRanges,
        prettyDate(date){
            return monthDateFormatter.format(date);
        }
    },
    {
        name: "weeks",
        aveDays: 7,
        getStartOfNextRange(date) {
            // WHole: M->M
            // Fractional: Th: Th-M

            var nextMonday = new Date(date);

            // Calculate how many days to add to get to the next Monday
            // Day of the week is represented as 0 (Sunday) to 6 (Saturday)
            var daysToAdd = (8 - nextMonday.getDay()) % 7;
            if (daysToAdd === 0) {
                daysToAdd = 7; // If today is Monday, move to the next Monday
            }

            // Add the required number of days
            nextMonday.setDate(nextMonday.getDate() + daysToAdd);

            return nextMonday;
        },
        dateRanges: makeDateRanges,
        prettyDate(date){
            return monthDateFormatter.format(date);
        }
    },
    {
        name: "months",
        aveDays: 30,
        dateRanges: makeDateRanges,
        // dec 5 -> Jan 1st, 19 days
        // jan 1, feb 1, 23

        // 67
        // Nov 3 -> Feb 04
        //   Nov - [1,21] 20
        //   Dec - [21,42] 21
        //   Jan - [42,65] 23
        //   Needs 3 more days 
        //   Feb 5th -  3
        //         [65, 67] 2 ... should be 3 days wide ...

        // 67 grid days 3/27
        // 
        getStartOfNextRange(date){
            var year = date.getUTCFullYear();
            var month = date.getUTCMonth();
        
            month++;
        
            if (month > 11) {
                month = 0;
                year++;
            }
        
            return new Date(Date.UTC(year, month, 1));
        },
        prettyDate(date){
            return monthDateFormatter.format(date);
        }
    },
    {
        name: "quarters",
        aveDays: 91,
        dateRanges: makeDateRanges,
        prettyDate(date){
            return monthDateFormatter.format(date);
        },
        getStartOfNextRange(date){
            return getStartOfNextQuarter(date);
        }
    },
    {
        name: "years",
        aveDays: 365,
        dateRanges: makeDateRanges,
        prettyDate(date){
            return yearDateFormatter.format(date);
        },
        getStartOfNextRange(date){
            var year = date.getUTCFullYear();
            year++;
            return new Date(Date.UTC(year, 0, 1));
        }
    }
];

export function bestFitRange(daysApart, maxBuckets) {
    // which range is closest
    const buckets = ranges.map( range => daysApart / range.aveDays); // 10 , 1.4, .3

    const tooHighIndex = buckets.findLastIndex( bucket => (bucket >  maxBuckets));

    let range
    if(tooHighIndex === -1) {
        range = ranges[0]
    }
    else if(tooHighIndex + 1 === ranges.length) {
        range = ranges[tooHighIndex];
    } 
    else {
        range = ranges[tooHighIndex + 1]
    }
    return range;
}

function toUTCStartOfDay(date) {
    // Create a new date object to avoid modifying the original date
    var utcDate = new Date(date);

    // Set the time to the start of the day in UTC
    utcDate.setUTCHours(0, 0, 0, 0);

    return utcDate;
}

export function bestFitRanges(startDate, endDate, maxBuckets){
    const startUTC = toUTCStartOfDay(startDate);
	const endUTC = toUTCStartOfDay(endDate);

    const daysApart = (endUTC - startUTC) / DAY_IN_MS;
    
    const range = bestFitRange(daysApart, maxBuckets)

    return range.dateRanges(startUTC, endUTC);
}


// TESTS
//ranges[2].dateRanges(new Date(1706745600000), new Date(1707091200000))
//ranges[2].dateRanges(new Date(1698969600000), new Date(1701388800000));