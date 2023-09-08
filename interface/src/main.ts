import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';

import GeoJSON from 'ol/format/GeoJSON';

import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';

import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';

import Map from 'ol/Map';
import View from 'ol/View';

import { Style, Fill, Stroke } from 'ol/style';
import { fromLonLat } from 'ol/proj';

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

fetch('/data/metro-station.json')
    .then(response => response.json())
    .then(geojsonObject => {
        const features = geojsonFormat.readFeatures(geojsonObject);

        const startCoords = features[0].getGeometry().getCoordinates();
        const endCoords = features[20].getGeometry().getCoordinates();
        const controlCoords = [endCoords[0], startCoords[1]];

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

        console.log(curveFeature)

        curveFeature.setStyle(new Style({
            stroke: strokeStyle,
        }));

        source.addFeature(curveFeature);
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

const map = new Map({
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

