import { StacheElement, type, ObservableObject, fromAttribute, queues } from "./can.js";
import {scheduleIssues } from "./schedule.js";
import {bestFitRanges, getUTCEndDateFromStartDateAndBusinessDays} from "./shared/dateUtils.js"



import "./simulation-data.js";

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
        startDateMedian: 0,


        dueDateBottom10: 0,
        dueDateBottom: 0,
        dueDateMedian: 0,
        dueDateTop: 0,
        dueDateTop90: 0,
        dueDateTop95: 0,
        uncertaintyWeight: {type: type.Any, default: 90},
        startDateValues: {get default(){ return []}},
        dueDateValues: {get default(){ return []}},

        _holdingStartDates: {get default(){ return []}},
        _holdingDueDates: {get default(){ return []}},
    };
    addWork(work){
        // update new values
        //if(this.work.issue["Issue key"] === "STORE-2" && work.startDay > 0) {
        //    debugger;
        //}
        this._holdingStartDates.push(work.startDay);
        this._holdingDueDates.push(work.startDay + work.daysOfWork);
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
        
        this.startDateMedian = average(this.startDateValues);
        this.dueDateMedian = average(this.dueDateValues);

        const length = this.startDateValues.length;
        if(typeof this.uncertaintyWeight === "number"){
            this.startDateBottom = this.startDateValues[Math.min( Math.round(length * (100-this.uncertaintyWeight) /100), length - 1) ];
            this.dueDateBottom = this.dueDateValues[Math.min( Math.round(length * (100-this.uncertaintyWeight) / 100 ), length - 1) ];
            this.dueDateTop = this.dueDateValues[Math.min( Math.round(length *this.uncertaintyWeight / 100 ), length - 1) ];
        } else if(this.uncertaintyWeight === "average") {
            this.startDateBottom = this.startDateMedian;
            this.dueDateBottom = this.dueDateTop = this.dueDateMedian;
        }

        this.startDateBottom10 = this.startDateValues[Math.min( Math.round(length * 10 /100), length - 1) ];
        this.dueDateBottom10 = this.dueDateValues[Math.min( Math.round(length * 10 / 100 ), length - 1) ];
        this.dueDateTop90 = this.dueDateValues[Math.min( Math.round(length * 90 / 100 ), length - 1) ];
        this.dueDateTop95 = this.dueDateValues[Math.min( Math.round(length * 95 / 100 ), length - 1) ];

        
    }

}

class MonteCarlo extends StacheElement {
    static view = `
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
                    class="border-neutral-30 border-solid border-x px-1 text-xs"
                    style="grid-row: 1 / span {{plus(this.workPlans.gridRowSpan, 2)}}; grid-column: {{plus(timeRange.startDay, 1)}} / span {{timeRange.days}}"
                    >{{timeRange.prettyStart}}</div>
            {{/ for }}
            {{# for(workPlan of this.workPlans) }}
                <div
                    class="bg-neutral-20 pt-2 pb-1"
                    style="grid-row: {{workPlan.gridRowStart}} / span 1; grid-column: 1 / span {{ plus(this.gridNumberOfDays,1) }}"></div>
                <div 
                    class="pl-2 pt-2 pb-1 pr-1 flex"
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
                    class="flex flex-row-reverse  pt-2 z-20 pr-2"
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
                            class="pl-5 {{this.workIndexDependentStyles(scope.index, track.works.length)}} self-center pr-2"
                            style="grid-row: {{ plus(scope.index, track.gridRowStart, 1) }}; grid-column-start: what"
                            >
                            {{# if(work.work.issue.url) }}
                                <a href="{{work.work.issue.url}}" target="_blank">{{work.work.issue.Summary}}</a>
                            {{ else }}
                                <span>{{work.work.issue.Summary}}</span>
                            {{/ if }}
                        </div>
                        <simulation-data
                            class="relative block" 
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

    `;
    static props = {
        configuration: type.Any,
        getVelocityForTeam: Function,
        updateVelocity: Function,
        rawIssues: type.Any,
        getParallelWorkLimit: Function,

        // [{teamKey, velocity, tracks: [{works: [WorkItem], workMap: {[KEY]: WorkItem} }] }]
        workPlans: type.Any,
        lastDueDay: {default: 1},
        allWorkItems: type.Any,
        totalSimulationsToRun: {default: 5000},
        totalSyncSimulations: {default: 50},
        simulationPercentComplete: {default: 0},
        velocities: type.Any,

        firstRunWorkPlans: {
            async(resolve) {
                this.runOneSimulation(resolve);
            }
        },
        startDate: type.maybeConvert(Date),
        endDateWorkItem: null
    };
    get gridNumberOfDays(){
        return this.lastDueDay + 1
    }
    get timeRanges(){
        const gridDays = this.gridNumberOfDays;
        // add an extra day to include the full range
        const endDate = getUTCEndDateFromStartDateAndBusinessDays(this.startDate, gridDays + 1);
        const ranges = bestFitRanges(this.startDate, endDate, 12);
        return ranges;
    }
    // High level ... we listen to a "computed" run of `scheduleIssues`,
    // When that produces a result, we run the simulation over and over
    connected(){
        this.listenTo("scheduledAllWork", this.insertBlockers.bind(this))

        this.listenTo("firstRunWorkPlans",({value})=>{
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
        })
    }

    runOneSimulation(success){
        if(!this.configuration || !this.rawIssues.length) {
            return success(undefined);
        }
        scheduleIssues(this.rawIssues, {
            uncertaintyWeight: null,
            onPlannedIssues: success,
            getVelocity: this.getVelocityForTeam.bind(this),
            onIgnoredIssues: function(ignored, reason){
                //console.log(ignored, reason);
            },
            // Overwrite for EB
            getEstimate: this.configuration.getEstimate,
            getTeamKey: this.configuration.getTeamKey,
            getParentKey: this.configuration.getParentKey,
            getConfidence: this.configuration.getConfidence,
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
        const runBatch = (remainingSimulations, syncRuns = 50) => {
            for(let i = 0; i < syncRuns; i++) {
                this.runOneSimulation(addResults);
            }
            updateAllStats();
            remainingSimulations = remainingSimulations - syncRuns;
            
            if(remainingSimulations > 0) {
                this.simulationPercentComplete = (this.totalSimulationsToRun - remainingSimulations) / this.totalSimulationsToRun * 100;
                setTimeout(()=> runBatch(remainingSimulations, syncRuns), 1)
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
        let lastDay = 0,
            lastWork = null;
        const baseWorkPlans = Object.values(workPlans).map( ({teamKey, velocity, workPlans}) => {
            const tracks = workPlans.plans.map( (trackPlan)=> {
                const track = {works: [], workMap: {}};
                for( const work of trackPlan.work){
                    const workItem = new WorkItem({work, uncertaintyWeight: this.uncertaintyWeight, dueDatesOnly: false});
                    track.workMap[work.issue["Issue key"]] = workItem;
                    track.works.push(workItem);
                    workItem.addWork(work);
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
            }
        });
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
        setTimeout(()=> runBatch(this.totalSimulationsToRun, this.totalSyncSimulations), 13);
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
    insertBlockers(){
        const svg = this.getElementsByTagName("svg")[0];
        svg.innerHTML = "";
        const svgRect = svg.getBoundingClientRect();
        svg.setAttributeNS(null, "viewBox",`0 0 ${svgRect.width} ${svgRect.height}` );
        const svgPoint = getTopLeft(svg);

        const elementsAndWorkMap = {};
        [...this.getElementsByClassName("work-item")].forEach( (element) => {
            // the summary isn't part of allWorkItems
            if(this.allWorkItems[element.id]) {
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