import { StacheElement, type } from "//unpkg.com/can@6/core.mjs";



class JiraTeams extends StacheElement {
  static view = `
		<div style='display: grid; grid-template-columns: max-content repeat({{plus(this.totalNumberOfDays,1)}}, {{this.dayWidth}}px);'>

			{{#for( team of this.teamsAndWorkPlansWithRowNumbers) }}

				<div
					class='border-y-solid-1px-gray-300'
					style='grid-column: 1 / span {{this.totalNumberOfDays}}; grid-row: {{plus(team.teamIndex, 1)}} / span {{team.workPlans.length}}'>

				</div>
				<div
					class='p2'
					style='grid-column: 1 / span 1; grid-row: {{plus(team.teamIndex, 1)}} / span {{team.workPlans.length}}'>
					<label class='block'>{{team.teamKey}}</label>
					<input
						type="number"
						value:from='this.getVelocityForTeam(team.teamKey)'
						on:change='this.updateVelocity(team.teamKey, scope.element.valueAsNumber)'
						/>
				</div>

				{{# for(workPlan of team.workPlans) }}
					<div
						class='border-yl-solid-1px-gray-200'
						style='grid-column: 2 / span {{this.totalNumberOfDays}}; grid-row: {{plus(workPlan.workPlanIndex, 1)}} / span 1'>

					</div>

					{{# for(work of workPlan.workPlan.work) }}
						<div id="{{work.issue['Issue key']}}"
								class="work {{# if(not(work.estimate))}}work-missing-estimate{{/}} {{# if(not(work.confidence))}}work-missing-confidence{{/}} border-solid-1px-black"
								on:mouseenter="this.showTooltip(scope.event, work)"
								on:mouseleave="this.hideTooltip(scope.event, work)"
								style="grid-column: {{plus(work.startDay, 2)}} / span {{work.daysOfWork}}; grid-row-start: {{plus(workPlan.workPlanIndex, 1)}}; overflow: hidden; z-index: 5">
							<a href="{{work.issue.url}}"><p class="truncate">{{work.issue.Summary}}</p></a>

						</div>
					{{/ for }}

				{{/ for }}

			{{/ for}}
		</div>
  `;
  static props = {
    team: type.maybeConvert(Object),
    dayWidth: Number,
    tooltip: type.Any,
    velocity: Number
  };

  connected(){
    //this.updateWork();
    //this.listenTo("dayWidth", this.updateWork.bind(this));
  }
	plus(a, b) {
		return a+b;
	}
	get teamsAndWorkPlansWithRowNumbers(){
		let row = 0;
		const teams = this.teams.map( (team, i)=> {
			if( i > 0) {
				row++;
			}
			return {
				...team,
				teamIndex: row,
				workPlans: team.workPlans.plans.map( (workPlan, j)=> {
					if( j > 0) {
						row++;
					}
					return {
						workPlan,
						workPlanIndex: row
					}
				})
			}
		});
		console.log(teams);
		return teams;
	}
	get totalNumberOfDays(){
		const allWork = this.teams.map( (team)=> team.workPlans.workNodes()).flat();
		const sortedWork = allWork.sort((workNodeA, workNodeB) => {
			return (workNodeA.work.startDay + workNodeA.work.daysOfWork) - (workNodeB.work.startDay + workNodeB.work.daysOfWork)
		});
		if(sortedWork.length) {
			const last = sortedWork[sortedWork.length - 1];
			return last.work.startDay + last.work.daysOfWork
		} else {
			return 300;
		}
	}
	showTooltip(event, work) {
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
	hideTooltip(event, work) {
		unhighlightDependencies(work.issue, "blocks","blocked");
		unhighlightDependencies(work.issue, "blockedBy","blocking");

		this.tooltip.leftElement();
	}
  updateWork(){
    var team = this.team;

    // var ul = this.lastElementChild;
    var ul = this.querySelector(".work-container");
    ul.innerHTML = "";

    var currentDay = 0;

    for(let work of team.workPlans.plans[0].work) {

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
			if(work.confidence == null) {
				li.classList.add("work-missing-confidence")
			}
			if(work.estimate == null) {
				li.classList.add("work-missing-estimate")
			}
      li.innerHTML = `<a href="${work.issue.url}"><p class="truncate">${work.issue["Summary"]}</p></a>`
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
customElements.define("jira-teams", JiraTeams);



function highlightDependencies(issue, key, className, depth=0) {
    (issue[key] || []).forEach( (issue)=> {
        var el = document.getElementById(issue["Issue key"])
        if(el) {
          el.classList.add(className + "-"+depth, "work-"+className);
        }
        highlightDependencies(issue, key, className, depth+1);
    })
}
function unhighlightDependencies(issue, key, className, depth=0) {
    (issue[key] || []).forEach( (issue)=> {
        var el = document.getElementById(issue["Issue key"])
        if(el) {
          el.classList.remove(className + "-"+depth, "work-"+className);
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
