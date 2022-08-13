// This file contains code to update various elements of the page
import constants from './const.js'
import {drawGrids,updatePoints} from './time-matrix.js'
import {popChart,hospChart,mobChart,powChart,scoChart,formatSims,adjustDist} from './hist.js'
import * as Plot from "https://cdn.skypack.dev/@observablehq/plot@0.5";
import tickPlot, { formatJson, dotPlot } from './plot.js';

export default function module() {

    let exports = {}
    let dm = dataManager.Manager();

    exports.currentStatus = {
        'Location': 'National',
        'Type': 'National',
        'Percentile': '0.5',
        'Impact': 'population',
        'Tornadoes': 'all',
        'lastState': 'OK',
        'lastCWA': 'OUN',
        'lastFEMA': '6'
    }

    exports.tableData = {}

    exports.whichLevel = function (loc) {

        switch(loc.length) {
            case 1:
                return 'FEMA';
            case 2:
                // Region '10' fails the check of 1 char so we need this block
                if (loc == '10') {
                    return 'FEMA';
                }
                return 'State';
            case 3:
                return 'CWA';
            default:
                return 'National';
        }
    }

    exports.updateTable = function (loc) {

        // Update location and type
        // exports.currentStatus.Location = loc;
        // exports.currentStatus.Type = exports.whichLevel(loc);
        
        // Get specific json for current selection
        let filtered = constants.quants.filter(entry => entry.Location == loc)

        // Place data
        exports.tableData = filtered[0]

        // Try to see if clicked loc has data
        try {
            let current = exports.tableData.Current[exports.currentStatus.Tornadoes]

            // Loop through 'current' data to populate table
            let outerKeys = Object.keys(current)
            outerKeys.forEach(outerKey => {
                let innerKeys = Object.keys(current[outerKey])
                innerKeys.forEach(innerKey => {
                    let val = current[outerKey][innerKey]
                    let cell = d3.select(`.t${outerKey}.${constants.percDict[innerKey]}`)
                    cell.text(val)
                })
            })
        }
        // If not, populate table with 0s
        catch (err) {
            console.log(`No data for this selection ${loc}!`)
            d3.selectAll('td.cell').text('0')
        }

        // Update table title
        if (loc == 'National') {
            d3.select('#cur-val-table').text(`${exports.currentStatus.Type}`)
        } else {
            d3.select('#cur-val-table').text(`${exports.currentStatus.Type}: ${loc}`)
        }

    }

    // exports.updateHists = function() {

    //     Promise.all(formatSims()).then(sims => {

    //         let pop = sims[0]
    //         let hosp = sims[1]
    //         let mob = sims[2]
    //         let pow = sims[3]
    //         let sco = sims[4]

    //         // title.innerText = `Tornado Impact Distributions (${loc})`

    //         popChart.updateChart(popChart.quantFormatter(pop),'#pop-chart')
    //         hospChart.updateChart(hospChart.quantFormatter(hosp),'#hosp-chart')
    //         mobChart.updateChart(mobChart.quantFormatter(mob),'#mob-chart')
    //         powChart.updateChart(powChart.quantFormatter(pow),'#pow-chart')
    //         scoChart.updateChart(scoChart.quantFormatter(sco),'#sco-chart')
    //     })

    // }

    exports.updateInjFat = async function(loc) {

        console.log('starting injfat update')

        let jsonText, response, respinj, respfat;
        let inj = document.querySelector('#inj');
        let fat = document.querySelector('#fat');
        let injsvg = document.querySelector('#inj svg');
        let fatsvg = document.querySelector('#fat svg');

        let injtime = document.querySelector('#injtime');
        let fattime = document.querySelector('#fattime');
        let injtimesvg = document.querySelector('#injtime svg');
        let fattimesvg = document.querySelector('#fattime svg');

        try {
            injsvg.remove();
        } catch (err) {
            console.log('Nothing to remove!')
        }

        try {
            fatsvg.remove();
        } catch (err) {
            console.log('Nothing to remove!')
        }

        try {
            injtimesvg.remove();
        } catch (err) {
            console.log('Nothing to remove!')
        }

        try {
            fattimesvg.remove();
        } catch (err) {
            console.log('Nothing to remove!')
        }

        console.log('requesting next file')

        try {
            let response = await dm.readJson(`${constants.simdataroot}cas/cas_${loc}.json`)
            jsonText = JSON.parse(response)
            console.log(jsonText)
        } catch (err) {
            console.log('No cas file!')
            jsonText = {
                num_inj: {1: 0},
                num_fat: {1: 0}
            }
        }

        try {
            respinj = await dm.readCsv(`${constants.simdataroot}cas/timeinj_${loc}.csv`)
        } catch (err) {
            console.log('No inj time file!')
            respinj = []
        }

        try {
            respfat = await dm.readCsv(`${constants.simdataroot}cas/timefat_${loc}.csv`)
        } catch (err) {
            console.log('No fat time file!')
            respfat = []
        }

        console.log(jsonText)
        inj.append(Plot.plot(tickPlot(formatJson(jsonText,'num_inj'),'Injuries')));
        fat.append(Plot.plot(tickPlot(formatJson(jsonText,'num_fat'),'Fatalities')));

        injtime.append(Plot.plot(dotPlot(respinj)));
        fattime.append(Plot.plot(dotPlot(respfat, 'Fatalities')));

        // inj.append(Plot.plot(tickPlot(formatJson(jsonText4,'num_inj'),'Injuries')));

    }

    exports.updateHistsnew = async function(loc,levelstr) {

        let containers = d3.selectAll('.chart');

        try {
            let response = await dm.readCsv(`${constants.simdataroot}followup/sims_${loc}_${levelstr}.csv`)
            constants.newsims = response
        // If the file does not exist, readCsv will reject promise and return error
        // which is caught here
        } catch(err) {
            
            console.log('No file!')

            // Remove svg if it exists and add a banner about no tornadoes
            // containers.select('svg').remove();
            containers.select('svg').style('opacity', 0.05)
            containers.select('.no-tor').style('visibility','visible')
            // containers.append('h4')
            //     .attr('class','notortext')
            //     .text('No simulated tornadoes')

            constants.newsims = [];

            return;
        }

        // If we make it here without returning, there are data so we need charts visible
        // containers.select('.notortext').remove()
        containers.select('svg').style('opacity', 1)
        containers.select('.no-tor').style('visibility','hidden')

        Promise.all(formatSims()).then(sims => {

            let pop = sims[0]
            let hosp = sims[1]
            let mob = sims[2]
            let pow = sims[3]
            let sco = sims[4]

            // title.innerText = `Tornado Impact Distributions (${loc})`

            popChart.updateChart(popChart.quantFormatter(pop),'#pop-chart')
            hospChart.updateChart(hospChart.quantFormatter(hosp),'#hosp-chart')
            mobChart.updateChart(mobChart.quantFormatter(mob),'#mob-chart')
            powChart.updateChart(powChart.quantFormatter(pow),'#pow-chart')
            scoChart.updateChart(scoChart.quantFormatter(sco),'#sco-chart')
        })

    }

    // Function that changes all necessary elements when the location changes
    exports.locChange = async function (loc) {

        // Things to do here...
        // - Update table values with updateTable
        // - Update time matrix
        // - Update hist charts title
        let curType = exports.whichLevel(loc);
        let levelstr = constants.ratDict[exports.currentStatus.Tornadoes]

        exports.currentStatus.Type = curType;
        // console.log('loc change')
        // console.log(exports.currentStatus.Type)

        exports.currentStatus.Location = loc;

        if (curType != 'National') {
            exports.currentStatus[`last${curType}`] = loc;
        }

        let title = document.getElementById('prob-dist-title')
        title.innerText = `Tornado Impact Distributions (${loc})`

        // Update table
        exports.updateTable(loc);

        exports.updateHistsnew(loc,levelstr);

        exports.updateInjFat(loc);

        // let containers = d3.selectAll('.chart');

        // // Update histograms
        // // Wait for new sim data
        // try {
        //     let response = await dm.readCsv(`${constants.simdataroot}followup/sims_${loc}_${levelstr}.csv`)
        //     constants.newsims = response
        // // If the file does not exist, readCsv will reject promise and return error
        // // which is caught here
        // } catch(err) {
            
        //     console.log('No file!')

        //     // Remove svg if it exists and add a banner about no tornadoes
        //     // containers.select('svg').remove();
        //     containers.select('svg').style('opacity', 0.05)
        //     containers.select('.no-tor').style('visibility','visible')
        //     // containers.append('h4')
        //     //     .attr('class','notortext')
        //     //     .text('No simulated tornadoes')

        //     constants.newsims = [];

        //     return;
        // }

        // // If we make it here without returning, there are data so we need charts visible
        // // containers.select('.notortext').remove()
        // containers.select('svg').style('opacity', 1)
        // containers.select('.no-tor').style('visibility','hidden')


        // exports.updateHists();

        
        // console.log('end of update')
        // console.log(exports.currentStatus.Type)

    }


    // exports.menuChange = function() {

    //     console.log('menu change function')
        
    //     let value = document.getElementById('gran').value;

    //     console.log(exports)
        
    //     // Get current status location
    //     exports.currentStatus.Type = value;
    //     exports.currentStatus.Location = exports.currentStatus[`l${value}`];

    //     console.log(exports)
    //     // console.log(loc)

    // }

    return exports;

}



