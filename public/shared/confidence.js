import jStat from "./jstat.js";

/**
 * Given an estimate, a confidence, and an uncertainty
 */


export function estimateExtraPoints(estimate, confidence, uncertaintyWeight) {
	var std = ((100 - confidence) * 1.28 * (1/.9))/100;

	return estimate * jStat.lognormal.inv( (uncertaintyWeight / 100) , 0, std) - estimate;
}


export function toP(confidence) {
    var cd = confidence / 100;
    return 1 - 0.5 * cd;
}
