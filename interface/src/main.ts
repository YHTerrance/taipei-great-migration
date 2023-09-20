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

// Define the projection
proj4.defs('EPSG:3826', '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +units=m +no_defs');
register(proj4);

const geojsonFormat: GeoJSON = new GeoJSON({
    dataProjection: 'EPSG:3826',
    featureProjection: 'EPSG:3857', // 3857: Flat | 4326: Curved
});

const strokeStyle = new Stroke({
    color: "red",
    width: 2,
});

// Fetch stations data and draw lines
const source = new VectorSource();

const migrations = new VectorLayer({
    source: source
});

function addCurve(startCoords: Array<number>, endCoords: Array<number>) {

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

    curveFeature.setStyle(new Style({
        stroke: strokeStyle,
    }));

    source.addFeature(curveFeature);
}

fetch('/data/metro-station.json')
    .then(response => response.json())
    .then(geojsonObject => {
        const features = geojsonFormat.readFeatures(geojsonObject);

        const stationToIndex = new Map();

        const fromStation = ["石牌"];
        const toStations = ["西湖", "中山", "內湖", "紅樹林"];

        features.forEach((feature, index) => {
            const name: string = feature.getProperties()["NAME"];
            stationToIndex.set(name, index);
        });

        const fromFeature = features[stationToIndex.get(fromStation + "站")];
        const toFeatures = toStations.map(station => features[stationToIndex.get(station + "站")]);

        toFeatures.forEach(toFeature => {
            const startCoords = (fromFeature?.getGeometry() as Point).getCoordinates();
            const endCoords = (toFeature?.getGeometry() as Point).getCoordinates();

            addCurve(startCoords, endCoords);
        });
    });

const stations = new VectorLayer({
    source: new VectorSource({
        format: geojsonFormat,
        url: '/data/metro-station.json'
    }),
});

const lines = new VectorLayer({
    source: new VectorSource({
        format: geojsonFormat,
        url: '/data/metro-line.json'
    }),
});

const base = new TileLayer({
    source: new OSM(),
});

new Map({
    target: 'map-container',
    layers: [
        // base,
        stations,
        lines,
        migrations,
    ],
    view: new View({
        center: fromLonLat([121.46, 25.05]),
        zoom: 12,
    }),
});

