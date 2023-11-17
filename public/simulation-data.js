import { StacheElement, type, ObservableObject, fromAttribute, queues } from "//unpkg.com/can@6/core.mjs";
import {bestFitRanges, getUTCEndDateFromStartDateAndBusinessDays} from "./shared/dateUtils.js"
import SimpleTooltip from "./shared/simple-tooltip.js";

const TOOLTIP = new SimpleTooltip();

document.body.append(TOOLTIP);

class SimulationData extends StacheElement {
    static view = `

    {{# if(this.showingData) }}
        <div class="grid transition-all ease-in-out duration-300 h-0 box-border top-3 relative" 
            style="grid-template-columns: repeat({{plus(this.lastDueDay, 1)}}, 1fr); grid-template-rows: auto;">
                
            {{# for( column of this.startColumns ) }}
                <div 
                    on:mouseenter="this.showProbabilityData(scope.event, column)" 
                    on:mouseleave="this.hideProbabilityData()"
                    class="flex h-full group">
                    <div
                        class="self-end bg-blue-100 w-full group-hover:bg-blue-500" style="height: {{column.percentValue}}%"></div>
                </div>
            {{/ }}
        </div>
    {{/ if }}
    
    <div class="relative py-1 cursor-pointer z-50"
        on:click="this.toggleShowingExtraData()"
        on:mouseenter="this.showProbabilitySumary(scope.event)"
        on:mouseleave="this.hideProbabilityData()">

        <!--<div 
            class="absolute bg-gradient-to-r from-blue-200 to-green-200 from-45% to-55% h-1 top-2.5 border-box" 
            style="left: {{this.percent(work.startDateBottom)}}; width: {{this.percentWidth(work.startDateBottom, work.dueDateTop)}}"></div>-->

        <!--<div 
            class="absolute bg-gradient-to-r from-blue-200 to-green-200 from-45% to-55% h-2 top-2 border-box rounded-sm" 
            style="left: {{this.percent(work.startDateBottom)}}; width: {{this.percentWidth(work.startDateBottom, work.dueDateTop)}}"></div>-->

        <!--<div id="{{work.work.issue["Issue key"]}}"
            class="work-item border-solid border relative bg-gradient-to-r from-blue-500 to-green-400 from-45% to-55% h-4 border-box rounded" 
            style="left: {{this.percent(work.startDateMedian)}}; width: {{this.percentWidth(work.startDateMedian, work.dueDateMedian)}}"></div>-->

        <div 
            class="absolute bg-gradient-to-r from-blue-200 to-green-200 from-45% to-55% h-1 top-2.5 border-box" 
            style="left: {{this.percent(work.startDateBottom10)}}; width: {{this.percentWidth(work.startDateBottom10, work.dueDateTop90)}}"></div>

        <div id="{{work.work.issue["Issue key"]}}"
            class="work-item border-solid border relative bg-gradient-to-r from-blue-500 to-green-400 from-45% to-55% h-4 border-box rounded" 
            style="left: {{this.percent(work.startDateBottom)}}; width: {{this.percentWidth(work.startDateBottom, work.dueDateTop)}}"></div>
    </div>
    {{# if(this.showingData) }}
        <div class="grid transition-all ease-in-out duration-300 h-0 box-border pb-1 relative -top-3" 
            style="grid-template-columns: repeat({{this.lastDueDay}}, 1fr); grid-template-rows: auto;">
                
            {{# for( column of this.endColumns ) }}
                <div 
                    on:mouseenter="this.showProbabilityData(scope.event, column)" 
                    on:mouseleave="this.hideProbabilityData()"
                    class="flex h-full">
                    <div
                        class="self-start bg-green-100 w-full" style="height: {{column.percentValue}}%"></div>
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

        const timingName = column.type === "startDate" ? "starting before" : "ending after";
        const pastTenseName = column.type === "startDate" ? "started" : "ended";
        let probability = column.type === "startDate" ? cumulativeProbability*100 : (1-cumulativeProbability)* 100;

        TOOLTIP.enteredElement(event, `
            <p>${monthDateFormatter.format(date)}</p>
            <p>There is a ${Math.round( probability )}% likelihood of ${timingName} or on this day.</p>
            <p>In ${column.totalCount } of ${this.work[column.type+"Values"].length} simulations, the work ${pastTenseName} on this day.</p>
            
        `)
    }
    hideProbabilityData(){
        TOOLTIP.leftElement();
    }
    showProbabilitySumary(event) {
        
        const monthDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

        const startDateBottom = getUTCEndDateFromStartDateAndBusinessDays(this.startDate, this.work.startDateBottom);
        const startDateMedian = getUTCEndDateFromStartDateAndBusinessDays(this.startDate, this.work.startDateMedian);

        const dueDateTop = getUTCEndDateFromStartDateAndBusinessDays(this.startDate, this.work.dueDateTop);
        const dueDateMedian = getUTCEndDateFromStartDateAndBusinessDays(this.startDate, this.work.dueDateMedian);

        TOOLTIP.enteredElement(event, `
            <p>Start Dates</p>
            <ul class="list-disc text-2xl pl-5">
                <li class="text-blue-200"><span class="text-black text-base">
                    10% chance starts before ${monthDateFormatter.format(startDateBottom)}
                </span></li>
                <li class="text-blue-500"><span class="text-black text-base">
                    Average start date is ${monthDateFormatter.format(startDateMedian)}
                </span></li>
            </ul>

            <p>End Dates</p>
            <ul class="list-disc text-2xl pl-5">
                <li class="text-green-500"><span class="text-black text-base">
                    Average end date is ${monthDateFormatter.format(dueDateMedian)}
                </span></li>
                <li class="text-green-200"><span class="text-black text-base">
                    10% chance end after ${monthDateFormatter.format(dueDateTop)}
                </span></li>
                
            </ul>
        `)
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
        return (((end - start + 1) / this.lastDueDay)* 100 )+"%";
    }
    toggleShowingExtraData(){
        this.showingData = !this.showingData
    }
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