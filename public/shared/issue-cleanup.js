import {getBusinessDatesCount} from "./dateUtils.js";

const ISSUE_KEY = "Issue key";
const PRODUCT_TARGET_RELEASE_KEY = "Product Target Release";
const ISSUE_TYPE_KEY = "Issue Type";
const PARENT_LINK_KEY = "Parent Link";
const START_DATE_KEY = "Start date";
const DUE_DATE_KEY = "Due date";
const LABELS_KEY = "Labels";
const STATUS_KEY = "Status";
const FIX_VERSIONS_KEY = "Fix versions";

function toCVSFormat(issues, serverInfo){
	return issues.map( issue => {

		const blocks = issue.fields["Linked Issues"].filter( (link) => {
			return link.outwardIssue && link.type.name === "Blocks";
		}).map((link)=>{
			return link.outwardIssue.key;
		});

		return {
			...issue.fields,
			changelog: issue.changelog,
			"Project key": issue.key.replace(/-.*/,""),
			[ISSUE_KEY]: issue.key,
			url: serverInfo.baseUrl+"/browse/"+issue.key,
			[ISSUE_TYPE_KEY]: issue.fields[ISSUE_TYPE_KEY].name,
			[PRODUCT_TARGET_RELEASE_KEY]: issue.fields[PRODUCT_TARGET_RELEASE_KEY]?.[0],
			[PARENT_LINK_KEY]: issue.fields[PARENT_LINK_KEY]?.data?.key,
			[STATUS_KEY]: issue.fields[STATUS_KEY]?.name,
			linkedIssues: {blocks}
		}
	})
}

function addWorkingBusinessDays(issues) {


	return issues.map( issue => {
		let weightedEstimate = null;
		if( issue["Story Points"]) {
			if(issue["Confidence"]) {
				weightedEstimate = issue["Story Points"] + Math.round( estimateExtraPoints(issue["Story Points"], issue["Confidence"]) );
			} else {
				weightedEstimate = issue["Story Points"];
			}
		}

		return {
			...issue,
			//workType: isQAWork(issue) ? "qa" : ( isPartnerReviewWork(issue) ? "uat" : "dev"),
			workingBusinessDays:
				issue["Due date"] && issue["Start date"] ?
					getBusinessDatesCount( new Date(issue["Start date"]), new Date(issue["Due date"]) )  : null,
			weightedEstimate: weightedEstimate
		};
	})
}

export function setupBlockers(issues) {
	return issues.map( (issue)=>{
		issue["Linked Issues"].map( ()=> {})
		return {
			...issue,

		}
	})
}

export function toCVSFormatAndAddWorkingBusinessDays(issues, serverInfo) {
	return addWorkingBusinessDays( toCVSFormat(issues, serverInfo) )
}
