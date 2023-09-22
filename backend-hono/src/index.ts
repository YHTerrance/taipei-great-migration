import { Hono } from 'hono'
import { Database } from "bun:sqlite";
import { cors } from 'hono/cors'

const app = new Hono()

const db = new Database("202307.sqlite", { readonly: true });

const from_query = db.query(`
    SELECT [出站], SUM([人次]) as Total_Passengers
    FROM [202307]
    WHERE [進站] = $from_station AND [時段] >= $start_time AND [時段] < $end_time
    GROUP BY [出站]
    ORDER BY Total_Passengers DESC
`);

const to_query = db.query(`
    SELECT [進站], SUM([人次]) as Total_Passengers
    FROM [202307]
    WHERE [出站] = $to_station AND [時段] >= $start_time AND [時段] < $end_time
    GROUP BY [進站]
    ORDER BY Total_Passengers DESC
`);

const from_to_query = db.query(`
    SELECT SUM([人次]) as Total_Passengers
    FROM [202307]
    WHERE [出站] = $to_station AND [進站] = $from_station AND [時段] >= $start_time AND [時段] < $end_time
    GROUP BY [進站], [出站]
`);

function parseStation(station: string) {
    if (station.endsWith("站")) {
        return station.slice(0, -1);
    }
    return station;
}

app.get('/', (c) => c.text('Hono API server that serves Taipei MRT OD data.'))

app.use('*', cors({
    origin: 'http://localhost:5173',
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

    let res;

    if (from_station != "null" && to_station != "null") {
        res = from_to_query.all({ $from_station: from_station, $to_station: to_station, $start_time: start_time, $end_time: end_time });
    }
    else if (from_station != "null") {
        res = from_query.all({ $from_station: from_station, $start_time: start_time, $end_time: end_time }).slice(0, 15);
    }
    else if (to_station != "null") {
        res = to_query.all({ $to_station: to_station, $start_time: start_time, $end_time: end_time }).slice(0, 15);
    }

    return c.json(res);
});

export default app
