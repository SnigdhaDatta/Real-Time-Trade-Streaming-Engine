import { Kafka } from "kafkajs";

//kafka client config
export const consumerConfig = new Kafka({
    clientId:"accessing-kafka-to-consume-data-for-calculating-ohlc",
    //brokers mane puro j service ta kafka er jar mddhe topics, partitions gulo ache
    brokers:process.env.NODE_ENV === "production" ? [process.env.KAFKA_BROKER_PROD] : [process.env.KAFKA_BROKER_DEV],
})

export const producerConfig = new Kafka({
    clientId:"sending-ohlc-data-to-kafka-for-cliUsers",
    //brokers mane puro j service ta kafka er jar mddhe topics, partitions gulo ache
    brokers:process.env.NODE_ENV === "production" ? [process.env.KAFKA_BROKER_PROD] : [process.env.KAFKA_BROKER_DEV],
})
