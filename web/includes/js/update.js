// This file contains code to update various elements of the page
import constants from './const.js'
// import {locCodes} from './const.js'

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
        d3.select('#cur-val-table').text(`${exports.currentStatus.Type}: ${loc}`)

    }

    // Function that changes all necessary elements when the location changes
    exports.locChange = function (loc) {

        // Things to do here...
        // - Update table values with updateTable
        // - Update hist charts title

        exports.currentStatus.Type = exports.whichLevel(loc);
        exports.currentStatus.Location = loc;


        let type = exports.currentStatus.Type

        // Update Menu
        // document.getElementById('gran').value = type;

        console.log('loc Change function')
        console.log(exports)


        exports.updateTable(loc);

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