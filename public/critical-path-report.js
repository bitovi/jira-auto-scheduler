import { StacheElement, type, ObservableObject, fromAttribute, queues } from "./can.js";

class CriticalPathReport extends StacheElement {
    static view = `
        <details on:toggle="this.showing = scope.element.open">
        <summary class="cursor-pointer"><b class="font-bold">Critical Path Report</b> -
            Identify the long poles in your plan.
        </summary>
        {{# if(this.showing) }}
            <div class="grid gap-2" style="grid-template-columns: auto auto auto auto auto;">   
                <div>First Epic</div>
                <div>Days in Critical Path</div>
                <div>Following Epics in Critical Path</div>
                <div>Days for All blocked work</div>
                <div>Remaining Blocked Epics</div>

                {{# for(criticalPath of this.criticalPaths) }}
                    <div>
                        <a class="link cursor-pointer"
                            href="{{criticalPath.workItem.work.issue.url}}">{{criticalPath.workItem.work.issue.Summary}}</a>
                    </div>
                    <div>{{this.round(criticalPath.totalDaysInCriticalPath)}}</div>
                    <div>
                        <ul>
                            {{# for(workItem of criticalPath.blockedPath) }}
                            <li><a class="link cursor-pointer"
                                    href="{{workItem.work.issue.url}}">{{workItem.work.issue.Summary}}</a>
                            </li>
                            {{/ }}
                        </ul>
                    </div>
                    <div>{{this.round(criticalPath.totalDaysAcrossAllBlockedWork)}}</div>
                    <div>
                        <ul>
                            {{# for(workItem of criticalPath.otherBlockedWork) }}
                            <li><a class="link cursor-pointer"
                                    href="{{workItem.work.issue.url}}">{{workItem.work.issue.Summary}}</a>
                            </li>
                            {{/ }}
                        </ul>
                    </div>
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

