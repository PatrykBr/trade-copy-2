# 🎯 Trade Copier - Fully Managed MT4/MT5 Copy Trading Platform

A production-ready, centralized trade copier system that enables millisecond-latency trade replication across multiple MT4/MT5 accounts without requiring users to install or manage their own Expert Advisors.

## ✨ Key Features

- **⚡ Ultra-Low Latency**: 1-2ms trade detection, 10-50ms execution
- **🌐 Fully Managed**: 100% web-based, no software installation
- **🔒 Bank-Level Security**: AES-256 encryption for credentials
- **📊 Real-Time Monitoring**: Live dashboards and analytics
- **🚀 Auto-Scaling**: Oracle Cloud VPS infrastructure
- **🔄 Multi-Account**: Copy from one master to multiple slaves
- **🛡️ Risk Management**: Advanced lot sizing and filtering

## 🏗️ Architecture

```
┌───────────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│  Next.js Web App  │    │  VPS Farm (Docker)   │    │ Broker Servers  │
│ • User Dashboard  │◄──►│ • MT4/MT5 Containers │◄──►│ • Live Accounts │
│ • Account Setup   │    │ • Trade Detection    │    │ • Demo Accounts │
│ • Copy Rules      │    │ • Auto Execution     │    │ • Market Data   │
│ • Monitoring      │    │ • Health Monitoring  │    │                 │
└───────────────────┘    └──────────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Supabase account
- Oracle Cloud account (for production)

### 1. Clone and Install

```bash
git clone <repository-url>
cd copy-trader
npm install
```

### 2. Environment Setup

Create a `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Security
ENCRYPTION_KEY=your_32_character_encryption_key
JWT_SECRET=your_jwt_secret

# Infrastructure
WEBSOCKET_PORT=3001
ORACLE_CLOUD_API_KEY=your_oracle_api_key
ORACLE_CLOUD_REGION=us-phoenix-1
```

### 3. Database Setup

The database schema is automatically created via Supabase migrations. The system includes:

- **Users**: Authentication and profiles
- **MT Accounts**: MT4/MT5 account credentials (encrypted)
- **Copy Rules**: Master-to-slave copying configuration
- **Trades**: Real-time trade data and history
- **Copy Operations**: Execution tracking and performance
- **VPS Containers**: Infrastructure monitoring

### 4. Development

```bash
# Start development server
npm run dev

# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

### 5. Production Deployment

```bash
# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production
```

## 📁 Project Structure

```
copy-trader/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── trades/        # Trade management
│   │   │   ├── copy-engine/   # Copy execution engine
│   │   │   └── vps/           # VPS management
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Main application
│   │   └── page.tsx           # Landing page
│   ├── components/            # React components
│   │   ├── ui/               # Base UI components
│   │   └── layout/           # Layout components
│   └── lib/                   # Utilities and configuration
│       ├── supabase.ts       # Database client
│       ├── encryption.ts     # Credential encryption
│       ├── auth.ts           # Authentication helpers
│       ├── websocket-server.ts # Real-time server
│       └── websocket-client.ts # Real-time client hooks
├── docker/
│   └── mt4-ea/               # MT4/MT5 container
│       ├── Dockerfile        # Container definition
│       ├── TradeCopier.mq4   # Expert Advisor
│       ├── trade_monitor.py  # Python monitoring service
│       └── supervisord.conf  # Process management
├── scripts/
│   └── deploy.sh             # Deployment automation
├── docker-compose.yml        # Local development stack
└── README.md
```

## 🔧 Configuration

### User Flow

1. **Registration**: Users create accounts via web interface
2. **Account Setup**: Add MT4/MT5 credentials (encrypted and stored securely)
3. **Copy Rules**: Configure master-to-slave relationships with risk parameters
4. **Deployment**: System automatically deploys accounts to VPS infrastructure
5. **Monitoring**: Real-time dashboard shows trades, performance, and system health

### Copy Rule Configuration

```typescript
{
  master_account_id: "uuid",
  slave_account_id: "uuid", 
  lot_multiplier: 1.0,        // Scale trade sizes
  max_lot_size: 10.0,         // Risk limit
  risk_percentage: 2.0,       // % of account per trade
  copy_pending_orders: true,  // Include pending orders
  copy_stop_loss: true,       // Copy SL levels
  copy_take_profit: true,     // Copy TP levels
  symbol_filter: ["EURUSD"], // Limit to specific symbols
  magic_number_filter: [123]  // Limit to specific EAs
}
```

## 🏭 Infrastructure

### VPS Management

The system uses Docker containers to run MT4/MT5 terminals:

- **Auto-scaling**: Containers spin up/down based on demand
- **Load balancing**: ~100 accounts per VPS container
- **Health monitoring**: Automatic restart on failures
- **Resource monitoring**: CPU, memory, and connection tracking

### Real-Time System

- **WebSocket**: Live trade updates and system events
- **Supabase Realtime**: Database change subscriptions
- **Event Broadcasting**: Multi-room message routing
- **Connection Health**: Ping/pong and automatic reconnection

### Security

- **Credential Encryption**: AES-256 encryption for MT4/MT5 passwords
- **Row-Level Security**: Database access control
- **JWT Authentication**: Secure API access
- **Audit Logging**: All operations tracked

## 📊 Monitoring & Analytics

### Dashboards

- **Account Status**: Connection health and balance tracking
- **Trade Performance**: P&L, win rates, and execution metrics
- **Copy Operations**: Success rates and latency monitoring
- **System Health**: VPS utilization and error tracking

### Metrics

- **Latency**: Trade detection and execution times
- **Reliability**: Uptime and error rates
- **Performance**: Throughput and resource usage
- **Business**: User growth and revenue metrics

## 🔌 API Reference

### Trade Management

```bash
# Create new trade
POST /api/trades
{
  "account_id": "uuid",
  "ticket": 12345,
  "symbol": "EURUSD",
  "trade_type": "BUY",
  "lot_size": 0.1,
  "open_price": 1.1234
}

# Get trades
GET /api/trades?account_id=uuid&limit=50
```

### Copy Engine

```bash
# Execute copy operation
POST /api/copy-engine
{
  "masterTradeId": "uuid",
  "copyRuleId": "uuid", 
  "operationType": "OPEN"
}

# Get copy operations
GET /api/copy-engine?limit=50
```

### VPS Management

```bash
# Deploy account to VPS
POST /api/vps
{
  "accountId": "uuid",
  "action": "deploy"
}

# Get VPS status
GET /api/vps
```

## 🚦 System Requirements

### Development

- **CPU**: 2+ cores
- **RAM**: 4GB+
- **Storage**: 10GB+
- **Network**: Stable internet connection

### Production

- **Web Tier**: 2+ CPU cores, 4GB RAM per instance
- **VPS Tier**: 4+ CPU cores, 8GB RAM per 100 accounts
- **Database**: Supabase Pro plan or higher
- **Storage**: 100GB+ for logs and data

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Load testing
npm run test:load
```

## 📈 Scaling

### Phase 1: Single VPS (0-100 accounts)
- Single Oracle Cloud VPS
- Manual deployment
- Basic monitoring

### Phase 2: VPS Cluster (100-10k accounts)
- Multiple VPS instances
- Load balancing
- Auto-scaling

### Phase 3: Multi-Region (10k+ accounts)
- Geographic distribution
- CDN integration
- Advanced orchestration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📜 License

This project is proprietary software. All rights reserved.

## 🆘 Support

- **Documentation**: [docs.tradecopy.system](https://docs.tradecopy.system)
- **Support**: [support@tradecopy.system](mailto:support@tradecopy.system)
- **Status**: [status.tradecopy.system](https://status.tradecopy.system)

## 🏆 Performance Targets

- **Trade Detection**: <2ms
- **Copy Execution**: <50ms  
- **System Uptime**: 99.9%
- **Data Accuracy**: 99.99%
- **Support Response**: <1 hour

---

**Built with ❤️ for professional traders who demand speed, reliability, and scalability.**