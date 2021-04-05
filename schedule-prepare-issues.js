import {
  makeObjectMapByKey,
  makeFilterByPropertyNotEqualToOneOfValues,
  groupByKey,
  splitByHavingPropertyValue,
  partition,
  stringToArray
} from "./helpers.js";

import {estimateExtraPoints} from "./confidence.js";


export function prepareIssues(issuesSource, {
  issueFilter = makeFilterByPropertyNotEqualToOneOfValues("Status", ["Done"]),

  // Which property points to the parent issue
  parentProperty = "Custom field (Parent Link)",

  // Decides what the project key is from an issue
  getProjectKey = getProjectKeyDefault,

  // Returns a team's velocity
  getVelocity = (key) => 21,

  // Returns a confidence for a particular issue (from 0-100)
  getConfidence = getConfidenceDefault,

  // Returns an estimate of the amount of work
  getEstimate = getEstimateDefault,

  // returns an array of keys that the issue blocks
  getBlockingKeys = (issue) => stringToArray(issue["Outward issue link (Blocks)"]) || [],

  // returns the number of work days per sprint
  getDaysPerSprint = (projectKey) => 10,

  // Called back when an issue isn't used
  onIgnoredIssues = (issues, reason) => {},

  uncertaintyWeight = 100
}) {

    // Copy issues
    const issues = issuesSource.map( issue => {
        return {...issue}
    });

    // Remove issues that we don't care about (done issues)
    const {truthy: interestingIssues, falsy: filteredOut} = partition( issues, issueFilter);
    onIgnoredIssues(filteredOut, "filtered-out");

    // Group issues by type
    const initialIssuesByType = groupByKey(interestingIssues, "Issue Type");

    // Get only the epics that have parent (this could be done in filter I think)
    var {falsy: epicsWithoutParents, truthy: epicsWithParents} =
      splitByHavingPropertyValue(initialIssuesByType.Epic, parentProperty);
    onIgnoredIssues(epicsWithoutParents, "epoics-with-no-parents");


    const issuesByType = {
      ...initialIssuesByType,
      Epic: epicsWithParents
    };

    const interestingEpics = issuesByType.Epic;

    const issuesByProject = groupByKey(interestingEpics, getProjectKey);

    var projectIds = Object.keys(issuesByProject);


    const workByTeams = makeObjectMapByKey(projectIds.map( (teamKey) => {
        return {
            teamKey,
            workPlan: [],
            velocity: getVelocity(teamKey)
        }
    }), "teamKey" );

    // Warning: Mutations of data start here!

    // add timing to epics
    interestingEpics.forEach( issue => {
      // mutation!
      issue.work = createWork(issue,
        workByTeams,
        {getProjectKey, getConfidence, getEstimate, uncertaintyWeight, getDaysPerSprint});

    });


    // Now we start making relationships ----------
    const issueByKey = makeObjectMapByKey(interestingEpics, "Issue key");

    // start building the block tree
    // adds a `.blocks` and `.blockedBy`
    linkBlocks(interestingEpics, issueByKey, getBlockingKeys);

    return {preparedIssues: interestingEpics, issuesByKey: issueByKey, workByTeams};
}


function createWork(issue, workByTeams,
  {getProjectKey, getConfidence, getEstimate, uncertaintyWeight, getDaysPerSprint}) {
    if(issue.work) {
        return issue.work;
    }
    var projectKey = getProjectKey(issue);
    var team = workByTeams[projectKey];
    var confidence = getConfidence(issue);
    var estimate = getEstimate(issue);
    var canEstimate =  confidence !== undefined && estimate !== undefined;

    var pointsPerDay = team.velocity / getDaysPerSprint(projectKey);

    var usedEstimate = (estimate !== undefined ? estimate : team.velocity );
    var usedConfidence = (confidence !== undefined ? confidence : 50 );

    var extraPoints = estimateExtraPoints(usedEstimate, usedConfidence, uncertaintyWeight);
    var estimatedDaysOfWork =  Math.ceil( (usedEstimate) / pointsPerDay);
    var daysOfWork = Math.ceil( (usedEstimate + extraPoints) / pointsPerDay);

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
        issue.blocks = getBlockingKeys(issue).map( (blockKey)=> {
            return issueByKey[blockKey]
        }).filter( x=>  x);

        issue.blocks.forEach( (blocker)=> {
            if(!blocker.blockedBy){
                blocker.blockedBy = [];
            }
            blocker.blockedBy.push(issue);
        })
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




// WEIRD STUFF
function getProjectKeyDefault(issue) {
    var matches = issue["Summary"].match( /M\d: ([^:]+): / )
    if(matches) {
        return issue["Project key"]+":"+matches[1]
    } else {
        return issue["Project key"];
    }
}

function getConfidenceDefault(issue) {
    if(issue["Custom field (Confidence)"]){
        var val = parseInt(issue["Custom field (Confidence)"], 10);
        if(val !== 0 && val !== "") {
            return val;
        }
    }
    return undefined;
}

function getEstimateDefault(issue) {
    var rawValue;
    if(issue["Custom field (Story Points)"]){
        rawValue = parseInt(issue["Custom field (Story Points)"], 10);
    }
    for( let value of issue["Custom field (Story point estimate)"] ){
        if(value) {
            rawValue = parseInt(value, 10);
        }
    }
    if(rawValue !== undefined && rawValue !== 0 && rawValue !== "") {
        return rawValue;
    }
}
