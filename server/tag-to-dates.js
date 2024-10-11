module.exports = function(req, res){
    

    try{
        let tag = req.body.startTag || req.body.endTag;
        
        let date;
        if(Array.isArray(tag)) {
            date = req.body.endTag ? getLatestDate(tag) : getEarliestDate(tag);
        } else {
            date = getHalfQuarterDate(tag, !!req.body.endTag);
        }
        
        res.status(200).json({ 
            isoDate: date.toISOString(),
            isoDay: date.toISOString().split('T')[0]
        });
    } catch(e) {
        res.status(400).json({errors: [e.message]})
    }

    
}
function getEarliestDate(tags){
    const validTags = tags.map( t => {
        try {
            return getHalfQuarterDate(t)
        } catch (e) {

        }
    }).filter(v => v);
    if(validTags.length === 0) {
        throw new Error("No valid tags")
    } else {
        return new Date(Math.min(...validTags.map(date => date.getTime())));
    }
}


function getLatestDate(tags){
    const validTags = tags.map( t => {
        try {
            return getHalfQuarterDate(t, true)
        } catch (e) {

        }
    }).filter(v => v);
    if(validTags.length === 0) {
        throw new Error("No valid tags")
    } else {
        return new Date(Math.max(...validTags.map(date => date.getTime())));
    }
}



function getHalfQuarterDate(input, isEndDate = false) {
    // Regular expression to match the format ending with YY.QQ and an optional TT
    const regex = /(\d{2})\.Q(\d)\.?T?(\d)?$/;
  
    // Extract the relevant parts using the regular expression
    const match = input.match(regex);
    if (!match) {
      throw new Error('Invalid input format. Expected format ending with "YY.QQ" or "YY.QQ.TT".');
    }
  
    const yearPart = match[1]; // The last two digits of the year, e.g., "25"
    const quarterPart = `Q${match[2]}`; // The quarter number, e.g., "Q1"
    const halfPart = match[3] ? `T${match[3]}` : null; // The half-quarter part if present, e.g., "T1"
  
    // Map the quarter to the starting month
    const quarterStartMonths = {
      Q1: 0, // January
      Q2: 3, // April
      Q3: 6, // July
      Q4: 9  // October
    };
  
    // Get the starting month of the quarter
    const startMonth = quarterStartMonths[quarterPart];
    if (startMonth === undefined) {
      throw new Error(`Invalid quarter value: ${quarterPart}`);
    }
  
    // Calculate the start date based on T1, T2, or the full quarter
    const monthOffset = halfPart === 'T1' ? 0 : halfPart === 'T2' ? 1.5 : 0; // T1 -> start of quarter, T2 -> 1.5 months in

    // Create the start date of the time period
    const fiscalYear = 2000 + parseInt(yearPart, 10); // Assuming fiscal year 2000+
    const periodStartDate = new Date(fiscalYear, startMonth + Math.floor(monthOffset), (monthOffset % 1) * 30 + 1);

    // If the end date is requested, calculate the last day of the period
    let periodEndDate;
    if (isEndDate) {
        if (halfPart === 'T1') {
            // End of T1 is 1.5 months into the quarter
            periodEndDate = new Date(fiscalYear, startMonth + 1, 15); // Approximate end of T1
        } else if (halfPart === 'T2') {
            // End of T2 is the last day of the quarter
            periodEndDate = new Date(fiscalYear, startMonth + 3, 0); // Last day of the quarter
        } else {
            // If it's a full quarter, get the end of the third month in the quarter
            periodEndDate = new Date(fiscalYear, startMonth + 3, 0); // Last day of the quarter
        }
        return periodEndDate
    }
  
    // Format the start date as YYYY-MM-DD
    return periodStartDate
  }