import { StacheElement, type } from "//unpkg.com/can@6/core.mjs";
import {getEndDateFromUTCStartDateAndBusinessDays} from "./shared/dateUtils.js";

const dateFormatter = new Intl.DateTimeFormat('en-US',{timeZone: "UTC"});

class JiraTeams extends StacheElement {
  static view = `
		<div style='display: grid; grid-template-columns: max-content repeat({{plus(this.totalNumberOfDays,1)}}, {{this.dayWidth}}px);'>
		<div>&nbsp;</div>
			{{#for (sprint of this.sprints)}}
				<div
					class="{{sprint.className}} text-center"
					style="grid-column: {{plus(sprint.startDay, 2)}} / span {{sprint.days}}; grid-row: 1 / span {{plus(this.teamsAndWorkPlansWithRowNumbers.rows, 2)}}">
					<div>{{sprint.number}}</div>
				</div>
			{{/ }}

			{{#for( team of this.teamsAndWorkPlansWithRowNumbers) }}

				<div
					class='border-y-solid-1px-gray-300'
					style='grid-column: 1 / span {{this.totalNumberOfDays}}; grid-row: {{plus(team.teamIndex, 2)}} / span {{team.workPlans.length}}'>

				</div>
				<div
					class='p2'
					style='grid-column: 1 / span 1; grid-row: {{plus(team.teamIndex, 2)}} / span 1'>
					<label class='block'>{{team.teamKey}}</label>
					<input
						type="number"
						value:from='this.getVelocityForTeam(team.teamKey)'
						on:change='this.updateVelocity(team.teamKey, scope.element.valueAsNumber)'
						/>
					<button on:click="this.addWorkPlanForTeam(team.teamKey)">+</button>
				</div>

				{{# for(workPlan of team.workPlans) }}
					{{# not( eq(scope.index, 0) ) }}
						<div
							class='p2'
							style='grid-column: 1 / span 1; grid-row: {{ plus(workPlan.workPlanIndex, 2) }} / span 1'>
							<button on:click="this.removeWorkPlanForTeam(team.teamKey)">-</button>
						</div>
					{{/ }}

					<div
						class='border-yl-solid-1px-gray-200'
						style='grid-column: 2 / span {{this.totalNumberOfDays}}; grid-row: {{plus(workPlan.workPlanIndex, 2)}} / span 1'>

					</div>

					{{# for(work of workPlan.workPlan.work) }}
						<div id="{{work.issue['Issue key']}}"
								class="work {{# if(not(work.estimate))}}work-missing-estimate{{/}} {{# if(not(work.confidence))}}work-missing-confidence{{/}} border-solid-1px-black"
								on:mouseenter="this.showTooltip(scope.event, work)"
								on:mouseleave="this.hideTooltip(scope.event, work)"
								style="grid-column: {{plus(work.startDay, 2)}} / span {{work.daysOfWork}}; grid-row-start: {{plus(workPlan.workPlanIndex, 2)}}; overflow: hidden; z-index: 5">
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
		teams.rows = row+1;
		return teams;
	}
	get totalNumberOfDays(){
		const allWork = this.teams.map( (team)=> team.workPlans.workNodes()).flat();
		const sortedWork = allWork.sort((workNodeA, workNodeB) => {
			return (workNodeA.work.startDay + workNodeA.work.daysOfWork) - (workNodeB.work.startDay + workNodeB.work.daysOfWork)
		});
		if(sortedWork.length) {
			const last = sortedWork[sortedWork.length - 1];
			return Math.ceil( (last.work.startDay + last.work.daysOfWork) / 10 ) * 10
		} else {
			return 300;
		}
	}
	get sprints(){
		const sprints = [];
		for(let s = 0; s*10 < this.totalNumberOfDays; s++){
			sprints.push({
				number: (s+1),
				startDay: s*10,
				days: Math.min( this.totalNumberOfDays - s* 10, 10),
				className: (s % 2 ? "color-bg-slate-100" : "")
			})
		}
		return sprints;
	}
	showTooltip(event, work) {
		let tip = `
			<span><strong>${work.issue["Summary"]}</strong></span><br/>
			<span>Start: ${work.startDay}, Days of Work: ${work.daysOfWork}</span><br/>
			<span>Estimate: ${printNumber(work.estimate)}, Confidence: ${printNumber(work.confidence)}</span><br/>
			<span>Estimated days: ${printNumber(work.estimatedDaysOfWork)}, Extra days: ${printNumber(work.extraDays)}</span>
		`;
		if(this.startDate) {
			tip = tip+`<br/>
				<span>Start Date: ${
					dateFormatter.format(
						getEndDateFromUTCStartDateAndBusinessDays(this.startDate, work.startDay)
					)
				}</span><br/>
				<span>End Date: ${
					dateFormatter.format(
						getEndDateFromUTCStartDateAndBusinessDays(this.startDate, work.startDay+work.daysOfWork)
					)
				}</span>
			`
		}
		this.tooltip.enteredElement(event, tip)
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
