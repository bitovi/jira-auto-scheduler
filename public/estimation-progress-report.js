import { StacheElement, type, ObservableObject, fromAttribute, queues } from "./can.js";


const interactableCellClasses = "text-right hover:text-blue-400 cursor-pointer hover:bg-neutral-40"

const interactableClasses = "hover:text-blue-400 cursor-pointer text-right inline-block"

class EstimationProgressReport extends StacheElement {
    static view = `
        <details on:toggle="this.showing = scope.element.open">
            <summary class="cursor-pointer"><b class="font-bold">Estimation Progress Report</b> -
             Track what has and needs to be estimated.
             
            </summary>
            <div>
                {{# if(this.showing) }}
                <div style="display: grid; grid-template-columns: auto auto 1fr 1fr auto 1fr 1fr 1fr 1fr; gap: 4px;">
                    <div><button class="btn-secondary-sm" on:click="this.downloadCSV()">Download CSV</button></div>
                    <div style="grid-column: 2 / span 3" class="">Epic</div>
                    <div style="grid-column: 5 / span 5" class=" pl-8">{{this.aboveEpicTypeName}}s</div>
                    <div>&nbsp;</div>
                    <div class="text-xs text-right sticky top-0 bg-white pt-1">Total</div>
                    <div class="text-xs text-right sticky top-0 bg-complete pt-1 pr-1">Estimated</div>
                    <div class="text-xs text-right sticky top-0 bg-notstarted pt-1 pr-1">Unestimated</div>
                    <div class="text-xs text-right sticky top-0 bg-white pt-1 pl-8">Total</div>
                    <div class="text-xs text-right sticky top-0 bg-complete pt-1 pr-1">Estimated</div>
                    <div class="text-xs text-right sticky top-0 bg-ontrack pt-1 pr-1">Partially estimated</div>
                    <div class="text-xs text-right sticky top-0 bg-behind pt-1 pr-1">Only unestimated Epics</div>
                    <div class="text-xs text-right sticky top-0 bg-notstarted pt-1 pr-1">Without epics</div>
                    
                    
                    
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
                        <div style="grid-column: 3 / span 2" class="flex">
                            <div  
                                class="${interactableClasses} bg-complete" 
                                style="width: {{ this.percent(teamRollup.epic.estimated, level.allTeamsRollup.epicTotalMax )}}"
                                on:click="this.showModal(teamRollup,'epic','estimated')"><span class="pr-1">{{teamRollup.epic.estimated}}</span></div>
                            <div 
                                class="${interactableClasses} bg-notstarted" 
                                style="width: {{ this.percent(teamRollup.epic.unestimated, level.allTeamsRollup.epicTotalMax )}}"
                                on:click="this.showModal(teamRollup,'epic','unestimated')"><span class="pr-1">{{teamRollup.epic.unestimated}}</span></div>
                        </div>
                        <div class="text-right">{{teamRollup.aboveEpic.total}}</div>

                        <div style="grid-column: 6 / span 4" class="flex">
                            <div class="${interactableClasses} bg-complete" on:click="this.showModal(teamRollup,'aboveEpic','fullyEstimated')"
                                style="width: {{ this.percent(teamRollup.aboveEpic.fullyEstimated, level.allTeamsRollup.aboveEpicTotalMax )}}">
                                <span class="pr-1">{{this.emptyIfFalsey(teamRollup.aboveEpic.fullyEstimated)}}</span>
                            </div>
                            <div class="${interactableClasses} bg-ontrack" on:click="this.showModal(teamRollup,'aboveEpic','someEstimated')"
                                style="width: {{ this.percent(teamRollup.aboveEpic.someEstimated, level.allTeamsRollup.aboveEpicTotalMax )}}">
                                <span class="pr-1">{{this.emptyIfFalsey(teamRollup.aboveEpic.someEstimated)}}</span>
                            </div>
                            <div class="${interactableClasses} bg-behind" on:click="this.showModal(teamRollup,'aboveEpic','onlyUnestimated')"
                                style="width: {{ this.percent(teamRollup.aboveEpic.onlyUnestimated, level.allTeamsRollup.aboveEpicTotalMax )}}">
                                <span class="pr-1">{{this.emptyIfFalsey(teamRollup.aboveEpic.onlyUnestimated)}}</span>
                            </div>
                            <div class="${interactableClasses} bg-notstarted" on:click="this.showModal(teamRollup,'aboveEpic','noEpic')"
                                style="width: {{ this.percent(teamRollup.aboveEpic.noEpics, level.allTeamsRollup.aboveEpicTotalMax )}}">
                                <span class="pr-1">{{this.emptyIfFalsey(teamRollup.aboveEpic.noEpics)}}</span>
                            </div>
                        </div>

                    {{/ }}
                    <p class="text-xs pl-3" style="grid-column: 1 / -1">Issue Rollup:</p>
                    {{# for(issue of level.issues) }}

                        <div class="pl-5"><a target="_blank" href="{{issue.url}}">{{issue.Summary}}</a></div>
                        <div class="text-right">{{issue.rollups.epic.total}}</div>
                        <div style="grid-column: 3 / span 2" class="flex">
                            <div class="${interactableClasses} bg-complete" 
                                style="width: {{ this.percent(issue.rollups.epic.estimated, level.allIssuesRollup.epicTotalMax )}}"
                                on:click="this.showModal(issue,'epic','estimated')"><span class="pr-1">{{issue.rollups.epic.estimated}}</span></div>
                            <div 
                                class="${interactableClasses} bg-notstarted" 
                                style="width: {{ this.percent(issue.rollups.epic.unestimated, level.allIssuesRollup.epicTotalMax )}}"
                                on:click="this.showModal(issue,'epic','unestimated')"><span class="pr-1">{{this.emptyIfFalsey(issue.rollups.epic.unestimated)}}</span></div>
                        </div>
                        
                        <div class="text-right pl-6">{{issue.rollups.aboveEpic.total}}</div>
                        <div style="grid-column: 6 / span 4" class="flex">
                            <div class="${interactableClasses} bg-complete" on:click="this.showModal(issue,'aboveEpic','fullyEstimated')"
                                style="width: {{ this.percent(issue.rollups.aboveEpic.fullyEstimated, level.allIssuesRollup.aboveEpicTotalMax )}}">
                                <span class="pr-1">{{this.emptyIfFalsey(issue.rollups.aboveEpic.fullyEstimated)}}</span>
                            </div>
                            <div class="${interactableClasses} bg-ontrack" on:click="this.showModal(issue,'aboveEpic','someEstimated')"
                                style="width: {{ this.percent(issue.rollups.aboveEpic.someEstimated, level.allIssuesRollup.aboveEpicTotalMax )}}">
                                <span class="pr-1">{{this.emptyIfFalsey(issue.rollups.aboveEpic.someEstimated)}}</span>
                            </div>
                            <div class="${interactableClasses} bg-behind" on:click="this.showModal(issue,'aboveEpic','onlyUnestimated')"
                                style="width: {{ this.percent(issue.rollups.aboveEpic.onlyUnestimated, level.allIssuesRollup.aboveEpicTotalMax )}}">
                                <span class="pr-1">{{this.emptyIfFalsey(issue.rollups.aboveEpic.onlyUnestimated)}}</span>
                            </div>
                            <div class="${interactableClasses} bg-notstarted" on:click="this.showModal(issue,'aboveEpic','noEpic')"
                                style="width: {{ this.percent(issue.rollups.aboveEpic.noEpics, level.allIssuesRollup.aboveEpicTotalMax )}}">
                                <span class="pr-1">{{this.emptyIfFalsey(issue.rollups.aboveEpic.noEpics)}}</span>
                            </div>
                        </div>

                        
                    {{/ }}
                    
                {{/ }}
                    
                </div>
                {{/ if }}
            </div>
           
        </details>
        
        <dialog on:close="this.modalIssues = null" this:to="this.dialog">
            <div class="p-4">
                <h2 class="text-lg pb-4">{{this.modalTitle}}</h2>
                <ul>
                    {{# for(issue of this.modalIssues) }}
                        <li><a target="_blank" href="{{issue.url}}">{{issue.Summary}}</a></li>
                    {{/ for }}
                </ul>
                <form>
                <button value="cancel" formmethod="dialog" class="btn-secondary mt-4" autofocus>Close</button>
                </form>
            </div>
        </dialog>
        
    `;

    static props = {
        getTeamKey: Function,
        getEstimate: Function,
        getConfidence: Function,
        modalIssues: type.maybe(Array),
        dialog: HTMLElement,
        showing: false,
        modalTitle: String,

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
                // get maxes on everything
                const allIssuesRollup = {
                    epicTotalMax: Math.max(...level.issues.map( i => i.rollups.epic.total )),
                    aboveEpicTotalMax: Math.max(...level.issues.map( i => i.rollups.aboveEpic.total ))
                }
                const teams = Object.values(level.teams).sort(sortTeamsByEpicCountThenStatus)
                const allTeamsRollup = {
                    epicTotalMax: Math.max(...teams.map( t => t.epic.total )),
                    aboveEpicTotalMax: Math.max(...teams.map( t => t.aboveEpic.total ))
                }
                return {
                    ...level,
                    issues: level.issues.sort(sortIssuesByEpicCountThenStatus),
                    allIssuesRollup,
                    teams,
                    allTeamsRollup
                }
            })

            return sorted;
        }
        
    };
    percent(top, bottom){
        if(!bottom) {
            return "0%";
        }
        return (top * 100 / bottom)+"%"
    }
    emptyIfFalsey(value){
        if(!value) {
            return ""
        } else {
            return value;
        }
    }
    connected(){
        // make sure the dialog closes correctly
        this.listenTo(this.dialog, "click",(event)=> {
            if (event.target === this.dialog) {
                this.dialog.close();
            }
        })
    }
    showModal(issue,type, valueName){
        const rollups =  issue.rollups || issue;
        const issues = rollups[type][valueName+"Issues"];
        this.modalTitle = ({
            epic: {
                estimated: "Estimated Epics",
                unestimated: "Unestimated Epics"
            },
            aboveEpic: {
                noEpic: this.aboveEpicTypeName+"s that have no epics",
                onlyUnestimated: this.aboveEpicTypeName+"s whose epics have no estimates",
                someEstimated: this.aboveEpicTypeName+"s that are partially estimated",
                fullyEstimated: this.aboveEpicTypeName+"s that are fully estimated",
            }
        })[type][valueName] || "Issues";
        this.modalIssues = issues.flat(Infinity);
        this.dialog.showModal();
    }
    downloadCSV(){
        const rawData = this.hierarchyLevelReportingData;
        const rowsData = [];

        const flattenRollups = (rollups) => {
            const result = {};
            for(let key in rollups.aboveEpic) {
                result[this.aboveEpicTypeName+" "+key] = rollups.aboveEpic[key];
            }
            for(let key in rollups.epic) {
                result["epic "+key] = rollups.epic[key];
            }
            return result;
        }

        for(let issueType of rawData) {
            for(let team of issueType.teams) {
                rowsData.push({
                    "IssueType": issueType.type.name,
                    "RollupType": "Team",
                    "Name": team.name,
                    "Team": team.name,
                    ... flattenRollups(team)
                })
            }

            for(let issue of issueType.issues) {
                let teamName = this.getTeamKey(issue);
                rowsData.push({
                    "IssueType": issueType.type.name,
                    "RollupType": "Issue",
                    "Name": issue.Summary,
                    "Team": teamName,
                    ... flattenRollups(issue.rollups)
                })
            }

        }

        function convertToCSV(data) {
            const headers = Object.keys(data[0]);
            const rows = data.map(obj => headers.map(header => JSON.stringify(obj[header], replacer)).join(","));
            return [headers.join(","), ...rows].join("\r\n");
        }

        function replacer(key, value) {
            return value === null || value === undefined ? '' : value;
        }

        const csvContent = convertToCSV(rowsData);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) { // Feature detection
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "data.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
    log(issue) {
        console.log(issue);
    }


}

customElements.define("estimation-progress-report", EstimationProgressReport);


function sortIssuesByEpicCountThenStatus(issueA, issueB){
    return sortTeamsByEpicCountThenStatus(issueA.rollups, issueB.rollups);
}

function sortTeamsByEpicCountThenStatus(rollupsA, rollupsB){
    if(rollupsA.epic.total > rollupsB.epic.total) {
        return -1;
    }
    if(rollupsA.epic.total < rollupsB.epic.total) {
        return 1;
    }
    if(rollupsA.epic.estimated > rollupsB.epic.estimated) {
        return -1;
    }
    if(rollupsA.epic.estimated < rollupsB.epic.estimated) {
        return 1;
    }
}

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

        // Epic
        if(hierarchyLevel === 1) {
            let estimate = getEstimate(issue);
            let confidence = getConfidence(issue);
            const isEstimated = estimate != null && confidence != null;

            issue.rollups.epic.total++;
            if(isEstimated) {
                issue.rollups.epic.estimated++;
                issue.rollups.epic.estimatedIssues.push(issue);
            } else {
                issue.rollups.epic.unestimated++;
                issue.rollups.epic.unestimatedIssues.push(issue);
            }
            
            updateTeamAndParentRollups(hierarchyLevels, issue, {getTeamKey, getParent});
        }
        // Initiative
        else if(hierarchyLevel === 2) {
            // this is an initiative labelling itself
            issue.rollups.aboveEpic.total= 1;
            if(issue.rollups.epic.total === 0) {
                issue.rollups.aboveEpic.noEpics = 1;
                issue.rollups.aboveEpic.noEpicIssues.push(issue);
            }
            else if(issue.rollups.epic.total === issue.rollups.epic.estimated) {
                issue.rollups.aboveEpic.fullyEstimated = 1;
                issue.rollups.aboveEpic.fullyEstimatedIssues.push(issue);
            } 
            else if(issue.rollups.epic.total > 0 && issue.rollups.epic.estimated === 0) {
                issue.rollups.aboveEpic.onlyUnestimated = 1;
                issue.rollups.aboveEpic.onlyUnestimatedIssues.push(issue);
            }
            else {
                issue.rollups.aboveEpic.someEstimated = 1;
                issue.rollups.aboveEpic.someEstimatedIssues.push(issue);
            }

            updateTeamAndParentRollups(hierarchyLevels, issue, {getTeamKey, getParent});
        }
        // Theme/Milestone/Outcome/Etc
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
    rollups.epic.estimatedIssues.push(issue.rollups.epic.estimatedIssues);

    rollups.epic.unestimated += issue.rollups.epic.unestimated;
    rollups.epic.unestimatedIssues.push(issue.rollups.epic.unestimatedIssues);

    rollups.aboveEpic.total += issue.rollups.aboveEpic.total;

    rollups.aboveEpic.noEpics += issue.rollups.aboveEpic.noEpics;
    rollups.aboveEpic.noEpicIssues.push( issue.rollups.aboveEpic.noEpicIssues );

    rollups.aboveEpic.fullyEstimated += issue.rollups.aboveEpic.fullyEstimated;
    rollups.aboveEpic.fullyEstimatedIssues.push( issue.rollups.aboveEpic.fullyEstimatedIssues );

    rollups.aboveEpic.onlyUnestimated += issue.rollups.aboveEpic.onlyUnestimated;
    rollups.aboveEpic.onlyUnestimatedIssues.push( issue.rollups.aboveEpic.onlyUnestimatedIssues );

    rollups.aboveEpic.someEstimated += issue.rollups.aboveEpic.someEstimated;
    rollups.aboveEpic.someEstimatedIssues.push( issue.rollups.aboveEpic.someEstimatedIssues );
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
            noEpicIssues: [],
            onlyUnestimated: 0,
            onlyUnestimatedIssues: [],
            someEstimated: 0,
            someEstimatedIssues: [],
            fullyEstimated: 0,
            fullyEstimatedIssues: []
        },
        epic: {
            estimated: 0,
            estimatedIssues: [],
            unestimated: 0,
            unestimatedIssues: [],
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