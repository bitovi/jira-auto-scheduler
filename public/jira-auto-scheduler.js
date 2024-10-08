import { StacheElement, type, ObservableObject } from "./can.js";
import {getEstimateDefault} from "./schedule-prepare-issues.js";
import {toCVSFormatAndAddWorkingBusinessDays} from "./shared/issue-cleanup.js";
import {saveJSONToUrl, saveJSONToUrlAndToLocalStorage, booleanParsing} from "./shared/state-storage.js";

import "./jira-configure-csv.js";
import "./shared/simple-tooltip.js";
import {Configure} from "./jira-config.js";
import "./monte-carlo.js";
import "./estimation-progress-report.js"
import "./critical-path-report.js";
import {nativeFetchJSON} from "./jira-oidc-helpers.js";

const updateEpicsPromise = new Promise((resolve, reject)=>{
  setTimeout(function(){
    import("./update-epics.js").then(resolve, reject);
  },500);
})



const jiraDataFormatter = new Intl.DateTimeFormat('en-CA', { // 'en-CA' uses the YYYY-MM-DD format
  year: 'numeric',
  month: '2-digit', // '2-digit' will ensure month is always represented with two digits
  day: '2-digit', // '2-digit' will ensure day is always represented with two digits
  calendar: 'iso8601', // This specifies usage of the ISO 8601 calendar
  timeZone: "UTC"
});

class JiraAutoScheduler extends StacheElement {
  static view = `
    <simple-tooltip this:to='this.tooltip'></simple-tooltip>
    {{# if(this.showSavingModal)}}
      <dialog on:close="this.showSavingModal = false">
        <update-epics
          workItems:from="this.workItems"
          storyPointField:from="this.config.storyPointField[0]"
          startDateField:from="this.config.startDateField[0]"
          dueDateField:from="this.config.dueDateField[0]"
          startDate:from="this.startDate"
          jiraHelpers:from="this.jiraHelpers"
          on:saved="this.closeModalAndRefreshIssues()"
          >
        </update-epics>
      </dialog>
    {{/ }}
    
    {{# if(this.loginComponent.isLoggedIn) }}

    
      <details class=" rounded-lg bg-white m-2 drop-shadow-md hide-on-fullscreen">
        <summary class="text-base p-3 bg-white cursor-pointer rounded-lg">
          Configure <span class="inline pl-8 text-sm">JQL: <span class="font-mono bg-neutral-40 text-sm">{{ this.issueJQL}}</span></span>
        </summary>
        <jira-configure-csv 
          rawIssues:from="this.csvIssues" 
          rawIssuesPromise:from="this.csvIssuesPromise"
          config:from="this.config"
          issueJQL:bind="this.issueJQL"
          loadChildren:bind="this.loadChildren"
          limitIssues:bind="this.limitIssues"
          childJQL:bind="this.childJQL"

          />

      </details>
    {{ else }}
      <div class=" rounded-lg m-2 drop-shadow-md hide-on-fullscreen bg-yellow-300 p-4">
        The following is a sample plan. Learn more about it in the 
          "<a class="text-blue-400" href="https://www.bitovi.com/academy/learn-agile-program-management-with-jira/estimating.html">Agile Program Management with Jira</a>" 
          training. Click "Connect to Jira" to load your own data.
      </div>
    {{/ if }}

    <div class=" z-10 right-0 flex rounded-t-lg  text-base p-2 gap-6 bg-white mt-2 mx-2 fullscreen-fixed-to-top fullscreen-m-0 fullscreen-round-none">
      {{# if( this.csvIssues ) }}
          <div class="flex grow gap-2">
            <label class="text-base py-1">Probability Thresholds:</label>
            <div class="grow relative -top-1">
              <input 
                class="w-full"
                type="range"
                min="50" max="90" step="5"
                value:from="this.dateThresholds" 
                on:input:value:to="this.dateThresholds"
                list="range-values"/>
                <datalist id="range-values" w="1206px" l="-59px"
                  style="width: calc( (100% - 15px) * 10.115/9); left: calc(7.5px -  (100% - 15px) * 10.115/9/18 ); grid-template-columns: repeat(9, 1fr); grid-template-rows: auto;"
                  class="grid absolute top-6">
                  <option value="50" class="text-center text-xs relative left-3">Median</option>
                  <option value="55" class="text-center text-xs">Average</option>
                  <option value="60" class="text-center text-xs">60%</option>
                  <option value="65" class="text-center text-xs">65%</option>
                  <option value="70" class="text-center text-xs">70%</option>
                  <option value="75" class="text-center text-xs">75%</option>
                  <option value="80" class="text-center text-xs">80%</option>
                  <option value="85" class="text-center text-xs">85%</option>
                  <option value="90" class="text-center text-xs">90%</option>
                </datalist>
            </div>
            
              
          </div>

          <div  class="flex gap-1">
            <label class="text-base py-1">Start Date:</label>
            <input type="date"
              class="form-border font-mono px-1 py-0 text-sm h-8"
              valueAsDate:bind="this.startDate"/>
          </div>
            <div>
              <button class="btn-primary"
                {{# if(this.loginComponent.isLoggedIn) }}
                title="Save dates to Jira"
                {{ else }}
                title="Connect to save dates to Jira"
                {{/ if }}
                on:click="this.showSavingModal = true" disabled:from="or( not(this.startDate), not(this.loginComponent.isLoggedIn) )">Update Epic Dates</button>
            </div>
      {{ else }}
        <div class="font-lg bg-yellow-500">Loading issues</div>
      {{/ if }}
    </div>
      
    <div>
      {{# and(this.csvIssuesPromise.isResolved, this.startDate) }}
        <monte-carlo class="block relative bg-white pt-1 mx-2 rounded-b-lg pb-2"
          configuration:from="this.configuration"
          getVelocityForTeam:from="this.config.teamConfiguration.getVelocityForTeam"
          updateVelocity:from="this.config.teamConfiguration.setVelocityForTeam"
          rawIssues:from="this.csvIssues"
          getParallelWorkLimit:from="this.config.teamConfiguration.getTracksForTeam"
          addWorkPlanForTeam:from="this.config.teamConfiguration.addTrackForTeam"
          removeWorkPlanForTeam:from="this.config.teamConfiguration.removeTrackForTeam"
          startDate:from="this.startDate"
          uncertaintyWeight:from="this.uncertaintyWeight"
          allWorkItems:to="this.workItems"
          workItemsToHighlight:from="this.workItemsToHighlight"
          ></monte-carlo>

        {{# if(this.workItems) }}
          <critical-path-report workItems:from="this.workItems" class="bg-white m-2 rounded-lg p-2 block" workItemsToHighlight:to="this.workItemsToHighlight"/>
        {{/ if }}
      {{/ and }}
      {{# if(this.csvIssuesPromise.isRejected) }}
        <div class="text-lg bg-yellow-500 pt-1 mx-2 rounded-b-lg pb-2">
          <p>There was an error loading from Jira!</p>
          <p>Error message: {{this.csvIssuesPromise.reason.errorMessages[0]}}</p>
          <p>Please check your JQL is correct!</p>
        </div>
      {{/ }}
      {{# if(this.csvIssuesPromise.isPending) }}
        <div class="pt-1 mx-2 rounded-b-lg pb-2 text-lg text-center bg-white">
          <svg class="animate-spin -ml-0.5 -mt-0.5 mr-1 h-e w-4 text-blue-400 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg> Loading Issues
        </div>
        
      {{/ }}
    </div>

    {{# and(this.csvIssuesPromise.isResolved, this.startDate, this.csvIssues.length) }}
      <div class="p-2 m-2 rounded-lg pb-2 bg-white">
        <estimation-progress-report 
          rawIssues:from="this.csvIssues"
          getEstimate:from="this.configuration.getEstimate"
          getConfidence:from="this.configuration.getConfidence"
          getTeamKey:from="this.configuration.getTeamKey">
        </estimation-progress-report>
      </div>
    {{/ }}
  `;
  static props = {
    showSavingModal: false,
    showingFullscreen: {type: Boolean, default: false},
    jiraHelpers: {type: type.Any},
    issueUpdates: {type: type.Any},
    // dayWidth: saveJSONToUrl("dayWidth",5,type.maybeConvert(Number)),
    get uncertaintyWeight(){
      const dateThreshold = this.dateThresholds;
      if(dateThreshold == 55) {
        return "average";
      } else {
        return dateThreshold;
      }
    },
    issueJQL: saveJSONToUrlAndToLocalStorage("issueJQL", "issueType = Epic and statusCategory != Done"),
    childJQL: saveJSONToUrl("childJQL", "", String, {parse: x => ""+x, stringify: x => ""+x}),
    loadChildren: saveJSONToUrl("loadChildren", false, Boolean, booleanParsing),
    dateThresholds: saveJSONToUrl("weight",55,type.maybeConvert(Number)),
		startDate: saveJSONToUrl("startDate",nowUTC(),type.maybeConvert(Date)),
    limitIssues: saveJSONToUrl("limitIssues", true, Boolean, booleanParsing),
    //rawIssues: type.Any,
    workItems: type.Any,
    tooltip: HTMLElement,
    dialog: HTMLElement,
    loginComponent: HTMLElement,
    workItemsToHighlight: type.Any,
    get configPromise(){
      let fieldsPromise, savedConfigurationPromise;
      if(this.issueJQL === "promotions example" || this.loginComponent.isLoggedIn === false) {
        fieldsPromise =  nativeFetchJSON("./examples/default-fields.json");
      } else {
        fieldsPromise =  this.jiraHelpers.fieldsRequest;
        
      }
      
      savedConfigurationPromise = document.querySelector("velocities-from-issue")?.teamConfigurationPromise;

      return Promise.all([fieldsPromise, savedConfigurationPromise]).then(([fields, teamConfiguration])=>{
        return new Configure({fields, teamConfiguration})
      })
    },
    config: {
      async(resolve) {
        this.configPromise.then(resolve);
      }
    },

    get csvIssuesPromise(){
      if(!this.config) {
        return Promise.resolve([]);
      }

      // do this for side-effects
      this.hackToRefreshIssues;

      if(this.login === "promotions example" || this.loginComponent.isLoggedIn === false) {
        return nativeFetchJSON("./examples/promotions.json");
      } else {
        const serverInfoPromise = this.jiraHelpers.getServerInfo();
        
        const loadIssues = this.loadChildren ? 
          this.jiraHelpers.fetchAllJiraIssuesAndDeepChildrenWithJQLUsingNamedFields :
          this.jiraHelpers.fetchAllJiraIssuesWithJQLUsingNamedFields;

        const issuesPromise = loadIssues({
            jql: this.issueJQL,//this.jql,
            childJQL: this.childJQL ? " and "+this.childJQL : "",
            fields: this.config.issueFields, // LABELS_KEY, STATUS_KEY ]
            limit: this.limitIssues ? 100 : Infinity
        });

        return Promise.all([
            issuesPromise, serverInfoPromise
        ]).then(([issues, serverInfo]) => {
          // just remove done ones 
          const aliveIssues = issues.filter( i => i.fields.Status.statusCategory.name !== "Done")
            const csv = toCVSFormatAndAddWorkingBusinessDays(aliveIssues, serverInfo);
            return csv;
        })
      }
      
    },
		csvIssues: {
			async(resolve) {
        if(!this.csvIssuesPromise) {
          resolve(null)
        } else {
          this.csvIssuesPromise.then(resolve);
        }
			}
		},
    // csv issues should derive from events, will change later!
    hackToRefreshIssues: type.Any,
    /*
    get teams(){
      const workByTeams = this.workByTeam;
      return Object.keys(this.workByTeam || {}).map( (key)=> {
        return workByTeams[key];
      })
    },
    */
		get configuration(){
      if(!this.config) {
        return;
      }
			return {
				getTeamKey: this.config.getTeamKey,
				getDaysPerSprint: this.config.getDaysPerSprint,
				getConfidence: this.config.getConfidence,
				getEstimate: this.config.getEstimate,
				getParentKey: this.config.getParentKey,
				getBlockingKeys: this.config.getBlockingKeys
			};
		}
  };
  closeModalAndRefreshIssues(){
    this.showSavingModal = false;
    this.hackToRefreshIssues = {};
  }
  get updateFields(){
    const storyPoints = this.config.storyPointField[0],
      startDate = this.config.startDateField[0],
      dueDate = this.config.dueDateField[0];

    if(storyPoints && startDate && dueDate) {
      return {storyPoints , startDate, dueDate};
    }
  }
  startSaveDates(event){
    // we can calculate how much changed work there is and show the button then ...
    event.preventDefault();
    
    updateEpicsPromise.then((module)=>{

      this.dialog.innerHTML = "";
      const updateEpics = new module.default().initialize({
       
      });
      this.dialog.appendChild(updateEpics);
      this.dialog.showModal();
      
    })

  }
  toggleFullscreen(event){
    event.preventDefault();
    document.body.classList.toggle("fullscreen");
    this.showingFullscreen = document.body.classList.contains("fullscreen");
  }
}

export default JiraAutoScheduler;

customElements.define("jira-auto-scheduler", JiraAutoScheduler);



function nowUTC(){
  let now = new Date();

  let year = now.getUTCFullYear();
  let month = now.getUTCMonth();
  let day = now.getUTCDate();

  // Create a new Date object using UTC components
  return new Date(Date.UTC(year, month, day));
}






// Overwrite things

const shirtSizeToPoints = {Small: 5, Medium: 13, Large: 21};
function getShirtSizePoints(value) {
  if(shirtSizeToPoints[value]) {
    return shirtSizeToPoints[value];
  } else {
    throw new Error(value+" shirt size does not have points");
  }
}

