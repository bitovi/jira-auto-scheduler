const jStat = require("jstat");

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


const stats = {
    estimateExtraPoints: function (estimate, confidence, uncertaintyWeight) {
        var std = toStandardDeviations({confidence});
        if(uncertaintyWeight === "average") {
            return estimate * jStat.lognormal.mean( 0, std) - estimate;
        } else {
            return estimate * jStat.lognormal.inv( (uncertaintyWeight / 100) , 0, std) - estimate;
        }
        
    }
};

module.exports = stats;