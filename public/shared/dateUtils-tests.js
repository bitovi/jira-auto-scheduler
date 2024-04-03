import { test } from "../test/test.js";
import {countBusinessDays, bestFitRanges} from "./dateUtils.js";



export const monthDateFormatter = new Intl.DateTimeFormat('en-US', { 
    month: 'short', day: 'numeric', timeZone: 'UTC', weekday: 'short'
});


// 2023 started on a sunday
function UTCJan2023(day = 1){
    return new Date( Date.UTC(2023, 0, day) )
}

function assertCountBusinessDays(equal, date1, date2, expected) {
    equal( countBusinessDays(date1, date2), expected, 
        `(${monthDateFormatter.format(date1)} to ${monthDateFormatter.format(date2)}) -> ${expected}`)
}

test("countBusinessDays", function({equal}){

    // countBusinessDays always rounds to the nearest UTC day.
    // It's also [inclusive, inclusive]
    // (2-Mon, 2-Mon) -> 1
    // (1-Sun, 2-Mon) -> 1
    // (2-Mon, 3-Tue) -> 2
    // (6-Fri, 6-Fri) -> 1
    // (6-Fri, 6-Sat) -> 1
    // (6-Fri,8-Sun) -> 1
    // (6-Fri,9-Mon) -> 2




    function makeTest(day1, day2, expected){
        const date1 = UTCJan2023(day1), date2 = UTCJan2023(day2);
        assertCountBusinessDays(equal, date1, date2, expected);
    }
    // (2-Mon, 2-Mon) -> 1
    makeTest(2, 2, 1);
    // (1-Sun, 2-Mon) -> 1
    makeTest(1, 2, 1);
    // (2-Mon, 3-Tue) -> 2
    makeTest(2, 3, 2);
    // (6-Fri, 6-Fri) -> 1
    makeTest(6, 6, 1);
    // (6-Fri, 7-Sat) -> 1
    makeTest(6, 7, 1);
    // (6-Fri,8-Sun) -> 1
    makeTest(6, 8, 1);
    // (6-Fri,9-Mon) -> 2
    makeTest(6, 9, 2);

    // Feb 2024
    assertCountBusinessDays(equal, new Date( Date.UTC(2024, 1, 1) ), new Date( Date.UTC(2024, 1, 29) ), 21) 
    
    // March 2024 (daylight savings time change)
    assertCountBusinessDays(equal, new Date( Date.UTC(2024, 2, 1) ), new Date( Date.UTC(2024, 2, 31) ), 21);

    const may1 = new Date( Date.UTC(2024, 4, 1) ),
        may6= new Date( Date.UTC(2024, 4, 6) );
        assertCountBusinessDays(equal, may1, may6, 4);
});

test("bestFitRanges", function({equal}){
    const feb1 = new Date( Date.UTC(2024, 1, 1) ),
        may6= new Date( Date.UTC(2024, 4, 6) );


    const ranges = bestFitRanges(feb1,may6 , 7);
    console.log(ranges);
    const days = ranges.map( d => d.days ).reduce((a, b) => a + b, 0)
    
    const countedDays = countBusinessDays(feb1, may6);
    equal(days, countedDays, "counted days is the same as the range days")
})