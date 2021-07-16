import constants from "./const.js";

var hist_margin = {top: 10, right: 20, bottom: 40, left: 40}

export function formatSims() {

    let arr1, arr2, arr3;
    let pop,hosp,mob,pow,sco;
    let pop_arr = [], hosp_arr = [], mob_arr = [], pow_arr = [], sco_arr = [];


    // Might be worth exploring using danfo.js again here
    // to groupby sims and sum, instead of looping through sims and filtering

    for (i=0;i<constants.nsims;i++) {
        
        // Filter for each sim
        let weakSim = constants.sims[0]['Sims'].filter(entry => entry[0] == i+1)
        let sigSim = constants.sims[1]['Sims'].filter(entry => entry[0] == i+1)
        let vioSim = constants.sims[2]['Sims'].filter(entry => entry[0] == i+1)
        
        pop = 0, hosp = 0, mob = 0, pow = 0, sco = 0;

        try {
            arr1 = weakSim[0].slice(1,)
            pop += +arr1[0], hosp += +arr1[1], mob += +arr1[2], pow += +arr1[3], sco += +arr1[4];

        } catch(err) {
            
        }
        try {
            arr2 = sigSim[0].slice(1,)
            pop += +arr2[0], hosp += +arr2[1], mob += +arr2[2], pow += +arr2[3], sco += +arr2[4];
        } catch(err) {
            
        }
        try {
            arr3 = vioSim[0].slice(1,)
            pop += +arr3[0], hosp += +arr3[1], mob += +arr3[2], pow += +arr3[3], sco += +arr3[4];
        } catch(err) {
            
        }

        pop_arr.push(pop), hosp_arr.push(hosp), mob_arr.push(mob), pow_arr.push(pow), sco_arr.push(sco);

    }

    // return new Promise((resolve,reject) => resolve(pop_arr, hosp_arr, mob_arr, pow_arr));
    
    // return new Promise((resolve,reject) => resolve(pop_arr, hosp_arr));
    return [Promise.resolve(pop_arr), Promise.resolve(hosp_arr), 
        Promise.resolve(mob_arr), Promise.resolve(pow_arr),
        Promise.resolve(sco_arr)];
}


export function adjustDist() {

    d3.selectAll('.dist-chart')
        .attr('opacity','0.1')

    d3.selectAll('.no-tor')
        .style('visibility','visible')


}


class charts {
    constructor() {
        this.width = constants.width;
        this.height = constants.height;
    }
}

export class histogram extends charts {
    constructor() {
        super()

        this.makeChart = function(data,container) {

            if (this.width >= 992) {
                this.width = this.width/6;
            }

            if (this.height >= 558) {
                this.height = this.height/4;
            } else {
                this.height = this.height/2;
            }

            const svg = d3.select(container).append('svg');
            svg.attr('width',this.width)
                .attr('height',this.height)
                .classed('dist-chart',true);

            svg.append("g").classed('x-axis',true);
            svg.append("g").classed('y-axis',true);
            svg.append("g").classed('bars',true);
            svg.append("g").classed('stats',true);

            let isMob = container == '#mob-chart'

            // Make x func for this chart
            var x = this.x(data,isMob);

            // Create x axis
            this.xAxis(svg.select('.x-axis'),x);

            // Create array of bins
            var bins = this.bins(data,x,isMob);

            // Create y func for this chart
            var y = this.y(bins);

            // Create y axis
            this.yAxis(svg.select('.y-axis'),y);

            // Create histogram bars
            this.bars(svg.select('.bars'),bins,x,y);

        }

        this.updateChart = function(data,container) {

            const svg = d3.select(container).select('svg')

            // Format the divs to show the distributions
            svg.attr('opacity',1);
            d3.selectAll('.no-tor').style('visibility','hidden')

            let isMob = container == '#mob-chart'

            // Make x func for this chart
            var x = this.x(data,isMob);

            var g = svg.select('.x-axis')
            
            g.call(d3.axisBottom(x).tickFormat(d3.format("~s")))
                .selectAll('text')
                .attr("y",9)
                .attr("x",6)
                .attr("dy",".35em")
                .style("text-anchor", "start")
                .attr("transform", "rotate(50)")

            let labels = g.selectAll('.x-axis text')
            labels.last(1).attr('visibility','hidden')
            let txtAdj = labels.last(2).text()
            labels.last(2).text(`${txtAdj} +`)

            // Update the bars here
            // Create array of bins
            var bins = this.bins(data,x,isMob);

            // Create y func for this chart
            var y = this.y(bins);

            // Create histogram bars
            this.bars(svg.select('.bars'),bins,x,y);

        }

        this.xAxis = (g,xScale) => { 
            g.attr("transform", `translate(0,${this.height - hist_margin.bottom})`)
                .call(d3.axisBottom(xScale).tickFormat(d3.format("~s")))
                .selectAll('text')
                .attr("y",9)
                .attr("x",6)
                .attr("dy",".35em")
                .style("text-anchor", "start")
                .attr("transform", "rotate(50)")

            let labels = g.selectAll('.x-axis text')
            labels.last(1).attr('visibility','hidden')
            let txtAdj = labels.last(2).text()
            labels.last(2).text(`${txtAdj} +`)
        }
    
        this.yAxis = (g,y) => { 
            g.attr("transform", `translate(${hist_margin.left},0)`)
                .call(d3.axisLeft(y).ticks(10,".0%"))
        }

        this.x = (data,isMob=false) => {
            return d3.scaleLinear().domain(this.xScaleDom(data,isMob))
                        .range([hist_margin.left, this.width - hist_margin.right])
        }

        this.xScaleDom = (data,isMob=false) => {

            if (d3.max(data) > 10) {
                return [0,d3.max(data)+1]
            } else {
                if (isMob) {
                    return [0,250]
                }
                return [0,10]
            }
        }

        this.bins = (data,x,isMob=false) => { 
            return d3.bin()
                    .domain(x.domain())
                    .thresholds(() => {

                        let max = d3.max(data);
                        
                        // Logic to ensure bins of 25 for mobile home hist
                        if (isMob) {

                            let step = Math.ceil(max/250)*25

                            if (max == 0) {
                                step = 25
                            }
                            let arr = [];
                            for(let i = 0; i <= 10; i++){
                                arr.push(i*step);
                            }
                            return arr;
                        }
                        
                        let limit = 20;

                        if (max <= 10) {
                            return 10;
                        } else if (max <= limit) {
                            return max;
                        } else {
                            return limit;
                        }
                    })
                    (data)
        }

        this.yScaleDom = [0,0.3];

        this.y = (bins) => d3.scaleLinear()
                            .domain(this.yScaleDom)
                            .range([this.height - hist_margin.bottom, hist_margin.top]);

        this.bars = (g,bins,x,y) => g.attr('fill','steelblue')
                                        .selectAll('rect')
                                        .data(bins)
                                        .join('rect')
                                        .attr('x', d => x(d.x0))
                                        .attr('width', d => x(d.x1) - x(d.x0))
                                        .attr('y', d => y(d.length/constants.nsims))
                                        .attr('height', d => y(0) - y(d.length/constants.nsims));

        this.quantFormatter = (data,quant=0.9,isMob=false) => {

            let max_adj = d3.max(data)/10
            let quant_adj = d3.quantile(data,quant)
        
            if (isMob) {
                if ((max_adj < 251) & (quant_adj < 251)) {
                    return data.filter(val => val < 251)
                } else if (max_adj > quant_adj) {
                    return data.filter(val => val < max_adj)
                } else {
                    return data.filter(val => val < quant_adj)
                }
            }
        
            if ((max_adj < 10) & (quant_adj < 10)) {
                return data.filter(val => val < 10)
            } else if (max_adj > quant_adj) {
                return data.filter(val => val < max_adj)
            } else {
                return data.filter(val => val < quant_adj - 1)
            }
        
        }
    }

}

export var popChart = new histogram()
export var hospChart = new histogram()
export var mobChart = new histogram()
export var powChart = new histogram()
