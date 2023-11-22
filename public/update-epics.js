import { StacheElement, type, ObservableObject, fromAttribute, queues } from "./can.js";
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
                style="grid-template-columns: repeat(8, auto); ">
                <div style="grid-row: 1; grid-column: 1 / span 2" class="text-sm"></div>
                <div style="grid-row: 1; grid-column: 3 / span 2" class="text-sm text-center">Story Points</div>
                <div style="grid-row: 1; grid-column: 5 / span 2" class="text-sm text-center">Start Date</div>
                <div style="grid-row: 1; grid-column: 7 / span 2" class="text-sm text-center">Due Date</div>
                <div style="grid-row: 2; grid-column: 1" class="text-sm">Key</div>
                <div style="grid-row: 2; grid-column: 2" class="text-sm">Summary</div>
                <div style="grid-row: 2; grid-column: 3" class="text-sm pl-2">Current</div>
                <div style="grid-row: 2; grid-column: 4" class="text-sm pr-2">New</div>
                <div style="grid-row: 2; grid-column: 5" class="text-sm pl-2">Current</div>
                <div style="grid-row: 2; grid-column: 6" class="text-sm pr-2">New</div>
                <div style="grid-row: 2; grid-column: 7" class="text-sm pl-2">Current</div>
                <div style="grid-row: 2; grid-column: 8" class="text-sm">New</div>
                <div 
                    class="border-solid border-b border-neutral-40"
                    style="grid-row: 2 / span 1; grid-column: 1 / span 8"></div>
                {{# for(workItem of this.workItemsWithDates) }}
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
                    <button class="btn-primary" on:click="this.save(scope.event)">
                        Save selected changes in Jira
                    </button>
                {{/ if }}
                {{# if(this.issueUpdates.isRejected) }}
                    ERROR! Check Logs!
                {{/ if }}
            
                
                <button class="btn-secondary" value="cancel" formmethod="dialog">Cancel</button>
            </div>
        </form>
    `;
    static props = {
        workItems: type.Any,
        storyPointField: String,
        startDateField: String,
        dueDateField: String,
        startDate: Date,
        updatePromises: type.Any,
        issueUpdates: type.Any,
        jiraHelpers: type.Any
    };
    connected(){
        // this isn't great, but easy
        this.parentElement.showModal();
    }
    get workItemsWithDates(){
        return Object.values(this.workItems).map( (workItem)=> {
            const clone = workItem.serialize();
            clone.dates = getDatesFromWork(clone, this.startDate);
            return clone;
        }) 
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

        const allWork = this.workItemsWithDates.map( workItem => {
          return {
            ...workItem,
            updates: {
              [this.startDateField]: this.jiraDates( workItem.dates.startDate ),
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
      console.log(allWork);
      const updates = changedWork.map( workItem => {
        return {
            ...workItem,
            updatePromise: this.jiraHelpers.editJiraIssueWithNamedFields(workItem.work.issue["Issue key"], workItem.updates)
        }
      })
      this.issueUpdates = Promise.allSettled(updates.map( update => update.updatePromise));
      this.issueUpdates
        .then(()=> {
            console.log("SAVED");
            this.dispatch("saved");
        })
        .catch(e => {
            console.log(e)
        })
    }
}

export default UpdateEpics;

customElements.define("update-epics", UpdateEpics);