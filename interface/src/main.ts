import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';

import GeoJSON from 'ol/format/GeoJSON';

import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';

import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';

import Link from 'ol/interaction/Link';

import Map from 'ol/Map';
import View from 'ol/View';

import { Style, Fill, Stroke } from 'ol/style';
import { fromLonLat } from 'ol/proj';

// Define the projection
proj4.defs('EPSG:3826', '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +units=m +no_defs');
register(proj4);

const geojsonFormat = new GeoJSON({
    dataProjection: 'EPSG:3826',
    featureProjection: 'EPSG:3857',
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

const countries = new VectorLayer({
    source: new VectorSource({
        format: new GeoJSON(),
        url: '/data/countries.json'
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
    ],
    view: new View({
        center: fromLonLat([121.46, 25.05]),
        zoom: 12,
        projection: 'EPSG:3857',
    }),
});

map.addInteraction(new Link());
