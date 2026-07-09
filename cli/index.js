import WebSocket from "ws";
import chalk from "chalk";

const WsServer = "ws://localhost:9000"; // WebSocket server URL

const restServer = "http://localhost:9003"; // REST server URL

function printCandles(pair, candle) {
  const t = candle.time.toString() || "N/A";
  const o = parseFloat(candle.open).toFixed(2);
  const h = parseFloat(candle.high).toFixed(2);
  const l = parseFloat(candle.low).toFixed(2);
  const c = parseFloat(candle.close).toFixed(2);
  const v = parseFloat(candle.volume).toFixed(4);

  console.log(
    `${pair} | Time: ${t} | Open: ${o} | High: ${h} | Low: ${l} | Close: ${c} | Volume: ${v}\n`,
  );
}

export function getLiveCandles(tradingPair, interval) {
  const ws = new WebSocket(
    `${WsServer}?pair=${tradingPair}&interval=${interval}`,
  ); //create a new WebSocket connection to the server with the trading pair and interval as query parameters

  ws.on("open", () => {
    console.log(
      chalk.greenBright("Connected ✅!!! Listening for live candles...\n"),
    );
  });

  ws.on("message", (data) => {
    const payload = JSON.parse(data.toString()); //parse the received data to json format , tostring() is used to convert the buffer data to string format before parsing it to json, its done only
    if (payload.error) {
      console.log(chalk.red(`❌ Error: ${payload.error}\n`));
      console.log(
        chalk.yellow(`Available Pairs: ${payload.availablePairs.join(", ")}`),
      );
      process.exit(1); //exit the process with error code 1 if there is an error in the received payload, like invalid trading pair or interval
    }
    if (payload.candle && payload.pair) {
      printCandles(payload.pair, payload.candle);
    }
  });
}

export function getCandlesHistory(tradingPair, interval, limit) {
  const url = `${restServer}/candles?pair=${tradingPair}&interval=${interval}&limit=${limit}`; //create the url to fetch the historical candles from the REST server with the trading pair, interval and limit as query parameters
  console.log(
    chalk.blueBright(
      `Fetching historical candles for ${tradingPair} with interval ${interval} and limit ${limit}`,
    ),
  );

  const fetchCandles = async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(chalk.red(`HTTP error! status: ${response.status}`));
      }
      const result = await response.json();
      if (!Array.isArray(result.candles) || result.candles.length === 0) {
        console.log(
          chalk.yellow(
            `No historical candles found for ${tradingPair} with interval ${interval} and limit ${limit}`,
          ),
        );
        return;
      }
      result.candles.forEach((candle) => printCandles(tradingPair, candle));
    } catch (error) {
      console.error(
        chalk.red(`❌ Error fetching historical candles: ${error.message}`),
      );
    }
  };

  fetchCandles();
}

export function getLatestCandle(tradingPair) {
  const url = `${restServer}/candles/latest?pair=${tradingPair}`; //create the url to fetch the latest candle from the REST server with the trading pair as query parameter
  console.log(chalk.blueBright(`Fetching latest candle for ${tradingPair}`));
  const fetchLatestCandle = async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(chalk.red(`HTTP error! status: ${response.status}`));
      }
      const result = await response.json();
      printCandles(tradingPair, result);
    } catch (error) {
      console.error(
        chalk.red(`❌ Error fetching latest candle: ${error.message}`),
      );
    }
  };

  fetchLatestCandle();
}
