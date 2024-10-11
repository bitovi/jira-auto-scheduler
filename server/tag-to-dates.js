module.exports = function(req, res){
    

    try{
        let date;
        if(Array.isArray(req.body.tag)) {
            date = getLatestDate(req.body.tag)
        } else {
            date = getHalfQuarterDate(req.body.tag);
        }
        
        res.status(200).json({ 
            isoDate: date.toISOString(),
            isoDay: date.toISOString().split('T')[0]
        });
    } catch(e) {
        res.status(400).json({errors: [e.message]})
    }

    
}

function getLatestDate(tags){
    const validTags = tags.map( t => {
        try {
            return getHalfQuarterDate(t)
        } catch (e) {

        }
    }).filter(v => v);
    if(validTags.length === 0) {
        throw new Error("No valid tags")
    } else {
        return new Date(Math.max(...datesArray.map(date => date.getTime())));
    }
}



function getHalfQuarterDate(input) {
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

  // Calculate the half-month offset
  const halfOffset = halfPart === 'T1' ? 0 : halfPart === 'T2' ? 1.5 : 0; // T1 -> first half, T2 -> second half, or full quarter if missing

  // Create the date object
  const fiscalYear = 2000 + parseInt(yearPart, 10); // Assuming fiscal year 2000+
  return new Date(fiscalYear, startMonth + halfOffset, 1);


}