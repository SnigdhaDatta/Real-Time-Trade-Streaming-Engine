# Real-Time Trade Streaming Engine

A pure backend, open-ended, distributed trade data pipeline that ingests live trades from Binance WebSocket, processes them into OHLC candlestick data, and streams them to consumers via a multi-protocol microservices architecture.

> No exchange klines used. Raw Trades are used for calculating the OHLCV

---

## System Architecture

```text
                        +---------------------------+
                        |     Binance WebSocket     |
                        |  (Live Raw Trade Feed)    |
                        +---------------------------+
                                     |
                                     | raw trades
                                     | { price, qty, time }
                                     v
                        +---------------------------+
                        |    Trade Ingestion        |
                        |       Service             |
                        +---------------------------+
                                     |
                                     | publishes to Kafka topic
                                     v
                        +---------------------------+
                        |          Kafka            |
                        |     (Message Buffer)      |
                        +---------------------------+
                                     |
                                     | consumes trades
                                     v
                        +---------------------------+
                        |    OHLC Processor         |
                        |       Service             |
                        |  (calculates candles)     |
                        +---------------------------+
                                     |
                          +----------+----------+
                          |                     |
                          v                     v
              +-----------------+    +--------------------+
              |   TimescaleDB   |    |       Redis        |
              | (historical     |    | (latest candle     |
              |  candle store)  |    |  cache + pub/sub)  |
              +-----------------+    +--------------------+
                                              |
                                              | Redis Pub/Sub
                                              v
                                   +--------------------+
                                   |    REST Service    |
                                   |   (gRPC Client)    |
                                   +--------------------+
                                              |
                                    +---------+---------+
                                    |                   |
                          (1. HTTP GET)        (2. internal gRPC call)
                                    |                   |
                                    v                   v
                          +-------------+    +--------------------+
                          | curl/browser|    |    WS Service      |
                          | (snapshot)  |    |  (gRPC Server +    |
                          +-------------+    |   WS broadcaster)  |
                                             +--------------------+
                                                        |
                                                        | WebSocket
                                                        v
                                             +--------------------+
                                             |     CLI Tool       |
                                             |  (npm package)     |
                                             +--------------------+
```

---

## Multi-Protocol Breakdown

| Protocol | Where Used | Why |
|---|---|---|
| **WebSocket (client)** | Binance → Ingestion Service | Live raw trade feed consume korte |
| **Kafka** | Ingestion → OHLC Processor | Buffer + rate control, no data loss |
| **Redis Pub/Sub** | OHLC Processor → REST Service | Ultra-low latency candle distribution |
| **REST (HTTP)** | Public API | Latest candle snapshot (curl/browser) |
| **gRPC (HTTP/2)** | REST Service → WS Service | Internal low-latency microservice hop |
| **WebSocket (server)** | WS Service → CLI Tool | Live candle streaming to consumers |

---

## Repository Structure

```text
real-time-trade-engine/
│
├── ARCHITECTURE.md                  # System design (this file)
├── notification.proto               # Shared gRPC schema contract
├── docker-compose.yml               # Local dev setup
│
├── ingestion-service/               # Binance WS → Kafka producer
│   ├── Dockerfile
│   ├── package.json
│   └── index.js
│
├── ohlc-processor/                  # Kafka consumer → OHLC → TimescaleDB + Redis
│   ├── Dockerfile
│   ├── package.json
│   └── index.js
│
├── rest-service/                    # Public REST API + gRPC client
│   ├── Dockerfile
│   ├── package.json
│   └── index.js
│
├── ws-service/                      # gRPC server + WebSocket broadcaster
│   ├── Dockerfile
│   ├── package.json
│   └── index.js
│
├── cli/                             # npm published CLI tool
│   ├── package.json
│   ├── index.js
│   └── bin/
│       └── trade-cli.js
│
├── site/                            # Static docs site (GitHub Pages)
│   └── index.html
│
└── terraform/                       # AWS infrastructure as code
    └── main.tf
```

---

## Microservices Breakdown

### 1. Ingestion Service
- **Role**: Binance WebSocket client + Kafka producer
- **What it does**: Connects to Binance live trade stream, receives raw trades `{ price, qty, time }`, publishes each trade to a Kafka topic
- **Tech**: Node.js, `ws`, `kafkajs`

### 2. OHLC Processor Service
- **Role**: Kafka consumer + candle calculator + storage
- **What it does**: Consumes raw trades from Kafka, accumulates them per time interval (1m, 5m, 15m), calculates Open/High/Low/Close/Volume, stores candles in TimescaleDB, caches latest candle in Redis
- **Tech**: Node.js, `kafkajs`, `pg` (TimescaleDB), `ioredis`

### 3. REST Service
- **Role**: Public API entrypoint + gRPC client
- **What it does**: Exposes `GET /api/v1/candles/:pair` for snapshot queries, reads latest candle from Redis, forwards live updates to WS service via gRPC
- **Tech**: Node.js, Express, `@grpc/grpc-js`

### 4. WS Service
- **Role**: gRPC server + WebSocket broadcaster
- **What it does**: Receives candle updates from REST service via gRPC, maintains open WebSocket connections with CLI subscribers, broadcasts candles to correct channel subscribers
- **Tech**: Node.js, `ws`, `@grpc/grpc-js`

---

## OHLC Calculation (No Exchange Klines)

Raw trades from Binance are accumulated per time window:

```
Incoming trades (1 minute window):
10:00:00 → price: 67420, qty: 0.5
10:00:15 → price: 67430, qty: 1.2   ← High
10:00:30 → price: 67400, qty: 0.3   ← Low
10:00:59 → price: 67410, qty: 0.8

Calculated OHLC candle:
O (Open)   = 67420  ← first trade price
H (High)   = 67430  ← highest price in window
L (Low)    = 67400  ← lowest price in window
C (Close)  = 67410  ← last trade price
V (Volume) = 2.8    ← total qty traded
```

Supported intervals: `1m`, `5m`, `15m`, `1h`

---

## Data Flow (Step by Step)

```
1. Binance sends raw trade every ~100ms
2. Ingestion service publishes to Kafka topic "raw-trades"
3. Kafka buffers trades (handles spikes, no data loss)
4. OHLC Processor consumes from Kafka
5. Accumulates trades per interval per pair
6. On interval close → calculates OHLC candle
7. Stores candle in TimescaleDB (historical)
8. Caches latest candle in Redis (fast access)
9. REST service reads Redis → gRPC → WS service
10. WS service broadcasts to all CLI subscribers
```

---

## Public API

### REST Endpoints

```bash
# Latest candle snapshot
GET /api/v1/candles/BTCUSDT?interval=1m
→ { pair: "BTCUSDT", O: 67420, H: 67430, L: 67400, C: 67410, V: 2.8 }

# Available pairs
GET /api/v1/pairs
→ ["BTCUSDT", "ETHUSDT", "SOLUSDT"]

# Health check
GET /health
→ { status: "ok" }
```

### CLI Tool

```bash
# Install
npm install -g trade-stream-cli

# Or without install
npx trade-stream-cli subscribe --pair BTCUSDT --interval 1m

# Output
🟢 Connected to trade-stream-engine...

BTCUSDT 1m Candle:
O: 67420 | H: 67430 | L: 67400 | C: 67410 | V: 2.8
O: 67410 | H: 67450 | L: 67400 | C: 67440 | V: 3.1
O: 67440 | H: 67460 | L: 67420 | C: 67450 | V: 1.9
...

^C
🔴 Disconnected.
```

---

## Cloud Infrastructure (AWS via Terraform)

```text
                    Internet
                       |
          +------------+------------+
          |                         |
   ALB (REST API)            NLB (WebSocket)
          |                         |
     Private Subnet            Private Subnet
          |                         |
   +-------------+          +-------------+
   | ECS Fargate |          | ECS Fargate |
   | rest-service|          |  ws-service |
   +-------------+          +-------------+
          |                         |
          +----------+   +----------+
                     |   |
              +------+---+------+
              |                 |
         ElastiCache       TimescaleDB
          (Redis)           (RDS)
```

- **VPC**: Private subnets for all services, public only for load balancers
- **ECS Fargate**: Serverless containers, no EC2 management
- **AWS Cloud Map**: Internal DNS for gRPC service discovery (`ws-service.internal:50051`)
- **ALB**: HTTP traffic → REST service
- **NLB**: TCP persistent connections → WS service
- **ElastiCache**: Managed Redis
- **Terraform**: Entire infrastructure provisioned as code (`terraform apply`)

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Language | Node.js |
| Message Queue | Apache Kafka (`kafkajs`) |
| Cache + Pub/Sub | Redis (`ioredis`) |
| Time Series DB | TimescaleDB (`pg`) |
| Internal RPC | gRPC (`@grpc/grpc-js`) |
| REST API | Express.js |
| WebSocket | `ws` |
| Containerization | Docker |
| Orchestration | AWS ECS Fargate |
| Infrastructure | Terraform |
| CLI Package | npm (`trade-stream-cli`) |
| Docs Site | GitHub Pages |

---

*Open-ended streaming engine — any pair, any interval, any consumer.*