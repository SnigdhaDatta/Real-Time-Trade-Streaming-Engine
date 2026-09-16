-- Schema for the candles that are being stored in the timescaledb

-- Store the raw ohlc candles for 1m
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE TABLE IF NOT EXISTS ohlc_candles(
    time TIMESTAMPTZ NOT NULL, -- The timestamp of the candle in the format of 2024-06-01T00:00:00Z
    symbol TEXT NOT NULL, -- The trading pair, e.g. BTC/USD
    open DOUBLE PRECISION NOT NULL, -- The opening price of the candle
    high DOUBLE PRECISION NOT NULL, -- The highest price of the candle
    low DOUBLE PRECISION NOT NULL, -- The lowest price of the candle
    close DOUBLE PRECISION NOT NULL, -- The closing price of the candle
    volume DOUBLE PRECISION NOT NULL,  -- The trading volume of the candle

    PRIMARY KEY (time, symbol) -- added a composite primary key to ensure uniqueness of each candle based on time and symbol
);


-- Create a hypertable on the ohlc_candles table with time as divider i.e divide the chunks of data on basis of time, so that we can query the data efficiently
SELECT create_hypertable('ohlc_candles', 'time',  if_not_exists => TRUE); --create hypertable if not existing from earlier 


-- Aggregate the ohlc_candles table to create a new table for 5m candles
CREATE MATERIALIZED VIEW IF NOT EXISTS ohlc_candles_5m 
WITH (timescaledb.continuous) AS  -- we add this line to make the view continuous, so that it will be updated automatically when new data is inserted into the ohlc_candles table.... Basically continuos agggregation
SELECT 
    time_bucket('5 minutes', time) As time, -- bucket the time of 1m into 5 minute intervals
    symbol,
    first(open, time) AS open, -- get the first open price of the FIRST 1M INTERVAL BLOCK
    max(high) AS high, -- MAX HIGH PRICE AMONG THE 5 ROWS OF A 1M CANDLE
    min(low) AS low, -- MIN LOW PRICE AMONG THE 5 ROWS OF A 1M CANDLE
    last(close, time) AS close, -- get the last close price of the LAST 1M INTERVAL BLOCK
    sum(volume) AS volume -- sum the volume of the 5 rows of 1m
FROM ohlc_candles -- aggregate from the source table og=f 1m candles
GROUP BY time_bucket('5 minutes', time), symbol  -- group by the 5 minute bucket and symbol to get the aggregated data for each symbol in 5 minute intervals
WITH NO DATA ; -- we add this line to create the view without any data, so that it will be populated automatically when new data is inserted into the ohlc_candles table


-- 15m aggregation view
CREATE MATERIALIZED VIEW IF NOT EXISTS ohlc_candles_15m
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('15 minutes', time) AS time,
    symbol,
    first(open, time) AS open,
    max(high) AS high,
    min(low) AS low,
    last(close, time) AS close,
    sum(volume) AS volume
FROM ohlc_candles
GROUP BY time_bucket('15 minutes', time), symbol
WITH NO DATA;


-- 1h aggregation view
CREATE MATERIALIZED VIEW IF NOT EXISTS ohlc_candles_1h
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', time) AS time,
    symbol,
    first(open, time) AS open,
    max(high) AS high,
    min(low) AS low,
    last(close, time) AS close,
    sum(volume) AS volume
FROM ohlc_candles
GROUP BY time_bucket('1 hour', time), symbol
WITH NO DATA;



--Auto refresh policies... This is written to automatically refresh the continuous agggregation view when new data is inserted into the ohlc_candles table, so that we don't have to manually refresh the view every time new data is inserted into the ohlc_candles table
SELECT add_continuous_aggregate_policy('ohlc_candles_5m',
    start_offset => INTERVAL '1 hour',  
    end_offset => INTERVAL '1 minute', -- these 3 lines means for every 5 minuts , check the ohlc_candles table for new data from 1 hour ago to 1 minute ago and update the ohlc_candles_5m view with the new data if there is any insersion
    schedule_interval => INTERVAL '5 minutes'); 

SELECT add_continuous_aggregate_policy('ohlc_candles_15m',
    start_offset => INTERVAL '3 hours',  
    end_offset => INTERVAL '1 minute', -- these 3 lines means for every 15 minuts , check the ohlc_candles table for new data from 1 hour ago to 1 minute ago and update the ohlc_candles_15m view with the new data if there is any insersion
    schedule_interval => INTERVAL '15 minutes'); 

SELECT add_continuous_aggregate_policy('ohlc_candles_1h',
    start_offset => INTERVAL '12 hours',  
    end_offset => INTERVAL '1 minute', -- these 3 lines means for every 1 hour , check the ohlc_candles table for new data from 1 hour ago to 1 minute ago and update the ohlc_candles_1h view with the new data if there is any insersion
    schedule_interval => INTERVAL '1 hour'); 