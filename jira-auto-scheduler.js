import { StacheElement, type } from "//unpkg.com/can@6/core.mjs";
import {
  getCSVResultsFromFile,
  makeObjectsFromRows,
  getCSVResultsFromUrl } from "./jira-csv-processing.js";

import {scheduleIssues } from "./schedule.js";


class JiraAutoScheduler extends StacheElement {
  static view = `
    <input type="file" id="jiraCSVExport" accept=".csv"
      on:change='this.processFile(scope.element)'/>

    Zoom:
    <input type="range"
      min="10" max="50"
      value:from="this.dayWidth" on:change:value:to="this.dayWidth"/>,

    UncertaintyWeight Weight:
    <input type="range"
      min="0" max="100"
      value:from="this.uncertaintyWeight" on:change:value:to="this.uncertaintyWeight"/>

    <button id="next">next</button>

    {{# for(team of this.teams) }}
      <jira-team team:from="team" dayWidth:from="this.dayWidth"></jira-team>
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
    this.workByTeam = {};
    scheduleIssues(this.rawIssues, {
      uncertaintyWeight: this.uncertaintyWeight,
      onPlannedIssues: (workByTeam) => {
        this.workByTeam = workByTeam;
      }
    })
  }
}


class JiraTeam extends StacheElement {
  static view = `
    <div class='left'>
      <label>{{team.teamKey}}</label>
      <input
        value:from='team.velocity'
        on:change='updateVelocity(scope.element.value)'/>
    </div>
    <ul></ul>
  `;
  static props = {
    team: type.maybeConvert(Object),
    dayWidth: Number
  };

  connected(){
    this.updateWork();
    this.listenTo("dayWidth", this.updateWork.bind(this));
  }
  updateWork(){
    var team = this.team;

    var ul = this.lastElementChild;
    ul.innerHTML = "";

    var currentDay = 0;
    for(let work of team.workPlan) {
      if(work.startDay > currentDay) {
          // there is a hole
          let emptyDay = document.createElement("li");
          emptyDay.classList.add("empty-day")
          emptyDay.style.width =( (work.startDay - currentDay) *this.dayWidth)+"px";
          ul.appendChild(emptyDay);
      }
      let li = document.createElement("li");
      li.style.width =( (work.daysOfWork ) *this.dayWidth)+"px";
      li.work = work;
      li.classList.add("work");
      li.innerHTML = `<a href="https://yumbrands.atlassian.net/browse/${work.issue["Issue key"]}">${work.issue["Summary"]}</a>`
      li.id = work.issue["Issue key"];
      li.onmouseenter = function(){

        workInfo.innerHTML = `
          <p>${work.issue["Summary"]}!</p>
          <code>Start: ${work.startDay}, Days: ${work.daysOfWork}</code><br/>
          <code>Estimate: ${printNumber(work.estimate)}, Confidence: ${printNumber(work.confidence)}</code><br/>
          <code>Estimated days: ${printNumber(work.estimatedDaysOfWork)}, Extra days: ${printNumber(work.extraDays)}</code>
        `;

        highlightDependencies(work.issue, "blocks","blocked");
        highlightDependencies(work.issue, "blockedBy","blocking");
      }
      li.onmouseleave = function(){
        unhighlightDependencies(work.issue, "blocks","blocked");
        unhighlightDependencies(work.issue, "blockedBy","blocking");
      }
      ul.appendChild(li);

      currentDay = work.startDay + work.daysOfWork;
    }
  }
}
customElements.define("jira-team", JiraTeam);
customElements.define("jira-auto-scheduler", JiraAutoScheduler);



const DEFAULT_VELOCITY = 21;





function highlightDependencies(issue, key, className, depth=0) {
    (issue[key] || []).forEach( (issue)=> {
        var el = document.getElementById(issue["Issue key"])
        if(el) {
          el.classList.add(className + "-"+depth);
        }
        highlightDependencies(issue, key, className, depth+1);
    })
}
function unhighlightDependencies(issue, key, className, depth=0) {
    (issue[key] || []).forEach( (issue)=> {
        var el = document.getElementById(issue["Issue key"])
        if(el) {
          el.classList.remove(className + "-"+depth);
        }
        unhighlightDependencies(issue, key, className, depth+1);
    })
}

function printNumber(num) {
    if(typeof num === "number") {
        return num;
    } else {
        return "--"
    }
}

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
