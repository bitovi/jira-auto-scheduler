import { StacheElement, type, ObservableObject, fromAttribute, queues } from "//unpkg.com/can@6/core.mjs";
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
        <div 
            class="p-2 grid gap-1"
            style="grid-template-columns: repeat(8, auto); ">
            <div>Key</div>
            <div>Summary</div>
            <div>Current Story Points</div><div>Updated Story Points</div>
            <div>Current Start Date</div><div>Updated Start Date</div>
            <div>Current Due Date</div><div>Updated Due Date</div>
            {{# for(workItem of this.workItemsWithDates) }}
                <div>{{workItem.work.issue["Issue key"]}}</div>
                <div>{{workItem.work.issue.Summary}}</div>
                <div>{{workItem.work.issue[this.storyPointField]}}</div>
                <div>{{ round( workItem.dates.totalPoints ) }}</div>
                <div>{{workItem.work.issue[this.startDateField]}}</div>
                <div>{{ jiraDates( workItem.dates.startDate ) }}</div>
                <div>{{workItem.work.issue[this.dueDateField]}}</div>
                <div>{{ jiraDates( workItem.dates.dueDate ) }}</div>
            {{/ for }}
        </div>
    `;
    static props = {
        workItems: type.Any,
        storyPointField: String,
        startDateField: String,
        dueDateField: String,
        startDate: Date
    };
    get workItemsWithDates(){
        return this.workItems.map( (workItem)=> {
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
}

export default UpdateEpics;

customElements.define("update-epics", UpdateEpics);