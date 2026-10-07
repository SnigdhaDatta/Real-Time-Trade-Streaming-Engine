import { Pool } from "pg";

// Create a new pool instance with your database configuration (basically a pool of connections to the database)
export const pool = new Pool({
  user: process.env.user,
  host: "localhost",
  database: process.env.database,
  password: process.env.password,
  port: 5432,
});

//test the connection to the database
pool.on("connect", () =>
  console.log(
    `Timescaledb Connection #${pool.totalCount} created | Remaining Ideal Connections: ${pool.idleCount} | Waiting Requests: ${pool.waitingCount}`,
  ),
);

//if error occurs then check for it
pool.on("error", (err) => console.error("TimescaleDb error:", err));

export async function getCandle(key, interval, limit) {
  if (!key || !interval || !limit) {
    throw new Error("Invalid key, interval or limit");
  }

  const tableName =
    interval === "5m"
      ? "ohlc_candles_5m"
      : interval === "15m"
        ? "ohlc_candles_15m"
        : interval === "1h"
          ? "ohlc_candles_1h"
          : "ohlc_candles";
  try {
    const result = await pool.query(
      `     SELECT * FROM ${tableName} 
            WHERE symbol = $1  -- Filter the results to only include rows where the symbol matches the provided key
            ORDER BY time DESC
            LIMIT $2; -- Limit the number of results returned to the specified limit
        `,
      [key, limit],
    );
    return result.rows; // Return the rows from the query result as a JSON object
  } catch (error) {
    console.error("Error fetching candle from TimescaleDb:", error);
    throw error;
  }
}
