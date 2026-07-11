import "dotenv/config";
import { WebSocketServer } from "ws";
import { initKafkaConsumer, receiveFromKafka, consumer } from "./kafka/consumer.js";
import { TOPICS } from "../shared/topics.js";
import { PAIRS } from "../shared/pairs.js";
import { INTERVALS } from "../shared/intervals.js";

const wsServer = new WebSocketServer({ port: 9000 });

await initKafkaConsumer(); //initialize kafka consumer

const channels = new Map(); //set to store all connected clients of each channel, key will be the channel name and value will be a set of all connected clients of that channel
//channel name - symbol of the trading pair

PAIRS.forEach((pair)=>{
    channels.set(pair, new Set()); //initialize the set for each channel, in each symbol the subscribed ws connections will be stored, multiple connections maybe there hence a set per key of the map
})

//open the websocket server connection for taking client subscriptons , i.e. when a client connects to the server, we will add the client's websoclket connection to the corresponding channel based on the trading pair and when a client disconnects from the server, we will remove the client from the corresponding channel based on the trading pair
wsServer.on("connection" ,  (ws, req)=>{
    console.log(`New client connected from ${req.socket.remoteAddress}`); //log the remote address(IP) of the client that is connecting to the server

    //server/?pair=BTCUSDT&interval=1m...  to splitting is done from ? to get  array like ["server/", "pair=BTCUSDT&interval=1m..."] and then we take the second element of the array to get the query parameters and then we parse the query parameters to get the trading pair and interval that the client wants to subscribe to
    const urlParams = new URLSearchParams(req.url.split("?")[1]); //parse the query parameters from the request URL to get the trading pair and interval that the client wants to subscribe to

    const tradingPair = urlParams.get("pair"); //pair
    const interval = urlParams.get("interval"); //interval

    if(!tradingPair || !interval){
        ws.send(
            JSON.stringify({
                error:"Invalid Pair or Interval",
                availablePairs: PAIRS,
                availableIntervals: INTERVALS
            })
        );
        ws.close(); //close the WebSocket connection if required query parameters are missing
        return;
    }

    console.log(`Subscribed to ${tradingPair} for ${interval} interval`);

    channels.get(tradingPair)?.add(ws); //add the connected client to the set of the corresponding channel based on the trading pair


    ws.on("close", ()=>{
        console.log(`Client from ${req.socket.remoteAddress} disconnected`); //log the remote address(IP) of the client that is disconnecting from the server
        channels.get(tradingPair)?.delete(ws); //remove the disconnected client from the set of the corresponding channel based on the trading pair
    })

    ws.on("error", (error)=>{
        console.error(`WebSocket error from ${tradingPair}:`, error); //log any WebSocket errors that occur for the client along with the remote address(IP) of the client
    })
})

//Broadcasting function to send the received candle from kafka to the corresponding channel(websocket connections of each pair) based on the trading pair
function broadcastToChannel(key, candle){
    const clients = channels.get(key); //get the set of all connected clients of the corresponding channel based on the trading pair
    if(clients && clients.size > 0){ //check if there are any connected clients in the set
        const message = JSON.stringify({pair: key, candle}); //convert the candle data to string format to send it to the clients
        clients.forEach((client)=>{
            if(client.readyState === 1){ //check if the client is still connected before sending the message
                client.send(message); //send the candle data to the connected client
            }
        })
    }
    else return; // if no connections for a key of the message then return for checking next consuemr message
}

console.log(`🚀 WS Service running on port 9000`);

//WS-service er kafka consumer thke kono candle ashle songe songe broadcastcandle function call kro to broadcast the candles  as its used as a callback function in receiveFromKafka function
await receiveFromKafka(TOPICS.OHLC_DISTRIBUTION, (key, candle)=>{
    broadcastToChannel(key, candle);
});


async function gracefulShutdown(signal) {
    try {
      console.log(`\n🛑 Gracefully shutting down on ${signal}...`);
      wsServer.close(() => {
        console.log("WebSocket Server Closed Successfully");
      });
      await consumer.disconnect(); //disconnect the consumer before exiting the process
      console.log("WS-service Kafka Consumer Disconnected Successfully");
    } catch (error) {
      console.error("Error occurred while shutting down:", error);
    }
    process.exit(0); //exit the process with success code 0
}

process.on("SIGINT", () => {
    gracefulShutdown("SIGINT");
});

process.on("SIGTERM", () => {
    gracefulShutdown("SIGTERM");
});