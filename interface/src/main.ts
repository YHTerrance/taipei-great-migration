import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import { fromLonLat } from 'ol/proj';

import GeoJSON from 'ol/format/GeoJSON';

import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';

import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';

import Map from 'ol/Map';
import View from 'ol/View';

import { Style, Fill, Stroke } from 'ol/style';
import { Point } from 'ol/geom';

import bezier from '@turf/bezier-spline';
import { Feature } from 'ol';
import { containsCoordinate } from 'ol/extent';

// Define the projection
proj4.defs('EPSG:3826', '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +units=m +no_defs');
register(proj4);

const geojsonFormat: GeoJSON = new GeoJSON({
    dataProjection: 'EPSG:3826',
    featureProjection: 'EPSG:3857', // 3857: Flat | 4326: Curved
});


// Fetch stations data and draw lines
const source = new VectorSource();

const migrations = new VectorLayer({
    source: source
});

const stationsLayer = new VectorLayer({
    source: new VectorSource({
        format: geojsonFormat,
        url: '/data/metro-station.json'
    }),
});

const metroLinesLayer = new VectorLayer({
    source: new VectorSource({
        format: geojsonFormat,
        url: '/data/metro-line.json'
    }),
});

fetch('/data/metro-station.json')
    .then(response => response.json())
    .then(geojsonObject => {

        let stations: string[] = [];
        let features = geojsonFormat.readFeatures(geojsonObject);
        let stationToIndex = new Map();
        features.forEach((feature, index) => {
            const name: string = feature.getProperties()["NAME"];
            stations.push(name);
            stationToIndex.set(name, index);
        });

        generateOptions(stations);

        const renderButton = document.getElementById("render") as HTMLButtonElement;

        renderButton?.addEventListener("click", () => {
            console.log("render button clicked");

            const fromStation = document.getElementById("from-station") as HTMLSelectElement;
            const toStation = document.getElementById("to-station") as HTMLSelectElement;
            const startTime = document.getElementById("start-time") as HTMLSelectElement;
            const endTime = document.getElementById("end-time") as HTMLSelectElement;

            const body = JSON.stringify({
                from_station: fromStation.value,
                to_station: toStation.value,
                start_time: startTime.value,
                end_time: endTime.value
            });

            console.log(body);

            fetch('http://localhost:3000/api/od', {
                method: 'POST',
                headers: {
                    'Content-Type': 'Application/json'
                },
                body: body
            })
                .then(response => response.json())
                .then(data => {
                    source.clear();
                    renderLines(features, stationToIndex, fromStation.value, toStation.value, data);
                })
                .catch(error => console.error(error));
        });
    });

// const base = new TileLayer({
//     source: new OSM(),
// });

new Map({
    target: 'map-container',
    layers: [
        // base,
        stationsLayer,
        metroLinesLayer,
        migrations,
    ],
    view: new View({
        center: fromLonLat([121.46, 25.05]),
        zoom: 12,
    }),
});

// Helper functions
function generateOptions(stations: string[]) {

    const fromStation = document.getElementById("from-station") as HTMLSelectElement;
    const toStation = document.getElementById("to-station") as HTMLSelectElement;

    stations.forEach(station => {
        const newOption1 = document.createElement("option");
        newOption1.value = station;
        newOption1.text = station;
        const newOption2 = newOption1.cloneNode(true) as HTMLOptionElement;

        newOption1.selected = (station == "石牌站");

        fromStation.add(newOption1);
        toStation.add(newOption2);
    });

    const startTime = document.getElementById("start-time") as HTMLSelectElement;
    const endTime = document.getElementById("end-time") as HTMLSelectElement;

    for (let time = 0; time < 24; ++time) {
        const newOption1 = document.createElement("option");
        newOption1.value = time.toString();
        newOption1.text = time.toString() + ":00";
        const newOption2 = newOption1.cloneNode(true) as HTMLOptionElement;

        newOption1.selected = (time == 7);
        newOption2.selected = (time == 10);

        startTime.add(newOption1);
        endTime.add(newOption2);
    }
}

function renderLines(features: Feature[], stationToIndex: Map, fromStation: string, toStation: string, data: []) {

    const totalPassengers = data.reduce((acc, station) => acc + station["Total_Passengers"], 0);

    if (fromStation != "null" && toStation != "null") {
        const fromFeature = features[stationToIndex.get(fromStation)];
        const toFeature = features[stationToIndex.get(toStation)];

        addCurve(fromFeature, toFeature, 0.5);
    }
    else if (fromStation != "null") {
        const fromFeature = features[stationToIndex.get(fromStation)];

        data.forEach(station => {
            const toFeature = features[stationToIndex.get(station["出站"] + "站")];
            const weight = station["Total_Passengers"] / totalPassengers;
            addCurve(fromFeature, toFeature, weight);
        });
    }
    else if (toStation != "null") {
        const toFeature = features[stationToIndex.get(toStation)];

        data.forEach(station => {
            const fromFeature = features[stationToIndex.get(station["進站"] + "站")];
            const weight = station["Total_Passengers"] / totalPassengers;
            addCurve(fromFeature, toFeature, weight);
        });
    }

}

function addCurve(fromFeature: Feature, toFeature: Feature, weight: number) {

    // console.log(fromFeature, toFeature)
    if(fromFeature == undefined || toFeature == undefined) {
        console.log("undefined feature")
        return;
    }

    const startCoords = (fromFeature?.getGeometry() as Point).getCoordinates();
    const endCoords = (toFeature?.getGeometry() as Point).getCoordinates();

    const controlCoords = [
        (startCoords[0] + endCoords[0]) / 2,
        (startCoords[1] + endCoords[1]) / 1.996
    ];

    const line = {
        "type": "Feature",
        "properties": {
            "stroke": "#f00"
        },
        "geometry": {
            "type": "LineString",
            "coordinates": [
                startCoords,
                controlCoords,
                endCoords
            ]
        }
    };

    const curved = bezier(line);
    const curveFeature = (new GeoJSON()).readFeature(curved);

    const strokeStyle = new Stroke({
        color: "red",
        width: 50 * weight,
    });

    curveFeature.setStyle(new Style({
        stroke: strokeStyle,
    }));

    source.addFeature(curveFeature);
}
