import { Database } from "bun:sqlite";

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
