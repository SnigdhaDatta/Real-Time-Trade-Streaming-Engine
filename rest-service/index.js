import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import candlesRouter from "./routes/candles.js";
import healthRouter from "./routes/health.js";
import { pool } from "./db/timescaleDB.js";
import redisClient from "./db/redisClient.js";

const app = new Hono();

app.get("/", (c) =>
  c.text("Welcome to the CandleFlow REST API!  \n Server is running successfully. \n Visit /candles for candle data and /health for service health status.")
);
app.route("/candles", candlesRouter);
app.route("/health", healthRouter);

const server = serve({
  fetch: app.fetch,
  port: 9003,
});

console.log("🚀 REST Service running at http://localhost:9003");

async function gracefulShutdown(signal) {
  try {
    console.log(`\n🛑 Gracefully shutting down on ${signal}...`);
    await pool.end();
    console.log("✅ TimescaleDB connection closed.");
    await redisClient.quit();
    console.log("✅ Redis connection closed.");
    await server.close();
    console.log("✅ Server closed.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error occurred while shutting down:", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  gracefulShutdown("SIGINT");
});

process.on("SIGTERM", () => {
  gracefulShutdown("SIGTERM");
});
