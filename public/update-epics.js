import { StacheElement, type, ObservableObject, fromAttribute, stache } from "./can.js";
import {getDatesFromWork} from "./simulation-data.js";

const jiraDataFormatter = new Intl.DateTimeFormat('en-CA', { // 'en-CA' uses the YYYY-MM-DD format
    year: 'numeric',
    month: '2-digit', // '2-digit' will ensure month is always represented with two digits
    day: '2-digit', // '2-digit' will ensure day is always represented with two digits
    calendar: 'iso8601', // This specifies usage of the ISO 8601 calendar
    timeZone: "UTC"
  });

class UpdateEpics extends StacheElement {
    static view = `
        <form class="p-4 rounded">
            <h3 class="text-lg font-semibold">Review changes</h3>
            <div 
                class="grid gap-x-3 py-4"
                style="grid-template-columns: repeat(9, auto); ">
                <div style="grid-row: 1; grid-column: 1 / span 3" class="text-sm"></div>
                <div style="grid-row: 1; grid-column: 4 / span 2" class="text-sm text-center">Story Points</div>
                <div style="grid-row: 1; grid-column: 6 / span 2" class="text-sm text-center">Start Date</div>
                <div style="grid-row: 1; grid-column: 8 / span 2" class="text-sm text-center">Due Date</div>
                <div style="grid-row: 2; grid-column: 1" class="text-sm">
                    <input type="checkbox"  
                        on:change="this.selectAll(scope.element.checked)"
                        checked:from="this.allWorkItemsSelected()"/>
                </div>
                <div style="grid-row: 2; grid-column: 2" class="text-sm">Key</div>
                <div style="grid-row: 2; grid-column: 3" class="text-sm">Summary</div>
                <div style="grid-row: 2; grid-column: 4" class="text-sm pl-2">Current</div>
                <div style="grid-row: 2; grid-column: 5" class="text-sm pr-2">New</div>
                <div style="grid-row: 2; grid-column: 6" class="text-sm pl-2">Current</div>
                <div style="grid-row: 2; grid-column: 7" class="text-sm pr-2">New</div>
                <div style="grid-row: 2; grid-column: 8" class="text-sm pl-2">Current</div>
                <div style="grid-row: 2; grid-column: 9" class="text-sm">New</div>
                <div 
                    class="border-solid border-b border-neutral-40"
                    style="grid-row: 2 / span 1; grid-column: 1 / span 9; z-index: -1"></div>
                {{# for(workItem of this.workItemsWithDates) }}
                    <div>
                        <input type="checkbox" 
                            on:change="this.selectWorkItem(workItem, scope.element.checked)"
                            checked:from="this.isWorkItemSelected(workItem)"/>
                    </div>
                    <div>{{workItem.work.issue["Issue key"]}}</div>
                    <div>{{workItem.work.issue.Summary}}</div>
                    <div class="pl-2 text-right">{{ this.oldStoryPoints(workItem) }}</div>
                    <div class="pr-2 {{this.storyPointsEqualClassName(workItem)}} text-right">{{ this.newStoryPoints(workItem) }}</div>
                    <div class="pl-2">{{workItem.work.issue[this.startDateField]}}</div>
                    <div class="pr-2 {{this.startDateEqualClassName(workItem)}}">{{ jiraDates( workItem.dates.startDate ) }}</div>
                    <div class="pl-2">{{workItem.work.issue[this.dueDateField]}}</div>
                    <div class=" {{this.dueDateEqualClassName(workItem)}}">{{ jiraDates( workItem.dates.dueDate ) }}</div>
                {{/ for }}
            </div>
            <div class="flex gap-2 flex-row-reverse">
                {{# if(this.issueUpdates.isPending) }}
                    <button class="btn-primary" disabled>
                    <svg class="animate-spin -ml-0.5 -mt-0.5 mr-1 h-e w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg> 
                    Saving changes in Jira
                    
                    </button>
                {{/ if }}
                {{# or(this.issueUpdates.isResolved, not(this.issueUpdates)) }}
                    <button class="btn-primary" on:click="this.save(scope.event)" disabled:from="not(this.selectedWorkItemsToBeSaved.length)">
                        Save selected changes in Jira
                    </button>
                {{/ or }}
                
                <button class="btn-secondary" value="cancel" formmethod="dialog">Cancel</button>
            </div>
            {{# eq(this.issueUpdateOutcome.status, "rejected") }}
            <div class="bg-yellow-500 p-4 mt-2">
                <p class="text-lg">There was an error saving to Jira!</p>
                <p>Error: {{this.issueUpdateOutcome.errorReasons[0]}}</p>
            </div>
            {{/ eq }}
        </form>
    `;
    static props = {
        workItems: type.Any,
        selectedWorkItems: {
            value({listenTo, resolve, lastSet}){
                console.log("YES")
                listenTo(lastSet, (value)=>{
                    resolve(value);
                })
                listenTo("workItems",()=>{
                    resolve(new Set())
                });
                resolve(new Set());
            }
        },
        storyPointField: String,
        startDateField: String,
        dueDateField: String,
        startDate: Date,
        issueUpdates: type.Any,
        jiraHelpers: type.Any,

        // {status: waiting|pending|rejected|fulfilled, errorReasons: []}
        issueUpdateOutcome: {
            value({listenTo, resolve}){
                function updateFromPromise(updatePromises){
                    if(!updatePromises) {
                        resolve({errorReasons: [], status: "waiting"})
                    } else {
                        resolve({errorReasons: [], status: "pending"})
                        updatePromises.then((outcomes)=>{
                            const errors = outcomes.filter( outcome => outcome.status === "rejected");
                            if(errors.length) {
                                return resolve({errorReasons: getNiceReasonsMessages( errors.map(error => error.reason) ), status: "rejected"})
                            } else {
                                return resolve({errorReasons: [], status: "fulfilled"})
                            }
                        });
                    }
                }
                listenTo("issueUpdates",({value})=>{
                    updateFromPromise(value)
                });
                updateFromPromise(this.updatePromises);
            }
        }
    };
    connected(){
        // this isn't great, but easy
        this.parentElement.showModal();
        this.listenTo("issueUpdateOutcome",({value})=>{
            if(value.status === "fulfilled") {
                this.issueUpdates = null;
                this.dispatch("saved");
            }
        })
    }
    selectAll(checked){
        this.selectedWorkItems = checked ? new Set( this.workItemsWithDates.map((workItem)=> {
            return workItem.work.issue["Issue key"];
        }) ) : new Set()
    }
    allWorkItemsSelected(){
        const selected = this.workItemsWithDates.map( (workItem)=> {
            return workItem.work.issue["Issue key"];
        })
        console.log(selected, this.selectedWorkItems);
        return selected.every( (key)=> {
            return this.selectedWorkItems.has( key )
        })
    }
    isWorkItemSelected(workItem){
        return this.selectedWorkItems.has( workItem.work.issue["Issue key"] )
    }
    selectWorkItem(workItem, checked){
        const key = workItem.work.issue["Issue key"];
        const newItems = new Set(this.selectedWorkItems);
        if(checked) {
            newItems.add(key)
        } else {
            newItems.delete(key)
        }
        this.selectedWorkItems = newItems;
    }
    get workItemsWithDates(){
        return Object.values(this.workItems).map( (workItem)=> {
            const clone = workItem.serialize();
            clone.dates = getDatesFromWork(clone, this.startDate);
            return clone;
        }) 
    }
    get selectedWorkItemsToBeSaved(){
        return this.workItemsWithDates.filter( (workItem)=> {
            return this.selectedWorkItems.has( workItem.work.issue["Issue key"] )
        });
    }
    jiraDates(date){
        return jiraDataFormatter.format(date)
    }
    round(number) {
        return Math.round(number)
    }
    oldStoryPoints(workItem) {
        return workItem.work.issue[this.storyPointField];
    }
    newStoryPoints(workItem) {
        return Math.round( workItem.dates.totalPoints );
    }
    storyPointsEqualClassName(workItem) {
        return this.oldStoryPoints(workItem) !== this.newStoryPoints(workItem) ? "bg-yellow-300" : "";
    }
    startDateEqualClassName(workItem) {
        return workItem.work.issue[this.startDateField] !== this.jiraDates( workItem.dates.startDate ) ? "bg-yellow-300" : "";
    }
    dueDateEqualClassName(workItem) {
        return workItem.work.issue[this.dueDateField] !== this.jiraDates( workItem.dates.dueDate ) ? "bg-yellow-300" : "";
    }
    save(event){
        event.preventDefault();
        const allWork = this.selectedWorkItemsToBeSaved.map( workItem => {
          return {
            ...workItem,
            updates: {
              [this.startDateField]: this.jiraDates( workItem.dates.startDateWithTimeEnoughToFinish ),
              [this.dueDateField]: this.jiraDates( workItem.dates.dueDate ),
              [this.storyPointField]: this.newStoryPoints(workItem)
            }
          };
        });
  
      const changedWork = allWork/*.filter((work) => {
        return work.issue["Start date"] !== work.updates["Start date"]  
          || work.issue["Due date"] !== work.updates["Due date"] 
          || work.issue["Story points"] !== work.updates["Story points"];
      });*/
      const updates = changedWork.map( workItem => {
        return {
            ...workItem,
            updatePromise: this.jiraHelpers.editJiraIssueWithNamedFields(workItem.work.issue["Issue key"], workItem.updates)
        }
      })
      this.issueUpdates = Promise.allSettled(updates.map( update => update.updatePromise));
      /*
      this.issueUpdates
        .then((values)=> {
            debugger;
            console.log("SAVED", values);

            if()
            this.dispatch("saved");
        })
        .catch(e => {
            debugger;
            console.log(e)
        })*/
    }
}

function getNiceReasonsMessages(reasons){
    return reasons.map(getNiceReasonsMessage);
}

function getNiceReasonsMessage(reason){
    if(Array.isArray( reason.errorMessages) && reason.errorMessages.length) {
        return reason.errorMessages[0]
    } else if(reason.errors ) {
        const message = Object.values(reason.errors)[0];
        if(message.includes("It is not on the appropriate screen, or unknown")) {
            return stache.safeString("A field is not on the screen associated with the epic."+
                " <a target='_blank' href='https://github.com/bitovi/jira-auto-scheduler/wiki/Troubleshooting#a-field-is-not-on-the-appropriate-screen'>Read how to fix it here.</a>")
        } else {
            return message;
        }
         
    } else {
        return reason.message;
    }
}


export default UpdateEpics;

customElements.define("update-epics", UpdateEpics);