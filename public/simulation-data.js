import { StacheElement, type, ObservableObject, fromAttribute, queues } from "./can.js";
import {bestFitRanges, getUTCEndDateFromStartDateAndBusinessDays} from "./shared/dateUtils.js"
import SimpleTooltip from "./shared/simple-tooltip.js";

import {estimateExtraPoints} from "./shared/confidence.js";

const TOOLTIP = new SimpleTooltip();

document.body.append(TOOLTIP);


class SimulationData extends StacheElement {
    static view = `

    {{# and(this.showingData, not(this.work.dueDatesOnly)) }}
        <div class="grid transition-all ease-in-out duration-300 h-0 box-border top-3 relative hover:bg-neutral-10 transition-colors" 
            style="grid-template-columns: repeat({{plus(this.lastDueDay, 1)}}, 1fr); grid-template-rows: auto;">
                
            {{# for( column of this.startColumns ) }}
                <div 
                    on:mouseenter="this.showProbabilityData(scope.event, column)" 
                    on:mouseleave="this.hideProbabilityData()"
                    class="flex h-full group hover:bg-neutral-30 transition-colors">
                    <div
                        class="self-end bg-blue-100 w-full group-hover:bg-blue-200 transition-colors" style="height: {{column.percentValue}}%"></div>
                </div>
            {{/ }}
        </div>
    {{/ and }}
    
    <div class="relative py-1 z-50"
        on:click="this.toggleShowingExtraData()"
        >
        {{# if(this.work.dueDatesOnly)}}

            <div id="{{work.work.issue["Issue key"]}}"
                on:mouseenter="this.showProbabilitySumary(scope.event)"
                on:mouseleave="this.hideProbabilityData()"
                class="work-item cursor-pointer  relative bg-gradient-to-r from-green-200 to-green-400 from-45% to-55% h-4 border-box  {{ this.rangeBorderClasses() }}" 
                style="left: {{this.percent(work.dueDateBottom)}}; width: {{this.percentWidth(work.dueDateBottom, work.dueDateTop)}}"></div>
        {{ else }}
        <div 
            class="absolute bg-gradient-to-r from-blue-200 to-green-200 from-85% to-95% h-1 top-2.5 border-box" 
            style="left: {{this.percent(work.startDateBottom)}}; width: {{this.percentWidth(work.startDateBottom, work.dueDateTop)}}"></div>

        <div id="{{work.work.issue["Issue key"]}}"
            on:mouseenter="this.showProbabilitySumary(scope.event)"
            on:mouseleave="this.hideProbabilityData()"
            class="work-item cursor-pointer {{ this.rangeBorderClasses() }} relative bg-gradient-to-r from-blue-500 to-green-400 from-45% to-55% h-4 border-box rounded" 
            style="left: {{this.percent(work.startDateWithTimeEnoughToFinish)}}; width: {{this.percentWidth(work.startDateWithTimeEnoughToFinish, work.dueDateTop)}}"></div>
        {{/ }}
    </div>
    {{# if(this.showingData) }}
        <div class="grid transition-all ease-in-out duration-300 h-0 box-border pb-1 relative -top-3  hover:bg-neutral-10 transition-colors" 
            style="grid-template-columns: repeat({{ plus(this.lastDueDay, 1) }}, 1fr); grid-template-rows: auto;">
                
            {{# for( column of this.endColumns ) }}
                <div 
                    on:mouseenter="this.showProbabilityData(scope.event, column)" 
                    on:mouseleave="this.hideProbabilityData()"
                    class="flex h-full group hover:bg-neutral-30 transition-colors">
                    <div
                        class="self-start bg-green-100 w-full group-hover:bg-green-300 transition-colors" style="height: {{column.percentValue}}%"></div>
                </div>
                
            {{/ }}
        </div>
    {{/ if }}
    `;
    static props = {
        work: type.Any,
        lastDueDay: Number,
        showingData: {default: false},
        startDate: Date
    };
    
    get startColumns(){
        return createColumnData(this.work.startDateValues, this.lastDueDay+1, "startDate");
    }
    get endColumns(){
        return createColumnData(this.work.dueDateValues, this.lastDueDay+1, "dueDate");
    }
    showProbabilityData(event, column){
        const date = getUTCEndDateFromStartDateAndBusinessDays(this.startDate, column.day);
        const monthDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

        const values = this.work[column.type+"Values"];
        const index = values.findIndex((value)=> {
            return value > column.day;
        });
        const cumulativeProbability = (index === -1 ? values.length : index) / values.length;

        const timingName = column.type === "startDate" ? "starts before or on" : "ends after or on";
        const pastTenseName = column.type === "startDate" ? "started" : "ended";
        let probability = column.type === "startDate" ? cumulativeProbability*100 : (1-cumulativeProbability)* 100;
        const color = column.type === "startDate" ? "bg-blue-500" : "bg-green-500";
        

        TOOLTIP.belowElementInScrollingContainer(event.currentTarget, `
            <div class="p-2">
                <div class="${color} rounded text-white text-center p-1">
                    <h5>${toFixed(probability,1)}% chance</h5>
                    <p class="text-sm">epic ${timingName}</p>
                    <p>${monthDateFormatter.format(date)}.</p>
                </div>
                <div class="bg-neutral-200 rounded text-white mt-2 p-1 text-center">
                    <h5> ${toFixed( 100*  column.totalCount / this.work[column.type+"Values"].length, 1 )}% of the time,</h5>
                    <p>the work ${pastTenseName} this day.</p>
                </div>
            </div>
        `)
    }
    hideProbabilityData(){
        TOOLTIP.leftElement();
    }
    showProbabilitySumary(event) {
        
        const monthDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
        const dates = getDatesFromWork(this.work,this.startDate);
        const dueDatesOnly = this.work.dueDatesOnly;
        
        const startDateBottom10 = dates.startDate10;
  
        const dueDateTop90 = dates.dueDate90; 
 
        let rangeStartChance, 
            rangeStartDate = dates.startDate,
            rangeEndChance,
            rangeEndDate = dates.dueDate;
        if(this.work.uncertaintyWeight === "average") {
            rangeStartChance = rangeEndChance = "On average";
        } else {
            rangeStartChance = rangeEndChance = `${this.work.uncertaintyWeight}% chance`;
        }
        if(!dueDatesOnly) {
            TOOLTIP.belowElementInScrollingContainer(event.currentTarget, `
                <div class="p-2">
                    <div class="flex gap-2">
                        <div class="bg-blue-200 rounded text-center p-1">
                            <h5>${rangeStartChance}</h5>
                            <p class="text-sm">epic starts on or after</p>
                            <p>${monthDateFormatter.format(rangeStartDate)}</p>
                            
                        </div>
                        <div class="bg-blue-500 rounded text-white text-center p-1 grow">
                            <h5>Epic should start</h5>
                            <p class="text-sm">earlier than</p>
                            <p>${monthDateFormatter.format(dates.startDateWithTimeEnoughToFinish)}</p>
                        </div>
                        <div class="bg-green-500 rounded text-white text-center p-1">
                            <h5>${rangeEndChance}</h5>
                            <p class="text-sm">epic ends before</p>
                            <p>${monthDateFormatter.format(rangeEndDate)}</p>
                        </div>
                    </div>
                    ${dueDatesOnly ? "" :
                    `<dl class="bg-neutral-200 rounded text-white mt-2 p-1 grid gap-2"
                        style="grid-template-columns: repeat(4, auto);">
                        <dt>Median Estimate</dt>
                        <dd class="${this.work.work.estimate === null ? `border-solid border-2 border-yellow-500` : ""} text-right">${this.work.work.estimate}</dd>
                        <dt>Confidence</dt>
                        <dd class="${this.work.work.confidence === null ? `border-solid border-2 border-yellow-500` : ""} text-right">${this.work.work.confidence}</dd>
                        
                        ${
                            this.work.work.estimate === null || this.work.work.confidence === null ? 
                            `
                            <dt>Default Estimate</dt>
                            <dd class="text-right">${this.work.work.usedEstimate}</dd>
                            <dt>Default Confidence</dt>
                            <dd class="text-right">${this.work.work.usedConfidence}</dd>
                            ` :
                            ""
                        }
                        
                        <dt>Median Days of Work</dt>
                        <dd class="text-right">${this.work.work.estimatedDaysOfWork}</dd>
                        <dt>Adjusted Days of Work</dt>
                        <dd class="text-right">${this.work.adjustedDaysOfWork }</dd>
                    </dl>`
                    }
                    
                </div>
            `)
        } else {

            if(this.work.uncertaintyWeight === "average") {
                TOOLTIP.belowElementInScrollingContainer(event.currentTarget, `
                    <div class="p-2">
                        <div class="flex gap-2">
                            <div class="bg-green-200 rounded text-white text-center p-1">
                                <h5>On Average</h5>
                                <p class="text-sm">work ends</p>
                                <p>${monthDateFormatter.format(dates.dueDateBottom)}</p>
                            </div>
                        </div>
                    </div>
                `)
            } else {
                TOOLTIP.belowElementInScrollingContainer(event.currentTarget, `
                <div class="p-2">
                    <div class="flex gap-2">
                        <div class="bg-green-200 rounded text-white text-center p-1">
                            <h5>${rangeStartChance}</h5>
                            <p class="text-sm">work ends after</p>
                            <p>${monthDateFormatter.format(dates.dueDateBottom)}</p>
                        </div>
                        <div class="bg-green-400 rounded text-white text-center p-1">
                            <h5>${rangeStartChance}</h5>
                            <p class="text-sm">work ends before</p>
                            <p>${monthDateFormatter.format(rangeEndDate)}</p>
                        </div>
                    </div>
                </div>
            `)
            }
            
        }

        
    }
    rangeBorderClasses() {
        // this.work.dueDatesOnly
        // work.dueDateBottom, work.dueDateTop
        if(this.work.dueDatesOnly) {
            if(this.work.dueDateBottom === this.work.dueDateTop) {
                return "border-solid border border-x-4 border-green-200"
            } else {
                return "border-solid border border-[6px] border-white";
            }
        }
        if(this.work.work.estimate === null || this.work.work.confidence === null) {
            return "border-solid border-2 border-yellow-500";
        } else {
            return "border-solid border";
        }
    }
    plus(a, b){
        return a+b;
    }
    connected(){
        
        this.listenTo("showingData",({value})=>{
            if(value) {
                setTimeout(() => {
                    for( const grid of this.querySelectorAll(".grid") ) {
                        grid.classList.add("h-24");
                        grid.classList.remove("h-0");
                    }
                    setTimeout(()=>{
                        this.dispatch("resized");
                    },150)
                    setTimeout(()=>{
                        this.dispatch("resized");
                    },300)
                },1)
            } else {
                this.dispatch("resized");
            }
        });
    }
    percent(value) {
        return ((value / this.lastDueDay)* 100 )+"%";
    }
    percentWidth(start, end){
        return (((end - start ) / this.lastDueDay)* 100 )+"%";
    }
    toggleShowingExtraData(){
        this.showingData = !this.showingData
    }
}


export function getDatesFromWork(work,startDate){
    
    let additionalPoints = estimateExtraPoints(work.work.usedEstimate, work.work.usedConfidence, work.uncertaintyWeight );

    let rangeStartDate,
        rangeEndDate;
    if(work.uncertaintyWeight === "average") {
        rangeStartDate = getUTCEndDateFromStartDateAndBusinessDays(startDate, work.startDateAverage);
        rangeEndDate = getUTCEndDateFromStartDateAndBusinessDays(startDate, work.dueDateAverage);
    } else {
        rangeStartDate = getUTCEndDateFromStartDateAndBusinessDays(startDate, work.startDateBottom);
        rangeEndDate = getUTCEndDateFromStartDateAndBusinessDays(startDate, work.dueDateTop);
    }

    return {
        additionalPoints,
        totalPoints: work.work.usedEstimate + additionalPoints,
        startDate: rangeStartDate,
        dueDate: rangeEndDate,
        
        startDate10: getUTCEndDateFromStartDateAndBusinessDays(startDate, work.startDateBottom10),
        dueDate10: getUTCEndDateFromStartDateAndBusinessDays(startDate, work.dueDateBottom10),
        dueDate90: getUTCEndDateFromStartDateAndBusinessDays(startDate, work.dueDateTop90),
        dueDateBottom: getUTCEndDateFromStartDateAndBusinessDays(startDate, work.dueDateBottom),
        startDateAverage: getUTCEndDateFromStartDateAndBusinessDays(startDate, work.startDateAverage),
        dueDateAverage: getUTCEndDateFromStartDateAndBusinessDays(startDate, work.dueDateAverage),
        startDateWithTimeEnoughToFinish: getUTCEndDateFromStartDateAndBusinessDays(startDate, work.startDateWithTimeEnoughToFinish)
    }
}


function toFixed( num, precision ) {
    return (+(Math.round(+(num + 'e' + precision)) + 'e' + -precision)).toFixed(precision);
}

function createColumnData(values, days, type) {
    const columnData = [];
    for(let i = 0; i < days; i++) {
        columnData.push({
            percentValue: 0,
            totalCount: 0,
            day: i,
            type
        })
    }
    let largestCount = 0;
    for( const dueDay of values ) {
        if(columnData[dueDay]) {
            columnData[dueDay].totalCount++;
            largestCount = Math.max(largestCount, columnData[dueDay].totalCount);
        }
    }
    for(const column of columnData) {
        column.percentValue = (column.totalCount / largestCount)*100;
    }

    return columnData;
}

/*
class SimulationData extends StacheElement {
    static view = `
        <div class="bg-white">
            <div class="chart"></div>
        </div>
       
    `;
    static props = {
        work: type.Any,
        lastDueDay: Number
    };

    connected(){
        const chart = this.querySelector("div.chart");

        const baseWidth = chart.parentElement.clientWidth;
        console.log(baseWidth);
        // set the dimensions and margins of the graph
        var margin = {top: 0, right: 0, bottom: 0, left: 0},
        width = baseWidth - margin.left - margin.right,
        height = 200 - margin.top - margin.bottom;

        // append the svg object to the body of the page
        var svg = d3.select(chart)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        // get 98%
        const largestDay = this.work.dueDateValues[ Math.round(this.work.dueDateValues.length * 0.98) ];
        const smallestDay = this.work.startDateValues[ Math.round(this.work.startDateValues.length * 0.01) ];

        const x = d3.scaleLinear()
            .domain([0,this.lastDueDay])   
            .range([0, width]);


        //const xAxis = d3.axisBottom(x).tickValues(generateMultiplesOfTen(smallestDay,largestDay))
        
        // set the parameters for the histogram
        const histogram = d3.histogram()
            //.value(function(d) { return +d.value; })   // I need to give the vector of value
            .domain(x.domain())  // then the domain of the graphic
            .thresholds(x.ticks(this.lastDueDay)); // then the numbers of bins
        
        // And apply twice this function to data to get the bins.
        const bins1 = histogram(this.work.startDateValues);
        const bins2 = histogram(this.work.dueDateValues);
        
        // Y axis: scale and draw:
        const y = d3.scaleLinear()
            .range([height, 0]);
            y.domain([0, d3.max(bins1, function(d) { return d.length; })]);   // d3.hist has to be called before the Y axis obviously

        
        // append the bars for series 1
        svg.selectAll("rect")
            .data(bins1)
            .join("rect")
                .attr("x", 1)
                .attr("transform", function(d) { return `translate(${x(d.x0)} , ${y(d.length)})`})
                .attr("width", function(d) { 
                    return x(d.x1) - x(d.x0) -1 ; 
                })
                .attr("height", function(d) { return height - y(d.length); })
                .style("fill", "#69b3a2")
                .style("opacity", 0.6)
        
        // append the bars for series 2
        svg.selectAll("rect2")
            .data(bins2)
            .enter()
            .append("rect")
                .attr("x", 1)
                .attr("transform", function(d) { return `translate(${x(d.x0)}, ${y(d.length)})`})
                .attr("width", function(d) { return x(d.x1) - x(d.x0) -1 ; })
                .attr("height", function(d) { return height - y(d.length); })
                .style("fill", "#404080")
                .style("opacity", 0.6)
        
        // Handmade legend
        svg.append("circle").attr("cx",300).attr("cy",30).attr("r", 6).style("fill", "#69b3a2")
        svg.append("circle").attr("cx",300).attr("cy",60).attr("r", 6).style("fill", "#404080")
        svg.append("text").attr("x", 320).attr("y", 30).text("Start Dates").style("font-size", "15px").attr("alignment-baseline","middle")
        svg.append("text").attr("x", 320).attr("y", 60).text("End Dates").style("font-size", "15px").attr("alignment-baseline","middle")

    }
}*/



function generateMultiplesOfTen(min, max) {
    // Round the min and max to nearest multiples of 10
    const start = Math.ceil(min / 10) * 10;
    const end = Math.floor(max / 10) * 10;

    // Generate the range
    let range = [];
    for (let i = start; i <= end; i += 10) {
        range.push(i);
    }

    return range;
}


customElements.define("simulation-data", SimulationData);

export default SimulationData;