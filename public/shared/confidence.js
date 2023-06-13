import jStat from "./jstat.js";

function toStandardDeviations({
	confidence,
	highConfidenceStds = 0,
	highConfidence = 100,
	lowConfidenceStds = 1.3,
	lowConfidence = 10
}){
	const slope = -1 * (highConfidenceStds - lowConfidenceStds) / (highConfidence - lowConfidence)
	const uncertainty = (100 - confidence);
	return  (uncertainty * slope);
}


/**
 * Given an estimate, a confidence, and an uncertainty
 */


export function estimateExtraPoints(estimate, confidence, uncertaintyWeight) {
	var std = toStandardDeviations({confidence});
	return estimate * jStat.lognormal.inv( (uncertaintyWeight / 100) , 0, std) - estimate;
}


export function toP(confidence) {
    var cd = confidence / 100;
    return 1 - 0.5 * cd;
}
