# PhantomDraw - Deployment Guide

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [CI/CD Workflow](#cicd-workflow)
- [Monitoring & Alerts](#monitoring--alerts)
- [Versioned Release & Rollback](#versioned-release--rollback)
- [Health Checks & Verification](#health-checks--verification)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Component | Version | Notes |
|-----------|---------|-------|
| Node.js | v20+ | Required for both frontend and backend |
| npm | v9+ | Comes with Node.js |
| Redis | 7+ | Used by BullMQ for task queues |
| SQLite | (built-in) | Default database; migrate to PostgreSQL for production |
| Docker & Docker Compose | v20+ / v2 | Only needed for containerized deployment |
| MinIO or S3-compatible storage | - | Required for image storage |

---

## Environment Variables

### Backend (`backend/.env`)

Copy the example and fill in your values:

```bash
cd backend
cp .env.example .env
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | Yes | `3001` | Backend API listen port |
| `NODE_ENV` | Yes | `development` | `development` or `production` |
| `APP_VERSION` | No | `dev` | Current deployment version used for metrics, release tracking, and rollback |
| `DB_TYPE` | Yes | `sqlite` | Database type |
| `DB_DATABASE` | Yes | `database.sqlite` | SQLite file path (relative to backend root) |
| `REDIS_HOST` | Yes | `127.0.0.1` | Redis server host |
| `REDIS_PORT` | Yes | `6379` | Redis server port |
| `REDIS_PASSWORD` | No | - | Redis password (if auth enabled) |
| `JWT_SECRET` | **Yes** | - | Secret key for signing JWT tokens. **Must be a strong random string in production.** |
| `JWT_EXPIRES_IN` | No | `7d` | JWT token expiration |
| `ADMIN_JWT_SECRET` | **Yes** | - | Separate secret for admin JWT tokens |
| `BACKEND_PUBLIC_URL` | No | `http://localhost:3001` | Public backend URL reachable by the browser for generated image links |
| `BOOTSTRAP_ADMIN_USERNAME` | No | - | Initial superadmin username (only used when admin table is empty) |
| `BOOTSTRAP_ADMIN_PASSWORD` | No | - | Initial superadmin password |
| `S3_ENDPOINT` | Yes | `http://127.0.0.1:9000` | S3/MinIO endpoint. Supports a full URL or hostname only |
| `S3_PORT` | No | `9000` | Port used when `S3_ENDPOINT` is configured as a hostname only |
| `S3_USE_SSL` | No | `false` | Enable SSL for S3 connection |
| `S3_ACCESS_KEY` | Yes | - | S3 access key |
| `S3_SECRET_KEY` | Yes | - | S3 secret key |
| `S3_BUCKET` | Yes | `phantomdraw` | S3 bucket name |
| `AI_API_URL` | Yes | `http://localhost:7860` | AI model provider URL (Stable Diffusion API / OpenAI-compatible endpoint) |
| `AI_API_KEY` | No | - | API key for the AI provider (if required) |
| `CORS_ORIGIN` | No | `http://localhost:4322` | Allowed CORS origin |

### Frontend (`frontend/.env.local`)

Copy the example and fill in your values:

```bash
cd frontend
cp .env.example .env.local
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:3001/api` | Backend API base URL |
| `NEXT_PUBLIC_WS_URL` | Yes | `ws://localhost:3001` | WebSocket URL for real-time task progress |

---

## Local Development

### 1. Start Redis

Redis is required for BullMQ task queues. Install and start it:

```bash
# macOS
brew install redis && brew services start redis

# Ubuntu/Debian
sudo apt install redis-server && sudo systemctl start redis

# Or via Docker (no install needed)
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### 2. Start the Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your values (at minimum: JWT_SECRET, S3 credentials, AI_API_URL)
# Local MinIO example:
# BACKEND_PUBLIC_URL=http://localhost:3001
# S3_ENDPOINT=http://127.0.0.1:19000
# S3_ACCESS_KEY=minioadmin
# S3_SECRET_KEY=minioadmin123
# S3_BUCKET=phantomdraw
npm run start:dev
```

The API will be available at `http://localhost:3001`. The `start:dev` script uses NestJS watch mode for auto-reload.

### 3. Start the Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

The frontend dev server runs at `http://localhost:4322`.

### 4. Create the First Admin Account

On first run with an empty database, set `BOOTSTRAP_ADMIN_USERNAME` and `BOOTSTRAP_ADMIN_PASSWORD` in `backend/.env`. The backend will create the initial superadmin on startup. **Remove these variables after the first successful login.**

---

## Docker Deployment

The `docker-compose.yml` at the project root provides a single-command deployment for the core app stack.

### Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `redis` | `redis:7-alpine` | 6379 | Task queue broker for BullMQ |
| `minio` | `minio/minio` | 9000 / 9001 | S3-compatible object storage and console |
| `backend` | Built from `backend/Dockerfile` | 3008 | NestJS API + WebSocket server |
| `frontend` | Built from `frontend/Dockerfile` | 3000 | Next.js app (standalone mode) |

Monitoring services (`prometheus`, `alertmanager`, and `grafana`) now live behind the `monitoring` profile and only start when explicitly requested.

### Quick Start

```bash
# From the project root
cp .env.example .env
docker compose up -d --build
```

This will:
1. Build the backend and frontend images
2. Start Redis, MinIO, backend, and frontend containers
3. Create persistent volumes for Redis, MinIO, and the SQLite database

Access the app at `http://localhost:3000`.

To start monitoring as well:

```bash
docker compose --profile monitoring up -d
```

### Customizing Environment Variables

The `docker-compose.yml` contains inline environment variables with sensible defaults for local use. For production, override them:

**Option A: Create a `.env` file** at the project root (`docker compose` auto-reads it):

```env
DB_DATABASE=/app/data/database.sqlite
JWT_SECRET=your-production-jwt-secret
ADMIN_JWT_SECRET=your-production-admin-secret
BACKEND_PUBLIC_URL=https://api.example.com
CORS_ORIGIN=https://app.example.com
NEXT_PUBLIC_API_URL=https://api.example.com/api
NEXT_PUBLIC_WS_URL=wss://api.example.com
S3_ACCESS_KEY=your-s3-key
S3_SECRET_KEY=your-s3-secret
```

The frontend image reads `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` during `docker compose build`, so rebuild the frontend image whenever those values change.

### Persistent Data

| Volume | Container | Path | Purpose |
|--------|-----------|------|---------|
| `redis_data` | redis | `/data` | Redis persistence |
| `minio_data` | minio | `/data` | Object storage persistence |
| `backend_data` | backend | `/app/data` | SQLite database file |

To reset all data:

```bash
docker-compose down -v
```

### Useful Commands

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f prometheus

# Rebuild a single service
docker-compose up -d --build backend

# Stop everything
docker-compose down

# Stop and remove volumes (destroys data)
docker-compose down -v
```

---

## Production Deployment

### Architecture Overview

```
                    ┌─────────────┐
                    │   CDN/WAF   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Load       │
                    │  Balancer   │
                    └──┬───────┬──┘
                       │       │
              ┌────────▼─┐  ┌──▼────────┐
              │ Frontend  │  │  Backend   │
              │ (Next.js) │  │  (NestJS)  │
              │ Vercel /  │  │  ECS / K8s │
              │ Amplify   │  │            │
              └───────────┘  └──┬────┬───┘
                                │    │
                    ┌───────────▼┐  ┌▼──────────┐
                    │ PostgreSQL │  │   Redis    │
                    │  (RDS /    │  │ (Elasti-   │
                    │  Supabase) │  │  Cache)    │
                    └────────────┘  └────────────┘
```

### Frontend (Next.js)

**Recommended**: Vercel or AWS Amplify for automatic edge caching and global CDN.

- The Dockerfile uses Next.js **standalone output mode** for minimal container size.
- If self-hosting, ensure `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` point to the public-facing backend domain (not internal Docker hostnames).

### Backend (NestJS + BullMQ)

**Recommended**: AWS ECS (Fargate), Google Cloud Run, or Kubernetes.

Key considerations:

- **Separate API and Worker processes**: The `GenerateProcessor` handles CPU/GPU-intensive image generation. For high traffic, deploy dedicated worker instances that only run the BullMQ worker, separate from the API/WebSocket servers.
- **WebSocket support**: Ensure your load balancer supports WebSocket connections (sticky sessions or WebSocket-aware routing).
- **CORS**: Set `CORS_ORIGIN` to your frontend domain in production.
- **Security**: Change `JWT_SECRET` and `ADMIN_JWT_SECRET` to strong, unique random strings. Never use the defaults.

### Database Migration (SQLite to PostgreSQL)

For production, migrate from SQLite to PostgreSQL for concurrent write support:

1. Install the PostgreSQL driver:
   ```bash
   cd backend && npm install pg
   ```
2. Update `backend/.env`:
   ```env
   DB_TYPE=postgres
   DB_HOST=your-rds-endpoint.amazonaws.com
   DB_PORT=5432
   DB_USERNAME=phantomdraw
   DB_PASSWORD=your-db-password
   DB_DATABASE=phantomdraw
   ```
3. The TypeORM entities will auto-sync the schema on startup (development mode). For production, generate and run migrations:
   ```bash
   npm run typeorm migration:generate -- -n InitSchema
   npm run typeorm migration:run
   ```

### Storage (S3/MinIO)

- **AWS S3** or **Cloudflare R2** for production image storage.
- Place a CDN (CloudFront, Cloudflare) in front of S3 for fast image delivery to the gallery.
- Configure CORS on the S3 bucket if the frontend uploads directly.

### AI Generation Provider

Connect the backend to a production-grade inference provider:

| Provider | Use Case |
|----------|----------|
| Replicate API | Managed, pay-per-use, wide model selection |
| RunPod | GPU cloud, good for custom ComfyUI/A1111 |
| OpenAI DALL-E 3 API | Simple API, high quality |
| Self-hosted (EC2 g4dn/g5) | Full control, highest cost/complexity |

Set `AI_API_URL` and `AI_API_KEY` accordingly.

### HTTPS & Domain

- Use a reverse proxy (Nginx, Caddy, or cloud load balancer) to terminate TLS.
- Caddy example (auto-HTTPS):
  ```
  yourdomain.com {
      reverse_proxy frontend:3000
  }

  api.yourdomain.com {
      reverse_proxy backend:3008
  }
  ```

---

## CI/CD Workflow

The repository now includes a GitHub Actions workflow at `.github/workflows/ci-cd.yml`.

### Default Pipeline Stages

1. Backend `npm ci`
2. Backend `lint`, unit tests, E2E tests, and `build`
3. Frontend `npm ci`
4. Frontend `lint` and `build`
5. Docker image build validation
6. Release artifact packaging on `main` / `master` pushes

### Recommended Usage

- Make the workflow a required PR check before merge.
- Allow only CI-validated commits to enter the deployment path.
- Set `APP_VERSION` to a Git SHA, semantic version, or artifact tag in production.

---

## Monitoring & Alerts

### Layout

The project now includes `ops/monitoring/`:

- `prometheus/prometheus.yml`: scrapes backend `api/metrics`
- `prometheus/alerts.yml`: includes backend down, frontend down, and backend high-memory alerts
- `alertmanager.yml`: central alert routing config
- `grafana/`: provisioned Prometheus datasource and `PhantomDraw Overview` dashboard

### Start Monitoring Stack

```bash
docker-compose up -d prometheus alertmanager grafana
```

### Default URLs

- Prometheus: `http://localhost:9090`
- Alertmanager: `http://localhost:9093`
- Grafana: `http://localhost:3009`

### Alerting Notes

- The default `alertmanager.yml` uses a placeholder webhook and must be replaced with a real notification endpoint in production.
- Extend the baseline rules with Redis latency, BullMQ backlog, and generation failure rate alerts before public launch.

---

## Versioned Release & Rollback

The project now includes standard scripts under `ops/bin/`:

- `deploy.sh <version>`: creates a versioned release directory, switches the `current` symlink, and redeploys
- `rollback.sh`: switches back to the `previous` release and restarts containers
- `healthcheck.sh`: verifies liveness and readiness probes

### Recommended Release Flow

```bash
export APP_VERSION=$(git rev-parse --short HEAD)
bash ops/bin/deploy.sh "$APP_VERSION"
bash ops/bin/healthcheck.sh
```

### Rollback Flow

```bash
bash ops/bin/rollback.sh
bash ops/bin/healthcheck.sh
```

### Directory Convention

- `ops/releases/current`: current live version
- `ops/releases/previous`: previous stable version
- `ops/releases/<version>`: archived release payload by version

---

## Health Checks & Verification

### Verify Services

```bash
# Backend liveness
curl http://localhost:3001/api/health/live

# Backend readiness
curl http://localhost:3001/api/health/ready

# Prometheus metrics
curl http://localhost:3001/api/metrics

# Frontend
curl -I http://localhost:3000

# Redis
redis-cli ping  # Should return PONG

# WebSocket (requires wscat)
npx wscat -c ws://localhost:3001
```

### Docker Health Checks

Check container status:

```bash
docker-compose ps
```

`backend`, `frontend`, and `redis` should show `healthy` or `Up`. Check logs for errors:

```bash
docker-compose logs --tail=50 backend
docker-compose logs --tail=50 frontend
docker-compose logs --tail=50 prometheus
docker-compose logs --tail=50 alertmanager
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend can't connect to Redis | Ensure Redis is running and `REDIS_HOST`/`REDIS_PORT` are correct. In Docker, use `redis` as the host. |
| Frontend shows API errors | Verify `NEXT_PUBLIC_API_URL` is reachable from the browser. Check CORS settings on the backend. |
| WebSocket connection fails | Ensure `NEXT_PUBLIC_WS_URL` uses `ws://` (not `http://`). Check that the load balancer supports WebSocket upgrade. |
| SQLite "database is locked" | SQLite doesn't handle concurrent writes well. Migrate to PostgreSQL for production. |
| Image generation hangs | Check `AI_API_URL` is reachable from the backend container. Check BullMQ dashboard or Redis for stuck jobs. |
| Docker build fails | Run `docker-compose build --no-cache` to force a clean rebuild. Check that `npm ci` succeeds locally first. |
| Bootstrap admin not created | Ensure both `BOOTSTRAP_ADMIN_USERNAME` and `BOOTSTRAP_ADMIN_PASSWORD` are set. They are only used when the admin table is empty. |
