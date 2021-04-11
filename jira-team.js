import { StacheElement, type } from "//unpkg.com/can@6/core.mjs";



class JiraTeam extends StacheElement {
  static view = `
    <div class='left'>
      <label>{{team.teamKey}}</label>
      <input
        type="number"
        value:from='this.velocity'
        valueAsNumber:to='this.velocity'/>
    </div>
    <ul></ul>
  `;
  static props = {
    team: type.maybeConvert(Object),
    dayWidth: Number,
    tooltip: type.Any,
    velocity: Number
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
      li.onmouseenter = (event) => {
        this.tooltip.enteredElement(event, `
          <code>Start: ${work.startDay}, Days: ${work.daysOfWork}</code><br/>
          <code>Estimate: ${printNumber(work.estimate)}, Confidence: ${printNumber(work.confidence)}</code><br/>
          <code>Estimated days: ${printNumber(work.estimatedDaysOfWork)}, Extra days: ${printNumber(work.extraDays)}</code>
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
