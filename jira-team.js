import { StacheElement, type } from "//unpkg.com/can@6/core.mjs";



class JiraTeam extends StacheElement {
  static view = `
    <th class="sticky-column">
      <label for="project-key-REPLACE">{{team.teamKey}}</label>
      <input
        type="number"
        id="project-key-REPLACE"
        value:from='this.velocity'
        valueAsNumber:to='this.velocity'/>
    </th>
    <td class="day-lines">
      <ul class="work-container">
      </ul>
    </td>
  `;
  static props = {
    team: type.maybeConvert(Object),
    dayWidth: Number,
    tooltip: type.Any,
    velocity: Number,
    issueLinkPrefix: String
  };

  connected(){
    this.updateWork();
    this.listenTo("dayWidth", this.updateWork.bind(this));
  }
  updateWork(){
    var team = this.team;

    // var ul = this.lastElementChild;
    var ul = this.querySelector(".work-container");
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
      li.innerHTML = `<a href="${this.issueLinkPrefix}${work.issue["Issue key"]}"><p class="truncate">${work.issue["Summary"]}</p></a>`
      li.id = work.issue["Issue key"];
      li.onmouseenter = (event) => {
        this.tooltip.enteredElement(event, `
          <span><strong>${work.issue["Summary"]}</strong></span><br/>
          <span>Start: ${work.startDay}, Days: ${work.daysOfWork}</span><br/>
          <span>Estimate: ${printNumber(work.estimate)}, Confidence: ${printNumber(work.confidence)}</span><br/>
          <span>Estimated days: ${printNumber(work.estimatedDaysOfWork)}, Extra days: ${printNumber(work.extraDays)}</span>
        `)
        /*workInfo.innerHTML = `
          <p>${work.issue["Summary"]}!</p>
          <code>Start: ${work.startDay}, Days: ${work.daysOfWork}</code><br/>
          <code>Estimate: ${printNumber(work.estimate)}, Confidence: ${printNumber(work.confidence)}</code><br/>
          <code>Estimated days: ${printNumber(work.estimatedDaysOfWork)}, Extra days: ${printNumber(work.extraDays)}</code>
        `;*/

        highlightDependencies(work.issue, "blocks","blocked");
        highlightDependencies(work.issue, "blockedBy","blocking");
      }
      li.onmouseleave = () => {
        unhighlightDependencies(work.issue, "blocks","blocked");
        unhighlightDependencies(work.issue, "blockedBy","blocking");

        this.tooltip.leftElement();
      }
      ul.appendChild(li);

      currentDay = work.startDay + work.daysOfWork;
    }
  }
}
customElements.define("jira-team", JiraTeam);



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
