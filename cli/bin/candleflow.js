#!/usr/bin/env node
import figlet from "figlet";
import chalk from "chalk";
import {
  getLiveCandles,
  getCandlesHistory,
  getLatestCandle,
} from "../index.js";
import { parseArgs } from "node:util";
import { PAIRS } from "../../shared/pairs.js";
import { INTERVALS } from "../../shared/intervals.js";

//Suppose command is command : trade-cli subscribe --pair BTCUSDT --interval 1m.... to subscribe word theke arguments namer akta array te sob words gulo dhukiye dbe ... process.argv is used to  get the command line script  arguments  pasted in the terminal
const args = process.argv.slice(2); //arguments = ["BTCUSDT", "--interval", "1m"]

//logo for the  fancy command line interface
const logo = figlet.textSync("CandleFlow", {
  font: "Small",
});

//parseArgs function will parse the arguments and return an object with values and positionals properties. values will contain the options passed in the command line and positionals will contain the positional arguments passed in the command line
let values;
let positionals;

try {
  ({ values, positionals } = parseArgs({
    args: args, //args will contain the arguments array
    //options will contain the commands(the words) who has '--' before them like --pair, --interval etc. and their values will be the words after them like BTCUSDT, 1m etc. and short will contain the short form of the commands like -p for --pair, -i for --interval etc.
    options: {
      //--interval flag er j value ache interval key te dhukbe and u can use -i instead of --interval as short form as mentioned in short
      interval: { type: "string", short: "i", default: "1m" }, //default value of interval is 1m if not provided in the command line
      limit: { type: "string", short: "l" }, //default value of limit is 100 if not provided in the command line
    },
    allowPositionals: true, //and jegulo standalone(commands which are not options/flags) commands thakbe ogulo positionals array te dhukbe
  }));
} catch (error) {
  if(error.code === "ERR_PARSE_ARGS_UNKNOWN_OPTION"){
    console.log(chalk.red("❌ Unknown option provided.\n"));
    console.log(chalk.yellow("Supported options:"));
    console.log(chalk.cyan("  --interval, -i"));
    console.log(chalk.cyan("  --limit, -l"));
    process.exit(1);
  }
}


const tradingPair = positionals[0];
const command = positionals[1];
const interval = values.interval; //interval will contain the value of the interval option which is the time interval like 1m, 5m, 1h etc.
const limit = values.limit; //limit will contain the value of the limit option which is the number of candles to be fetched from the server

if (!tradingPair) {
  console.log(chalk.red("\n❌ Error: Trading pair is required\n"));
  console.log(chalk.yellow(`Available Pairs: ${PAIRS.join(", ")}`));
  console.log(
    chalk.blueBright(`
      EXAMPLE USAGE:
        candleflow BTCUSDT
        candleflow BTCUSDT --interval 5m --limit 100
        candleflow BTCUSDT --interval 15m --limit 50
        candleflow BTCUSDT --interval 1h --limit 20
    `),
  );
  process.exit(1);
}
if (!PAIRS.includes(tradingPair)) {
  console.log(
    chalk.red(
      `Invalid trading pair: ${tradingPair}. Supported pairs: ${PAIRS.join(", ")}`,
    ),
  );
  process.exit(1);
}

if (!INTERVALS.includes(interval)) {
  console.log(
    chalk.red(
      `\n❌ Invalid interval: ${interval}. Supported intervals: ${INTERVALS.join(", ")}\n`,
    ),
  );
  console.log(
  chalk.blueBright(
    `EXAMPLE USAGE:
    candleflow BTCUSDT --interval 5m --limit 100
    candleflow BTCUSDT --interval 15m --limit 50
    candleflow BTCUSDT --interval 1h --limit 20
  `),
  );
  process.exit(1);
}

// Historical intervals require a limit
if (interval !== "1m" && !limit) {
  console.log(
    chalk.red(
      "\n❌ Error: Historical intervals (5m, 15m, 1h) require the --limit flag.\n",
    ),
  );

  console.log(
    chalk.blueBright(`
      EXAMPLE USAGE:
        candleflow BTCUSDT --interval 5m --limit 100
        candleflow BTCUSDT --interval 15m --limit 50
        candleflow BTCUSDT --interval 1h --limit 20
    `),
  );

  process.exit(1);
}

function Intro() {
    console.clear(); // Clear the console for a clean interface
    console.log(chalk.cyanBright(logo));

    console.log(chalk.gray("Real-Time Crypto Streaming Engine\n"));

    console.log(`${chalk.cyan("📈 Pair")}     : ${chalk.greenBright(tradingPair)}`);

    console.log(
      `${chalk.cyan("⏱️  Interval")} : ${chalk.yellowBright(interval)}\n`,
    );

    console.log(chalk.blueBright("⏳ Connecting...\n"));
    }

if (!limit) {
  //if limit not there and latest command is there then get the latest candle else get the live candles
  if (command === "latest"){
    Intro(); getLatestCandle(tradingPair);
  } 
  else if(!command) {
    Intro(); getLiveCandles(tradingPair, interval);
  }
  else {
    console.log(chalk.red("\n❌ Error: Invalid command.\n"));
    console.log(chalk.yellow("Supported commands:"));
    console.log(chalk.cyan("  latest"));
    console.log(chalk.cyan("  coin name (like BTCUSDT)"));

    console.log(chalk.blueBright(`
      EXAMPLE USAGE:
        candleflow BTCUSDT 
        candleflow BTCUSDT latest
    `));
  
    process.exit(1);
  }
} else {
  Intro();
  getCandlesHistory(tradingPair, interval, limit);
}
