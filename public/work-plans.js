


class ScheduledWorkNode {
	constructor(work, workPlan) {
		this.work = work;
		this.next = null;
		this.previous = null;
		this.workPlan = workPlan;
	}

	prependIfPossible(work, firstDayWorkCouldStartOn) {
		let firstDayToStartWorkAfterExistingWork = 0;
		if(this.previous !== null) {
			firstDayToStartWorkAfterExistingWork = this.previous.work.startDay + this.previous.work.daysOfWork;
		}
		var possibleStartDay = Math.max(firstDayWorkCouldStartOn, firstDayToStartWorkAfterExistingWork);
		if( possibleStartDay + work.daysOfWork <= this.work.startDay ) {
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
	append(work, firstDayWorkCouldStartOn) {
		if(!this.tail) {
			this.head = this.tail = new ScheduledWorkNode(work, this);
			// MUTATION
			work.startDay = firstDayWorkCouldStartOn;
		} else {
			// MUTATION
			work.startDay = Math.max( this.tail.work.startDay  + this.tail.work.daysOfWork, firstDayWorkCouldStartOn)
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
