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
 * Given an estimate, a confidence, and an uncertainty, return the extra amount of time.
 */


export function estimateExtraPoints(estimate, confidence, uncertaintyWeight) {
	var std = toStandardDeviations({confidence});
	if(uncertaintyWeight === "average") {
		return estimate * jStat.lognormal.mean( 0, std) - estimate;
	} else {
		return estimate * jStat.lognormal.inv( (uncertaintyWeight / 100) , 0, std) - estimate;
	}
	
}

// will return negative numbers weirdly ... but I don't feel like changing all of this right now
export function sampleExtraPoints(estimate, confidence) {
	const std = toStandardDeviations({confidence});
	const scale = jStat.lognormal.sample( 0, std );
	return estimate * scale - estimate;
}


export function toP(confidence) {
    var cd = confidence / 100;
    return 1 - 0.5 * cd;
}
