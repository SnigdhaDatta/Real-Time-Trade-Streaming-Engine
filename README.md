# Work in Progress

## Folder Structure (As per planned till now)
```text
multi-protocol-notification-engine/
│
├── ARCHITECTURE.md                  # System design specifications and topology
├── notification.proto               # Shared single-source gRPC schema contract
├── test-pipeline.sh                 # Local end-to-end multi-protocol test automation
│
├── terraform/                       # Infrastructure as Code (IaC) configuration
│   └── main.tf                      # AWS VPC, ECS Fargate, ALB/NLB automation script
│
├── rest-service/                    # Microservice A (Public API Entrypoint)
│   ├── Dockerfile                   # Isolated REST API multi-stage container config
│   ├── package.json                 # REST dependencies (Express, gRPC client dependencies)
│   └── server.js                    # REST server runtime and gRPC proxy client logic
│
└── ws-service/                      # Microservice B (Real-time Broadcast Hub)
    ├── Dockerfile                   # Isolated WebSocket server container configuration
    ├── package.json                 # WS dependencies (Native WebSockets, gRPC server)
    └── server.js                    # gRPC server controller and WebSocket map router
```
