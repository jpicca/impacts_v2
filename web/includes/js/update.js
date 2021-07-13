// This file contains code to update various elements of the page
import constants from './const.js'
import {drawGrids,updatePoints} from './time-matrix.js'
import {popChart,hospChart,mobChart,powChart,formatSims} from './hist.js'

export default function module() {

    let exports = {}

    exports.currentStatus = {
        'Location': 'National',
        'Type': 'National',
        'Percentile': '0.5',
        'Impact': 'population'
    }

    exports.tableData = {}

    exports.whichLevel = function (loc) {

        switch(loc.length) {
            case 1:
                return 'FEMA';
            case 2:
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
            let current = exports.tableData.Current

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

    // Function that changes all necessary elements when the location changes
    exports.locChange = async function (loc) {

        // Things to do here...
        // - Update table values with updateTable
        // - Update time matrix
        // - Update hist charts title

        exports.currentStatus.Type = exports.whichLevel(loc);
        exports.currentStatus.Location = loc;


        // let type = exports.currentStatus.Type

        // Update table
        exports.updateTable(loc);

        // Update time matrix
        drawGrids(loc)

        // Update Impacts scatter
        // Need to first read in new set of sims
        if (loc == 'TX') {
            
            let dm = dataManager.Manager();

            let response = await dm.readJson('../data/output/examples/jsonResponse_sims_TX.json')
            let jsonText = JSON.parse(response)

            constants.sims = jsonText
            
            // Update Points
            updatePoints('pop');
            updatePoints('hosp');
            updatePoints('mob');
            updatePoints('pow');

            // Update histograms
            Promise.all(formatSims()).then(sims => {

                let pop = sims[0]
                let hosp = sims[1]
                let mob = sims[2]
                let pow = sims[3]

                popChart.updateChart(popChart.quantFormatter(pop),'#pop-chart')
                hospChart.updateChart(hospChart.quantFormatter(hosp),'#hosp-chart')
                mobChart.updateChart(mobChart.quantFormatter(mob),'#mob-chart')
                powChart.updateChart(powChart.quantFormatter(pow),'#pow-chart')

            })

        } else {

            console.log('Only TX updates the impacts scatter right now!')
            console.log('Need to figure out how sims data will be delivered from backend...')
            console.log('i.e., from API or from post-processed jsons/csvs')

        }
        

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