import { Hono } from 'hono'
import { cors } from 'hono/cors'

import psql from './postgres';

const app = new Hono();

function parseStation(station: string) {
    if (station.endsWith("站")) {
        return station.slice(0, -1);
    }
    return station;
}

app.get('/', (c) => c.text('Hono API server that serves Taipei MRT OD data.'))

app.use('*', cors({
    origin: process.env.FRONTEND_URL as string,
    allowHeaders: ['Content-Type'],
}));

app.options('*', (c) => {
    return c.text('', 204)
});

app.post('/api/od', async (c) => {

    const body = await c.req.json();

    console.log("Body: ", body);

    const start_time = parseInt(body.start_time);
    const end_time = parseInt(body.end_time);
    const from_station = parseStation(body.from_station);
    const to_station = parseStation(body.to_station);

    const res = await getPassengerOD("mrt_od_202307", start_time, end_time, from_station, to_station);

    return c.json(res);
});

async function getPassengerOD(table: string, startTime: number, endTime: number, fromStation: string, toStation: string) {
    let res;

    if (fromStation != "null" && toStation != "null") {

        /*
        SELECT SUM(count) as Total_Passengers
        FROM \"mrt_od_202307\"
        WHERE entry = \"石牌\" AND exit = \"士林\" AND time >= 8 AND time < 12
        GROUP BY entry, exit
        ORDER BY Total_Passengers DESC;
        */
        res = await psql`
            SELECT SUM(count) as Total_Passengers
            FROM ${ psql(table) }
            WHERE entry = ${ fromStation } AND exit = ${ toStation } AND time >= ${ startTime } AND time < ${ endTime }
            GROUP BY entry, exit
            ORDER BY Total_Passengers DESC
            LIMIT 20;
        `;
    }
    else if (fromStation != "null") {
        res = await psql`
            SELECT exit, SUM(count) as Total_Passengers
            FROM ${ psql(table) }
            WHERE entry = ${fromStation} AND time >= ${startTime} AND time < ${endTime}
            GROUP BY exit
            ORDER BY Total_Passengers DESC
            LIMIT 20;
        `;
    }
    else if (toStation != "null") {
        res = await psql`
            SELECT entry, SUM(count) as Total_Passengers
            FROM ${ psql(table) }
            WHERE exit = ${toStation} AND time >= ${startTime} AND time < ${endTime}
            GROUP BY entry
            ORDER BY Total_Passengers DESC
            LIMIT 20;
        `;
    }
    return res;
}

export default {
    port: 3000,
    fetch: app.fetch,
};
