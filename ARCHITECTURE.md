# Real-Time Trade Streaming Engine

A pure backend, open-ended, distributed trade data pipeline deployed on AWS ECS that ingests live trades from Binance WebSocket, processes them into OHLC candlestick data, and streams them to consumers via a multi-protocol microservices architecture.

> No exchange klines used. Raw trades are used for calculating OHLCV candles.

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
                        |    Ingestion Service      |
                        |  (Binance WS consumer +   |
                        |    Kafka producer)        |
                        +---------------------------+
                                     |
                                     | publishes to Kafka
                                     | key: pair (BTCUSDT, ETHUSDT...)
                                     | partition per pair
                                     v
                        +---------------------------+
                        |          Kafka            |
                        |  (Partitioned by pair)    |
                        |  Partition 0 → BTCUSDT    |
                        |  Partition 1 → ETHUSDT    |
                        |  Partition 2 → SOLUSDT    |
                        +---------------------------+
                                     |
                                     | consumes trades
                                     v
                        +---------------------------+
                        |    OHLC Processor         |
                        |  (calculates candles)     |
                        |  1m, 5m, 15m, 1h          |
                        +---------------------------+
                                     |
                          +----------+----------+
                          |                     |
                          v                     v
              +-----------------+    +--------------------+
              |   TimescaleDB   |    |       Redis        |
              | (all historical |    | (latest candle     |
              |  candles store) |    |  cache only)       |
              +-----------------+    +--------------------+
                       |                       |
                       |                       |
                       v                       v
           +--------------------+   +--------------------+
           |    WS Service      |   |    REST Service    |
           |  (gRPC Server +    |   |   (gRPC Client)    |
           |  WS broadcaster)   |   +--------------------+
           +--------------------+             |
                       |                      |
                       | WebSocket            | HTTP GET
                       v                      v
           +--------------------+   +--------------------+
           |     CLI Tool       |   |   curl / browser   |
           |  (live candles)    |   | (latest snapshot)  |
           +--------------------+   +--------------------+


           Internal gRPC connection:
           REST Service ──── gRPC ────► WS Service
           (forwards any              (stores to TimescaleDB
            REST triggered             + broadcasts to CLI)
            events)
```

---

## Why This Data Flow?

| Consumer | Source | Why |
|---|---|---|
| **curl / browser** | Redis | Shudhu latest candle dorkar, Redis fast cache ✅ |
| **CLI Tool** | TimescaleDB → WS Service | Historical + live stream dorkar, TimescaleDB e sob stored ✅ |

```
Redis   → latest candle only    → REST → curl
TimescaleDB → all candles       → WS Service → CLI
```

---

## Multi-Protocol Breakdown

| Protocol | Where Used | Why |
|---|---|---|
| **WebSocket (client)** | Binance → Ingestion Service | Live raw trade feed consume korte |
| **Kafka** | Ingestion → OHLC Processor | Buffer + rate control, no data loss, partitioned by pair |
| **REST (HTTP)** | Public API | Latest candle snapshot from Redis (curl/browser) |
| **gRPC (HTTP/2)** | REST Service → WS Service | Internal low-latency microservice hop |
| **WebSocket (server)** | WS Service → CLI Tool | Live candle streaming to consumers |

---

## Repository Structure

```text
real-time-trade-engine/
│
├── ARCHITECTURE.md                  # System design (this file)
├── trade.proto                      # Shared gRPC schema contract
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
├── ws-service/                      # gRPC server + WS broadcaster + TimescaleDB reader
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
- **What it does**: Connects to Binance live trade streams for multiple pairs, receives raw trades `{ price, qty, time }`, publishes each trade to Kafka with pair as key so same pair always goes to same partition
- **Tech**: Node.js, `ws`, `kafkajs`
- **Pairs**: BTCUSDT, ETHUSDT, SOLUSDT

### 2. OHLC Processor Service
- **Role**: Kafka consumer + candle calculator + storage writer
- **What it does**: Consumes raw trades from Kafka partitions, accumulates trades per interval per pair, calculates OHLCV candles on interval close, stores all candles in TimescaleDB, caches only latest candle per pair in Redis
- **Tech**: Node.js, `kafkajs`, `pg` (TimescaleDB), `ioredis`

### 3. REST Service
- **Role**: Public snapshot API + gRPC client
- **What it does**: Exposes `GET /api/v1/candles/:pair` — reads latest candle from Redis and returns instantly. Also acts as gRPC client to forward any triggered events to WS service
- **Tech**: Node.js, Express, `@grpc/grpc-js`, `ioredis`

### 4. WS Service
- **Role**: gRPC server + TimescaleDB reader + WebSocket broadcaster
- **What it does**: Acts as gRPC server to receive internal messages. Reads candles from TimescaleDB, maintains open WebSocket connections with CLI subscribers, broadcasts live candles to correct pair channels
- **Tech**: Node.js, `ws`, `@grpc/grpc-js`, `pg`

---

## OHLC Calculation (No Exchange Klines)

Raw trades from Binance are accumulated per time window per pair:

```text
Incoming trades for BTCUSDT (1 minute window):
10:00:00 → price: 67420, qty: 0.5   ← Open
10:00:15 → price: 67430, qty: 1.2   ← High
10:00:30 → price: 67400, qty: 0.3   ← Low
10:00:59 → price: 67410, qty: 0.8   ← Close

Calculated OHLCV candle:
O (Open)   = 67420  ← first trade price in window
H (High)   = 67430  ← highest price in window
L (Low)    = 67400  ← lowest price in window
C (Close)  = 67410  ← last trade price in window
V (Volume) = 2.8    ← total qty traded in window
```

Supported intervals: `1m`, `5m`, `15m`, `1h`

---

## Data Flow (Step by Step)

```text
1.  Binance sends raw trades every ~100ms per pair
2.  Ingestion service receives trades via WebSocket
3.  Publishes to Kafka topic "raw-trades" with pair as key
4.  Kafka routes same pair to same partition (ordered)
5.  OHLC Processor consumes from Kafka partitions
6.  Accumulates trades per interval per pair in memory
7.  On interval close → calculates OHLCV candle
8.  Stores candle in TimescaleDB (historical record)
9.  Caches latest candle in Redis (fast snapshot access)
10. CLI user subscribes via WS Service
11. WS Service reads from TimescaleDB → pushes to CLI
12. curl/browser hits REST Service → reads Redis → returns snapshot
```

---

## Public API

### REST Endpoints (Redis backed — snapshot only)

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

### CLI Tool (TimescaleDB backed — live stream)

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
             +--------------+--------------+
             |                             |
      ALB (REST API)               NLB (WebSocket)
             |                             |
        Private Subnet               Private Subnet
             |                             |
      +-------------+             +-------------+
      | ECS Fargate |             | ECS Fargate |
      | rest-service| ── gRPC ──► |  ws-service |
      +-------------+             +-------------+
             |                             |
             |                    +--------+--------+
             |                    |                 |
             v                    v                 v
        ElastiCache          TimescaleDB      CLI consumers
         (Redis)              (RDS/EC2)
```

- **VPC**: Private subnets for all services, public only for load balancers
- **ECS Fargate**: Serverless containers, no EC2 management
- **AWS Cloud Map**: Internal DNS for gRPC (`ws-service.internal:50051`)
- **ALB**: HTTP traffic → REST service (snapshot queries)
- **NLB**: TCP persistent connections → WS service (live streaming)
- **ElastiCache**: Managed Redis (latest candle cache)
- **TimescaleDB**: Historical OHLC candle storage
- **Terraform**: Entire infrastructure as code (`terraform apply`)

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Language | Node.js |
| Message Queue | Apache Kafka (`kafkajs`) |
| Cache | Redis (`ioredis`) |
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