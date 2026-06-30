# 🕯️ CandleFlow

> A real-time cryptocurrency OHLC streaming engine built with **Apache Kafka**, **TimescaleDB**, **Redis**, **Node.js**, **WebSockets**, and **Hono**.

CandleFlow is an event-driven microservices application that ingests live cryptocurrency trades from Binance, generates 1-minute OHLC candles, stores them efficiently in TimescaleDB, caches historical queries using Redis, and provides both real-time streaming and historical candle retrieval through dedicated services.

---

## 🏗️ Architecture

```mermaid
flowchart LR

    Binance["📈 Binance WebSocket"]

    subgraph Event Streaming
        K1["Kafka<br/>Raw Trades"]
        Processor["OHLC Processor"]
        DB[("TimescaleDB")]
        Redis[("Redis Cache")]
        K2["Kafka<br/>1m Candle Updates"]
    end

    subgraph Backend Services
        WS["WebSocket Service"]
        REST["REST API"]
    end

    CLI["🖥️ CandleFlow CLI"]

    Binance --> K1
    K1 --> Processor

    Processor --> DB
    Processor --> Redis
    Processor --> K2

    K2 --> WS

    CLI -->|"Historical Data<br/>Latest Candle"| REST

    REST --> Redis
    REST --> DB

    WS -->|"Live 1m Stream"| CLI
```

---

## ✨ Features

* 📈 Real-time Binance trade ingestion
* ⚡ Apache Kafka event streaming
* 🕯️ Automatic 1-minute OHLC candle generation
* ⏱️ TimescaleDB hypertables
* 📊 Continuous Aggregates (5m, 15m, 1h)
* 🚀 Redis caching
* 🔌 WebSocket live streaming
* 🌐 REST API for historical data
* 💻 Interactive CLI

---

## 📖 Documentation

For the complete system architecture, communication flow, scalability considerations, caching strategy, and design decisions, please refer to **[ARCHITECTURE.md](./ARCHITECTURE.md)**.
