# PhantomDraw - 部署指南

## 目录

- [环境要求](#环境要求)
- [环境变量](#环境变量)
- [本地开发](#本地开发)
- [Docker 部署](#docker-部署)
- [生产环境部署](#生产环境部署)
- [CI/CD 流程](#cicd-流程)
- [监控告警](#监控告警)
- [版本化发布与回滚](#版本化发布与回滚)
- [健康检查与验证](#健康检查与验证)
- [常见问题排查](#常见问题排查)

---

## 环境要求

| 组件 | 版本 | 说明 |
|------|------|------|
| Node.js | v18+ | 前后端均需要 |
| npm | v9+ | 随 Node.js 一起安装 |
| Redis | 7+ | BullMQ 任务队列依赖 |
| SQLite | (内置) | 默认数据库；生产环境建议迁移至 PostgreSQL |
| Docker & Docker Compose | v20+ / v2 | 仅容器化部署需要 |
| MinIO 或兼容 S3 的存储 | - | 图片存储必须 |

---

## 环境变量

### 后端 (`backend/.env`)

复制示例文件并填入实际值：

```bash
cd backend
cp .env.example .env
```

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `PORT` | 是 | `3001` | 后端 API 监听端口 |
| `NODE_ENV` | 是 | `development` | `development` 或 `production` |
| `APP_VERSION` | 否 | `dev` | 当前部署版本号，用于指标、发布和回滚追踪 |
| `DB_TYPE` | 是 | `sqlite` | 数据库类型 |
| `DB_DATABASE` | 是 | `database.sqlite` | SQLite 文件路径（相对于 backend 根目录） |
| `REDIS_HOST` | 是 | `127.0.0.1` | Redis 服务器地址 |
| `REDIS_PORT` | 是 | `6379` | Redis 服务器端口 |
| `REDIS_PASSWORD` | 否 | - | Redis 密码（如启用了认证） |
| `JWT_SECRET` | **是** | - | JWT 签名密钥，**生产环境必须使用强随机字符串** |
| `JWT_EXPIRES_IN` | 否 | `7d` | JWT 过期时间 |
| `ADMIN_JWT_SECRET` | **是** | - | 管理员 JWT 独立签名密钥 |
| `BACKEND_PUBLIC_URL` | 否 | `http://localhost:3001` | 后端对浏览器可访问的公开地址，用于生成图片访问链接 |
| `BOOTSTRAP_ADMIN_USERNAME` | 否 | - | 初始超级管理员用户名（仅在管理员表为空时生效） |
| `BOOTSTRAP_ADMIN_PASSWORD` | 否 | - | 初始超级管理员密码 |
| `S3_ENDPOINT` | 是 | `http://127.0.0.1:9000` | S3/MinIO 端点地址，支持完整 URL 或纯主机名 |
| `S3_PORT` | 否 | `9000` | 当 `S3_ENDPOINT` 仅填写主机名时使用的端口 |
| `S3_USE_SSL` | 否 | `false` | 是否启用 SSL 连接 |
| `S3_ACCESS_KEY` | 是 | - | S3 访问密钥 |
| `S3_SECRET_KEY` | 是 | - | S3 秘密密钥 |
| `S3_BUCKET` | 是 | `phantomdraw` | S3 存储桶名称 |
| `AI_API_URL` | 是 | `http://localhost:7860` | AI 模型服务地址（Stable Diffusion API / OpenAI 兼容接口） |
| `AI_API_KEY` | 否 | - | AI 服务商 API 密钥（如需要） |
| `CORS_ORIGIN` | 否 | `http://localhost:4322` | 允许的跨域来源 |

### 前端 (`frontend/.env.local`)

```bash
cd frontend
cp .env.example .env.local
```

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `NEXT_PUBLIC_API_URL` | 是 | `http://localhost:3001/api` | 后端 API 基础地址 |
| `NEXT_PUBLIC_WS_URL` | 是 | `ws://localhost:3001` | WebSocket 地址，用于实时任务进度推送 |

---

## 本地开发

### 1. 启动 Redis

Redis 是 BullMQ 任务队列的必要依赖。安装并启动：

```bash
# macOS
brew install redis && brew services start redis

# Ubuntu/Debian
sudo apt install redis-server && sudo systemctl start redis

# 或使用 Docker（无需安装）
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### 2. 启动后端

```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env 填入你的配置（至少需要：JWT_SECRET、S3 凭证、AI_API_URL）
# 本地 MinIO 示例：
# BACKEND_PUBLIC_URL=http://localhost:3001
# S3_ENDPOINT=http://192.168.0.103:19000
# S3_ACCESS_KEY=minioadmin
# S3_SECRET_KEY=minioadmin123
# S3_BUCKET=phantomdraw
npm run start:dev
```

API 服务地址：`http://localhost:3001`。`start:dev` 使用 NestJS 监听模式，代码修改后自动重载。

### 3. 启动前端

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

前端开发服务器地址：`http://localhost:4322`。

### 4. 创建首个管理员账号

首次运行时数据库为空，在 `backend/.env` 中设置 `BOOTSTRAP_ADMIN_USERNAME` 和 `BOOTSTRAP_ADMIN_PASSWORD`。后端会在启动时自动创建初始超级管理员。**首次登录成功后请删除这两个变量。**

---

## Docker 部署

项目根目录的 `docker-compose.yml` 提供了一键部署全栈服务的能力。

### 服务列表

| 服务 | 镜像 | 端口 | 用途 |
|------|------|------|------|
| `redis` | `redis:7-alpine` | 6379 | BullMQ 任务队列 |
| `backend` | 基于 `backend/Dockerfile` 构建 | 3008 | NestJS API + WebSocket 服务 |
| `frontend` | 基于 `frontend/Dockerfile` 构建 | 3000 | Next.js 应用（standalone 模式） |
| `prometheus` | `prom/prometheus` | 9090 | 指标采集与告警规则计算 |
| `alertmanager` | `prom/alertmanager` | 9093 | 告警路由与通知聚合 |
| `grafana` | `grafana/grafana` | 3009 | 监控看板 |

### 快速启动

```bash
# 在项目根目录执行
docker-compose up -d --build
```

启动后将：
1. 构建后端和前端镜像
2. 启动 Redis、后端和前端容器
3. 创建持久化卷用于 Redis 数据和 SQLite 数据库

访问地址：`http://localhost:3000`

### 自定义环境变量

`docker-compose.yml` 中包含内联环境变量，适用于本地开发。生产环境建议覆盖：

**方式 A：在项目根目录创建 `.env` 文件**（docker-compose 会自动读取）：

```env
JWT_SECRET=你的生产环境JWT密钥
ADMIN_JWT_SECRET=你的生产环境管理员密钥
S3_ACCESS_KEY=你的S3访问密钥
S3_SECRET_KEY=你的S3秘密密钥
AI_API_URL=https://你的AI服务商地址
AI_API_KEY=你的AI密钥
CORS_ORIGIN=https://你的域名
```

然后在 `docker-compose.yml` 中引用：

```yaml
backend:
  environment:
    - JWT_SECRET=${JWT_SECRET}
```

**方式 B：使用 `env_file` 指令**：

```yaml
backend:
  env_file:
    - ./backend/.env
```

### 持久化数据

| 卷名 | 容器 | 路径 | 用途 |
|------|------|------|------|
| `redis_data` | redis | `/data` | Redis 数据持久化 |
| `backend_data` | backend | `/app/data` | SQLite 数据库文件 |

清除所有数据：

```bash
docker-compose down -v
```

### 常用命令

```bash
# 查看日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f prometheus

# 重新构建单个服务
docker-compose up -d --build backend

# 停止所有服务
docker-compose down

# 停止并删除卷（会丢失数据）
docker-compose down -v
```

---

## 生产环境部署

### 架构概览

```
                    ┌─────────────┐
                    │   CDN/WAF   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  负载均衡    │
                    └──┬───────┬──┘
                       │       │
              ┌────────▼─┐  ┌──▼────────┐
              │  前端     │  │   后端     │
              │ (Next.js) │  │  (NestJS) │
              │ Vercel /  │  │  ECS / K8s│
              │ Amplify   │  │           │
              └───────────┘  └──┬────┬───┘
                                │    │
                    ┌───────────▼┐  ┌▼──────────┐
                    │ PostgreSQL │  │   Redis    │
                    │  (RDS /    │  │ (Elasti-   │
                    │  Supabase) │  │  Cache)    │
                    └────────────┘  └────────────┘
```

### 前端 (Next.js)

**推荐方案**：Vercel 或 AWS Amplify，自动提供边缘缓存和全球 CDN。

- Dockerfile 使用 Next.js **standalone 输出模式**，镜像体积最小化。
- 自托管时，确保 `NEXT_PUBLIC_API_URL` 和 `NEXT_PUBLIC_WS_URL` 指向公网可访问的后端域名（而非 Docker 内部地址）。

### 后端 (NestJS + BullMQ)

**推荐方案**：AWS ECS (Fargate)、Google Cloud Run 或 Kubernetes。

关键要点：

- **分离 API 和 Worker 进程**：`GenerateProcessor` 处理 CPU/GPU 密集型图片生成任务。高流量场景下，应部署专用的 Worker 实例，仅运行 BullMQ Worker，与 API/WebSocket 服务器分离。
- **WebSocket 支持**：确保负载均衡器支持 WebSocket 连接（需要 sticky sessions 或 WebSocket 感知路由）。
- **CORS**：生产环境中将 `CORS_ORIGIN` 设置为前端域名。
- **安全**：将 `JWT_SECRET` 和 `ADMIN_JWT_SECRET` 更换为强随机字符串，切勿使用默认值。

### 数据库迁移（SQLite → PostgreSQL）

生产环境建议迁移至 PostgreSQL 以支持并发写入：

1. 安装 PostgreSQL 驱动：
   ```bash
   cd backend && npm install pg
   ```
2. 更新 `backend/.env`：
   ```env
   DB_TYPE=postgres
   DB_HOST=your-rds-endpoint.amazonaws.com
   DB_PORT=5432
   DB_USERNAME=phantomdraw
   DB_PASSWORD=你的数据库密码
   DB_DATABASE=phantomdraw
   ```
3. TypeORM 会在开发模式下自动同步 Schema。生产环境请生成并执行迁移：
   ```bash
   npm run typeorm migration:generate -- -n InitSchema
   npm run typeorm migration:run
   ```

### 对象存储 (S3/MinIO)

- 生产环境使用 **AWS S3** 或 **Cloudflare R2** 存储生成的图片。
- 在 S3 前置 CDN（CloudFront、Cloudflare）加速图片加载。
- 如前端直接上传，需在 S3 存储桶上配置 CORS。

### AI 图片生成服务

连接生产级推理服务：

| 服务商 | 适用场景 |
|--------|----------|
| Replicate API | 托管服务，按需付费，模型选择丰富 |
| RunPod | GPU 云服务，适合自定义 ComfyUI/A1111 |
| OpenAI DALL-E 3 API | 接口简单，生成质量高 |
| 自建服务 (EC2 g4dn/g5) | 完全自主可控，成本和复杂度最高 |

根据实际情况设置 `AI_API_URL` 和 `AI_API_KEY`。

### HTTPS 与域名配置

- 使用反向代理（Nginx、Caddy 或云负载均衡器）处理 TLS 终止。
- Caddy 配置示例（自动 HTTPS）：
  ```
  yourdomain.com {
      reverse_proxy frontend:3000
  }

  api.yourdomain.com {
      reverse_proxy backend:3008
  }
  ```

---

## CI/CD 流程

仓库新增 GitHub Actions 工作流：`.github/workflows/ci-cd.yml`。

### 默认流水线阶段

1. 后端 `npm ci`
2. 后端 `lint`、单测、E2E、`build`
3. 前端 `npm ci`
4. 前端 `lint`、`build`
5. Docker 镜像构建校验
6. `main` / `master` 分支 push 时生成发布归档物

### 接入建议

- PR 阶段将工作流状态设为必过检查。
- 主干分支仅允许通过 CI 校验的提交进入部署流程。
- 生产环境将 `APP_VERSION` 统一设置为 Git SHA、语义化版本或制品标签。

---

## 监控告警

### 目录结构

项目新增 `ops/monitoring/`：

- `prometheus/prometheus.yml`：抓取后端 `api/metrics`
- `prometheus/alerts.yml`：内置后端不可达、前端不可达、后端高内存告警
- `alertmanager.yml`：统一告警路由
- `grafana/`：预置 Prometheus 数据源与 `PhantomDraw Overview` 看板

### 启动方式

```bash
docker-compose up -d prometheus alertmanager grafana
```

### 访问地址

- Prometheus：`http://localhost:9090`
- Alertmanager：`http://localhost:9093`
- Grafana：`http://localhost:3009`

### 告警说明

- 默认 `alertmanager.yml` 使用 webhook 占位地址，生产环境请替换为真实通知入口。
- 建议在现有规则基础上继续补充 Redis 延迟、BullMQ 队列堆积、生成失败率等业务告警。

---

## 版本化发布与回滚

项目新增 `ops/bin/` 标准脚本：

- `deploy.sh <version>`：创建版本目录、切换 `current` 软链并重新部署
- `rollback.sh`：回退到 `previous` 版本
- `healthcheck.sh`：校验服务存活与就绪状态

### 推荐发布流程

```bash
export APP_VERSION=$(git rev-parse --short HEAD)
bash ops/bin/deploy.sh "$APP_VERSION"
bash ops/bin/healthcheck.sh
```

### 回滚流程

```bash
bash ops/bin/rollback.sh
bash ops/bin/healthcheck.sh
```

### 目录约定

- `ops/releases/current`：当前线上版本
- `ops/releases/previous`：上一稳定版本
- `ops/releases/<version>`：按版本号归档的发布目录

---

## 健康检查与验证

### 服务验证

```bash
# 后端存活检查
curl http://localhost:3001/api/health/live

# 后端就绪检查
curl http://localhost:3001/api/health/ready

# Prometheus 指标
curl http://localhost:3001/api/metrics

# 前端
curl -I http://localhost:3000

# Redis
redis-cli ping  # 应返回 PONG

# WebSocket（需要 wscat）
npx wscat -c ws://localhost:3001
```

### Docker 容器状态

```bash
docker-compose ps
```

`backend`、`frontend`、`redis` 应显示 `healthy` 或 `Up` 状态。查看日志排查错误：

```bash
docker-compose logs --tail=50 backend
docker-compose logs --tail=50 frontend
docker-compose logs --tail=50 prometheus
docker-compose logs --tail=50 alertmanager
```

---

## 常见问题排查

| 问题 | 解决方案 |
|------|----------|
| 后端无法连接 Redis | 确认 Redis 已启动，检查 `REDIS_HOST`/`REDIS_PORT`。Docker 环境中主机名应为 `redis` |
| 前端显示 API 错误 | 确认 `NEXT_PUBLIC_API_URL` 在浏览器中可访问，检查后端 CORS 配置 |
| WebSocket 连接失败 | 确认 `NEXT_PUBLIC_WS_URL` 使用 `ws://` 协议（非 `http://`），检查负载均衡器是否支持 WebSocket 升级 |
| SQLite 报 "database is locked" | SQLite 不适合高并发写入，生产环境请迁移至 PostgreSQL |
| 图片生成挂起 | 检查 `AI_API_URL` 是否可从后端容器访问，通过 Redis 检查 BullMQ 队列中是否有卡住的任务 |
| Docker 构建失败 | 执行 `docker-compose build --no-cache` 强制重新构建，先确认本地 `npm ci` 能正常运行 |
| 管理员账号未创建 | 确保同时设置了 `BOOTSTRAP_ADMIN_USERNAME` 和 `BOOTSTRAP_ADMIN_PASSWORD`，仅在管理员表为空时生效 |
| 前端无法加载远程图片 | 检查 `next.config.ts` 中的 `images.remotePatterns` 配置，确保包含图片域名 |
