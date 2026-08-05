import { Kafka } from "kafkajs";

//kafka client config
export const kafkaConfig = new Kafka({
  clientId: "ingesting-data-to-kafka",
  //brokers mane puro j service ta kafka er jar mddhe topics, partitions gulo ache
  brokers:["localhost:9092"],
    // process.env.NODE_ENV === "production"
    //   ? [process.env.KAFKA_BROKER_PROD]
    //   : [process.env.KAFKA_BROKER_DEV],
});
