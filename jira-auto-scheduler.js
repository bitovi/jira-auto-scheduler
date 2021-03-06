import { StacheElement, type, ObservableObject } from "//unpkg.com/can@6/core.mjs";
import {
  getCSVResultsFromFile,
  makeObjectsFromRows,
  getCSVResultsFromUrl } from "./jira-csv-processing.js";

import {scheduleIssues } from "./schedule.js";
import {getEstimateDefault} from "./schedule-prepare-issues.js";

import "./jira-team.js";
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
              <button on:click="this.clearIssues()" class="button--primary">Change CSV file</button>
              <button on:click="this.configureCSV(scope.event)">Configure</button>
            </div>

            <div>
              <label>Zoom:</label>
              <input type="range"
                min="10" max="50"
                value:from="this.dayWidth" on:change:value:to="this.dayWidth"/>
            </div>

            <div>
              <label>Uncertainty Weight:</label>
              <input type="range"
                min="0" max="100"
                value:from="this.uncertaintyWeight" on:change:value:to="this.uncertaintyWeight"/>
            </div>

            <div>
              <ul class="key">
                <li><span>Key:</span></li>
                <li><span class="chip chip--blocking">Blocking</span></li>
                <li><span class="chip chip--current">Current item</span></li>
                <li><span class="chip chip--blocked">Blocked by</span></li>
              </ul>
            </div>
        {{ else }}
          <div>
            <label for="jiraCSVExport" class="file-upload">Upload CSV file</label>
            <input type="file" id="jiraCSVExport" accept=".csv" class="visually-hidden"
            on:change='this.processFile(scope.element)'/>
          </div>

          <div>
            <span>or</span>
          </div>

          <div>
            <input type="text" id="jiraCSVURL"

              value:bind='this.uploadUrl'
              placeholder="Enter CSV URL" aria-label="Enter CSV URL"
              />&nbsp;
            <button class="button--secondary" on:click='this.processUrl(this.uploadUrl)'>Upload</button>
          </div>
        {{/ if }}
      </div>
      </form>
    </header>

    <main>
    {{# if(this.configuringCSV) }}
      <jira-configure-csv rawIssues:from="this.rawIssues" config:from="this.config"/>
    {{ else }}
      <table class="team-table">
        {{# for(team of this.teams) }}
          <jira-team
            role="row"
            team:from="team"
            dayWidth:from="this.dayWidth"
            tooltip:from="this.tooltip"
            velocity:from='this.getVelocityForTeam(team.teamKey)'
            on:velocity='this.updateVelocity(team.teamKey, scope.event.value)'
            issueLinkPrefix:from="this.config.issueLinkPrefix"
            ></jira-team>
        {{/}}
      </table>
      {{/}}
    </main>
  `;
  static props = {
    dayWidth: {
      type: type.maybeConvert(Number),
      default: 20
    },
    uncertaintyWeight: {
      type: type.maybeConvert(Number),
      default: 100
    },

    rawIssues: type.Any,
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
    get velocitiesJSON(){
      return this.velocities.serialize();
    },

    get teams(){
      const workByTeams = this.workByTeam;
      return Object.keys(this.workByTeam || {}).map( (key)=> {
        return workByTeams[key];
      })
    },
    uploadUrl: {
      get default(){
        return localStorage.getItem("csv-url") || "";
      },
      set(newVal) {
        localStorage.setItem("csv-url", newVal);
        return newVal;
      }
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

    this.listenTo("velocitiesJSON", ({value}) => {
      localStorage.setItem("team-velocities", JSON.stringify(value) );
      this.scheduleIssues();
    });

    // redraw lines when zoom changes
    this.listenTo("dayWidth", ()=> {
      this.querySelector(".team-table").style.backgroundSize = this.dayWidth + "px";
    })

    if(this.uploadUrl) {
      this.processUrl(this.uploadUrl);
    }
  }

  // methods
  async processFile(input) {
    this.uploadUrl = "";
    const results = await getCSVResultsFromFile(input.files[0]);
    this.scheduleCSV(results);

  }
  async processUrl(url) {
    this.uploadUrl = url;
    const results = await getCSVResultsFromUrl(url);
    this.scheduleCSV(results);
  }

  scheduleCSV(results) {
    this.rawIssues = makeObjectsFromRows(results.data)
    this.scheduleIssues();
  }
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
    })
  }
  configureCSV(event){
    event.preventDefault();
    this.configuringCSV = !this.configuringCSV;
  }
  clearIssues(){
    this.rawIssues = null;
    this.workByTeam = null;
  }
  getVelocityForTeam(teamKey) {
    return this.velocities[teamKey] || 21;
  }
  updateVelocity(teamKey, value){
    this.velocities[teamKey] = value;
  }

}



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
