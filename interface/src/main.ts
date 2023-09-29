import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import { fromLonLat } from 'ol/proj';

import GeoJSON from 'ol/format/GeoJSON';

import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';

import VectorSource from 'ol/source/Vector';
import StadiaMaps from 'ol/source/StadiaMaps';

import Map from 'ol/Map';
import View from 'ol/View';

import { Style, Stroke, Fill, Circle } from 'ol/style';
import { Point } from 'ol/geom';

import { Feature, Overlay } from 'ol';

// @ts-ignore
import bezier from '@turf/bezier-spline';

// Define the projection
proj4.defs('EPSG:3826', '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +units=m +no_defs');
register(proj4);

const geojsonFormat: GeoJSON = new GeoJSON({
    dataProjection: 'EPSG:3826',
    featureProjection: 'EPSG:3857', // 3857: Flat | 4326: Curved
});

const routeColor = {
    "淡水線": "#e3002c",
    "蘆洲線": "#f8b61c",
    "板橋線": "#0070bd",
    "中和線": "#f8b61c",
    "新店線": "#008659",
    "碧潭支線": "#cfdb00",
    "新莊線": "#f8b61c",
    "木柵線": "#c48c31",
    "南港線": "#0070bd",
    "信義線": "#e3002c",
    "松山線": "#008659",
    "小南門線": "#008659",
    "內湖線": "#c48c31",
    "環狀線": "#ffdb00"
}

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
    style: new Style({
        image: new Circle({
            fill: new Fill({
                color: 'rgba(200,200,200,0.5)',
            }),
            stroke: new Stroke({
                color: 'rgba(255,255,255,0.8)',
                width: 1,
            }),
            radius: 3,
        }),
    }),
});

const metroLinesLayer = new VectorLayer({
    source: new VectorSource({
        format: geojsonFormat,
        url: '/data/metro-line.json'
    }),
    style: function(feature) {
        const route = feature.get("RouteName");
        return new Style({
            stroke: new Stroke({
                width: 3,
                // @ts-ignore
                color: routeColor[route],
            })
        });
    }
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

            fetch(import.meta.env.VITE_BACKEND_URL + '/api/od', {
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

const base = new TileLayer({
    // @ts-ignore
    source: new StadiaMaps({
        layer: "alidade_smooth",
        retina: true,
    }),
});

const map = new Map({
    target: 'map-container',
    layers: [
        base,
        metroLinesLayer,
        stationsLayer,
        migrations,
    ],
    view: new View({
        center: fromLonLat([121.46, 25.05]),
        zoom: 12,
    }),
});

// Create a listener for the `pointermove` event on the map.
map.on('pointermove', function(e) {
    // Check if there is a feature at the current mouse position.
    var feature = map.forEachFeatureAtPixel(
        e.pixel,
        function(feature) {
            return feature;
        },
        {
            layerFilter: function(layerCandidate) {
                return layerCandidate == migrations;
            },
            hitTolerance: 5,
        }
    );

    let popup = map.getOverlayById("popup");

    if (!popup) {
        // Create a popup with information about the feature.
        popup = new Overlay({
            id: "popup",
            element: document.getElementById('popup') as HTMLElement
        });
        // Add the popup to the map.
        map.addOverlay(popup);
    }

    // If there is a feature at the current mouse position, display a popup with information about the feature.
    if (feature) {
        // Set the popup's position to the current mouse position.
        popup.setPosition(e.coordinate);
        popup.setOffset([0, -60]);

        // Set the popup's content to the feature's information.
        const popupElement = popup.getElement() as HTMLElement;
        popupElement.innerHTML = `${feature.get('from')} -> ${feature.get('to')}<br> ${feature.get('passengers')} 人次`
        popupElement.style.display = "block";
    }
    else {
        // If there is no feature at the current mouse position, remove the popup from the map.
        (popup.getElement() as HTMLElement).style.display = "none";
    }
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

function renderLines(features: Feature[], stationToIndex: Map, fromStation: string, toStation: string, data: any[]) {

    const totalPassengers = data.reduce((acc, station) => acc + station["total_passengers"], 0);

    if (fromStation != "null" && toStation != "null") {
        const fromFeature = features[stationToIndex.get(fromStation)];
        const toFeature = features[stationToIndex.get(toStation)];

        if (data.length > 0) {
            addCurve(fromFeature, toFeature, 0.02, data[0]["total_passengers"]);
        }
    }
    else if (fromStation != "null") {
        const fromFeature = features[stationToIndex.get(fromStation)];

        data.forEach(station => {
            const toFeature = features[stationToIndex.get(station["exit"] + "站")];
            addCurve(fromFeature, toFeature, station["total_passengers"] / totalPassengers, station["total_passengers"]);
        });
    }
    else if (toStation != "null") {
        const toFeature = features[stationToIndex.get(toStation)];

        data.forEach(station => {
            const fromFeature = features[stationToIndex.get(station["entry"] + "站")];
            addCurve(fromFeature, toFeature, station["total_passengers"] / totalPassengers, station["total_passengers"]);
        });
    }

}

function addCurve(fromFeature: Feature, toFeature: Feature, weight: number, passengers: number) {

    // console.log(fromFeature, toFeature)
    if(fromFeature == undefined || toFeature == undefined) {
        console.log("undefined feature");
        return;
    }

    if (fromFeature == toFeature) {
        console.log("same feature");
        return;
    }

    const startCoords = (fromFeature?.getGeometry() as Point).getCoordinates();
    const endCoords = (toFeature?.getGeometry() as Point).getCoordinates();

    if (startCoords == undefined || endCoords == undefined) {
        console.log("undefined coordinates");
        return;
    }

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
        color: "gray",
        width: weight * 100,
    });

    curveFeature.setProperties({
        "from": fromFeature.get("NAME"),
        "to": toFeature.get("NAME"),
        "passengers": passengers,
    });

    curveFeature.setStyle(new Style({
        stroke: strokeStyle,
    }));

    source.addFeature(curveFeature);
}
