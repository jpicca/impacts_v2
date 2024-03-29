import constants from './const.js'
import update from './update.js'
import {makeMap} from './mapping.js'
import {formatSims,popChart,hospChart,mobChart,powChart,scoChart} from './hist.js'
import * as Plot from "https://cdn.skypack.dev/@observablehq/plot@0.5";
import tickPlot, { formatJson, dotPlot } from './plot.js';


// for ( let i = 1; i < constants.nsims + 1; i++) { constants.sim_range.push(i) }
var dm, du;

$(window).on('load', async function() {

    dm = dataManager.Manager();
    du = update();

    // * Currently an example file *
    // * Reading from a regular json

    // json containing national/fema/state/cwa quantile and climo data for the table
    // let response = await dm.readJson(`../data/output/examples/${constants.date}/processed/jsonResponse_schoolsfema.json`)
    let response = await dm.readJson(`${constants.simdataroot}init/data.json`)
    let jsonText = JSON.parse(response)
    
    // Reading injury / fatality data by simulation
    let response4 = await dm.readJson(`${constants.simdataroot}cas/cas_national.json`)
    let jsonText4 = JSON.parse(response4)
    console.log(jsonText4)

    // Reading injury / fatality data by tornado
    let response5 = await dm.readCsv(`${constants.simdataroot}cas/timeinj_national.csv`)
    console.log(response5)
    let response6 = await dm.readCsv(`${constants.simdataroot}cas/timefat_national.csv`)



    // *** response2 and response3 are likely no longer needed -- review if they are **
    // json containing data for impacts timing information ... probably will change how we use timing data
    let response2 = await dm.readJson(`../data/output/examples/${constants.date}/processed/jsonResponse_time_sum_schoolsfema.json`)
    let jsonText2 = JSON.parse(response2)

    // sim impacts (for each category), broken down by tornado rating, to drive hists
    let response3 = await dm.readJson(`../data/output/examples/${constants.date}/processed/jsonResponse_sims_newnat.json`)
    let simresponse;

    try {
        simresponse = await dm.readCsv(`${constants.simdataroot}followup/sims_national_0.csv`)
        constants.newsims = simresponse;
    } catch(err) {
            
        console.log('No file!')

        let containers = d3.selectAll('.chart')
        containers.select('svg').attr('display','none')
        containers.selectAll('.no-tor').style('visibility','visible')

        constants.newsims = [];

        return;
    }
        
    let jsonText3 = JSON.parse(response3)

    constants.quants = jsonText;
    constants.time = jsonText2;
    constants.sims = jsonText3;

    console.log(simresponse);
    console.log(jsonText4);

    // Need to edit quants json file to be broken down by 'all', 'weak', 'sig', 'violent'
    du.updateTable('National')

    // makeMatrix()
    // makeScatter()
    makeMap()


    // Make injury plot
    let inj = document.querySelector('#inj');
    inj.append(Plot.plot(tickPlot(formatJson(jsonText4,'num_inj'),'Injuries')));

    // Make fatality plot
    let fat = document.querySelector('#fat');
    fat.append(Plot.plot(tickPlot(formatJson(jsonText4,'num_fat'),'Fatalities')));

    // Make injury time plot
    let injtime = document.querySelector('#injtime');
    injtime.append(Plot.plot(dotPlot(response5)));

    // Make fatality time plot
    let fattime = document.querySelector('#fattime');
    fattime.append(Plot.plot(dotPlot(response6,'Fatalities')));




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

        scoChart.makeChart(scoChart.quantFormatter(sco), '#sco-chart')

        
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
