


class ScheduledWorkNode {
	constructor(work, workPlan) {
		this.work = work;
		this.next = null;
		this.previous = null;
		this.workPlan = workPlan;
	}
	isPrependPossible(work, firstDayWorkCouldStartOn) {
		let firstDayToStartWorkAfterExistingWork = 0;
		if(this.previous !== null) {
			firstDayToStartWorkAfterExistingWork = this.previous.work.startDay + this.previous.work.daysOfWork;
		}
		var possibleStartDay = Math.max(firstDayWorkCouldStartOn, firstDayToStartWorkAfterExistingWork);
		return {
			isPossible:possibleStartDay + work.daysOfWork <= this.work.startDay,
			possibleStartDay: possibleStartDay
		};
	}
	prependIfPossible(work, firstDayWorkCouldStartOn) {
		const {isPossible, possibleStartDay} = this.isPrependPossible(work, firstDayWorkCouldStartOn);
		if( isPossible ) {
			this.workPlan.prepend(this, work, possibleStartDay, firstDayWorkCouldStartOn)
			return true;
		} else {
			return false;
		}
	}
	get isTail(){
		return this.next === null;
	}
	append(work, firstDayWorkCouldStartOn) {
		this.workPlan.append(work, firstDayWorkCouldStartOn);
	}
}

class WorkPlan {
	constructor() {
		this.head = null;
		this.tail = null;
	}
	get isEmpty(){
		return this.head === null;
	}
	get work(){
		return [...this].map( (workNode) => workNode.work )
	}
	// figures out the earliest start day ... if it is selected, includes a function to do the update
	earliestStartDay(work, firstDayWorkCouldStartOn) {
		for(const workNode of this) {
			const {isPossible, possibleStartDay} = workNode.isPrependPossible(work, firstDayWorkCouldStartOn)
			if(isPossible) {
				return {
					possibleStartDay,
					updatePlan: ()=>{
						workNode.prependIfPossible(work, firstDayWorkCouldStartOn);
					}
				}
			}
		}
		return {
			possibleStartDay: this.appendStartDay(work, firstDayWorkCouldStartOn),
			updatePlan: ()=>{
				this.append(work, firstDayWorkCouldStartOn)
			}
		};
	}
	prepend(workNode, work, startDay, firstDayWorkCouldStartOn) {
		// MUTATION
		work.startDay = startDay;
		if(work.startDay > firstDayWorkCouldStartOn) {
			work.artificiallyDelayed = true;
		}

		const newNode = new ScheduledWorkNode(work, this);
		if(this.head === workNode) {
			this.head = newNode;
		} else {
			const oldPrevious = workNode.previous;
			oldPrevious.next = newNode;
			workNode.previous = newNode;
			newNode.previous = oldPrevious;
		}
		newNode.next = workNode;
		workNode.previous = newNode;
	}
	appendStartDay(work, firstDayWorkCouldStartOn){
		if(!this.tail) {
			return firstDayWorkCouldStartOn;
		} else {
			return Math.max( this.tail.work.startDay  + this.tail.work.daysOfWork, firstDayWorkCouldStartOn)
		}
	}
	append(work, firstDayWorkCouldStartOn) {
		const startDay = this.appendStartDay(work, firstDayWorkCouldStartOn);
		if(!this.tail) {
			this.head = this.tail = new ScheduledWorkNode(work, this);
			// MUTATION
			work.startDay = startDay;
		} else {
			// MUTATION
			work.startDay = startDay;
			if(work.startDay > firstDayWorkCouldStartOn) {
				work.artificiallyDelayed = true;
			}

			const newNode = new ScheduledWorkNode(work, this);
			const oldTail = this.tail;
			this.tail = newNode;
			oldTail.next = newNode;
			newNode.previous = oldTail;
		}
	}
	*[Symbol.iterator](){
		let node = this.head;
		if(node !== null) {
			yield node;
		}
		while(node !== this.tail) {
			node = node.next;
			yield node;
		}
	}
}

export class WorkPlans {
	static sortByEndDate = (workNodeA, workNodeB) => {
		return (workNodeA.startDay + workNodeA.daysOfWork) - (workNodeB.startDay + workNodeB.daysOfWork)
	};

	constructor(parallelWorkStreams){
		this.plans = [];
		for(let i = 0; i < parallelWorkStreams; i++) {
			this.plans.push(new WorkPlan())
		}
	}
	workNodes(){
		return this.plans.map( workPlan => [...workPlan]).flat();
	}
	sortedWorkNodes(){
		return this.workNodes().sort( (workNodeA, workNodeB) => {
			return workNodeA.work.startDay - workNodeB.work.startDay
		})
	}
	sortedWorkNodesByEndDate(){
		return this.workNodes().sort( WorkPlans.sortByEndDate )
	}
	sheduleWork(work, firstDayWorkCouldStartOn) {

		// if any are empty, add it right away
		for(const workPlan of this.plans) {
			if(workPlan.isEmpty) {
				workPlan.append(work, firstDayWorkCouldStartOn);
				return;
			}
		}

		// try each workplan for it's earliest fit ...
		const earliestDates = this.plans.map( (plan)=>{
			return plan.earliestStartDay(work, firstDayWorkCouldStartOn)
		}).sort( (dataA, dataB) => {
			return dataA.possibleStartDay - dataB.possibleStartDay;
		});

		earliestDates[0].updatePlan();


		return;
		// now we need to order them ....
		const allWorkNodes = this.sortedWorkNodes();

		for(const existingWork of allWorkNodes) {

			if(existingWork.prependIfPossible(work, firstDayWorkCouldStartOn)) {
				return;
			}
			// if we are at the end of a list ... we can add it there before going to later lists
			if(existingWork.isTail) {
				existingWork.append(work, firstDayWorkCouldStartOn);
				return;
			}
		}
	}
}
