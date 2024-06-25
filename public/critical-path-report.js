import { StacheElement, type, ObservableObject, fromAttribute, queues } from "./can.js";

class CriticalPathReport extends StacheElement {
    static view = `
        <details on:toggle="this.showing = scope.element.open">
        <summary class="cursor-pointer"><b class="font-bold">Critical Path Report</b> -
            Identify the long poles in your plan.
        </summary>
        {{# if(this.showing) }}
            <div class="grid gap-2 py-2" style="grid-template-columns: auto auto auto auto auto;">   
                <div class="font-bold">First Epic</div>
                <div class="font-bold">Days in Critical Path</div>
                <div class="font-bold">Following Epics in Critical Path</div>
                <div class="font-bold">Days for All blocked work</div>
                <div class="font-bold">Remaining Blocked Epics</div>

                {{# for(criticalPath of this.criticalPaths) }}
                    {{# if(this.shouldShowPath(criticalPath) ) }}

                        <div style="grid-row: {{plus(scope.index,2)}} / span 1; grid-column: 1 / span 5"
                            class="bg-neutral-10"></div>
                        <div style="grid-row: {{plus(scope.index,2)}} / span 1; grid-column: 1 / span 1">
                            <a class="link cursor-pointer block"
                                href="{{criticalPath.workItem.work.issue.url}}">{{criticalPath.workItem.work.issue.Summary}}</a>
                            <button class="btn-secondary-sm rounded" on:click="this.toggleHighlight(criticalPath, scope.event)">
                                {{this.toggleText(criticalPath)}}
                            </button>
                        </div>
                        <div style="grid-row: {{plus(scope.index,2)}} / span 1; grid-column: 2 / span 1">{{this.round(criticalPath.totalDaysInCriticalPath)}}</div>
                        <div style="grid-row: {{plus(scope.index,2)}} / span 1; grid-column: 3 / span 1">
                            <ul>
                                {{# for(workItem of criticalPath.blockedPath) }}
                                <li><a class="link cursor-pointer"
                                        href="{{workItem.work.issue.url}}">{{workItem.work.issue.Summary}}</a>
                                </li>
                                {{/ }}
                            </ul>
                        </div>
                        <div style="grid-row: {{plus(scope.index,2)}} / span 1; grid-column: 4 / span 1">{{this.round(criticalPath.totalDaysAcrossAllBlockedWork)}}</div>
                        <div style="grid-row: {{plus(scope.index,2)}} / span 1; grid-column: 5 / span 1">
                            <ul>
                                {{# for(workItem of criticalPath.otherBlockedWork) }}
                                <li><a class="link cursor-pointer"
                                        href="{{workItem.work.issue.url}}">{{workItem.work.issue.Summary}}</a>
                                </li>
                                {{/ }}
                            </ul>
                        </div>
                    {{/}}
                {{/ for }}
            </div>
        {{/ }}
        </details>
    `;

    static props = {
        workItems: type.Any,
        showing: false,
    };
    round(number){
        return Math.round(number);
    }
    plus(a, b) {
        return a + b;
    }
    toggleText(criticalPath) {
        const startingKey = criticalPath.workItem.work.issue["Issue key"];

        if(this.workItemsToHighlight && this.workItemsToHighlight.has(startingKey)) {
            return "Show all work"
        } else {
            return "Show critical path and blocked work"
        }
    }
    shouldShowPath(criticalPath){
        if(!this.workItemsToHighlight) {
            return true;
        } 
        else {
            const startingKey = criticalPath.workItem.work.issue["Issue key"];
            return this.workItemsToHighlight.has(startingKey);
        }
    }
    toggleHighlight(criticalPath, event) {
        const startingKey = criticalPath.workItem.work.issue["Issue key"];

        if(this.workItemsToHighlight && this.workItemsToHighlight.has(startingKey)) {
            maintainElementPosition(event.target, ()=> {
                this.workItemsToHighlight = null
            })
        } else {
            const pathKeys = criticalPath.blockedPath.map( (workItem)=> {
                return workItem.work.issue["Issue key"];
            })
    
            const otherWorkKeys = criticalPath.otherBlockedWork.map( (workItem)=> {
                return workItem.work.issue["Issue key"];
            })
            
            maintainElementPosition(event.target, ()=> {
                this.workItemsToHighlight = new Set([startingKey, ...pathKeys, ...otherWorkKeys]);
            })
            
        }
    }
    get criticalPaths(){

        const keyToWorkItem = this.workItems;

        const sorted = Object.values(this.workItems).sort(sortWorkItemsByBlocksWorkDepth);

        const excludedKeys = new Set();

        function recursivelyAddToCriticalPath(criticalPath, blocked){
            const blockingWorkItems = blocked.map( (issue)=> {
                return keyToWorkItem[issue["Issue key"]]
            }).sort(sortWorkItemsByBlocksWorkDepth);

            if(blockingWorkItems.length) {
                criticalPath.blockedPath.push( blockingWorkItems[0] );
                excludedKeys.add(blockingWorkItems[0].work.issue["Issue key"]);
                
                criticalPath.totalDaysInCriticalPath += blockingWorkItems[0].adjustedDaysOfWork;
                criticalPath.totalDaysAcrossAllBlockedWork += blockingWorkItems[0].adjustedDaysOfWork;

               
                recursivelyAddToCriticalPath(criticalPath, blockingWorkItems[0].work.issue.blocks );
                recursivelyAddToOtherBlockedWork(criticalPath, blockingWorkItems.slice(1));
            }
        }
        
        function recursivelyAddToOtherBlockedWork(criticalPath, blockedWork){
            
            blockedWork.forEach( (workItem)=> {
                excludedKeys.add(workItem.work.issue["Issue key"]);
                if(!criticalPath.otherBlockedWork.has(workItem)) {
                    criticalPath.otherBlockedWork.add(workItem);
                    criticalPath.totalDaysAcrossAllBlockedWork += workItem.adjustedDaysOfWork;
                    const blockingWorkItems = workItem.work.issue.blocks.map( (issue)=> {
                        return keyToWorkItem[issue["Issue key"]];
                    }).sort(sortWorkItemsByBlocksWorkDepth)
                    recursivelyAddToOtherBlockedWork(criticalPath, blockingWorkItems);
                }
            } );
        }
        
        const criticalPaths = sorted.map( (workItem)=> {
            // what it is ... what's it's critical path, what else it blocks ....
            const criticalPath = {
                workItem,
                blockedPath: [],
                totalDaysInCriticalPath: workItem.adjustedDaysOfWork,
                otherBlockedWork: new Set(),
                totalDaysAcrossAllBlockedWork: workItem.adjustedDaysOfWork,
                include: !excludedKeys.has( workItem.work.issue["Issue key"] )
            }
            excludedKeys.add(workItem.work.issue["Issue key"]);

            recursivelyAddToCriticalPath(criticalPath, workItem.work.issue.blocks);
            return criticalPath;
        });
        // these are the critical blocks of work
        const isolatedCriticalPaths = criticalPaths.filter( cp => cp.include).map( cp => {
            return {...cp, otherBlockedWork: [...cp.otherBlockedWork]}
        }).sort((cpA, cpB)=> cpB.totalDaysInCriticalPath - cpA.totalDaysInCriticalPath);
        return isolatedCriticalPaths;
    }
}

function sortWorkItemsByBlocksWorkDepth(wiA, wiB){
    return wiB.work.issue.blocksWorkDepth - wiA.work.issue.blocksWorkDepth;
}

customElements.define("critical-path-report", CriticalPathReport);



// Function to get the element's position relative to the document
function getElementPosition(elem) {
    var rect = elem.getBoundingClientRect();
    return {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX
    };
}

// Function to maintain the element's position during DOM changes
function maintainElementPosition(elem, domChangesCallback) {
    // Step 1: Store the current scroll position
    const scrollTop = window.scrollY;

    // Step 2: Store the element's position
    const elemPosition = getElementPosition(elem);

    const howFarDown = elemPosition.top - scrollTop;

    // Step 3: Perform the DOM changes
    domChangesCallback();



    // Step 4: Restore the scroll position
    // window.scrollTo(0, scrollTop);

    // Step 5: Adjust the element's position if necessary
    const newElemPosition = getElementPosition(elem);
    const newScroll = newElemPosition.top - howFarDown;

    
    console.log("original scroll", scrollTop, "original top",elemPosition.top, "howFarDown",howFarDown, "current scroll",window.scrollY, "new top",newElemPosition.top, "updating to ", newScroll)
    window.scrollTo(0, newScroll);
    
}

