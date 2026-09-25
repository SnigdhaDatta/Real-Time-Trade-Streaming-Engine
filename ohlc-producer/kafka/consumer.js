import { consumerConfig } from "./client.js";

export const consumer = consumerConfig.consumer({
  groupId: "ohlc-producer-group", //group id for the consumer, same group id holei ekta topic er messages consume korte parbe
});

//consumer is responsible for consuming messages from Kafka topics
export const initKafkaConsumer = async () => {
  try {
    console.log("Connecting to Ingestion-service Kafka Consumer...");
    await consumer.connect();
    console.log("Connected to Ingestion-service Kafka Consumer Successfully");
  } catch (error) {
    console.error("Error connecting to Ingestion-service Kafka Consumer", error);
    process.exit(1); //exit the process with error code 1
  }
};

export const consumeMessages = async (topic, callback) => {
  try {
    //subscribe to the topic from which we want to consume messages
    await consumer.subscribe({ topics: [topic], fromBeginning: false }); //fromBeginning true holei topic er shuru theke messages consume hobe, false hole latest message theke consume hobe

    //run the consumer to consume messages from the topic, eachMessage is a callback function that will be called for each message consumed from the topic
    await consumer.run({
      eachMessage: async ({ partition, message }) => {
        try {
          const trade = JSON.parse(message.value.toString()); //message value is in buffer format, so we need to convert it to string and then parse it to json
          const key = message.key.toString(); //message key is in buffer format, so we need to convert it to string
          callback(key, trade);
        } catch (error) {
          console.error("Error parsing message:", error);
          process.exit(1); //exit the process with error code 1
        }
      },
    });
  } catch (error) {
    console.error("Error connecting to Ingestion-service Kafka Consumer", error);
    process.exit(1); //exit the process with error code 1
  }
};
