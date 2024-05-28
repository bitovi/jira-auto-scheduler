import { StacheElement, type, ObservableObject, fromAttribute, queues } from "./can.js";





class EstimationProgressReport extends StacheElement {
    static view = `
        <details on:toggle="this.showing = scope.element.open">
            <summary class="cursor-pointer"><b class="font-bold">Estimation Progress Report</b> - Track what has and needs to be estimated.</summary>
            <div>
                {{# if(this.showing) }}
                <div style="display: grid; grid-template-columns: auto 1fr 1fr 1fr 1fr 1fr 1fr 1fr; gap: 4px;">
                    <div>&nbsp;</div>
                    <div style="grid-column: 2 / span 2" class="text-center">Epic</div>
                    <div style="grid-column: 4 / span 5" class="text-center">{{this.aboveEpicTypeName}}s</div>
                    <div>&nbsp;</div>
                    <div class="text-xs text-right">Total</div>
                    <div class="text-xs text-right">Estimated</div>
                    <div class="text-xs text-right">Total</div>
                    <div class="text-xs text-right">Without epics</div>
                    <div class="text-xs text-right">Only unestimated Epics</div>
                    <div class="text-xs text-right">Partially estimated</div>
                    <div class="text-xs text-right">Estimated</div>
                {{# for(level of this.hierarchyLevelReportingData) }}
                    <h2 style="grid-column: 1 / -1"
                        class="text-base grow font-semibold bg-neutral-20">
                        <img src="{{level.type.iconUrl}}" class="inline"/> 
                        {{level.name}}
                    </h2>
                    <p class="text-xs pl-3" style="grid-column: 1 / -1">Team Rollup:</p>
                    {{# for(teamRollup of level.teams) }}
                        <div class="pl-5">{{teamRollup.name}}</div>
                        <div class="text-right">{{teamRollup.epic.total}}</div>
                        <div class="text-right">{{teamRollup.epic.estimated}}</div>
                        <div class="text-right">{{teamRollup.aboveEpic.total}}</div>
                        <div class="text-right">{{teamRollup.aboveEpic.noEpics}}</div>
                        <div class="text-right">{{teamRollup.aboveEpic.onlyUnestimated}}</div>
                        <div class="text-right">{{teamRollup.aboveEpic.someEstimatedEpics}}</div>
                        <div class="text-right">{{teamRollup.aboveEpic.fullyEstimated}}</div>
                    {{/ }}
                    <p class="text-xs pl-3" style="grid-column: 1 / -1">Issue Rollup:</p>
                    {{# for(issue of level.issues) }}

                        <div class="pl-5"><a target="_blank" href="{{issue.url}}">{{issue.Summary}}</a></div>
                        <div class="text-right">{{issue.rollups.epic.total}}</div>
                        <div class="text-right">{{issue.rollups.epic.estimated}}</div>
                        <div class="text-right">{{issue.rollups.aboveEpic.total}}</div>
                        <div class="text-right">{{issue.rollups.aboveEpic.noEpics}}</div>
                        <div class="text-right">{{issue.rollups.aboveEpic.onlyUnestimated}}</div>
                        <div class="text-right">{{issue.rollups.aboveEpic.someEstimatedEpics}}</div>
                        <div class="text-right">{{issue.rollups.aboveEpic.fullyEstimated}}</div>
                    {{/ }}
                    
                {{/ }}
                    
                </div>
                {{/ if }}
            </div>
        </details>
        
    `;

    static props = {
        getTeamKey: Function,
        getEstimate: Function,
        getConfidence: Function,
        showing: false,

        get aboveEpicTypeName(){
            const reportingData = this.hierarchyLevelReportingData;
            if(reportingData.length > 1) {
                return reportingData[reportingData.length - 2].name
            }
        },

        get hierarchyLevelReportingData(){
            if(!this.rawIssues.length) {
                return this.rawIssues;
            }

            const reportingData = getReportingData(this.rawIssues, {
                getEstimate: this.getEstimate, 
                getConfidence: this.getConfidence,
                getTeamKey: this.getTeamKey
            });
            
            // prepare the data for the view
            const sorted = Object.values(reportingData).sort( (levelA, levelB)=>{
                return levelB.hierarchyLevel - levelA.hierarchyLevel
            }).map( (level)=> {
                return {
                    ...level,
                    teams: Object.values(level.teams)
                }
            })

            return sorted;
        }
    };

    log(issue) {
        console.log(issue);
    }


}

customElements.define("estimation-progress-report", EstimationProgressReport);


function calculatePercentileWhoHasStoryPointsAndConfidence(issues,{getEstimate, getConfidence}) {
    let totalCount = 0, estimatedCount = 0;
    for(let issue of issues) {
        if(issue["Issue Type"].name === "Epic") {
            let estimate = getEstimate(issue);
            let confidence = getConfidence(issue);
            if(estimate != null && confidence != null) {
                estimatedCount ++;
            }
            totalCount++;
        } else {
            const result = calculatePercentileWhoHasStoryPointsAndConfidence(issue.children, {getEstimate, getConfidence});
            issue.epicRollup = result;
            totalCount += result.totalCount;
            estimatedCount += result.estimatedCount;
            
        }

    }

    return {totalCount, estimatedCount, percentage: Math.round(100*estimatedCount / totalCount) };
}


const EPIC_HIERARCHY_LEVEL = 1;

// hierarchyLevel: {name, hierarchyLevel, issues, teams}
function getReportingData(issues, {getConfidence, getEstimate, getTeamKey}){

    // if the heirarchyLevel + (groupByTeam ? 1 : 0) > EPIC_HIERARCHY_LEVEL + 1
    // then we should have enough data to give the 4-part breakdown

    // 


    const issuesWithRollup = issues.map( issue => {
        return {
            ...issue,
            rollups: makeBaseRollup()
        }
    }).sort( (a, b)=> {
        return a["Issue Type"].hierarchyLevel - b["Issue Type"].hierarchyLevel;
    });

    const getParent = makeGetParent(issuesWithRollup);

    // hierarchy levels  hierarchyLevel: {name, hierarchyLevel, issues, teams}
    const hierarchyLevels = {};

    for(let issue of issuesWithRollup) {
        const hierarchyLevel = issue["Issue Type"].hierarchyLevel
        if(hierarchyLevel < 1) {
            continue; // ignore everything below epics
        }

        
        if(hierarchyLevel === 1) {
            let estimate = getEstimate(issue);
            let confidence = getConfidence(issue);
            const isEstimated = estimate != null && confidence != null;

            issue.rollups.epic.total++;
            if(isEstimated) {
                issue.rollups.epic.estimated++;
            }
            
            updateTeamAndParentRollups(hierarchyLevels, issue, {getTeamKey, getParent});
        }
        else if(hierarchyLevel === 2) {
            // this is an initiative labelling itself
            issue.rollups.aboveEpic.total= 1;
            if(issue.rollups.epic.total === 0) {
                issue.rollups.aboveEpic.noEpics = 1;
            }
            else if(issue.rollups.epic.total === issue.rollups.epic.estimated) {
                issue.rollups.aboveEpic.fullyEstimated = 1;
            } 
            else if(issue.rollups.epic.total > 0 && issue.rollups.epic.estimated === 0) {
                issue.rollups.aboveEpic.onlyUnestimated = 1;
            }
            else {
                issue.rollups.aboveEpic.someEstimatedEpics = 1;
            }

            updateTeamAndParentRollups(hierarchyLevels, issue, {getTeamKey, getParent});
        }
        else {
            // update the team info ...
            updateTeamAndParentRollups(hierarchyLevels, issue, {getTeamKey, getParent});            
        }
    }
    return hierarchyLevels;
}

function updateTeamAndParentRollups(hierarchyLevels, issue, {getTeamKey, getParent}){
    let {teamRollup} = ensureHierarchyLevelObjectAndTeamRollup(hierarchyLevels, issue, {getTeamKey});
    updateRollup(teamRollup, issue);
    
    let parent = getParent(issue);
    if(!parent ) {
        // console.warn("No parent. We will find a way to report later")
    } else {
        updateRollup(parent.rollups, issue);
    }
}

function updateRollup(rollups, issue) {
    rollups.epic.total += issue.rollups.epic.total;
    rollups.epic.estimated += issue.rollups.epic.estimated;

    rollups.aboveEpic.total += issue.rollups.aboveEpic.total;
    rollups.aboveEpic.noEpics += issue.rollups.aboveEpic.noEpics;
    rollups.aboveEpic.fullyEstimated += issue.rollups.aboveEpic.fullyEstimated;
    rollups.aboveEpic.onlyUnestimated += issue.rollups.aboveEpic.onlyUnestimated;
    rollups.aboveEpic.someEstimatedEpics += issue.rollups.aboveEpic.someEstimatedEpics;
}

function makeGetParent(issues){
    const issueKeyToIssue = Object.groupBy(issues, issue => issue["Issue key"]);
    return function getParent(issue) {
        if(issue?.Parent?.key && issueKeyToIssue[issue.Parent.key]) {
            return issueKeyToIssue[issue.Parent.key][0]
        } else {
            return;
        }
    }
}

function makeBaseRollup(){
    return {
        aboveEpic: {
            total: 0,
            noEpics: 0,
            onlyUnestimated: 0,
            someEstimatedEpics: 0,
            fullyEstimated: 0
        },
        epic: {
            estimated: 0,
            total: 0
        }
    };
}

function ensureHierarchyLevelObjectAndTeamRollup(hierarchyLevels, issue, {getTeamKey}){
    const hierarchyLevel = issue["Issue Type"].hierarchyLevel;
    let hierarchyLevelObject = hierarchyLevels[hierarchyLevel];

    if(!hierarchyLevels[hierarchyLevel]) {
        hierarchyLevelObject = hierarchyLevels[hierarchyLevel] = {
            name: issue["Issue Type"].name,
            hierarchyLevel: hierarchyLevel,
            issues: [],
            teams: {},
            type: issue["Issue Type"]
        }
    }
    hierarchyLevelObject.issues.push(issue);
    const team = getTeamKey(issue);
    let teamRollup = hierarchyLevelObject.teams[team]
    if(!teamRollup) {
        teamRollup = hierarchyLevelObject.teams[team] = {...makeBaseRollup(), name: team};
    }

    return {hierarchyLevelObject, teamRollup};
}