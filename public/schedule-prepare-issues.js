import {
  makeObjectMapByKey,
  makeFilterByPropertyNotEqualToOneOfValues,
  groupByKey,
  splitByHavingPropertyValue,
  partition,
  stringToArray
} from "./helpers.js";

import {estimateExtraPoints, sampleExtraPoints} from "./shared/confidence.js";
import {WorkPlans} from "./work-plans.js";

export function prepareIssues(issuesSource, {
  // Decides what the project key is from an issue
  getTeamKey = getTeamKeyDefault,

  // returns the number of work days per sprint
  getDaysPerSprint = (teamKey) => 10,

  // Returns a team's velocity
  getVelocity = (key) => 21,

  // Returns a confidence for a particular issue (from 0-100)
  getConfidence = getConfidenceDefault,

  // Returns an estimate of the amount of work
  getEstimate = getEstimateDefault,


  issueFilter = issueFilterDefault,


  getParentKey = (issue) => issue["Custom field (Epic Link)"],

  // returns an array of keys that the issue blocks
  getBlockingKeys = (issue) => stringToArray(issue.linkedIssues.blocks) || [],


  // Called back when an issue isn't used
  onIgnoredIssues = (issues, reason) => {},

  uncertaintyWeight = 100,

	getParallelWorkLimit = (teamKey) => {
		return 1;
	}
}) {
    window.issuesSource = issuesSource;
    // Copy issues
    const issues = issuesSource.map( issue => {
        return {...issue}
    });

    // Remove issues that we don't care about (done issues and epics without parents)
    const {truthy: interestingIssues, falsy: filteredOut} = partition( issues, issueFilterDefault);
    onIgnoredIssues(filteredOut, "filtered-out");

    const issueByKey = makeObjectMapByKey(interestingIssues, "Issue key");

    // Group issues by type
    const issuesByType = groupByKey(interestingIssues, "Issue Type");

    const interestingEpics = issuesByType.Epic || [];

    const issuesByTeam = groupByKey(interestingIssues, getTeamKey);

    var projectIds = Object.keys(issuesByTeam);

    const workByTeams = makeObjectMapByKey(projectIds.map( (teamKey, i) => {
        return {
            teamKey,
            workPlans: new WorkPlans(getParallelWorkLimit(teamKey)),
            velocity: getVelocity(teamKey)
        }
    }), "teamKey" );

    // Warning: Mutations of data start here!

    // Make parent-child relationship
    associateParentAndChildren(interestingIssues, getParentKey, issueByKey);

    // add timing to epics
    interestingEpics.forEach( issue => {
      // mutation!
      issue.work = createWork(issue,
        workByTeams,
        {getTeamKey, getConfidence, getEstimate, uncertaintyWeight, getDaysPerSprint, getParallelWorkLimit});

    });

    // start building the block tree
    // adds a `.blocks` and `.blockedBy`
    linkBlocks(interestingEpics, issueByKey, getBlockingKeys);
    checkForCycles(interestingEpics);
    return {preparedIssues: interestingEpics, issuesByKey: issueByKey, workByTeams};
}

const removeDone = makeFilterByPropertyNotEqualToOneOfValues("Status", ["Done"]);
function issueFilterDefault(issue){
    return removeDone(issue) && (issue.Type === "Epic" ? issue["Custom field (Parent Link)"] : true)
}

function createWork(issue, workByTeams,
  {getTeamKey, getConfidence, getEstimate, uncertaintyWeight, getDaysPerSprint, getParallelWorkLimit}) {
    if(issue.work) {
        return issue.work;
    }

    var teamKey = getTeamKey(issue);
    var team = workByTeams[teamKey];
    var confidence = getConfidence(issue);

    var estimate = getEstimate(issue);
		if(!confidence || !estimate) {
			//debugger; Template Void, Refund features beyond Store 1
		}

    var canEstimate =  confidence !== undefined && estimate !== undefined;

    var pointsPerDay = team.velocity / getDaysPerSprint(teamKey)  / getParallelWorkLimit(teamKey);

    const usedEstimate = (estimate != undefined ? estimate : team.velocity );
    const usedConfidence = (confidence != undefined ? confidence : 50 );

    const extraPoints = uncertaintyWeight === null ?
      sampleExtraPoints(usedEstimate, usedConfidence):
      estimateExtraPoints(usedEstimate, usedConfidence, uncertaintyWeight);

    var estimatedDaysOfWork =  Math.max( Math.round( (usedEstimate) / pointsPerDay), 1);
    var daysOfWork = Math.max( Math.round( (usedEstimate + extraPoints) / pointsPerDay), 1);

    var work = {
        isDefaultValue: !canEstimate,
        confidence,
        estimate,
        usedEstimate,
        usedConfidence,
        extraPoints,
        extraDays: daysOfWork - estimatedDaysOfWork,
        estimatedDaysOfWork,
        daysOfWork: daysOfWork,
        issue: issue,
        team: team,
        isScheduled: false
    }
    return work;
}


function linkBlocks(issues, issueByKey, getBlockingKeys) {
    issues.forEach((issue)=> {
        issue.blocks = (stringToArray( getBlockingKeys(issue) || [])).map( (blockKey)=> {
            const blocked = issueByKey[blockKey];
            if(blocked && blocked["Issue Type"] !== issue["Issue Type"]) {
              console.log(issue["Issue Type"], issue.Summary,"is blocking", blocked["Issue Type"], blocked.Summary, ". This is ignored");
              return undefined;
            }
            return blocked
        }).filter( x=>  x);

        issue.blocks.forEach( (blocker)=> {
            if(!blocker.blockedBy){
                blocker.blockedBy = [];
            }
            blocker.blockedBy.push(issue);
        })
    })
}

function checkForCycles(issues) {
  issues.forEach((issue) => {
    // collect all the recursive blocks, make sure it doesn't block itself ...
    checkCycle([issue]);
  })
}
function checkCycle(issuePath) {
  var last = issuePath[issuePath.length-1];
  var issuePathSet = new Set(issuePath);

  last.blocks.forEach( (blocked)=> {
      if(issuePathSet.has(blocked)) {
        console.log(issuePath, blocked);
        throw "There is a cycle of dependencies. Aborting."
      } else {
        checkCycle([...issuePath, blocked]);
      }
  })
}

// NOT NEEDED
function blockedByDepth(issue) {
    if(issue.blockedByDepth !== undefined) {
        return issue.blockedByDepth;
    }
    if(!issue.blockedBy || !issue.blockedBy.length) {
        return issue.blockedByDepth = 0;
    } else {
        return issue.blockedByDepth = issue.blockedBy.reduce( (sum, issue)=> {
            return sum + blockedByDepth(issue);
        },1)
    }
}
// NOT NEEDED
function blocksDepth(issue) {
    if(issue.blocksDepth !== undefined) {
        return issue.blocksDepth;
    }
    if(!issue.blocks || !issue.blocks.length) {
        return issue.blocksDepth = 0;
    } else {
        return issue.blocksDepth = issue.blocks.reduce( (sum, issue)=> {
            return sum + blocksDepth(issue);
        },1)
    }
}


function associateParentAndChildren(issues, getParentKey, issuesByKey) {

  const issuesForEpics = groupByKey(issues,getParentKey);

  for(let epicKey in issuesForEpics) {
    if(epicKey) {
      const epic = issuesByKey[epicKey];
      if(epic) {
        epic._children = issuesForEpics[epicKey];
        epic._children.forEach( child => child._parent = epic );
      } else {
        //console.log("Unable to find epic", epicKey, "perhaps it is marked as done but has an issue not done");
      }

    }
  }
}


// WEIRD STUFF
function getTeamKeyDefault(issue) {
    var matches = issue["Summary"].match( /M\d: ([^:]+): / )
    if(matches) {
        return issue["Project key"]+":"+matches[1]
    } else {
        return issue["Project key"];
    }
}

function getConfidenceDefault(issue) {
    const outerValue = issue["Custom field (Confidence)"];

    if(Array.isArray(outerValue)) {
      for(let rawValue of outerValue) {
        let converted = parseInt(rawValue, 10);

        if(converted !== 0 && converted !== "") {
            return val;
        }
      }
    } else if(val !== undefined) {
      var val = parseInt(outerValue, 10);
      if(val !== 0) {
          return val;
      }
    }
    return undefined;
}

export function getEstimateDefault(issue) {
    var rawValue;
    if(issue["Custom field (Story Points)"]){
        rawValue = parseInt(issue["Custom field (Story Points)"], 10);
    }
    if( issue["Custom field (Story point estimate)"] ) {
      for( let value of issue["Custom field (Story point estimate)"] ){
          if(value) {
              rawValue = parseInt(value, 10);
          }
      }
    }
    if(rawValue !== undefined && rawValue !== 0 && rawValue !== "") {
        return rawValue;
    }
}
