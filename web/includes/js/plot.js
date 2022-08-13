
import * as Plot from "https://cdn.skypack.dev/@observablehq/plot@0.5";

let tickPlot = (data,type) => {

    let text = type;

    return {
        style: {
            width: vars.width,
            fontSize: vars.fontsize
        },
        grid: false,
        x: {
            type: "symlog",
            constant: 600,
            tickPadding: 2,
            tickSize: 3,
            tickFormat: 's',
            domain: formatDomain(data)
        },
        y: {
            label: "",
            tickRotate: -90,
            tickFormat: d => text
        },
        marks: [
            Plot.ruleX([0]),
            Plot.tickX(data, {x: "Value", strokeOpacity: 0.01, insetTop: 0, title: "Sim"}),
            Plot.barX(data, 
                    Plot.groupY({x1: iqr1, x2: iqr2}, 
                                {x: "Value", y: "cat", insetTop: -9, insetBottom: 32})),
            Plot.barX(data, 
                    Plot.groupY({x1: quartile1, x2: quartile3}, 
                                {x: "Value", y: "cat", fill: "#ccc", insetTop: -13, insetBottom: 28})
                    ),
            Plot.tickX(data, 
                    Plot.groupY({x: "median"}, 
                                {x: "Value", y: "cat", strokeWidth: 1, insetTop: -13, insetBottom: 28})),
            Plot.text(data,
                    Plot.groupY({x: iqr1, text: iqr1}, 
                                {x: "Value", y: "cat", dy: -21, dx: -vars.dx, text: "Value", textAnchor: "end"})),
            Plot.text(data,
                    Plot.groupY({x: iqr2, text: iqr2}, 
                                {x: "Value", y: "cat", dy: -21, dx: vars.dx, text: "Value", textAnchor: "start"})),
            Plot.text(data,
                    Plot.groupY({x: quartile1, text: quartile1}, 
                                {x: "Value", y: "cat", dy: -30, dx: -vars.dx, textAnchor: "end", text: "Value"})),
            Plot.text(data,
                    Plot.groupY({x: quartile3, text: quartile3}, 
                                {x: "Value", y: "cat", dy: -30, dx: vars.dx, textAnchor: "start", text: "Value"})),
            Plot.text(data,
                    Plot.groupY({x: "median", text: "median"}, 
                                {x: "Value", y: "cat", dy: -30, textAnchor: "middle", text: "Value"}))
        ]
    }

}

export let dotPlot = (data,type='Injuries') => {

    let formattimes = data.map(entry => 
        {
            if (+entry.time < 12) {
                entry.time = +entry.time + 24
            }
            return entry
        })

    let label = type == 'Injuries' ? ["Number Injured",'num_inj'] : ["Number Killed",'num_fat'];

    return {
        grid: true,
        height: 125,
        x: {
          label: "Time (UTC) →",
          tickFormat: "",
          domain: [12,35],
          ticks: [12,14,16,18,20,22,24,26,28,30,32,34,36],
          tickFormat: i => {
            if (i > 23) {
              return i - 24
            } else {
              return i
            }
          }
        },
        y: {
          label: label[0],
          type: "log",
          // tickFormat: "~s"
        },
        r: {
          type: 'linear'
        },
        marks: [
          Plot.ruleX([24]),
          Plot.dot(formattimes, {x: "time", y: label[1], r: 4, strokeOpacity: 0.05, fill: "#000", fillOpacity: 0.01})
        ]
    }

}

function formatDomain(data) {
    if (Math.max(...data.map(o => o.Value)) > 10) {
        let res = Math.max.apply(Math,data.map(function(o){return o.Value;}))
        return [0,res]
    } else {
        return [0,10]
    }
}

export var formatJson = (json_data,type) => {
    let t = type;
    let result = [];
    for (let i in json_data[t]) {
        result.push({Sim: i, cat: t, Value: json_data[t][i]})
    }
    return result;
}

let iqr1 = V => Math.round(Math.max(d3.min(V), quartile1(V) * 2.5 - quartile3(V) * 1.5))
let iqr2 = V => Math.round(Math.min(d3.max(V), quartile3(V) * 2.5 - quartile1(V) * 1.5))
let quartile1 = V => Math.round(d3.quantile(V, 0.25))
let quartile3 = V => Math.round(d3.quantile(V, 0.75))

let vars = {
    width: "1000px",
    fontsize: "7px",
    dx: 2
}

export default tickPlot;
