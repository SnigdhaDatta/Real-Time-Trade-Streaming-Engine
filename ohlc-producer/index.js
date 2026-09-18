import "dotenv/config";
import {
  initKafkaConsumer,
  consumeMessages,
  consumer,
} from "./kafka/consumer.js";
import {producer, initKafkaProducer} from "./kafka/producer.js";
import { calculateOHLC } from "./calculator.js";
import { TOPICS } from "../shared/topics.js";
import redisClient from "./redis/client.js";
import { pool }from "./db/timescale.js";
//initialize kafka producer
await initKafkaProducer();
//initialize kafka consumer
await initKafkaConsumer();

//consume messages from the topic and print the trades coming from the topic in formated way
//consumeMessages function takes two arguments, first one is the topic from which we want to consume messages and second one is a callback function that will be called for each message consumed from the topic, the callback function takes two arguments, first one is the key of the message and second one is the value of the message
await consumeMessages(TOPICS.RAW_TRADES_INGESTION, (key, trade) => {
  calculateOHLC({ trade, key });
});



async function gracefulShutdown(signal) {
  try {
    console.log(`\n🛑 Gracefully shutting down on ${signal}...`);
    await redisClient.quit(); //disconnect the redis client before exiting the process
    console.log("Redis Client Disconnected Successfully");
    await pool.end(); //disconnect the timescale pool before exiting the process
    console.log("Timescale Pool Disconnected Successfully");
    await consumer.disconnect(); //disconnect the consumer before exiting the process
    console.log("OHLC Kafka Consumer Disconnected Successfully");
    await producer.disconnect(); //disconnect the producer before exiting the process
    console.log("OHLC Kafka Producer Disconnected Successfully");
    process.exit(0); //exit the process with success code 0
  } catch (error) {
    console.error("Error occurred while shutting down:", error);
  }
}

process.on("SIGINT", () => {
  gracefulShutdown("SIGINT");
});

process.on("SIGTERM", () => {
  gracefulShutdown("SIGTERM");
});
