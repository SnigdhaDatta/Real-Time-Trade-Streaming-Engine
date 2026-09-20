import { Pool } from "pg";

// Create a new pool instance with your database configuration (basically a pool of connections to the database)
export const pool = new Pool ({
    user: process.env.user,
    host: "localhost",
    database: process.env.database,
    password: process.env.password,
    port: 5432,
    max:10, //maximum number of connections in the pool
})

//on every new connection we are notified like this... new connections are created by timescaledb on their own depending in the amount of querries executed which is dependent on the amountof trades incoming from the kafka topic, so if the trades are coming in at a high rate then more connections will be created by timescaledb and if the trades are coming in at a low rate then less connections will be created by timescaledb
pool.on('connect', ()=>console.log(`Timescaledb connection #${pool.totalCount} created | Remaining Ideal Connections: ${pool.idleCount} | Waiting Requests: ${pool.waitingCount}`));

//if error occurs then check for it 
pool.on('error' , (err)=>console.error("TimescaleDb error:", err));

export const saveCandles = async (candle, key) => {
    try {
        await pool.query(
            `INSERT INTO ohlc_candles(time, symbol, open, high, low, close, volume) 
            VALUES($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (time, symbol) DO UPDATE SET
                open = EXCLUDED.open,  
                high = EXCLUDED.high,
                low = EXCLUDED.low,
                close = EXCLUDED.close,
                volume = EXCLUDED.volume;
                -- Update the existing candle with the new values if a conflict occurs (i.e., if a candle for the same time and symbol already exists), then update the existing candle with the new values --`,
            [
                new Date(candle.timestamp),
                key,
                candle.open,
                candle.high,
                candle.low,
                candle.close,
                candle.volume
            ]
        );
    } catch (error) {
        console.error("Error saving candle to TimescaleDb:", error);
    }
}

