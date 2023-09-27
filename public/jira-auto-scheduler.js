import { StacheElement, type, ObservableObject } from "//unpkg.com/can@6/core.mjs";
import {
  getCSVResultsFromFile,
  makeObjectsFromRows,
  getCSVResultsFromUrl } from "./jira-csv-processing.js";

import {scheduleIssues } from "./schedule.js";
import {getEstimateDefault} from "./schedule-prepare-issues.js";
import {toCVSFormatAndAddWorkingBusinessDays} from "./shared/issue-cleanup.js";
import {saveJSONToUrl} from "./shared/state-storage.js";

import "./jira-team.js";
import "./jira-teams.js";
import "./jira-configure-csv.js";
import "./simple-tooltip.js";
import config from "./jira-config.js";

class JiraAutoScheduler extends StacheElement {
  static view = `
    <simple-tooltip this:to='this.tooltip'></simple-tooltip>

    <header>
      <h1>Auto Scheduler for Jira</h1>

      <form>
      <div class="inline-grid">
        {{# if( this.rawIssues ) }}
            <div>
              <button on:click="this.configureCSV(scope.event)">
                {{# if(this.configuringCSV) }}
                  Back
                {{ else }}
                  Configure
                {{/ }}
              </button>
            </div>

            {{# not(this.configuringCSV) }}
            <div>
              <label>Zoom:</label>
              <input type="range"
                min="3" max="20"
                value:from="this.dayWidth" on:change:value:to="this.dayWidth"/>
            </div>

            <div>
              <label>Likelihood:</label>
              <input type="range"
                min="50" max="90"
								step="5"
                value:from="this.uncertaintyWeight" on:change:value:to="this.uncertaintyWeight"/>
                ({{this.uncertaintyWeight}}%)
            </div>

						<div>
							<label>Start Date:</label>
							<input type="date"
								valueAsDate:bind="this.startDate"/>
						</div>

            <div>
              <ul class="key">
                <li><span>Key:</span></li>
                <li><span class="chip chip--blocking">Blocking</span></li>
                <li><span class="chip chip--current">Current item</span></li>
                <li><span class="chip chip--blocked">Blocked by</span></li>
              </ul>
            </div>
            {{/ not }}
        {{ else }}
          <div>Loading issues</div>
        {{/ if }}
      </div>
      </form>
    </header>

    <main>
    {{# if(this.configuringCSV) }}
      <jira-configure-csv rawIssues:from="this.rawIssues" config:from="this.config" jiraHelpers:from="this.jiraHelpers"/>
    {{ else }}


		<jira-teams
			class="py-2"
			teams:from="this.teams"
			dayWidth:from="this.dayWidth"
			tooltip:from="this.tooltip"
			getVelocityForTeam:from="this.getVelocityForTeam"
			updateVelocity:from="this.updateVelocity"
			startDate:from="this.startDate"
			addWorkPlanForTeam:from="this.addWorkPlanForTeam"
			removeWorkPlanForTeam:from="this.removeWorkPlanForTeam"
			></jira-teams>

      {{/}}
    </main>
  `;
  static props = {
    jiraHelpers: {type: type.Any},
    dayWidth: saveJSONToUrl("dayWidth",5,type.maybeConvert(Number)),
    uncertaintyWeight: saveJSONToUrl("weight",90,type.maybeConvert(Number)),
		startDate: saveJSONToUrl("startDate",null,type.maybeConvert(Date)),
		workLimit: saveJSONToUrl("workLimit",{},type.maybeConvert(Object)),
    //rawIssues: type.Any,
    workByTeam: type.Any,
    tooltip: HTMLElement,
    configuringCSV: {Type: Boolean, value: false},
    config: {
      default: config
    },
    velocities: {
      get default(){
        return new ObservableObject(
          JSON.parse( localStorage.getItem("team-velocities") ) || {}
        );
      }
    },
		rawIssues: {
			async(resolve) {
				const serverInfoPromise = this.jiraHelpers.getServerInfo();

		    const issuesPromise = this.jiraHelpers.fetchAllJiraIssuesWithJQLUsingNamedFields({
		        jql: this.config.issueJQL,//this.jql,
		        fields: this.config.issueFields, // LABELS_KEY, STATUS_KEY ]
		    });

		    return Promise.all([
		        issuesPromise, serverInfoPromise
		    ]).then(([issues, serverInfo]) => {
						const raw = toCVSFormatAndAddWorkingBusinessDays(issues, serverInfo);
						return raw;
		    }).catch(function(){
          return [];
        })
			}
		},
    get velocitiesJSON(){
      return this.velocities.serialize();
    },

    get teams(){
      const workByTeams = this.workByTeam;
      return Object.keys(this.workByTeam || {}).map( (key)=> {
        return workByTeams[key];
      })
    },

		get configuration(){

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
  // hooks
  async connected() {

    //const results = await getCSVResultsFromUrl("./tb-r2a.csv");
    //this.scheduleCSV(results);

    // reschedule when confidence changes
    this.listenTo("uncertaintyWeight", ()=> {
      this.scheduleIssues();
    })
    this.listenTo("configuration", ()=> {
      this.scheduleIssues();
    });
		this.listenTo("rawIssues", ()=> {
      this.scheduleIssues();
    });

		this.listenTo("workLimit", ()=> {
      this.scheduleIssues();
    });

    this.listenTo("velocitiesJSON", ({value}) => {
      localStorage.setItem("team-velocities", JSON.stringify(value) );
      this.scheduleIssues();
    });

    // redraw lines when zoom changes
    //this.listenTo("dayWidth", ()=> {
    //  this.querySelector(".team-table").style.backgroundSize = this.dayWidth + "px";
    //})




		// temp



		//this.jiraHelpers
  }
  scheduleIssues() {
    this.workByTeam = null;
    scheduleIssues(this.rawIssues, {
      uncertaintyWeight: this.uncertaintyWeight,
      onPlannedIssues: (workByTeam) => {
        this.workByTeam = workByTeam;
      },
      getVelocity: this.getVelocityForTeam.bind(this),
      onIgnoredIssues: function(ignored, reason){
        console.log(ignored, reason);
      },
      // Overwrite for EB
      getEstimate: this.configuration.getEstimate,
      getTeamKey: this.configuration.getTeamKey,
      getParentKey: this.configuration.getParentKey,
			getConfidence: this.configuration.getConfidence,
			getParallelWorkLimit: this.getParallelWorkLimit.bind(this)
    })
  }
  configureCSV(event){
    event.preventDefault();
    this.configuringCSV = !this.configuringCSV;
  }
  getVelocityForTeam(teamKey) {
    return this.velocities[teamKey] || 21;
  }
  updateVelocity(teamKey, value){
    this.velocities[teamKey] = value;
  }
	addWorkPlanForTeam(teamKey){
		const copy = { ... this.workLimit };
		copy[teamKey] = teamKey in copy ? copy[teamKey]+1 : 2;
		this.workLimit = copy;
	}
	removeWorkPlanForTeam(teamKey){
		const copy = { ... this.workLimit };
		if(copy.workLimit === 2) {
			delete copy.workLimit;
		} else if(teamKey in copy) {
			copy[teamKey]--
		}
		this.workLimit = copy;
	}
	getParallelWorkLimit(teamKey) {
		if(teamKey in this.workLimit) {
			return this.workLimit[teamKey];
		} else {
			return 1;
		}
	}
}

export default JiraAutoScheduler;

customElements.define("jira-auto-scheduler", JiraAutoScheduler);



const DEFAULT_VELOCITY = 21;






// VELOCITY STUFF ==========================================================
function getVelocitiesByProjectId(projectIds) {
    var map = {};
    projectIds.forEach((projectId) => {
        if(localStorage.getItem(projectId+"-velocity")) {
            map[projectId] = parseInt(localStorage.getItem(projectId+"-velocity"),10);
        } else {
            map[projectId] = DEFAULT_VELOCITY;
        }
    });
    return map;
}

function setupSavingVelocity(input, team) {
    input.onchange = function(){
        if( parseInt(this.value, "10") > 0 ) {
            localStorage.setItem(team.teamKey+"-velocity", parseInt(this.value, "10") );
            var teams = document.querySelectorAll(".team");
            process(lastProcessedIssues);
            for(let teamDiv of teams) {
                teamDiv.remove();
            }
        }
    }
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

// returning undefiined has meaning. We preserve that.
function EB_getEstimate(issue){

  var rawValue = getEstimateDefault(issue);

  if( issue["Custom field (T-shirt Size)"] ) {
    for( let value of issue["Custom field (T-shirt Size)"] ){
        if(value) {
          rawValue = getShirtSizePoints(value)
        }
    }
  }
  let sum;
  if(issue._children) {
    sum = issue._children.reduce((sum, child) => {
      return sum + getEstimateDefault(child) || 0;
    }, 0);
    if(sum > 0) {
      return typeof rawValue === "number" ? rawValue + sum : sum;
    }
  }
  return rawValue || 13;

}
