import {producerConfig} from "./client.js";

export const producer = producerConfig.producer({
    allowAutoTopicCreation: true, //true hole topic create hobe jodi topic na thake
});

export const initKafkaProducer = async () => {
    try {
        console.log("Connecting to OHLC Kafka Producer...");
        await producer.connect();
        console.log("Connected to OHLC Kafka Producer Successfully");
    } catch (error) {
        console.error("Error connecting to OHLC Kafka Producer", error);
        process.exit(1);
    }
};

export const sendToKafka = async (topic, { candle, key }) => {
    try {
        await producer.send({
            topic:topic,
            messages:[
                {
                    key:key, 
                    value:JSON.stringify({
                        time:new Date(candle.timestamp).toISOString(),
                        open:candle.open,
                        high:candle.high,
                        low:candle.low,
                        close:candle.close,
                        volume:candle.volume,
                    })
                }
            ]
        })
    } catch (error) {
        console.error("Error sending message to OHLC Kafka Producer", error);
    }
}
