import{c as t,a as e,g as s,b as i}from"./main-OanJOK3m.js";const r=new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",calendar:"iso8601",timeZone:"UTC"});class a extends t{static view='\n        <form class="p-4 rounded">\n            <h3 class="text-lg font-semibold">Review changes</h3>\n            <div \n                class="grid gap-x-3 py-4"\n                style="grid-template-columns: repeat(8, auto); ">\n                <div style="grid-row: 1; grid-column: 1 / span 2" class="text-sm"></div>\n                <div style="grid-row: 1; grid-column: 3 / span 2" class="text-sm text-center">Story Points</div>\n                <div style="grid-row: 1; grid-column: 5 / span 2" class="text-sm text-center">Start Date</div>\n                <div style="grid-row: 1; grid-column: 7 / span 2" class="text-sm text-center">Due Date</div>\n                <div style="grid-row: 2; grid-column: 1" class="text-sm">Key</div>\n                <div style="grid-row: 2; grid-column: 2" class="text-sm">Summary</div>\n                <div style="grid-row: 2; grid-column: 3" class="text-sm pl-2">Current</div>\n                <div style="grid-row: 2; grid-column: 4" class="text-sm pr-2">New</div>\n                <div style="grid-row: 2; grid-column: 5" class="text-sm pl-2">Current</div>\n                <div style="grid-row: 2; grid-column: 6" class="text-sm pr-2">New</div>\n                <div style="grid-row: 2; grid-column: 7" class="text-sm pl-2">Current</div>\n                <div style="grid-row: 2; grid-column: 8" class="text-sm">New</div>\n                <div \n                    class="border-solid border-b border-neutral-40"\n                    style="grid-row: 2 / span 1; grid-column: 1 / span 8"></div>\n                {{# for(workItem of this.workItemsWithDates) }}\n                    <div>{{workItem.work.issue["Issue key"]}}</div>\n                    <div>{{workItem.work.issue.Summary}}</div>\n                    <div class="pl-2 text-right">{{ this.oldStoryPoints(workItem) }}</div>\n                    <div class="pr-2 {{this.storyPointsEqualClassName(workItem)}} text-right">{{ this.newStoryPoints(workItem) }}</div>\n                    <div class="pl-2">{{workItem.work.issue[this.startDateField]}}</div>\n                    <div class="pr-2 {{this.startDateEqualClassName(workItem)}}">{{ jiraDates( workItem.dates.startDate ) }}</div>\n                    <div class="pl-2">{{workItem.work.issue[this.dueDateField]}}</div>\n                    <div class=" {{this.dueDateEqualClassName(workItem)}}">{{ jiraDates( workItem.dates.dueDate ) }}</div>\n                {{/ for }}\n            </div>\n            <div class="flex gap-2 flex-row-reverse">\n                {{# if(this.issueUpdates.isPending) }}\n                    <button class="btn-primary" disabled>\n                    <svg class="animate-spin -ml-0.5 -mt-0.5 mr-1 h-e w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">\n                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>\n                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>\n                    </svg> \n                    Saving changes in Jira\n                    \n                    </button>\n                {{/ if }}\n                {{# or(this.issueUpdates.isResolved, not(this.issueUpdates)) }}\n                    <button class="btn-primary" on:click="this.save(scope.event)">\n                        Save selected changes in Jira\n                    </button>\n                {{/ or }}\n                \n                <button class="btn-secondary" value="cancel" formmethod="dialog">Cancel</button>\n            </div>\n            {{# eq(this.issueUpdateOutcome.status, "rejected") }}\n            <div class="bg-yellow-500 p-4 mt-2">\n                <p class="text-lg">There was an error saving to Jira!</p>\n                <p>Error: {{this.issueUpdateOutcome.errorReasons[0]}}</p>\n            </div>\n            {{/ eq }}\n        </form>\n    ';static props={workItems:e.Any,storyPointField:String,startDateField:String,dueDateField:String,startDate:Date,issueUpdates:e.Any,jiraHelpers:e.Any,issueUpdateOutcome:{value({listenTo:t,resolve:e}){function s(t){t?(e({errorReasons:[],status:"pending"}),t.then((t=>{const s=t.filter((t=>"rejected"===t.status));return s.length?e({errorReasons:(i=s.map((t=>t.reason)),i.map(n)),status:"rejected"}):e({errorReasons:[],status:"fulfilled"});var i}))):e({errorReasons:[],status:"waiting"})}t("issueUpdates",(({value:t})=>{s(t)})),s(this.updatePromises)}}};connected(){this.parentElement.showModal(),this.listenTo("issueUpdateOutcome",(({value:t})=>{"fulfilled"===t.status&&(this.issueUpdates=null,this.dispatch("saved"))}))}get workItemsWithDates(){return Object.values(this.workItems).map((t=>{const e=t.serialize();return e.dates=s(e,this.startDate),e}))}jiraDates(t){return r.format(t)}round(t){return Math.round(t)}oldStoryPoints(t){return t.work.issue[this.storyPointField]}newStoryPoints(t){return Math.round(t.dates.totalPoints)}storyPointsEqualClassName(t){return this.oldStoryPoints(t)!==this.newStoryPoints(t)?"bg-yellow-300":""}startDateEqualClassName(t){return t.work.issue[this.startDateField]!==this.jiraDates(t.dates.startDate)?"bg-yellow-300":""}dueDateEqualClassName(t){return t.work.issue[this.dueDateField]!==this.jiraDates(t.dates.dueDate)?"bg-yellow-300":""}save(t){t.preventDefault();const e=this.workItemsWithDates.map((t=>({...t,updates:{[this.startDateField]:this.jiraDates(t.dates.startDateWithTimeEnoughToFinish),[this.dueDateField]:this.jiraDates(t.dates.dueDate),[this.storyPointField]:this.newStoryPoints(t)}}))).map((t=>({...t,updatePromise:this.jiraHelpers.editJiraIssueWithNamedFields(t.work.issue["Issue key"],t.updates)})));this.issueUpdates=Promise.allSettled(e.map((t=>t.updatePromise)))}}function n(t){if(Array.isArray(t.errorMessages)&&t.errorMessages.length)return t.errorMessages[0];if(t.errors){const e=Object.values(t.errors)[0];return e.includes("It is not on the appropriate screen, or unknown")?i.safeString("A field is not on the screen associated with the epic. <a target='_blank' href='https://github.com/bitovi/jira-auto-scheduler/wiki/Troubleshooting#a-field-is-not-on-the-appropriate-screen'>Read how to fix it here.</a>"):e}return t.message}customElements.define("update-epics",a);export{a as default};
//# sourceMappingURL=update-epics-2YNF0D9x.js.map
