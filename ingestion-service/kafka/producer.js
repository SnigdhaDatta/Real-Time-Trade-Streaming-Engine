import { kafkaConfig } from "./client.js";

export const producer = kafkaConfig.producer({
  allowAutoTopicCreation: true, //true hole topic create hobe jodi topic na thake
  //transactionTimeout: 30000, //30 seconds transaction timeout mane jodi producer message send korte giye 30 seconds er moddhe response na pay tahole transaction timeout hoye jabe i.e consumeer
});

//producer connection
export const initKafka = async () => {
  try {
    console.log("Connecting to Kafka Ingestion-service Producer...");
    await producer.connect();
    console.log("Connected to Kafka Ingestion-service Producer Successfully");
  } catch (error) {
    console.error("Error connecting to Kafka Ingestion-service Producer", error);
    process.exit(1); //exit the process with error code 1
  }
};

//producer is responsible for sending messages to Kafka topics
export const produceMessages = async (topic, trade) => {
  try {
    //connect to kafka producer

    //sending messages. messages should be in the format of {key: "key", value: "value"}
    await producer.send({
      topic: topic,
      messages: [
        {
          key: trade.s, //symbol of the trade
          value: JSON.stringify({
            price: trade.p,
            quantity: Number(trade.q),
            timestamp: Number(trade.T),
          }), //trade data in string format
        },
      ],
    });
  } catch (error) {
    console.error("Error connecting to Kafka Ingestion-service Producer", error);
  }
};
