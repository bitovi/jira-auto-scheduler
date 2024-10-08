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

import { defineFeatureFlag } from "./feature-flag.js";


const useParentBlockers = defineFeatureFlag("useParentBlockers",`

Turns on an awareness of epic parent's blockers.  

For example, lets say Initiatives contain Epics.

If Initiative A blocks Initaitive B, then every epic in Initiative A will block 
ever epic in Initiative B.

This creates a lof of dependency blockers in the tool.

`, false)

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

  // True will randomly select an issue timing based on the probability distribution
  // False will always use the same extra timing.  There is no reason to do a montecarlo with this configuration.
  probablisticallySelectIssueTiming = true,

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
    const issuesByType = Object.groupBy(interestingIssues, issue => issue["Issue Type"].name)
    
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
        {getTeamKey, getConfidence, getEstimate, uncertaintyWeight, getDaysPerSprint, getParallelWorkLimit, probablisticallySelectIssueTiming});

    });

    // start building the block tree of direct locks
    //directLinkBlocks(interestingIssues, issueByKey, getBlockingKeys);

    // allow a parent to block other parents with children
    if(useParentBlockers()) {
      linkIndirectBlocks(interestingEpics, issueByKey, getBlockingKeys);
    } else {
      linkDirectBlocks(interestingEpics, issueByKey, getBlockingKeys);
    }
    
    checkForCycles(interestingEpics);
    return {preparedIssues: interestingEpics, issuesByKey: issueByKey, workByTeams};
}

//makeFilterByPropertyNotEqualToOneOfValues("Status", ["Done"])

const removeDoneStatusCategory = function({issue}){
  return issue?.fields?.Status?.statusCategory?.name !== "Done"
}

;
function issueFilterDefault(issue){
    return removeDoneStatusCategory(issue);
}

function getDaysOfWork(usedEstimate, extraPoints, pointsPerDay){
  return Math.max( Math.round( (usedEstimate + extraPoints) / pointsPerDay), 1)
}

export function isConfidenceValid(value){
  return value && value > 0 && value <=100;
}

function createWork(issue, workByTeams,
  {
    getTeamKey, 
    getConfidence, 
    getEstimate, 
    uncertaintyWeight, 
    getDaysPerSprint, 
    getParallelWorkLimit,
    probablisticallySelectIssueTiming
  }) {
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

    var canEstimate =  isConfidenceValid( confidence ) && estimate !== undefined;

    var pointsPerDay = team.velocity / getDaysPerSprint(teamKey)  / getParallelWorkLimit(teamKey);

    const usedEstimate = (estimate != undefined ? estimate : team.velocity );
    const usedConfidence = ( isConfidenceValid(confidence) ? confidence : 50 );

    var estimatedDaysOfWork =  Math.max( Math.round( (usedEstimate) / pointsPerDay), 1);

    const extraPoints = probablisticallySelectIssueTiming ?
      sampleExtraPoints(usedEstimate, usedConfidence):
      estimateExtraPoints(usedEstimate, usedConfidence, uncertaintyWeight);

    var daysOfWork = getDaysOfWork(usedEstimate, extraPoints, pointsPerDay);

    // We always want deterministic days of work, this makes controling for the order easier
    let deterministicDaysOfWork;
    if(probablisticallySelectIssueTiming) {
      deterministicDaysOfWork =  getDaysOfWork(usedEstimate, 
        estimateExtraPoints(usedEstimate, usedConfidence, uncertaintyWeight), 
        pointsPerDay);
    } else {
      deterministicDaysOfWork = daysOfWork;
    }

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
        deterministicDaysOfWork,
        deterministicExtraDays: deterministicDaysOfWork - estimatedDaysOfWork,
        issue: issue,
        team: team,
        isScheduled: false,
        pointsPerDay
    }
    return work;
}

function getParentBlocks(issueWithDirectBlocks){
  let parent;
    allBlocks = [];
  while(parent = issue._parent) {
    const children = getNestedEpics(parent.blocks);
    allBlocks.push(...children);
  }
  return [...new Set(allBlocks)];
}

function getNestedEpics(blockedIssues){
  const blockedEpics = [];
  for( let blockedIssue of blockedIssues) {
    if(blockedIssue["Issue Type"].name === "Epic") {
      blockedEpics.push(blockedIssue);
    }
    else if(blockedIssue._children) {
      blockedEpics.push(...getNestedEpics(blockedIssue._children))
    }
  }
  return blockedEpics;
}

function makeGetDirectBlocks(issueByKey, getBlockingKeys){
  return function(issue){
    return (stringToArray( getBlockingKeys(issue) || [])).map( (blockKey)=> {
      return issueByKey[blockKey];
    }).filter( x=>  x);
  }
}

// hierarchyLevel = 1 for epic

function getIndirectAndDirectBlocks(issue, getDirectBlocks){
  const allBlocks = [];
  const directBlocks = getDirectBlocks(issue);
  const directHierarchyOneBlocks = getHierarchyLevelChildren(directBlocks, 1);
  
  allBlocks.push(...directHierarchyOneBlocks);

  let parent = issue;
  while(parent = parent._parent) {
    let parentDirectBlocks = getDirectBlocks(parent);
    const parentDirectHierarchyOneBlocks = getHierarchyLevelChildren(parentDirectBlocks, 1);
    allBlocks.push(...parentDirectHierarchyOneBlocks);
  }
  return allBlocks;
}

function getHierarchyLevelChildren(issues, level) {
  const children = [];
  for( let issue of issues) {
    if(issue["Issue Type"].hierarchyLevel === level) {
      children.push(issue);
    }
    else if(issue._children && issue["Issue Type"].hierarchyLevel > level) {
      children.push(...getHierarchyLevelChildren(issue._children, level));
    }
  }
  return children;
}


function linkDirectBlocks(issues, issueByKey, getBlockingKeys){
  issues.forEach((issue)=> {
    const issueBlocks = (stringToArray( getBlockingKeys(issue) || [])).map( (blockKey)=> {
        const blocked = issueByKey[blockKey];
        if(blocked && blocked["Issue Type"].name !== issue["Issue Type"].name) {
          console.log(issue["Issue Type"].name, issue.Summary,"is blocking", blocked["Issue Type"].name, blocked.Summary, ". This is ignored");
          return undefined;
        }
        return blocked
    }).filter( x=>  x);

    issue.blocks = issueBlocks;

    issue.blocks.forEach( (blocker)=> {
        if(!blocker.blockedBy){
            blocker.blockedBy = [];
        }
        blocker.blockedBy.push(issue);
    })
  });

}

function linkIndirectBlocks(issues, issueByKey, getBlockingKeys) {
  const getDirectBlocks = makeGetDirectBlocks(issueByKey, getBlockingKeys);
  issues.forEach((issue)=> {
    const allBlocks = getIndirectAndDirectBlocks(issue, getDirectBlocks);
    issue.blocks = allBlocks;

    issue.blocks.forEach( (blocker)=> {
        if(!blocker.blockedBy){
            blocker.blockedBy = [];
        }
        blocker.blockedBy.push(issue);
    })
  });
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

  const issuesByParentKey = groupByKey(issues,getParentKey);

  for(let parentKey in issuesByParentKey) {
    if(parentKey) {
      const issue = issuesByKey[parentKey];
      const children = issuesByParentKey[parentKey];
      if(issue) {
        issue._children = children;
        children.forEach( child => child._parent = issue );
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
