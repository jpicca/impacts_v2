// import {mapData} from './mapData.js'
import update from './update.js'
import {locCodes} from './const.js'
import constants from './const.js'
import {fillColorDict} from './const.js'
import { drawGrids, updatePoints } from './time-matrix.js'
import {popChart,hospChart,mobChart,powChart,formatSims} from './hist.js'

const path_pre = './includes/geo/'

var stateMap = d3.json(`${path_pre}states.json`)
    .then(function(files) {
        return files;
    })

var cwaMap = d3.json(`${path_pre}cwas.json`)
    .then(function(files) {
        return files;
    })

var femaMap = d3.json(`${path_pre}FemaRegions_fixed.json`)
    .then(function(files) {
        return files;
    })

var torMap = d3.json(`${path_pre}day1_torn.geojson`)
    .then(function(files) {
        return files;
    })

var mapData = [stateMap, cwaMap, femaMap, torMap]
var mu = update();

// // Initialize leaflet map
var map, natLayer, statesLayer, cwasLayer, femaLayer, torLayer, control, info;
// var map = L.map('map-holder').setView([39.8283, -98.5795], 3);

// L.tileLayer( 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
// }).addTo( map );
// // Info window
// var info = L.control({position: 'bottomleft'});

function getFeatureData(loc,impact,perc,type='Current') {

    let filtered = constants.quants.filter(entry => entry.Location == loc);

    try {
        return filtered[0][type][impact][perc];
    } catch (err) {
        return 0
    }

}

function returnColor(loc,impact,perc,type='Current') {

    let data = getFeatureData(loc,impact,perc,type='Current');

    return fillColorDict[impact][perc](data)

}

function style(feature,level) {

    let loc;
    let impact = mu.currentStatus.Impact;
    let perc = mu.currentStatus.Percentile
    let opacity = document.getElementById('slide').value

    switch(level) {
        case 'National':

            loc = locCodes[feature.properties.NAME];

            return {

                fillColor: returnColor(loc,impact,perc),
                weight: 1,
                fillOpacity: opacity,
                color: '#432'
        
            }

        case 'State':
            
            loc = locCodes[feature.properties.NAME];

            return {

                fillColor: returnColor(loc,impact,perc),
                weight: 1,
                fillOpacity: opacity,
                color: '#432'
        
            }

        case 'CWA':
            
            loc = feature.properties.CWA;

            return {

                fillColor: returnColor(loc,impact,perc),
                weight: 1,
                fillOpacity: opacity,
                color: '#432'
        
            }

        case 'FEMA':
            
            loc = feature.properties.region;

            return {

                fillColor: returnColor(loc,impact,perc),
                weight: 1,
                fillOpacity: opacity,
                color: '#432'
        
            }

    }
}

export function makeMap() {

    // Initialize leaflet map
    map = L.map('map-holder').setView([39.8283, -98.5795], 3);

    L.tileLayer( 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo( map );
    // Info window
    info = L.control({position: 'bottomleft'});

    Promise.all(mapData).then(files =>
        
        {
            let states = files[0];
            let cwas = files[1];
            let fema = files[2];
            let tor = files[3];

            natLayer = L.geoJson(states, {style: function(feature){
                return style(feature,'National')
            }}).addTo(map);
            natLayer.options.what = 'National'
                
            //     weight: 1, //Attributes of polygons including the weight of boundaries and colors of map.
            //     color: "#432",
            //     what: 'National',
            //     fillOpacity: 0.7,
            //     fillColor: returnColor(feature,mu.currentStatus.Impact,mu.currentStatus.Percentile)
            // }).addTo(map);

            statesLayer = L.geoJson(states, 
                {
                    style: function(feature){
                        return style(feature,'State')
                    },
                    onEachFeature: onEachFeature
                })
            statesLayer.options.what = 'State'

            // statesLayer = L.geoJson(states, { //instantiates a new geoJson layer using built in geoJson handling
            //     weight: 1, //Attributes of polygons including the weight of boundaries and colors of map.
            //     color: "#432",
            //     what: 'State',
            //     onEachFeature: onEachFeature
            // })

            map.fitBounds(statesLayer.getBounds());

            cwasLayer = L.geoJson(cwas, 
                {
                    style: function(feature){
                        return style(feature,'CWA')
                    },
                    onEachFeature: onEachFeature
                })
            cwasLayer.options.what = 'CWA'

            // cwasLayer = L.geoJson(cwas, { //instantiates a new geoJson layer using built in geoJson handling
            //     weight: 1, //Attributes of polygons including the weight of boundaries and colors of map.
            //     color: "#432",
            //     what: 'CWA',
            //     onEachFeature: onEachFeature
            // })

            femaLayer = L.geoJson(fema, 
                {
                    style: function(feature){
                        return style(feature,'FEMA')
                    },
                    onEachFeature: onEachFeature
                })
            femaLayer.options.what = 'FEMA'

            // femaLayer = L.geoJson(fema, { //instantiates a new geoJson layer using built in geoJson handling
            //     weight: 1, //Attributes of polygons including the weight of boundaries and colors of map.
            //     color: "#432",
            //     what: 'FEMA',
            //     onEachFeature: onEachFeature
            // })

            torLayer = L.geoJson(tor, {
                weight: 1,
                style: function(feature) {
                    let fill = feature.properties.fill;
                    return {color: fill, fillOpacity: 0.7}
                }
            })
            
            let torGroup = L.layerGroup([torLayer])
            let probControl = {
                "Tornado Probs": torGroup
            }

            let impactControl = {
                "National": natLayer,
                "States": statesLayer,
                "CWAs": cwasLayer,
                "FEMA Regions": femaLayer
            };

            control = new L.Control.Layers(impactControl, probControl).addTo(map);

            // Change table to national data if control layer changes to national
            map.on('baselayerchange', async function (e) {

                switch (e.layer.options.what) {
                    case 'National':
                        
                        mu.currentStatus.Type = 'National'
                        mu.currentStatus.Location = 'National'
                        mu.updateTable('National')
                        drawGrids('National');

                        // Need update of impacts box
                        let dm = dataManager.Manager();
                        let response = await dm.readJson('../data/output/examples/jsonResponse_sims_newnat.json')
                        let jsonText = JSON.parse(response)

                        constants.sims = jsonText
                        
                        // Update Points
                        updatePoints('pop');
                        updatePoints('hosp');
                        updatePoints('mob');
                        updatePoints('pow');
                        updatePoints('sco');

                        Promise.all(formatSims()).then(sims => {

                            let pop = sims[0]
                            let hosp = sims[1]
                            let mob = sims[2]
                            let pow = sims[3]
                            let sco = sims[4]
                    
                            popChart.updateChart(popChart.quantFormatter(pop),'#pop-chart')
                            hospChart.updateChart(hospChart.quantFormatter(hosp), '#hosp-chart')
                            mobChart.updateChart(mobChart.quantFormatter(mob), '#mob-chart')
                            powChart.updateChart(powChart.quantFormatter(pow), '#pow-chart')
                        })

                        break;
                    case 'State':

                        mu.currentStatus.Type = 'State'
                        break;

                    case 'CWA':

                        mu.currentStatus.Type = 'CWA'
                        break;

                    case 'FEMA':

                        mu.currentStatus.Type = 'FEMA'
                        break;

                }
            })

            // Control Opacity of the impact map fill
            let slide = document.getElementById('slide')
            slide.onchange = function() {
                natLayer.setStyle({fillOpacity: this.value})
                statesLayer.setStyle({fillOpacity: this.value})
                cwasLayer.setStyle({fillOpacity: this.value})
                femaLayer.setStyle({fillOpacity: this.value})
            }

            let prod = document.getElementById('prod')
            prod.onchange = function() {
                mu.currentStatus.Impact = constants.impDict[prod.value];

                info.update();
                
                natLayer.setStyle(function(feature){
                    return style(feature,'National')
                })
                statesLayer.setStyle(function(feature){
                    return style(feature,'State')
                })
                cwasLayer.setStyle(function(feature){
                    return style(feature,'CWA')
                })
                femaLayer.setStyle(function(feature){
                    return style(feature,'FEMA')
                })
            }

            let perc = document.getElementById('perc')
            perc.onchange = function() {
                mu.currentStatus.Percentile = perc.value;

                natLayer.setStyle(function(feature){
                    return style(feature,'National')
                })
                statesLayer.setStyle(function(feature){
                    return style(feature,'State')
                })
                cwasLayer.setStyle(function(feature){
                    return style(feature,'CWA')
                })
                femaLayer.setStyle(function(feature){
                    return style(feature,'FEMA')
                })
            }

            info.onAdd = function(map) {
                this._div = L.DomUtil.create('div','info')
                this.update();
                return this._div;
            }

            info.update = function(props) {
                let loc;
                let impact = mu.currentStatus.Impact;
                let perc = mu.currentStatus.Percentile

                try {
                    // Need a switch (or something similar) here for area type
                    switch (mu.currentStatus.Type) {

                        case 'State':
                            loc = locCodes[props.NAME];
                            break;

                        case 'CWA':
                            loc = props.CWA;
                            break;
                        
                        case 'FEMA':
                            loc = props.region;
                            break;

                    }

                } catch (err) {

                }

                this._div.innerHTML = `<h6> Impact: ${impact} </h6> ` + 
                    (props ? getFeatureData(loc,impact,perc) : 'Hover over an area');
            }

            info.addTo(map);
        })
}

function onEachFeature(feature, layer) {

    let du = update();

    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: selectFeature
    });
}

function highlightFeature(e) {
    var layer = e.target;

    info.update(layer.feature.properties)
    layer.setStyle({
        weight: 5
        // color: '#666',
        // dashArray: '',
        // fillOpacity: 0.7
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
}

function resetHighlight(e) {

    info.update()
    var layer = e.target;
    layer.setStyle({
        weight: 1
    })
}

function selectFeature(e) {
    map.fitBounds(e.target.getBounds());
    let loc;

    // *** need to grab checked radio button value
    // State
    if (e.target.feature.properties.NAME) {
        loc = locCodes[e.target.feature.properties.NAME];
    // CWA
    } else if (e.target.feature.properties.CWA) {
        loc = e.target.feature.properties.CWA;
    // FEMA
    } else {
        loc = e.target.feature.properties.region;
    }
    
    mu.locChange(loc);
}