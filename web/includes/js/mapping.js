// import {mapData} from './mapData.js'
import update from './update.js'
import {locCodes} from './const.js'
import constants from './const.js'
import {fillColorDict} from './const.js'

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

// Initialize leaflet map
var natLayer, statesLayer, cwasLayer, femaLayer, torLayer, control;
var map = L.map('map-holder').setView([39.8283, -98.5795], 3);

L.tileLayer( 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo( map );

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

function style(feature) {

    let loc = locCodes[feature.properties.NAME];
    let impact = mu.currentStatus.Impact;
    let perc = mu.currentStatus.Percentile

    return {

        fillColor: returnColor(loc,impact,perc),
        weight: 1,
        fillOpacity: 0.7,
        color: '#432'

    }
}

export function makeMap() {

    Promise.all(mapData).then(files =>
        
        {
            let states = files[0];
            let cwas = files[1];
            let fema = files[2];
            let tor = files[3];

            natLayer = L.geoJson(states, {style: style}).addTo(map);
            natLayer.options.what = 'National'
                
            //     weight: 1, //Attributes of polygons including the weight of boundaries and colors of map.
            //     color: "#432",
            //     what: 'National',
            //     fillOpacity: 0.7,
            //     fillColor: returnColor(feature,mu.currentStatus.Impact,mu.currentStatus.Percentile)
            // }).addTo(map);

            statesLayer = L.geoJson(states, { //instantiates a new geoJson layer using built in geoJson handling
                weight: 1, //Attributes of polygons including the weight of boundaries and colors of map.
                color: "#432",
                what: 'State',
                onEachFeature: onEachFeature
            })

            map.fitBounds(statesLayer.getBounds());

            cwasLayer = L.geoJson(cwas, { //instantiates a new geoJson layer using built in geoJson handling
                weight: 1, //Attributes of polygons including the weight of boundaries and colors of map.
                color: "#432",
                what: 'CWA',
                onEachFeature: onEachFeature
            })

            femaLayer = L.geoJson(fema, { //instantiates a new geoJson layer using built in geoJson handling
                weight: 1, //Attributes of polygons including the weight of boundaries and colors of map.
                color: "#432",
                what: 'FEMA',
                onEachFeature: onEachFeature
            })

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
            map.on('baselayerchange', function (e) {
                if (e.layer.options.what == 'National') {
                    
                    mu.currentStatus.Type = 'National'
                    mu.currentStatus.Location = 'National'
                    mu.updateTable('National')

                }
            })

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