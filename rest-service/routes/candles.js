import { Hono } from "hono";
import { PAIRS } from "../../shared/pairs.js";
import { INTERVALS } from "../../shared/intervals.js";
import { getCandle } from "../db/timescaleDB.js";
import redisClient  from "../db/redisClient.js";

const candlesRouter = new Hono();

candlesRouter.get("/", async(c)=> {
    const pair = c.req.query("pair");
    const interval = c.req.query("interval");
    const limit = Number(c.req.query("limit"));

    if(!pair || !interval){
        return c.json({
            error:"Invalid Pair or Interval",
            availablePairs: PAIRS,
            availableIntervals: INTERVALS
        }, 400);
    }

    if(!Number.isInteger(limit) || limit <= 0){
        return c.json({
            error:"Invalid limit. Limit must be a positive integer."
        }, 400);
    }
    if(!PAIRS.includes(pair)){
        return c.json({
            error: `Invalid trading pair: ${pair}. Supported pairs: ${PAIRS.join(", ")}`
        }, 400);
    }
    if(!INTERVALS.includes(interval)){
        return c.json({
            error: `Invalid interval: ${interval}. Supported intervals: ${INTERVALS.join(", ")}`
        }, 400);
    }
    if(!limit) return c.json({
        error:"Limit is required for fetching historical candles"
    }, 400);

    try{
        const cachedCandles = await redisClient.get(`candles:${pair}:${interval}:${limit}`);
        if(!cachedCandles){
            const candles = await getCandle(pair, interval, limit);
            await redisClient.set(`candles:${pair}:${interval}:${limit}`, JSON.stringify(candles), "EX", 1000); // Cache for 1000 seconds
            return c.json({
                pair,
                interval,
                limit,
                candles
            }, 200);
        }
        return c.json({
            pair,
            interval,
            limit,
            candles: JSON.parse(cachedCandles)
        }, 200);
        
    }catch (error) {
        return c.json({
            error: "Failed to fetch candles"
        }, 500);
    }
})

candlesRouter.get("/latest", async(c)=> {
    const pair = c.req.query("pair");
    try{
        if(!pair){
            return c.json({
                error:"Invalid Pair",
                availablePairs: PAIRS
            }, 400);
        }
        const candle = await redisClient.get(`candle:${pair}`);
        if (!candle) {
            return c.json({ error: "Candle not found" }, 404);
        }
        return c.json(JSON.parse(candle), 200);
    } catch (error) {
        return c.json({
            error: "Failed to fetch latest candle"
        }, 500);
    }
});

export default candlesRouter;
