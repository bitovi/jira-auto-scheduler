import {prepareIssues} from "./schedule-prepare-issues.js";

// This is the main function that schedule issues.
// issues - a raw list of issue objects, no metadata
// options - a whole bunch of configuration options
export function scheduleIssues(issues, options){
  const {
    onPlannedIssueIncrement, onPlannedIssues
  } = {
    onPlannedIssueIncrement: (issue, workByTeams) => {},
    onPlannedIssues: (workByTeams) => {},
    ...options
  }
  // prepares a copy of issues that should be plotted.  Each issue
  // has a `.work` item with velocity and such.
  const {
    preparedIssues,
    issuesByKey,
    workByTeams} = prepareIssues(issues, options);


  // adds a .blocksWorkDepth
  preparedIssues.forEach(issue => blocksWorkDepth(issue));

  // Sorts by the items that has the most work
  preparedIssues.sort((iA, iB) => iB.blocksWorkDepth - iA.blocksWorkDepth);

	console.log("sorted by depth", preparedIssues)
  // starting with the issue that blocks the most work
  preparedIssues.forEach( (issue)=> {
    // plan that issue out
    planIssue(issue, workByTeams);
    onPlannedIssueIncrement(issue, workByTeams);

  });
  onPlannedIssues(workByTeams);
}


function blocksWorkDepth(issue) {
    if(issue.blocksWorkDepth !== undefined) {
        return issue.blocksWorkDepth;
    }
    if(!issue.blocks || !issue.blocks.length) {
        return issue.blocksWorkDepth = issue.work.daysOfWork;
    } else {
        return issue.blocksWorkDepth = issue.work.daysOfWork + issue.blocks.reduce( (max, issue)=> {
            return Math.max(max,  blocksWorkDepth(issue) );
        },0)
    }
}


// This function tries to plan an issue.
// It is recursive. It will plan the issue and then try to plan everything the issue
// blocks.
function planIssue(issue, workByTeams) {
    var work = issue.work;

    // Has everything that blocks this work already been scheduled?
    if( areAllBlockersScheduled(work) ) {

        // schedule
        if(work.startDay == null) {
            // Look at each blocker and get the first date when all blockers will be done
            var firstDayWorkCouldStartOn = earliestStartTimeFromBlockers(work);


            /*console.log(new Array(firstDayWorkCouldStartOn).join(" "),
              issue.blocksWorkDepth,
              issue.work.daysOfWork,
              issue.Summary,
              "rescheduled");*/

            // Try to place this work in the first place the team could absorb it.
            scheduleIssue(work, firstDayWorkCouldStartOn );

            if(issue.blocks) {
              issue.blocks.sort((iA, iB) => iB.blocksWorkDepth - iA.blocksWorkDepth)
                .forEach( block => planIssue(block, workByTeams));
            }
        }

    } else {
      // If there is a blocker that hasn't been scheduled, we will wait on the blocker
      // to be scheduled.  It will then recurse to this issue and schedule it.
    }
}

// Try to find the first available time  the work could be scheduled for this team.
function scheduleIssue(work, firstDayWorkCouldStartOn) {

    var team = work.team;
		//if(work.issue["Issue key"] === "YUMPOS-4131") {
		//	debugger;
		//}

		team.workPlans.sheduleWork(work, firstDayWorkCouldStartOn);
		console.log(new Array(Math.ceil(work.startDay / 2)).join(" "), work.startDay, work.issue.Summary)
		return work;
}






// Start day is set on everything
function areAllBlockersScheduled(work){
    return  (work.issue.blockedBy || []).every( (issue)=> issue.work.startDay != null )
}

// The earliest start day an issue could start on. Calculated
// by looking at when blockers to this issue end.
function earliestStartTimeFromBlockers(work) {
    return work.issue.blockedBy ? work.issue.blockedBy.reduce( (prev, issue)=> {
        return Math.max(prev, issue.work.startDay + issue.work.daysOfWork )
    }, 0) : 0;
}
