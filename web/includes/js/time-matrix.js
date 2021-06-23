import constants, { fillColorDict, fillColorTime} from './const.js'

var margin = { top: 30, right: 0, bottom: 0, left: 30 }
var width, height, gridHeight, gridWidth, buckets, colors, imps, times

export function makeMatrix() {

    width = $('#matrix-holder').width() - margin.left - margin.right
    height = $('.table').height() - margin.top - margin.bottom
    gridHeight = Math.floor(height / 4)
    gridWidth = Math.floor(width / 8)
    buckets = 9
    colors = ["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"] // alternatively colorbrewer.YlGnBu[9]
    imps = ["pop", "hosp", "mob", "pow"]
    times = ["12-15","15-18","18-21","21-00","00-03","03-06","06-09","09-12"]

    var svg = d3.select("#matrix-holder").append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
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

    drawGrids(svg,'National','0.9')

}

function drawGrids(svg,loc,perc) {
    
    let formatted = [];
    let filtered = constants.time.filter(entry => entry.Location == loc)
    let data = filtered[0]
    console.log(data.Timing)

    times.forEach((label,i) => {

        formatted.push(
            {
                imp: 'population',
                row: 0,
                column: i,
                time: label,
                value: data.Timing.population[label][perc]
            }
        )

        formatted.push(
            {
                imp: 'hospitals',
                row: 1,
                column: i,
                time: label,
                value: data.Timing.hospitals[label][perc]
            }
        )

        formatted.push(
            {
                imp: 'mobilehomes',
                row: 2,
                column: i,
                time: label,
                value: data.Timing.mobilehomes[label][perc]
            }
        )

        formatted.push(
            {
                imp: 'psubstations',
                row: 3,
                column: i,
                time: label,
                value: data.Timing.psubstations[label][perc]
            }
        )

    })

    let cards = svg.selectAll(".hour")
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
                        return fillColorTime[d.imp][perc](d.value); 
                    });

}