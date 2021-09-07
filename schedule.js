import {prepareIssues} from "./schedule-prepare-issues.js";

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


  preparedIssues.forEach( (issue)=> {
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


// problem here is that the `firstDay` doesn't line up with other potential blockers ....
function planIssue(issue, workByTeams) {
    var work = issue.work;

    if( areAllBlockersScheduled(work) ) {

        // schedule
        if(work.startDay == null) {
            var firstDayWorkCouldStartOn = earliestStartTimeFromBlockers(work);

            console.log(new Array(firstDayWorkCouldStartOn).join(" "),
              issue.blocksWorkDepth,
              issue.work.daysOfWork,
              issue.Summary,
              "rescheduled");

            scheduleIssue(work, firstDayWorkCouldStartOn );

            if(issue.blocks) {
              issue.blocks.sort((iA, iB) => iB.blocksWorkDepth - iA.blocksWorkDepth)
                .forEach( block => planIssue(block, workByTeams));
            }
        }

    } else {
      // we can't schedule this until our parent blocker has been schedule
    }
}


function scheduleIssue(work, firstDayWorkCouldStartOn) {

    var team = work.team;

    // find a gap between days and insert the work ...
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
