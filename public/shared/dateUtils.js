
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
