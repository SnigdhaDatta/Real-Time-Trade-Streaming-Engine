import { kafkaConfig } from "./client.js";

async function update(){
 const admin = kafkaConfig.admin();
 await admin.connect();
 if(!(await admin.listTopics()).includes("crypto.top-assets")) {
    console.log("Kafka resources already deleted");
    await admin.disconnect();
    console.log("Kafka Admin Disconnected Successfully");
    return ;
 }
 console.log("Connected to Kafka Admin Successfully");
 await admin.deleteTopics({
    topics: ["crypto.top-assets"],
    timeout: 5000, //5 seconds timeout for deleting topics
 })
 console.log("Kafka Topics Deleted Successfully");
await admin.disconnect();
console.log("Kafka Admin Disconnected Successfully");
return "Kafka Topics Deleted Successfully";
}

update();