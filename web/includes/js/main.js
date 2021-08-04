import constants from './const.js'
import update from './update.js'
import {makeMap} from './mapping.js'
import {formatSims,histogram} from './hist.js'
import {drawGrids, makeMatrix, makeScatter} from './time-matrix.js'
import {popChart,hospChart,mobChart,powChart} from './hist.js'

// for ( let i = 1; i < constants.nsims + 1; i++) { constants.sim_range.push(i) }
var dm, du;

$(window).on('load', async function() {

    dm = dataManager.Manager();
    du = update();

    // * Currently an example file *
    // * Reading from a regular json
    let response = await dm.readJson(`../data/output/examples/${constants.date}/processed/jsonResponse_schoolsfema.json`)
    let jsonText = JSON.parse(response)

    let response2 = await dm.readJson(`../data/output/examples/${constants.date}/processed/jsonResponse_time_sum_schoolsfema.json`)
    let jsonText2 = JSON.parse(response2)

    let response3 = await dm.readJson(`../data/output/examples/${constants.date}/processed/jsonResponse_sims_newnat.json`)
    let jsonText3 = JSON.parse(response3)

    constants.quants = jsonText;
    constants.time = jsonText2;
    constants.sims = jsonText3;

    du.updateTable('National')

    makeMatrix()
    makeScatter()
    makeMap()

    Promise.all(formatSims()).then(sims => {

        let pop = sims[0]
        let hosp = sims[1]
        let mob = sims[2]
        let pow = sims[3]
        let sco = sims[4]

        popChart.makeChart(popChart.quantFormatter(pop),'#pop-chart')

        hospChart.makeChart(hospChart.quantFormatter(hosp), '#hosp-chart')

        mobChart.makeChart(mobChart.quantFormatter(mob), '#mob-chart')

        powChart.makeChart(powChart.quantFormatter(pow), '#pow-chart')

        // *****************************************************
        // ** How do we want to ingegrate a school histogram? **
        // *****************************************************

        
    })

    // let pop = await formatSims();
    // console.log(pop)

    
    // Set-up menu change callback
    // document.getElementById('gran').addEventListener('change', du.menuChange)

    // * Reading from entire .psv.gz
    // let req = await dm.readFile('../data/output/examples/20210428124600.psv.gz')

    // let respStr = dm.gunzip(req)
    // let json_arr = dm.convertStr(respStr)
    // let df = await dm.makeDF(json_arr)

    // // Ensure we have all sims accounted for in df
    // let placeholder = new dfd.DataFrame({"sim": constants.sim_range})
    // allSims = dfd.merge({left: placeholder, right: df, on: ["sim"], how: "outer"})

})
