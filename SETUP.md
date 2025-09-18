# 🚀 Trade Copier Setup Guide

This guide will walk you through setting up the complete Trade Copier system from scratch.

## 📋 Prerequisites

- Node.js 18+ installed
- Git installed
- A Supabase account
- Docker and Docker Compose installed (for VPS infrastructure)
- An Oracle Cloud account (for production VPS deployment)

---

## 🗄️ Database Setup (Supabase)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click "New Project"
3. Choose your organization and enter project details:
   - **Name**: `trade-copier`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
4. Wait for the project to be created (2-3 minutes)

### Step 2: Get API Keys

1. In your Supabase dashboard, go to **Settings > API**
2. Copy these values (you'll need them later):
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public key**: `eyJ...` (starts with eyJ)
   - **service_role secret key**: `eyJ...` (starts with eyJ, different from anon)

### Step 3: Database Schema Setup

The database schema will be automatically created when you run the application for the first time. The system includes:

- **Users table**: User profiles and subscription info
- **MT Accounts table**: Encrypted MT4/MT5 credentials
- **Copy Rules table**: Master-to-slave copying configuration
- **Trades table**: Real-time trade data
- **Copy Operations table**: Execution tracking
- **VPS Containers table**: Infrastructure monitoring
- **System Events table**: Logging and alerts

---

## 🏭 Production Overview (read first)

- **Web + DB are not enough to place trades.** You also need a "worker layer" that logs into brokers and executes trades. This can be:
  - Option A (recommended): Windows Server VPS running real MT4/MT5 terminals with the TradeCopier EA.
  - Option B: Linux Docker containers using Wine + broker terminal binaries (you must supply binaries; licensing is your responsibility).
- For clarity: the web app (Next.js) + Supabase handle auth, config, copy rules, and events; the workers do the actual broker login/trade execution.

If you only deploy the web, trades will not be copied.

---

## 🔧 Application Setup

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd copy-trader

# Install dependencies
npm install
```

### Step 2: Environment Configuration

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Security (Generate secure random strings)
ENCRYPTION_KEY=your_32_character_encryption_key_here_123456
JWT_SECRET=your_jwt_secret_here_minimum_32_characters

# WebSocket Configuration
WEBSOCKET_PORT=3001

# VPS Management (Oracle Cloud - Optional for development)
ORACLE_CLOUD_API_KEY=your_oracle_cloud_api_key_here
ORACLE_CLOUD_REGION=us-phoenix-1

# Docker Registry (Optional for production)
DOCKER_REGISTRY_URL=your_docker_registry_url_here
DOCKER_REGISTRY_TOKEN=your_docker_registry_token_here
```

**Important Notes:**
- Replace all `your_*_here` values with actual values
- Generate a random 32-character string for `ENCRYPTION_KEY`
- Generate a random 32+ character string for `JWT_SECRET`
- You can generate secure keys using: `openssl rand -base64 32`

### Step 3: Test the Application

```bash
# Start development server
npm run dev

# Open http://localhost:3000 in your browser
```

You should see the Trade Copier landing page. Try:
1. Creating an account (Register)
2. Logging in
3. Accessing the dashboard

---

## 🐳 VPS Infrastructure Setup

### Development Setup (Local Docker)

For development and testing, you can run the VPS infrastructure locally:

```bash
# Start all services including MT4 containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

This starts:
- **Web Application** (port 3000)
- **WebSocket Server** (port 3001)
- **Redis** (port 6379)
- **Monitoring Stack** (Prometheus: 9090, Grafana: 3002)
- **Nginx Load Balancer** (port 80)

### Production Setup (Oracle Cloud) — Step by step (beginner‑friendly)

This will run everything on ONE VM (web + websocket + workers). Users do not install anything.

1) Create a server (Oracle Compute)
- Image: Ubuntu 22.04 LTS
- Shape: 2–4 OCPU, 8–16 GB RAM (increase later)
- Open inbound ports: 80, 443 (and 3001 only if you skip nginx proxying WS)

2) Install Docker and Compose
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
sudo apt-get install -y docker-compose-plugin
docker --version && docker compose version
```

3) Download the code
```bash
sudo mkdir -p /opt/trade-copier && sudo chown $USER:$USER /opt/trade-copier
cd /opt/trade-copier
git clone https://github.com/PatrykBr/trade-copy-2 .
```

4) Create the environment file (.env)
```bash
cat > .env << 'EOF'
# Supabase (get from Supabase → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# Security (generate long random strings)
ENCRYPTION_KEY=<32+ char random>
JWT_SECRET=<32+ char random>

# WebSocket
WEBSOCKET_PORT=3001

# Optional: secure token for workers pushing to API
WORKER_INGEST_TOKEN=<random_secret>
EOF
```
If you ever edit `.env` on Windows, re‑create it on Linux as above (Windows Notepad can add a BOM that breaks Compose).

5) First run — core services
```bash
docker compose pull || true
docker compose up -d redis websocket nginx web
docker compose logs -f web | sed -n '1,120p'
```
If this errors:
- Recreate `.env` exactly as step 4 (UTF‑8, no BOM).
- Rebuild web without cache: `docker compose build web --no-cache && docker compose up -d web`.
- Use `docker compose logs <service>` to view errors.

6) HTTPS (choose ONE)
- Cloudflare: point your domain to the VM, set SSL mode to Full, leave origin on port 80.
- Let’s Encrypt: install `certbot`, create certs, mount them into `nginx/ssl`, update `nginx/nginx.conf`, then `docker compose restart nginx`.

7) Supabase production settings
- Settings → Auth → SMTP: configure SES/SendGrid for emails.
- Settings → Auth → URL config:
  - Site URL: `https://YOUR_DOMAIN`
  - Allowed redirects: `https://YOUR_DOMAIN/auth/verify`
- Copy the Project URL / anon / service_role into `.env` (step 4) and `docker compose restart web`.

---

## 🧩 Worker Layer (required for real copying) — Single VM, automatic, no user installs

To actually place trades at brokers, you need per-account workers that log into MT4/MT5 and relay trades. For a single-VM, cost‑efficient, fully managed setup (no user installs), use Linux Docker workers running MT4 under Wine. The web app and workers run on the same Oracle VM.

What you must supply (once):
- Broker terminal binary (`terminal.exe`) for each broker you support.
- Compiled EA: build `docker/mt4-ea/TradeCopier.mq4` in MetaEditor to produce `TradeCopier.ex4` (or an MT5 `.ex5` counterpart if you target MT5).

One‑time preparation on the server:
1) Copy artifacts into the repo on the server:
```bash
cp /path/to/terminal.exe docker/mt4-ea/terminal.exe
cp /path/to/TradeCopier.ex4 docker/mt4-ea/TradeCopier.ex4
```
2) (Optional) Build the MT4 image so it’s cached:
```bash
docker compose build mt4-template
```

Automatic worker deployment (per account):
When a user adds an account in the web UI, the platform should deploy a dedicated worker container for that account. You can trigger this via the existing API:

- The web UI already posts to `/api/vps` (action `deploy`). Ensure your `.env` has a strong `SUPABASE_SERVICE_ROLE_KEY` and set a secret `WORKER_INGEST_TOKEN` for secure ingestion.
- The deploy endpoint will:
  - Pick (or create) a container slot.
  - Start a worker using `mt4-template` with these environment variables:
    - `ACCOUNT_ID` (value = `mt_accounts.id`)
    - `API_KEY` (random secret used by the worker to authenticate to the API)
    - `MT4_LOGIN`, `MT4_PASSWORD`, `MT4_SERVER`
    - `API_ENDPOINT` (e.g. `https://YOUR_DOMAIN/api`)
    - `WEBSOCKET_ENDPOINT` (e.g. `wss://YOUR_DOMAIN/socket.io` if proxied)

Manual run (for first validation):
```bash
export ACCOUNT_ID=<uuid_from_mt_accounts>
export API_KEY=<random_secret>
export MT4_LOGIN=<login>
export MT4_PASSWORD=<password>
export MT4_SERVER=<BrokerName-Server>
docker compose --profile template up -d mt4-template
docker compose logs -f mt4-template | sed -n '1,200p'
```

Notes:
- The repository does not include broker terminals or compiled EAs. You must add them to `docker/mt4-ea/`.
- Wine is widely used for MT4 automation on Linux. Some broker builds can be sensitive to Wine updates; if a particular terminal misbehaves, pin its version in your image and test.

---

## 🔐 Security Configuration

### Step 1: Supabase Row Level Security

The system automatically sets up RLS policies, but verify they're active:

1. Go to **Supabase Dashboard > Authentication > Policies**
2. Ensure all tables have RLS enabled
3. Verify policies exist for users, mt_accounts, copy_rules, trades

### Step 2: API Security

The system includes:
- JWT authentication for API routes
- Encrypted storage of MT4/MT5 credentials
- CORS protection
- Rate limiting (in production)

### Step 3: SSL/TLS (Production)

For production deployment:
1. Set up SSL certificates (Let's Encrypt recommended)
2. Configure Nginx with SSL termination
3. Update CORS settings for your domain

---

## 📊 Monitoring Setup

### Development Monitoring

Access these URLs when running locally:
- **Grafana Dashboard**: http://localhost:3002 (admin/admin)
- **Prometheus Metrics**: http://localhost:9090

### Production Monitoring

The system includes:
- **Health Checks**: Automatic service monitoring
- **Metrics Collection**: Performance and business metrics
- **Alerting**: Email/Slack notifications for issues
- **Log Aggregation**: Centralized logging

---

## 🧪 Testing Your Setup

### Step 1: User Registration Flow
1. Go to http://localhost:3000
2. Click "Get Started" → Register
3. Create a test account
4. Verify you can log in
5. Check the dashboard loads

### Step 2: Account Management
1. Go to **Dashboard > Accounts**
2. Try adding a demo MT4/MT5 account
3. Use test credentials:
   - **Login**: `123456`
   - **Password**: `testpass`
   - **Server**: `Demo-Server`
   - **Platform**: MT4
   - **Type**: Demo

### Step 3: Copy Rules
1. Add at least 2 accounts (1 master, 1 slave)
2. Go to **Dashboard > Copy Rules**
3. Create a copy rule between them
4. Verify the configuration saves

### Step 4: Real-Time Updates
1. Open browser dev tools → Network tab
2. Look for WebSocket connection
3. Should see "ws://localhost:3001" connected
4. Make changes and verify real-time updates

---

## 🚨 Troubleshooting

### Common Issues

#### "Row Level Security" Error
```
Error: new row violates row-level security policy
```
**Solution**: The database trigger should handle user creation automatically. If this persists:
1. Check Supabase logs
2. Verify RLS policies are correct
3. Ensure the trigger function exists

#### WebSocket Connection Failed
```
WebSocket connection failed
```
**Solution**:
1. Ensure WebSocket server is running (port 3001)
2. Check firewall settings
3. Verify JWT_SECRET is set correctly

#### Docker Issues
```
Container failed to start
```
**Solution**:
1. Check Docker is running
2. Verify port availability
3. Check Docker logs: `docker compose logs service-name`
4. If you see `unexpected character "�"` reading `.env`, recreate it as UTF‑8 (no BOM) on Linux or with PowerShell: `"..." | Out-File -FilePath .env -Encoding utf8`

#### Build Errors
```
Module not found or compilation errors
```
**Solution**:
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. Check Node.js version (18+ required)

### Getting Help

1. **Check Logs**:
   ```bash
   # Application logs
   npm run dev
   
   # Docker logs
   docker-compose logs -f
   
   # Supabase logs (in dashboard)
   ```

2. **Database Issues**: Check Supabase dashboard > Logs
3. **API Issues**: Check browser dev tools > Network tab

---

## 🎯 Production Deployment Checklist

Before going live:

### Security
- [ ] Change all default passwords
- [ ] Generate secure encryption keys
- [ ] Set up SSL certificates
- [ ] Configure CORS for your domain
- [ ] Enable rate limiting
- [ ] Set up database backups

### Performance
- [ ] Configure CDN (Cloudflare recommended)
- [ ] Set up database connection pooling
- [ ] Enable caching (Redis)
- [ ] Configure auto-scaling

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure uptime monitoring
- [ ] Set up log aggregation
- [ ] Create alerting rules

### Business
- [ ] Set up payment processing
- [ ] Configure user limits
- [ ] Set up customer support tools
- [ ] Create terms of service

---

## 📞 Support

If you encounter issues:

1. **Check this guide** first
2. **Search the logs** for error messages
3. **Check Supabase status**: status.supabase.com
4. **Verify environment variables** are set correctly

Remember: This is a complex system with many moving parts. Take it step by step and verify each component works before moving to the next.

---

## 🚀 Next Steps

Once everything is working:

1. **Customize the UI** to match your brand
2. **Add payment processing** (Stripe recommended)
3. **Set up customer support** tools
4. **Configure monitoring** and alerting
5. **Plan your scaling** strategy
6. **Test with real MT4/MT5 accounts**

Good luck with your Trade Copier platform! 🎯

---

## 📂 About `docker/mt4-ea/`

This folder contains a scaffold for running MT4 under Linux (Wine) inside Docker:
- `TradeCopier.mq4`: EA source. Compile in MetaEditor to produce `TradeCopier.ex4` (not included).
- `TradeCopier.ex4`: must be provided by you after compiling.
- `start_mt4.sh`, `supervisord.conf`, `trade_monitor.py`: helper scripts/process supervision.

What you must do for production:
- For Windows workers (recommended): Copy/compile the EA on Windows and attach to charts. You can ignore this Docker folder.
- For Linux containers: Add your broker terminal executable (`terminal.exe`) and compiled EA (`TradeCopier.ex4`) into this directory before building the image. Then launch workers with the `mt4-template` service and proper environment variables.

---

## 🔗 Repository

Production documentation and code live here: [PatrykBr/trade-copy-2](https://github.com/PatrykBr/trade-copy-2)

When deploying on servers:
```bash
git clone https://github.com/PatrykBr/trade-copy-2 /opt/trade-copier
cd /opt/trade-copier
# create .env (see above) then
docker compose up -d nginx websocket web
```