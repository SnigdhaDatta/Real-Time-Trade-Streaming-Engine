import {kafkaConfig} from "./client.js";
import {TOPICS} from "../../shared/topics.js";

export const consumer = kafkaConfig.consumer({
    groupId: "ws-service-group", //group id for the consumer, same group id helps consumers understand that they are part of the same consumer group and can share the load of consuming messages from the topic they are susbcribed to
})


export const initKafkaConsumer = async () => {
    try {
        console.log("Connecting to WS-service Kafka Consumer...");
        await consumer.connect();
        console.log("Connected to WS-service Kafka Consumer Successfully");
    } catch (error) {
        console.error("Error connecting to WS-service Kafka Consumer", error);
        process.exit(1); //exit the process with error code 1
    }   
};


export const receiveFromKafka = async (topic, callback) => {
    try{
        await consumer.subscribe({
        topics: [TOPICS.OHLC_DISTRIBUTION], //topics from which we want to consume messages
        fromBeginning: false, //fromBeginning true holei topic er shuru theke messages consume hobe, false hole latest message theke consume hobe
        })

        await consumer.run({
            eachMessage: async ({ partition, message }) => {
                try{
                    const candle = JSON.parse(message.value.toString()); //message value is in buffer format, so we need to convert it to string and then parse it to json
                    const key = message.key.toString();
                    callback(key, candle); //call the callback function with the key and candle data, this callback function is used to broadcast the received candle data to the corresponding channel based on the trading pair
                } catch (error) {
                    console.error("Error processing Kafka message", error);
                    process.exit(1); //exit the process with error code 1
                }
            }
        });
    }
    catch(error){
        console.error("Error connecting to WS-service Kafka Consumer", error);
        process.exit(1); //exit the process with error code 1
    }
}