import { saveCandles } from "./db/timescale.js";
import redisClient from "./redis/client.js";
import { sendToKafka } from "./kafka/producer.js";
import { TOPICS } from "../shared/topics.js";
const candles = {};

//calculate the nearest minute of the timestamp field of the trade
function getNearestMinute(timestamp) {
  return Math.floor(timestamp / 60000) * 60000; //60000 milliseconds = 1 minute
}

export const calculateOHLC = function ({ trade, key }) {
  const candleTime = getNearestMinute(trade.timestamp);
  if (!candles[key]) {
    candles[key] = {
      open: parseFloat(trade.price),
      high: parseFloat(trade.price),
      low: parseFloat(trade.price),
      close: parseFloat(trade.price),
      volume: parseFloat(trade.quantity),
      timestamp: candleTime,
    };
  } else {
    const candle = candles[key];
    if (candleTime > candle.timestamp) {
      saveCandles(candle, key); 
      sendToKafka(TOPICS.OHLC_DISTRIBUTION, { candle, key}); // Send the candle data to Kafka for distribution to cli users
      redisClient.set(`candle:${key}`, JSON.stringify(candle), 'EX', 60); // Set the candle data in Redis with an expiration time of 1 minute (60 seconds)
      // console.log(
      //   `Candle for ${key} at ${new Date(candle.timestamp).toISOString()}: \n Open: ${candle.open} | High: ${candle.high} | Low: ${candle.low} | Close: ${candle.close} | Volume: ${candle.volume}`,
      // );
      candle.open = parseFloat(trade.price);
      candle.high = parseFloat(trade.price);
      candle.low = parseFloat(trade.price);
      candle.close = parseFloat(trade.price);
      candle.volume = parseFloat(trade.quantity);
      candle.timestamp = candleTime;
    } else {
      candle.high = Math.max(candle.high, parseFloat(trade.price));
      candle.low = Math.min(candle.low, parseFloat(trade.price));
      candle.close = parseFloat(trade.price);
      candle.volume += parseFloat(trade.quantity);
    }  
  }
};
