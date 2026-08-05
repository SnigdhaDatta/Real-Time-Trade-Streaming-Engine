import { kafkaConfig } from "./client.js";
import { TOPICS } from "../../shared/topics.js";
//admin is responsible for creating TOPICS , PARTITIONS and all in Kafka

//so lets create them
const admin = kafkaConfig.admin();

//let isCreated = false; //flag to check if topics are created or not

export const createKafkaResources = async () => {

   await admin.connect();
    console.log("Connected to Kafka Admin Successfully");
    const topics = await admin.listTopics(); //list all topics in the kafka cluster

    if(topics.includes(TOPICS.RAW_TRADES_INGESTION) && topics.includes(TOPICS.OHLC_DISTRIBUTION)) {
      console.log("Kafka resources already created");
      await admin.disconnect();
      console.log("Kafka Admin Disconnected Successfully");
      return;
    }
  try {

    //lets create topics and partitions now
    await admin.createTopics({
      validateOnly: false, //true hole topic create hobe na, sudhu validate korbe
      timeout: 5000, //5 seconds timeout for creating topics
      topics: [
        {
          topic: TOPICS.RAW_TRADES_INGESTION,
          numPartitions: 1,
          replicationFactor: 1,
        },
        {
          topic: TOPICS.OHLC_DISTRIBUTION,
          numPartitions: 2,
          replicationFactor: 1,
        }
      ],
    });
    console.log("Kafka Topics Created Successfully");
  } catch (error) {
    console.log("Error connecting to Kafka Admin", error);
  } finally {
    //after creating topics we can disconnect the admin client
    await admin.disconnect();
    console.log("Kafka Admin Disconnected Successfully");
  }
};
