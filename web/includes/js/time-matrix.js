import constants, { fillColorDict } from './const.js'

var margin = { top: 30, right: 0, bottom: 0, left: 30 }
var rat_margin = { top: 30, right: 10, bottom: 0, left: 30}
var mat_width, mat_height, rat_width, rat_height, 
        gridHeight, gridWidth, buckets, colors, imps, times;
var x,y;
var imps = ["pop", "hosp", "mob", "pow", "sco"];
var cats = ['0-1','2-3','4-5']
var nsims = 10000;

export function makeScatter() {

    rat_width = $('#rating-holder').width() - rat_margin.left - rat_margin.right;
    rat_height = $('.table').height() - rat_margin.top - rat_margin.bottom;
    let rangeArr = []
    
    for (let i = 0; i < imps.length; i++) {
        let loc = rat_margin.top + (i + 0.5)*gridHeight
        rangeArr.push(loc)
    }

    let svg = d3.select('#rating-holder').append('svg')
                .attr('width', rat_width + rat_margin.left + rat_margin.right)
                .attr('height', rat_height + rat_margin.top + rat_margin.bottom)
    

    // Section to append legend
    svg.append('g')
        .attr('transform',`translate(${rat_width + rat_margin.left},${rat_margin.top})`)
        .selectAll('circle')
        .data(cats)
        .join('circle')
        .attr('cy',(d,i) => {
            return (i+1)*gridHeight;
        })
        .attr('stroke-width',1)
        .attr('stroke','black')
        .attr('fill', d => {
            switch (d) {
                case '0-1':
                    return 'yellow';
                case '2-3':
                    return 'orange';
                case '4-5':
                    return 'red';
            }
        })
        .attr('r',5)

    svg.append('g')
        .attr('transform',`translate(${rat_width + rat_margin.left},${rat_margin.top})`)
        .selectAll('text')
        .data(cats)
        .join('text')
        .attr('y',(d,i) => {
            return (i+1.5)*gridHeight;
        })
        .attr('font-size','10px')
        .attr('text-anchor','middle')
        .text(d => `${d}`)

    x = d3.scaleLinear()
                .domain([0,100])
                .range([rat_margin.left, rat_width-rat_margin.right])
    

    y = d3.scaleOrdinal()
                .domain(imps)
                .range(rangeArr)
                    
    let xAxis = g => g.attr("transform",`translate(0, ${rat_margin.top})`)
                        .call(d3.axisTop(x).ticks(5))
                        .call(g => g.select(".domain").remove())
                        .call(g => g.append("text")
                            .attr("x", rat_width - rat_margin.right)
                            .attr("y", -rat_margin.top/2 - 4)
                            .attr("fill", "black")
                            .attr("text-anchor","end")
                            .text('% of all sims >= threshold'))

    let yAxis = g => g.attr("transform",`translate(${rat_margin.left}, 0)`)
                        .call(d3.axisLeft(y))
                        .call(g => g.select(".domain").remove())

    let grid = g => g.attr("stroke", "black")
                        .call(g => g.append("g")
                                    .selectAll("line")
                                    .data(x.ticks(5))
                                    .join("line")
                                    .attr("stroke-opacity", 0.1)
                                    .attr("x1", d => 0.5 + x(d))
                                    .attr("x2", d => 0.5 + x(d))
                                    .attr("y1", rat_margin.top + 0.5*gridHeight)
                                    .attr("y2", rat_margin.top + 4.5*gridHeight))
                        .attr('id','rat-grid')

    let inputs = div => div.style('transform',`translate(0,${rat_margin.top}px)`)
                            .selectAll("div")
                            .data(imps)
                            .join("div")
                            .style("height",`${gridHeight}px`)
                            .style('font-size','10px')
                            .html(d => `<input type="text" class="thresh" id="thresh-${d}" size="7" value="1"> ${constants.impDict[d]} `)
                            .call(div => {
                                let input = div.select('input')
                                input.on('change',function() {
                                    let id = this.id;
                                    let imp = id.slice(7,);
                                    let value = +this.value;

                                    let arr = [imp,value];
                                    updatePoints(arr);
                                })
                            })

    svg.append("g").call(xAxis)
    svg.append("g").call(yAxis)
    svg.append("g").call(grid)

    let thresHold = d3.select('#threshold-holder')
    thresHold.append("div").call(inputs)

    drawPoints()

}

export function updatePoints(manImp) {

    let impMap = {
        pop: 1,
        hosp: 2,
        mob: 3,
        pow: 4,
        sco: 5
    }

    if (typeof(manImp) == 'object') {

        var imp = manImp[0];
        var value = manImp[1];

    } else {

        var imp = manImp;
        var value = +d3.select(`#thresh-${imp}`).attr('value');

    } 
    
    // Need an else statement on how to update dots if we manually drive the update
    // e.g., we choose a new state and need to update all impacts
    

    let svg = d3.select('#rating-holder svg')
    let cToUpdate = svg.selectAll(`circle.${imp}`)

    let pcts = []

    cats.forEach(cat => {
        let data = constants.sims.filter(entry => entry.Level == cat);

        try {
            let numThresh = data[0].Sims.filter(entry => entry[impMap[imp]] >= value).length
            pcts.push({x: 100*numThresh/nsims, y: imp, cat: cat})
        } catch(err) {
            pcts.push({x: 0, y: imp, cat: cat})
        }
 
    })

    cToUpdate.data(pcts)
                .transition().duration(1000)
                .attr("cx", d => x(d.x))
    

}

export function drawPoints() {

    let pcts = [];
    let thresh = {'pop': 1, 'hosp': 1, 'mob': 1, 'pow': 1, 'sco': 1}
    let grid = d3.select('#rat-grid')

    cats.forEach(cat => {
        let data = constants.sims.filter(entry => entry.Level == cat);

        imps.forEach((imp,i) => {

            let numThresh = data[0].Sims.filter(entry => entry[i+1] >= thresh[imp]).length
            pcts.push({x: 100*numThresh/nsims, y: imp, cat: cat})

        })
    })

    grid.append("g")
        .attr("stroke","black")
        .attr("stroke-width",1)
        .selectAll("circle")
        .data(pcts)
        .join("circle")
        .attr("fill", d => {

            if (d.cat == '0-1') {
                return 'yellow';
            }
            else if (d.cat == '2-3') {
                return 'orange';
            } else { 
                return 'red';
            }

        })
        .attr("cx", d => x(d.x))
        .attr("cy", d => y(d.y))
        .attr("r", 5)
        .attr("class", d => `cat${d.cat} ${d.y}`)
    

}

export function makeMatrix() {

    mat_width = $('#matrix-holder').width() - margin.left - margin.right
    mat_height = $('.table').height() - margin.top - margin.bottom
    gridHeight = Math.floor(mat_height / 5)
    gridWidth = Math.floor(mat_width / 24)
    buckets = 9
    colors = ["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"] // alternatively colorbrewer.YlGnBu[9]
    times = ["12","13","14","15","16","17","18","19","20","21","22","23","0","1","2","3",
                "4","5","6","7","8","9","10","11"]

    let svg = d3.select("#matrix-holder").append("svg")
                .attr("width", mat_width + margin.left + margin.right)
                .attr("height", mat_height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var impLabels = svg.selectAll(".impLabel")
                        .data(imps)
                        .enter().append("text")
                        .text(function (d) { return d; })
                        .attr('font-size', 10)
                        .attr("x", 0)
                        .attr("y", function (d, i) { return i * gridHeight; })
                        .style("text-anchor", "end")
                        .attr("transform", "translate(-6," + gridHeight / 1.5 + ")");
  
    var timeLabels = svg.selectAll(".timeLabel")
                        .data(times)
                        .enter().append("text")
                        .text(function(d) { return d; })
                        .attr('font-size', 8)
                        .attr("x", function(d, i) { return i * gridWidth; })
                        .attr("y", 0)
                        .style("text-anchor", "middle")
                        .attr("transform", "translate(" + gridWidth / 2 + ", -6)");

    // drawGrids(svg,'National')
    drawGrids('National')

}

function makeColorCurve(obj) {

    let values = []

    Object.keys(obj).forEach(key => {

        values.push(+obj[key])

    })

    let max = Math.max(...values)
    let sum = values.reduce((pv,cv) => pv + cv, 0)

    let reds = d3.scaleLinear().range(["rgb(255,245,240)", "rgb(214,37,34)"]);
    let curve = d3.scaleSequential([0,max], reds)

    return [curve,sum];

}

export function drawGrids(loc) {
    
    let svg = d3.select('#matrix-holder svg g')
    let formatted = [];
    let filtered = constants.time.filter(entry => entry.Location == loc)
    let data = filtered[0]

    if (data) {

        times.forEach((label,i) => {

            formatted.push(
                {
                    imp: 'population',
                    row: 0,
                    column: i,
                    time: label,
                    value: data.Timing.population[label]
                }
            )

            formatted.push(
                {
                    imp: 'hospitals',
                    row: 1,
                    column: i,
                    time: label,
                    value: data.Timing.hospitals[label]
                }
            )

            formatted.push(
                {
                    imp: 'mobilehomes',
                    row: 2,
                    column: i,
                    time: label,
                    value: data.Timing.mobilehomes[label]
                }
            )

            formatted.push(
                {
                    imp: 'psubstations',
                    row: 3,
                    column: i,
                    time: label,
                    value: data.Timing.psubstations[label]
                }
            )

            formatted.push(
                {
                    imp: 'schools',
                    row: 4,
                    column: i,
                    time: label,
                    value: data.Timing.schools[label]
                }
            )

        })
    } else {
        times.forEach((label,i) => {

            formatted.push(
                {
                    imp: 'population',
                    row: 0,
                    column: i,
                    time: label,
                    value: 0
                }
            )

            formatted.push(
                {
                    imp: 'hospitals',
                    row: 1,
                    column: i,
                    time: label,
                    value: 0
                }
            )

            formatted.push(
                {
                    imp: 'mobilehomes',
                    row: 2,
                    column: i,
                    time: label,
                    value: 0
                }
            )

            formatted.push(
                {
                    imp: 'psubstations',
                    row: 3,
                    column: i,
                    time: label,
                    value: 0
                }
            )

            formatted.push(
                {
                    imp: 'schools',
                    row: 4,
                    column: i,
                    time: label,
                    value: 0
                }
            )

        })
    }

    let colorCurves;

    try {
        colorCurves = {

            'population': makeColorCurve(data.Timing.population),
            'hospitals': makeColorCurve(data.Timing.hospitals),
            'mobilehomes': makeColorCurve(data.Timing.mobilehomes),
            'psubstations': makeColorCurve(data.Timing.psubstations),
            'schools': makeColorCurve(data.Timing.schools)

        }
    } catch(err) {
        console.log('No data for this selection')

        // Just using some default data below to fill the time matrix when there are
        // no data

        let reds = d3.scaleLinear().range(["rgb(255,245,240)", "rgb(214,37,34)"]);
        let curve = d3.scaleSequential([0,100, reds])

        colorCurves = {

            'population': [curve,1],
            'hospitals': [curve,1],
            'mobilehomes': [curve,1],
            'psubstations': [curve,1],
            'schools': [curve,1]

        }
    }

    let cards = svg.selectAll("rect")
                        .data(formatted, d => d.value)
                        .join('rect')
                        .attr("x", function(d) { return d.column * gridWidth; })
                        .attr("y", function(d) { return d.row * gridHeight; })
                        .attr("rx", 4)
                        .attr("ry", 4)
                        .attr("class", "hour bordered")
                        .attr("width", gridWidth)
                        .attr("height", gridHeight)
                        .style("fill", colors[0]);

    cards.transition().duration(1000)
                        .style("fill", function(d) { 
                            return colorCurves[d.imp][0](d.value);
                        });
    
    let cardText = svg.selectAll(".percent")
                        .data(formatted, d => d.value)
                        .join('text')
                        .attr("x", function(d) { return d.column * gridWidth + 0.5*gridWidth; })
                        .attr("y", function(d) { return d.row * gridHeight + 0.6*gridHeight; })
                        .attr("class", "percent bordered")
                        .attr("text-anchor","middle")
                        .attr("font-size", 8)
                        .text(d => `${Math.round(100 * d.value / colorCurves[d.imp][1])}`)
                        
}