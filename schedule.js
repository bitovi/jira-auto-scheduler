import {prepareIssues} from "./schedule-prepare-issues.js";

// This is the main function that schedule issues.
// issues - a raw list of issue objects, no metadata
// options - a whole buncho f configuration options
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


            console.log(new Array(firstDayWorkCouldStartOn).join(" "),
              issue.blocksWorkDepth,
              issue.work.daysOfWork,
              issue.Summary,
              "rescheduled");

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

    // If there is no work for this team, then make this the first work item.
    if(!team.workPlan.length) {
        work.startDay = firstDayWorkCouldStartOn;
        team.workPlan.push(work)
    } else {

        // check if the work can exist before existing work
        var firstDayToStartWorkAfterExistingWork = 0;
        // find the first spot where this will fit after `startDay`
        for(let w = 0 ; w < team.workPlan.length; w++) {
            let existingWork = team.workPlan[w];
            // check if work can be done before this existing work
            var possibleStartDay = Math.max(firstDayWorkCouldStartOn, firstDayToStartWorkAfterExistingWork);
            if(possibleStartDay + work.daysOfWork <= existingWork.startDay) {
                work.startDay = possibleStartDay;
                team.workPlan.splice(w, 0, work);
                if(work.startDay > firstDayWorkCouldStartOn) {
                    work.artificiallyDelayed = true;
                    //console.log("can't schedule where we'd want to. This is in the way:", existingWork);
                }
                return work;
            } else {

                // move forward
                firstDayToStartWorkAfterExistingWork = existingWork.startDay + existingWork.daysOfWork;
            }
        }
        // work not scheduled, add to the end ...
        work.startDay = Math.max(firstDayWorkCouldStartOn, firstDayToStartWorkAfterExistingWork);
        if(work.startDay > firstDayWorkCouldStartOn) {
            work.artificiallyDelayed = true;
            //console.log("can't schedule where we'd want to. This is in the way:",
            //    team.workPlan.map( (work)=> { return {summary: work.issue.Summary, startDay: work.startDay}}));
        }
        team.workPlan.push(work);
    }
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
