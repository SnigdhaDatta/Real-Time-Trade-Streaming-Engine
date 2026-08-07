import "dotenv/config"          // ← 2nd e execute hocche!
import  WebSocket  from "ws";
import {produceMessages, initKafka, producer} from "./kafka/producer.js";
import { TOPICS }  from "../shared/topics.js";
import { PAIRS } from "../shared/pairs.js";
import { createKafkaResources } from "./kafka/admin.js";

// Make Combined stream URL
// btcusdt@trade/ethusdt@trade/solusdt@trade...
const streamingPairs = PAIRS.map(pair => `${pair.toLowerCase()}@trade`).join("/")

const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streamingPairs}`)

console.log(process.env.KAFKA_BROKER_DEV)
//Step 1: Create Kafka resources(topics, partitions, etc) and then connect to kafka producer
await createKafkaResources();
await initKafka();
 
let isShuttingDown = false; //flag to check if the process is shutting down or not

//connection opened 
ws.on("open", ()=> console.log("WebSocket connection opened"));
 

//message handling i.e printing the trades coming from the websocket stream in formated way
ws.on("message", (data)=>{
    if(isShuttingDown) return; //if the process is shutting down then we should not accept anymore messages from the websocket stream, so we return from the function
    const parsed = JSON.parse(data.toString()); //data is coming in buffer format, so we need to convert it to string and then parse it to json
       //produce messages to kafka topic once the producer is connected
    const trade = parsed.data; //trade data is coming in the data field of the parsed json    
       produceMessages(TOPICS.RAW_TRADES_INGESTION, trade).catch(err=> console.log(err));
        // console.log(`
        //     Symbol: ${trade.s},
        //     Price: ${trade.p},
        //     Quantity: ${trade.q},
        //     Trade Time: ${trade.T},
        //     Is Buyer Maker: ${trade.m}
        // `);

})

//error handling
ws.on("error", (error)=> console.log("WebSocket error", error));

//close handling through Graceful shutdown
async function gracefulShutdown(signal) {
  try {
    isShuttingDown= true; //set the flag to true when the process is shutting down, so that we can stop accepting messages from the websocket stream
    console.log(`\n🛑 Gracefully shutting down on ${signal}...`);
    await ws.close();
    console.log("WebSocket connection closed");
    await producer.disconnect(); //disconnect the producer before exiting the process
    console.log("Ingestion-service Kafka Producer Disconnected Successfully");
  } catch (error) {
    console.error("Error occurred while shutting down:", error);
  }
  process.exit(0); //exit the process with success code 0
}


process.on("SIGINT", () => {
  isShuttingDown = true; //set the flag to true when the process is shutting down, so that we can stop accepting messages from the websocket stream
  gracefulShutdown("SIGINT");
});

process.on("SIGTERM", () => {
  isShuttingDown = true; //set the flag to true when the process is shutting down, so that we can stop accepting messages from the websocket stream
  gracefulShutdown("SIGTERM");
});
