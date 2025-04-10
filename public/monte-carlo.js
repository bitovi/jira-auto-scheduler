import { StacheElement, type, ObservableObject, fromAttribute, queues } from "./can.js";
import {scheduleIssues } from "./schedule.js";
import {bestFitRanges, getUTCEndDateFromStartDateAndBusinessDays} from "./shared/dateUtils.js"
import log from "./debug-log.js";
import { defineFeatureFlag } from "./feature-flag.js";

import "./simulation-data.js";

const TIME_BETWEEN_BATCHES = 1;

function compareNumbers(a, b) {
    return a - b;
  }

function sortedIndex(array, value) {
    let low = 0;
    let high = array.length;
  
    while (low < high) {
      let mid = Math.floor((low + high) / 2);
      if (array[mid] < value) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
  
    return low;
}

function average(array) {
    let sum = 0;
    for (let i = 0; i < array.length; i++) {
      sum += array[i];
    }
    return sum / array.length;
  }


class WorkItem extends ObservableObject {
    static props = {
        work: type.Any,

        startDateBottom: 0,
        startDateBottom10: 0, 
        startDateAverage: 0,


        dueDateBottom10: 0,
        dueDateBottom: 0,
        dueDateAverage: 0,
        dueDateTop: 0,
        dueDateTop90: 0,
        dueDateTop95: 0,

        adjustedDaysOfWork: 0,
        
        startDateWithTimeEnoughToFinish: 0,

        uncertaintyWeight: {type: type.Any, default: 90},
        startDateValues: {get default(){ return []}},
        dueDateValues: {get default(){ return []}},
        adjustedDaysOfWorkValues: {get default(){ return []}},

        _holdingStartDates: {get default(){ return []}},
        _holdingDueDates: {get default(){ return []}},
        _holdingAdjustedDaysOfWork: {get default(){ return []}},
    };
    addWork(work){
        // update new values
        //if(this.work.issue["Issue key"] === "IMP-121") {
        //    debugger;
        //}
        this._holdingStartDates.push(work.startDay);
        this._holdingDueDates.push(work.startDay + work.daysOfWork);
        this._holdingAdjustedDaysOfWork.push(work.daysOfWork);
        //this.startDateValues.push(work.startDay);
        //this.dueDateValues.push(work.startDay + work.daysOfWork);
    }
    updateStats(){
        
        this.startDateValues.push(...this._holdingStartDates);
        this.startDateValues.sort(compareNumbers);
        this._holdingStartDates = [];
        
        this.dueDateValues.push(...this._holdingDueDates);
        this.dueDateValues.sort(compareNumbers);
        this._holdingDueDates = [];

        this.adjustedDaysOfWorkValues.push(...this._holdingAdjustedDaysOfWork);
        this.adjustedDaysOfWorkValues.sort(compareNumbers);
        this._holdingAdjustedDaysOfWork = [];
        
        this.startDateAverage = average(this.startDateValues);
        this.dueDateAverage = average(this.dueDateValues);
        
    
        const length = this.startDateValues.length;
        if(typeof this.uncertaintyWeight === "number"){
            const uncertaintyIndex = Math.min( Math.round(length *this.uncertaintyWeight / 100 ), length - 1),
                    confidenceIndex = Math.max( length - 1 - uncertaintyIndex, 0 );
            this.startDateBottom = this.startDateValues[confidenceIndex ];
            this.dueDateBottom = this.dueDateValues[ confidenceIndex ];
            this.dueDateTop = this.dueDateValues[ uncertaintyIndex ];

            // There is a much performant way of doing this ... will do it later
            this.adjustedDaysOfWork = this.adjustedDaysOfWorkValues[uncertaintyIndex];
            
        } else if(this.uncertaintyWeight === "average") {
            this.startDateBottom = this.startDateAverage;
            this.dueDateBottom = this.dueDateTop = this.dueDateAverage;
            this.adjustedDaysOfWork = average(this.adjustedDaysOfWorkValues);
        }

        this.startDateBottom10 = this.startDateValues[Math.min( Math.round(length * 10 /100), length - 1) ];
        this.dueDateBottom10 = this.dueDateValues[Math.min( Math.round(length * 10 / 100 ), length - 1) ];
        this.dueDateTop90 = this.dueDateValues[Math.min( Math.round(length * 90 / 100 ), length - 1) ];
        this.dueDateTop95 = this.dueDateValues[Math.min( Math.round(length * 95 / 100 ), length - 1) ];

        this.startDateWithTimeEnoughToFinish = this.dueDateTop - this.adjustedDaysOfWork;
    }

}

const deterministicallySelectIssueTiming = defineFeatureFlag("deterministicallySelectIssueTiming",`

Turns off the montecarlo simulation and runs a single scheduling pass. Epic time will be expanded to account 
for the probability threshold. Then the scheduling pass will take place. 



This will make series of epics take longer than they would normally. 
This will make parallel epics take less time than they should.

`, false)


class MonteCarlo extends StacheElement {
    static view = `
        {{# if(this.warnings.length) }}
            {{# for(warning of this.warnings)}}
                <div class="text-lg bg-yellow-500 p-4">
                    {{warning}}
                </div>
            {{/ for }}
        {{ else }}

            <div class="absolute h-1 bg-orange-400 transition-opacity duration-500 {{# eq(this.simulationPercentComplete, 100) }}opacity-0{{/ eq }}" 
                style="width: {{this.simulationPercentComplete}}%; top: -7px;"></div>
            <div class="grid bg-white" 
                style="grid-template-columns: [what] auto repeat({{this.gridNumberOfDays}}, 1fr); grid-template-rows: auto repeat({{this.workPlans.gridRowSpan}}, auto) auto">
                <div 
                    class="relative z-5"
                    style="grid-row: 2 / span {{this.workPlans.gridRowSpan}}; grid-column: 2 / span {{this.gridNumberOfDays}}" id="dependencies">
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        x="0" y="0"
                        class="absolute" width="100%" height="100%" preserveAspectRatio="none">
                        
                    </svg>
                </div>
                <div class="text-xs"
                style="grid-row: 1 / span 1; grid-column: 1 / span 1"
                >
                &nbsp; <!-- gives size to the top row -->

                
                </div>
                {{# for( timeRange of this.timeRanges) }}
                    <div
                        class="border-neutral-30 border-solid border-x px-1 text-xs truncate"
                        style="grid-row: 1 / span {{plus(this.workPlans.gridRowSpan, 2)}}; grid-column: {{plus(timeRange.startDay, 1)}} / span {{timeRange.days}}"
                        >{{timeRange.prettyStart}}</div>
                {{/ for }}
                {{# for(workPlan of this.workPlans) }}
                    <div
                        class="bg-neutral-20 pt-2 pb-1  sticky top-0"
                        style="grid-row: {{workPlan.gridRowStart}} / span 1; grid-column: 1 / span {{ plus(this.gridNumberOfDays,1) }}"></div>
                    <div 
                        class="pl-2 pt-2 pb-1 pr-1 flex sticky top-0"
                        style="grid-row: {{workPlan.gridRowStart}} / span 1; grid-column-start: what">
                        <div class="text-base grow font-semibold">{{workPlan.teamKey}}</div>
                        {{# not(workPlan.disableVelocity) }}
                        <div class="flex flex-col justify-around"><button
                            title="Add a parallel work track for this team."
                            on:click="this.addWorkPlanForTeam(workPlan.teamKey)" 
                            class="btn-secondary-sm shrink text-xs font-mono">+</button></div>
                        {{/ }}
                    </div>
                    <div
                        class="pl-2 pt-2 pb-1 pr-1 text-xs" 
                        style="grid-row: {{workPlan.gridRowStart}} / span 1; grid-column: 2 / span {{this.gridNumberOfDays}}">
                        
                    </div>
                    
                    <div
                        class="flex flex-row-reverse  pt-2 z-20 pr-2 gap-2"
                        style="grid-row: {{workPlan.gridRowStart}} / span 1; grid-column: 2 / span {{this.gridNumberOfDays}}">
                        {{# not(workPlan.disableVelocity) }}
                            <div class="text-sm">
                                Velocity: 
                                
                                <input
                                    type="number"
                                    value:from='this.getVelocityForTeam(workPlan.teamKey)'
                                    on:change='this.updateVelocity(workPlan.teamKey, scope.element.valueAsNumber)'
                                    class="form-border w-10 text-sm text-center" />
                            </div>
                            <div class="text-sm border-transparent border">
                                Track Working Days: {{this.roundedTotalWorkingDays(workPlan)}}, 
                                Team Working Days: {{this.roundedTeamWorkingDays(workPlan)}}</div>
                        {{/ not}}
                        
                    </div>
                    {{# for(track of workPlan.tracks) }}

                        <div
                            class="pl-4 flex pt-0.5 pr-1" 
                            style="grid-row: {{track.gridRowStart}} / span 1; grid-column-start: what">
                            {{# not(workPlan.disableTracks) }}
                                <div class="text-xs grow ">Track {{track.name}}</div>
                                {{# if( this.canRemoveTrack(scope.index, workPlan.tracks.length) ) }}
                                    <button 
                                        title="Remove a work track for this team."
                                        on:click="this.removeWorkPlanForTeam(workPlan.teamKey)"
                                        class="btn-secondary-sm shrink text-xs font-mono">-</button>
                                {{/ if }}
                            {{/ not}}
                        </div>

                        {{# for(work of track.works) }}
                            <div 
                                id="{{work.work.issue["Issue key"]}}-timeline-summary"
                                class="pl-5 {{this.workIndexDependentStyles(scope.index, track.works.length)}} 
                                    {{this.highightingClasses(work)}} self-center pr-2 truncate max-w-sm"
                                style="grid-row: {{ plus(scope.index, track.gridRowStart, 1) }}; grid-column-start: what"
                                >
                                {{# if(work.work.issue.url) }}
                                    <a href="{{work.work.issue.url}}" target="_blank">{{work.work.issue.Summary}}</a>
                                {{ else }}
                                    <span>{{work.work.issue.Summary}}</span>
                                {{/ if }}
                            </div>
                            <simulation-data
                                class="relative block {{this.highightingClasses(work)}}" 
                                style="grid-row: {{ plus(scope.index, track.gridRowStart, 1) }}; grid-column: 2 / span {{this.gridNumberOfDays}}"
                                on:el:mouseenter="this.showDependencies(work)"
                                on:el:mouseleave="this.hideDependencies(work)"
                                on:resized="this.insertBlockers()"
                                id="{{work.work.issue["Issue key"]}}-timeline"
                                lastDueDay:from="this.lastDueDay"
                                work:from="work"
                                startDate:from="this.startDate"
                                uncertaintyWeight:from="this.uncertaintyWeight"
                                >
                            </simulation-data>
                        {{/ for }}
                    {{/ for }}
                {{/ }}
            </div>
        {{/ if }}
    `;
    static props = {
        workItemsToHighlight: type.Any,
        configuration: type.Any,
        getVelocityForTeam: Function,
        updateVelocity: Function,
        rawIssues: type.Any,
        getParallelWorkLimit: Function,

        // [{teamKey, velocity, tracks: [{works: [WorkItem], workMap: {[KEY]: WorkItem} }] }]
        workPlans: type.Any,
        lastDueDay: {default: 1},
        allWorkItems: type.Any,
        totalSimulationsToRun: {default: 1000},
        totalSyncSimulations: {default: 25},
        simulationPercentComplete: {default: 0},
        get probablisticallySelectIssueTiming(){
            return !deterministicallySelectIssueTiming()
        },

        firstRunWorkPlans: {
            async(resolve) {
                this.runOneSimulation(resolve, true);
            }
        },
        startDate: type.maybeConvert(Date),
        endDateWorkItem: null,
        warnings: type.maybe( Array ),
        // A timer that we can clear on a restart
        timer: Number
    };
    get gridNumberOfDays(){
        return this.lastDueDay + 1
    }
    get timeRanges(){
        // grid number of days is how many columns there are in the actual CSS grid
        const gridDays = this.gridNumberOfDays;
        // add an extra day to include the full range
        const endDate = getUTCEndDateFromStartDateAndBusinessDays(this.startDate, gridDays + 1);
        const ranges = bestFitRanges(this.startDate, endDate, 12);
        return ranges;
    }
    // High level ... we listen to a "computed" run of `scheduleIssues`,
    // When that produces a result, we run the simulation over and over
    connected(){
        this.listenTo("scheduledAllWork", this.insertBlockers.bind(this));
        this.listenTo("workItemsToHighlight", this.insertBlockers.bind(this))

        this.listenTo("firstRunWorkPlans",({value})=>{
            this.warnings = null;
            this.removeBlockers();
            clearTimeout(this.timer);
            this.afterFirstSimulation(value)
        });
        this.afterFirstSimulation(this.firstRunWorkPlans);

        this.listenTo("uncertaintyWeight",({value})=> {
            queues.batch.start();
            for(let prop in this.allWorkItems) {
                const work = this.allWorkItems[prop];
                work.uncertaintyWeight = value;
                work.updateStats();
            }
            this.endDateWorkItem.uncertaintyWeight = value;
            this.endDateWorkItem.updateStats()
            queues.batch.stop();
            this.insertBlockers();
        });
    }
    highightingClasses(work) {
        if(this.workItemsToHighlight) {
            return this.workItemsToHighlight.has( work.work.issue["Issue key"] ) ? "" : "hidden"
        } else {
            return "";
        }
    }
    totalWorkingDays(workPlan) {
        return workPlan.tracks.reduce( (acc, track) => {
            return acc + track.works.reduce( (workAcc, work) => {
                return workAcc + work.adjustedDaysOfWork;
            }, 0)
        },0)
    }
    roundedTotalWorkingDays(workPlan){
        return Math.round( this.totalWorkingDays(workPlan) );
    }
    roundedTeamWorkingDays(workPlan){
        return Math.round( this.totalWorkingDays(workPlan) /  workPlan.tracks.length )
    }
    runOneSimulation(success, first){
        if(!this.configuration || !this.rawIssues.length) {
            return success(undefined);
        }

        scheduleIssues(this.rawIssues, {
            // hard-coding 80 makes this not have to re-run the simulation on each movement
            uncertaintyWeight: this.probablisticallySelectIssueTiming ? 80 : this.uncertaintyWeight,
            planIssuesInUncertaintyOrder: true,
            probablisticallySelectIssueTiming: this.probablisticallySelectIssueTiming,
            onPlannedIssues: success,
            getVelocity: this.getVelocityForTeam.bind(this),
            onIgnoredIssues: function(ignored, reason){
                //console.log(ignored, reason);
            },
            // Overwrite for EB
            getEstimate: this.configuration.getEstimate,
            getConfidence: this.configuration.getConfidence,
            getTeamKey: this.configuration.getTeamKey,
            getParentKey: this.configuration.getParentKey,
            
            getParallelWorkLimit: this.getParallelWorkLimit
        })
        


        
    }
    afterFirstSimulation(workPlans){
        if(!workPlans) {
            return;
        }
        // tracks the end date stats
        const endDateWorkItem = this.endDateWorkItem = new WorkItem({
            work: {
                issue: {
                    Summary: "Due Date", "Issue key": "Due Date", 
                    blocks: [], 
                    blocking: [],
                    url: null
                }
            },
            uncertaintyWeight: this.uncertaintyWeight,
            dueDatesOnly: true
        });
        // a mapping to the "work stats" for each item
        const allWorkItems = this.allWorkItems = {};

        // a function to update all the work stats after a batch of runs
        const updateAllStats = () => {
            let largest = 0;
            queues.batch.start();
            for(let prop in allWorkItems) {
                const work = allWorkItems[prop];
                work.updateStats();
                largest = Math.max( work.dueDateTop95, largest)
            }
            this.lastDueDay = largest + 2; // 2 extra days for margin
            endDateWorkItem.updateStats();
            queues.batch.stop();
        }

        const allDone = ()=> {
            this.dispatch({type: "scheduledAllWork"});
        }

        // runs a batch of tests
        const runBatch = (remainingSimulations, syncRuns = 100) => {
            log("Running batch", remainingSimulations, syncRuns)
            for(let i = 0; i < syncRuns; i++) {
                this.runOneSimulation(addResults);
            }
            updateAllStats();
            remainingSimulations = remainingSimulations - syncRuns;
            
            if(remainingSimulations > 0) {
                this.simulationPercentComplete = (this.totalSimulationsToRun - remainingSimulations) / this.totalSimulationsToRun * 100;
                this.timer = setTimeout(()=> runBatch(remainingSimulations, syncRuns), TIME_BETWEEN_BATCHES)
            } else {
                this.simulationPercentComplete = 100;
                allDone();
            }
        }
        // Helper function for adding results of a simulation into "work stats"
        function addResults(teamWork) {
            let lastDay = 0,
                lastWork = null;
            for(let prop in teamWork) {
                const tracks = teamWork[prop].workPlans.plans;
                for( const track of tracks ) {
                    for( const work of track.work ) {
                        allWorkItems[work.issue["Issue key"]].addWork(work);
                        const endDay = work.startDay + work.daysOfWork;
                        if(endDay > lastDay) {
                            lastDay = endDay;
                            lastWork = work;
                        }
                    }
                }   
            }
            endDateWorkItem.addWork(lastWork);
        }

        // Here we take the first runs result and create the "amoritized" stats
        // objects for each issue
        const {baseWorkPlans, lastWork} = toBaseWorkPlans(allWorkItems, workPlans, this.uncertaintyWeight)

        if(lastWork === null) {
            // there's no work planned. Probably no epics, abort.
            this.warnings = ["There is no work to be simulated. Did you load any epics?"]
            return;
        }
        endDateWorkItem.addWork(lastWork);
        baseWorkPlans.unshift({
            teamKey: "Summary",
            velocity: null,
            tracks: [
                {works: [endDateWorkItem], workMap: {"SUMMARY": endDateWorkItem}}
            ],
            disableVelocity: true,
            disableTracks: true
        })

        updateAllStats();
        // Save a nice representation for the grid
        this.workPlans = gridifyWorkPlans(baseWorkPlans);

        // start running all the other simulations
        if(this.probablisticallySelectIssueTiming) {
            this.timer = setTimeout(()=> runBatch(this.totalSimulationsToRun, this.totalSyncSimulations), TIME_BETWEEN_BATCHES);
        } else {
            allDone();
        }
        
    }
    canRemoveTrack(index, tracksCount) {
        return tracksCount > 1 && index === 0;
    }
    plus(first, second, third = 0) {
        return first + second + third;
    }

    workIndexDependentStyles(index, itemsCount){
        if(index === itemsCount - 1 ) {
            return "pb-2"
        }
    }
    removeBlockers(){
        const svg = this.getElementsByTagName("svg")[0];
        svg.innerHTML = "";
        return svg;
    }
    insertBlockers(){
        const svg = this.removeBlockers();
        const svgRect = svg.getBoundingClientRect();
        svg.setAttributeNS(null, "viewBox",`0 0 ${svgRect.width} ${svgRect.height}` );
        const svgPoint = getTopLeft(svg);

        const elementsAndWorkMap = {};
        [...this.querySelectorAll(".work-item")].forEach( (element) => {
            // the summary isn't part of allWorkItems
            // offset parent makes sure it's visible
            if(this.allWorkItems[element.id] && element.offsetParent) {
                elementsAndWorkMap[element.id] = {
                    element,
                    work: this.allWorkItems[element.id]
                };
            }

        });

        for(const {element, work} of Object.values(elementsAndWorkMap)) {
            const blocks = work.work.issue.blocks;
            const blockerPoint = minusPoint( getCenterRight(element), svgPoint);
            
            for(const blocking of blocks ) {
                const blockedElement = elementsAndWorkMap[blocking["Issue key"]].element;
                const blockedPoint = minusPoint( getCenterLeft( blockedElement ), svgPoint);

                const blockingPath = path({
                    d: makeCurveBetweenPoints(blockerPoint, blockedPoint),
                        //C x1 y1, x2 y2, x y
                    
                });
                blockingPath.classList.add("path-blocker");
                blockingPath.id = work.work.issue["Issue key"]+"-"+blocking["Issue key"];

                svg.appendChild(blockingPath)
            }
        }
    }
    showDependencies(work){
        highlightDependencies(work.work.issue, "blocks", "blocked", 0);
        highlightDependencies(work.work.issue, "blockedBy", "blocking", 0);
    }
    hideDependencies(work) {
        unhighlightDependencies(work.work.issue, "blocks", "blocked", 0);
        unhighlightDependencies(work.work.issue, "blockedBy", "blocking", 0);
    }
}

// SVG HELPERS
function path(attributes){
    const path = document.createElementNS('http://www.w3.org/2000/svg',"path");
    for(let attr in attributes) {
        path.setAttributeNS(null, attr, attributes[attr]);
    }
    return path;
}

function getCenterRight(element){
    const rect = element.getBoundingClientRect();
    return {
        x: rect.right,
        y: rect.top + rect.height / 2 
    };
}
function getCenterLeft(element) {
    const rect = element.getBoundingClientRect();
    return {
        x: rect.left,
        y: rect.top + rect.height / 2 
    };
}

function sortByTeamKey(wpA, wpB){
    return wpA > wpB ? 1 : -1;
}
function onlyPlansWithWork({workPlans}) {
    return workPlans.plans.some(trackPlan => trackPlan.work.length)
}
function toBaseWorkPlans(allWorkItems, workPlans, uncertaintyWeight) {
    let lastDay = 0,
        lastWork = null;
    const sortedAndFilteredPlans = Object.values(workPlans).sort(sortByTeamKey).filter(onlyPlansWithWork);

    const baseWorkPlans = sortedAndFilteredPlans.map( ({teamKey, velocity, workPlans}) => {
        const tracks = workPlans.plans.map( (trackPlan)=> {
            const track = {works: [], workMap: {}};
            for( const work of trackPlan.work){
                const workItem = new WorkItem({work, uncertaintyWeight: uncertaintyWeight, dueDatesOnly: false});
                track.workMap[work.issue["Issue key"]] = workItem;
                track.works.push(workItem);
                workItem.addWork(work);
                // we should update this at some point
                allWorkItems[work.issue["Issue key"]] = workItem;
                const endDay = work.startDay + work.daysOfWork;
                if(endDay > lastDay) {
                    lastDay = endDay;
                    lastWork = work;
                }
            }
            return track
        });

        return {
            teamKey,
            velocity,
            tracks: tracks,
            disableTracks: false,
            disableVelocity: false
        };
    });
    return {baseWorkPlans, lastWork};
}

function getTopLeft(element) {
    const rect = element.getBoundingClientRect();
    return {
        x: rect.left,
        y: rect.top
    };
}

function minusPoint(pointA, pointB) {
    return {
        x: pointA.x - pointB.x,
        y: pointA.y - pointB.y
    }
}

function makeCurveBetweenPoints(start, end, controlDistance = 30) {
    return `M ${start.x} ${start.y} 
    c ${controlDistance} 0, ${end.x - start.x - controlDistance} ${end.y - start.y}, ${end.x - start.x} ${end.y - start.y}`
}


// CSS GRID HELPERS
function gridifyWorkPlans(workPlans){
    let previousWorkPlan;
    const plans = workPlans.map((workPlan, i)=>{
        const start =  previousWorkPlan ? previousWorkPlan.gridRowStart + previousWorkPlan.gridRowSpan : 2;
        const span = workPlan.tracks.length + workPlan.tracks.reduce((a, t)=> a+t.works.length,0) + 1;

        let previousTrack;
        const tracks = workPlan.tracks.map((t, i) => {
            return previousTrack = {
                ...t,
                gridRowStart: previousTrack ? previousTrack.gridRowStart + previousTrack.gridRowSpan + 1 : start+ 1,
                gridRowSpan: t.works.length,
                name: ""+(i+1)
            }
        })
        return previousWorkPlan = { 
            ...workPlan,
            gridRowStart:start,
            gridRowSpan: span,
            tracks
        }
    })
    const lastPlan = plans[plans.length - 1];
    plans.gridRowSpan = lastPlan.gridRowStart + lastPlan.gridRowSpan;
    return plans;
}

// HIGHLIGHT HELPERS
const getPath = {
    "blockedBy": function(base, second) {
        return document.getElementById(second+"-"+base);
    },
    "blocks": function(base, second) {
        return document.getElementById(base+"-"+second);
    }
}

function highlightDependencies(issue, key, className, depth=0) {
    const baseIssueKey = issue["Issue key"];
    (issue[key] || []).forEach( (issue)=> {
        const el = getPath[key](baseIssueKey, issue["Issue key"]);
        if(el) {
            el.classList.add(className+"-"+depth, "work-"+className );
        }
        highlightDependencies(issue, key, className, depth+1);
    });
}

function unhighlightDependencies(issue, key, className, depth=0) {
    const baseIssueKey = issue["Issue key"];
    (issue[key] || []).forEach( (issue)=> {
        const el = getPath[key](baseIssueKey, issue["Issue key"]);
        if(el) {
          el.classList.remove(className + "-"+depth, "work-"+className);
        }
        unhighlightDependencies(issue, key, className, depth+1);
    })
}


customElements.define("monte-carlo", MonteCarlo);

export default MonteCarlo;