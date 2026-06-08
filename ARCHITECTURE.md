# Open-Ended Notification-as-a-Service (NaaS) Microservices Engine

A high-performance, open-ended, and completely decoupled messaging utility architecture designed to ingest system events via public APIs and stream them to open client connections instantly. This infrastructure operates purely as a protocol routing engine, making it reusable by any external application, platform, or automated log pipeline.

## System Architecture

```text
       +---------------------------------------------+

       |         Third-Party App / Script            |
       |             (e.g., Kineq App)               |
       +---------------------------------------------+

                              |
                              | 1. HTTP REST POST
                              |    /api/v1/broadcast
                              v
       +---------------------------------------------+

       |            REST Microservice                |
       |              (gRPC Client)                  |
       +---------------------------------------------+

                              |
                              | 2. Internal gRPC Call
                              |    Port 50051 (Binary/HTTP-2)
                              v
       +---------------------------------------------+

       |          WebSocket Microservice             |
       |              (gRPC Server)                  |
       +---------------------------------------------+

                              |
                              | 3. Live WebSocket Push
                              |    Port 8080 (Persistent TCP)
                              v
       +---------------------------------------------+

       |          Client Terminal / Browser          |
       |             (Active Subscriber)             |
       +---------------------------------------------+
```

## Technical Core & Multi-Protocol Breakdown

The architecture implements three distinct layers of the network stack, selecting the optimal communication protocol for each specific microservices boundary:

1. **HTTP/REST (External Data Ingestion)**: Exposes an open public API endpoint (`POST /api/v1/broadcast`). Any external service or script can trigger an event by passing a generic payload containing a target `channelId`, custom `eventName`, and an abstract data `message`.
2. **gRPC over HTTP/2 (Low-Latency Internal Hop)**: The REST Service acts as a gRPC client, compiling the text payload into a highly compressed protocol-buffer binary format before routing it to the WebSocket Service. This maintains persistent, multi-plexed TCP pipelines inside the network to minimize inter-service communication latency.
3. **WebSockets (Stateful Real-Time Streaming)**: Maintains long-lived, continuous TCP streams with clients (frontend browsers, IoT devices, or CLI listeners) listening to specific channels via connection query parameters (e.g., `ws://.../?channel=dev-logs`).

## Microservices System Isolation

The platform is completely split into two independent codebases, allowing them to be packaged into isolated Docker containers and managed as separate lifecycle units:

### 1. The REST Microservice Gateway
* **Role**: Public API Entrypoint & Serialization Proxy.
* **Responsibilities**: Validates generic payload structures, initializes the gRPC client transport layer, compiles data inputs into strict protobuf shapes, and proxies events deeper into the private network.
* **Network Context**: Listens on public HTTP ports to receive external traffic.

### 2. The WebSocket Broadcast Hub
* **Role**: gRPC Targets Server & Stateful Stream Router.
* **Responsibilities**: Runs an active gRPC server to ingest processed internal messages, manages an in-memory map of real-time channel subscribers, and multiplexes concurrent data broadcasts out to specific target sockets.
* **Network Context**: Exposes an internal gRPC port strictly to the private subnet and a separate public port to handle streaming traffic.

## Cloud Infrastructure Topology (AWS via Terraform)

To ensure high availability and cloud automation, the entire system infrastructure is written programmatically as **Infrastructure as Code (IaC)** using **Terraform**.

* **Network Segmentation (VPC)**: Application runtimes are completely hidden inside isolated **Private Subnets** to defend against direct network attacks. Entrance boundaries are strictly regulated using firewalls (Security Groups).
* **Serverless Orchestration (AWS ECS Fargate)**: Containers are deployed as separate auto-scaling services on a serverless Fargate engine. If a specific channel receives massive subscriber traffic, AWS scales out *only* the WebSocket tasks, keeping infrastructure costs highly optimized.
* **Dynamic Service Discovery (AWS Cloud Map)**: Since Fargate container IPs shift dynamically during auto-scaling cycles, a private cloud DNS namespace (`notification.internal`) automatically registers active WebSocket containers. This allows the REST Service to reliably target the internal gRPC endpoint at `ws-service.notification.internal:50051`.
* **Protocol-Specific Routing Layer**:
    * **AWS Application Load Balancer (ALB)** manages public HTTP routing and health checks for incoming REST requests.
    * **AWS Network Load Balancer (NLB)** handles stateful Layer 4 TCP pass-through configurations to keep long-lived WebSocket pipelines open without connection timeouts.
