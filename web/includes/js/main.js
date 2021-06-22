import constants from './const.js'
import update from './update.js'
import {makeMap} from './mapping.js'

// for ( let i = 1; i < constants.nsims + 1; i++) { constants.sim_range.push(i) }
var dm, du;

$(window).on('load', async function() {

    dm = dataManager.Manager();
    du = update();

    // * Currently an example file *
    // * Reading from a regular json
    let response = await dm.readJson('../data/output/examples/jsonResponse.json')
    let jsonText = JSON.parse(response)

    constants.quants = jsonText;

    du.updateTable('National')

    makeMap()
    
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
