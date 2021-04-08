import { StacheElement, type } from "//unpkg.com/can@6/core.mjs";
import {
  getCSVResultsFromFile,
  makeObjectsFromRows,
  getCSVResultsFromUrl } from "./jira-csv-processing.js";

import {scheduleIssues } from "./schedule.js";

import "./jira-team.js";
import "./simple-tooltip.js";

class JiraAutoScheduler extends StacheElement {
  static view = `
    <simple-tooltip this:to='this.tooltip'></simple-tooltip>


    <form>
      {{# if( this.rawIssues ) }}
        <button on:click="this.clearIssues()">Change CSV</button>

        <label>Zoom:</label>
        <input type="range"
          min="10" max="50"
          value:from="this.dayWidth" on:change:value:to="this.dayWidth"/>,

        <label>Uncertainty Weight:</label>
        <input type="range"
          min="0" max="100"
          value:from="this.uncertaintyWeight" on:change:value:to="this.uncertaintyWeight"/>

      {{ else }}

      <fieldset>
        <legend>Import a CSV file</legend>
        <input type="file" id="jiraCSVExport" accept=".csv"
          on:change='this.processFile(scope.element)'/>

        <input on:change='this.processUrl(scope.element.value)'
            placeholder="Enter CSV url"/>
      </fieldset>

      {{/ if }}
    </form>


    {{# for(team of this.teams) }}
      <jira-team team:from="team" dayWidth:from="this.dayWidth" tooltip:from="this.tooltip"></jira-team>
    {{/}}
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
    tooltip: type.Any,

    get teams(){
      const workByTeams = this.workByTeam;
      return Object.keys(this.workByTeam || {}).map( (key)=> {
        return workByTeams[key];
      })
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
  }

  // methods
  async processFile(input) {
    const results = await getCSVResultsFromFile(input.files[0]);
    this.scheduleCSV(results);

  }

  scheduleCSV(results) {
    this.rawIssues = makeObjectsFromRows(results.data)
    this.scheduleIssues();
  }
  scheduleIssues() {
    this.workByTeam = null;
    scheduleIssues(this.rawIssues, {
      uncertaintyWeight: this.uncertaintyWeight,
      onPlannedIssues: (workByTeam) => {
        this.workByTeam = workByTeam;
      }
    })
  }
  clearIssues(){
    this.rawIssues = null;
    this.workByTeam = null;
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


// SCHEDULING THINGS =======================================================
















// estimation things ============
