# PhantomDraw 部署指南

本文档基于当前仓库实际结构编写，覆盖本地开发、`docker compose` 启动、监控组件、版本化发布与回滚。

当前仓库可完成演示环境和受控环境部署，但若要直接公开上线，建议先补齐生产安全与发布治理项，例如强密钥、真实对象存储、告警通知、备份恢复与回滚演练。

## 1. 项目结构

- `frontend/`：Next.js 前端，开发模式默认监听 `4322`，容器内运行端口为 `3000`
- `backend/`：NestJS 后端，开发模式默认监听 `3001`，`docker compose` 中监听 `3008`
- `ops/monitoring/`：Prometheus、Alertmanager、Grafana 配置
- `ops/bin/`：发布、回滚、健康检查脚本
- `docker-compose.yml`：全栈容器化启动入口

## 2. 部署前准备

### 2.1 环境要求

| 组件 | 建议版本 | 说明 |
|------|----------|------|
| Node.js | 18+ | 前后端构建与本地运行 |
| npm | 9+ | 包管理 |
| Redis | 7+ | BullMQ 队列依赖 |
| Docker Engine | 20+ | 容器化部署 |
| Docker Compose | v2+ | 编排启动 |
| MinIO / S3 | 任意兼容版本 | 生成图片存储，必需 |
| AI 推理服务 | 按实际接入 | 文生图/图生图上游接口 |

### 2.2 当前实现限制

- 后端当前固定使用 SQLite，`backend/src/app.module.ts` 中 TypeORM 类型写死为 `sqlite`
- 仓库已提供 Redis、前后端和监控组件的容器编排
- 生成结果会先写入 MinIO/S3，再通过后端资源路由对外访问
- 首个超级管理员仅会在管理员表为空且显式设置引导变量时创建

如果你准备部署到公网，请至少确认以下事项：

1. 替换所有默认或示例密钥
2. 使用稳定的 MinIO/S3 服务，而不是临时本地目录
3. 为 SQLite 数据文件和对象存储建立备份策略
4. 配置真实告警通知渠道，而不是占位 webhook

## 3. 环境变量

### 3.1 后端环境变量

后端提供了示例文件：

```bash
cd backend
cp .env.example .env
```

建议至少配置以下变量：

| 变量 | 是否必填 | 示例 | 说明 |
|------|----------|------|------|
| `PORT` | 否 | `3001` | 后端监听端口 |
| `NODE_ENV` | 是 | `production` | 运行环境 |
| `APP_VERSION` | 否 | `2026.05.07` | 当前版本标识 |
| `DB_DATABASE` | 是 | `database.sqlite` | SQLite 文件名或路径 |
| `REDIS_HOST` | 是 | `127.0.0.1` / `redis` | Redis 地址 |
| `REDIS_PORT` | 是 | `6379` | Redis 端口 |
| `JWT_SECRET` | 是 | 随机长串 | 用户端 JWT 密钥 |
| `ADMIN_JWT_SECRET` | 是 | 随机长串 | 管理端 JWT 密钥 |
| `BACKEND_PUBLIC_URL` | 强烈建议 | `https://api.example.com` | 后端对外可访问地址，用于拼接图片访问链接 |
| `BOOTSTRAP_ADMIN_USERNAME` | 首次初始化时必填 | `admin` | 首个超级管理员账号 |
| `BOOTSTRAP_ADMIN_PASSWORD` | 首次初始化时必填 | 强密码 | 首个超级管理员密码 |
| `S3_ENDPOINT` | 是 | `http://minio:9000` | MinIO/S3 端点 |
| `S3_PORT` | 否 | `9000` | 当 `S3_ENDPOINT` 只写主机名时使用 |
| `S3_USE_SSL` | 否 | `false` | 是否使用 HTTPS |
| `S3_ACCESS_KEY` | 是 | `minioadmin` | 存储访问密钥 |
| `S3_SECRET_KEY` | 是 | `minioadmin123` | 存储访问密码 |
| `S3_BUCKET` | 是 | `phantomdraw` | 存储桶名 |
| `AI_API_URL` | 是 | `http://host.docker.internal:7860` | AI 服务地址 |
| `AI_API_KEY` | 按需 | `sk-xxx` | 上游服务认证 |
| `CORS_ORIGIN` | 强烈建议 | `https://app.example.com` | 前端域名 |

后端最小生产示例：

```env
PORT=3008
NODE_ENV=production
APP_VERSION=2026.05.07
DB_DATABASE=database.sqlite
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=replace-with-a-long-random-string
ADMIN_JWT_SECRET=replace-with-another-long-random-string
BACKEND_PUBLIC_URL=https://api.example.com
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=replace-with-a-strong-password
S3_ENDPOINT=http://minio:9000
S3_PORT=9000
S3_USE_SSL=false
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin123
S3_BUCKET=phantomdraw
AI_API_URL=http://host.docker.internal:7860
AI_API_KEY=
CORS_ORIGIN=https://app.example.com
```

### 3.2 前端环境变量

前端仓库中当前没有 `frontend/.env.example`，请手动创建 `frontend/.env.local`。

需要的变量只有两个：

| 变量 | 是否必填 | 示例 | 说明 |
|------|----------|------|------|
| `NEXT_PUBLIC_API_URL` | 是 | `http://localhost:3001/api` | 浏览器访问的后端 API 地址 |
| `NEXT_PUBLIC_WS_URL` | 是 | `ws://localhost:3001` | 浏览器访问的 WebSocket 地址 |

本地开发示例：

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

公网部署示例：

```env
NEXT_PUBLIC_API_URL=https://api.example.com/api
NEXT_PUBLIC_WS_URL=wss://api.example.com
```

注意：

- `NEXT_PUBLIC_API_URL` 和 `NEXT_PUBLIC_WS_URL` 必须是浏览器可访问地址
- 不要在生产环境继续使用 `docker-compose.yml` 里默认的 `http://backend:3008/api` 与 `ws://backend:3008`，那只是容器内网地址

## 4. 本地开发部署

### 4.1 启动 Redis

任选一种方式：

```bash
# Ubuntu / Debian
sudo apt install redis-server
sudo systemctl start redis
```

```bash
# 使用 Docker
docker run -d --name phantomdraw-redis -p 6379:6379 redis:7-alpine
```

### 4.2 启动后端

```bash
cd backend
npm install
cp .env.example .env
```

编辑 `backend/.env`，至少补齐以下项：

- `JWT_SECRET`
- `ADMIN_JWT_SECRET`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_BUCKET`
- `AI_API_URL`

然后启动：

```bash
npm run start:dev
```

默认访问地址：

- API：`http://localhost:3001/api`
- 健康检查：`http://localhost:3001/api/health/live`

### 4.3 启动前端

```bash
cd frontend
npm install
cat > .env.local <<'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001
EOF
npm run dev
```

默认访问地址：

- 前端：`http://localhost:4322`
- 管理端：`http://localhost:4322/admin`

### 4.4 初始化首个管理员

首次启动且管理员表为空时，在 `backend/.env` 中设置：

```env
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=your-strong-password
```

后端启动后会自动创建首个超级管理员。首次登录成功后，请立刻删除这两个变量并重启后端。

## 5. Docker Compose 部署

### 5.1 编排内容

根目录 `docker-compose.yml` 默认会启动以下服务：

| 服务 | 对外端口 | 说明 |
|------|----------|------|
| `redis` | `6379` | BullMQ 队列 |
| `backend` | `3008` | NestJS API 与 WebSocket |
| `frontend` | `3000` | Next.js standalone 服务 |
| `prometheus` | `9090` | 指标采集 |
| `alertmanager` | `9093` | 告警路由 |
| `grafana` | `3009` | 可视化看板 |

### 5.2 直接启动

在项目根目录执行：

```bash
docker compose up -d --build
```

默认访问地址：

- 前端：`http://localhost:3000`
- 后端：`http://localhost:3008/api`
- Prometheus：`http://localhost:9090`
- Alertmanager：`http://localhost:9093`
- Grafana：`http://localhost:3009`

### 5.3 启动前必须改的内容

当前 `docker-compose.yml` 内含演示性质的默认值，至少需要覆盖以下配置：

- `JWT_SECRET`
- `ADMIN_JWT_SECRET`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `AI_API_URL`
- `AI_API_KEY`
- `CORS_ORIGIN`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`

推荐做法是先准备一份根目录 `.env`，供 `docker compose` 插值使用：

```env
APP_VERSION=2026.05.07
JWT_SECRET=replace-with-a-long-random-string
ADMIN_JWT_SECRET=replace-with-another-long-random-string
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin123
AI_API_URL=http://host.docker.internal:7860
AI_API_KEY=
CORS_ORIGIN=https://app.example.com
NEXT_PUBLIC_API_URL=https://api.example.com/api
NEXT_PUBLIC_WS_URL=wss://api.example.com
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=change-this-password
```

然后将 `docker-compose.yml` 中对应环境变量改为引用 `.env` 的值。

### 5.4 数据持久化

当前编排中有两个命名卷：

| 卷名 | 用途 |
|------|------|
| `redis_data` | Redis 数据持久化 |
| `backend_data` | SQLite 数据持久化 |

删除容器但保留数据：

```bash
docker compose down
```

删除容器和卷：

```bash
docker compose down -v
```

## 6. 生产环境建议

### 6.1 推荐拓扑

最小可用部署建议如下：

1. 反向代理或负载均衡器暴露 `443`
2. 前端容器对外提供页面
3. 后端容器对外提供 `/api` 与 WebSocket
4. Redis 独立部署
5. MinIO/S3 独立部署
6. AI 推理服务独立部署

### 6.2 反向代理

推荐由 Nginx 或 Caddy 统一处理 HTTPS。Caddy 示例：

```caddy
app.example.com {
    reverse_proxy 127.0.0.1:3000
}

api.example.com {
    reverse_proxy 127.0.0.1:3008
}
```

如果前后端走同域不同路径，也要确保 WebSocket 升级头被正确透传。

### 6.3 生产风险提示

- 当前后端仍使用 SQLite，更适合单机、低并发或内部系统
- `synchronize: true` 仍处于开启状态，生产变更前必须评估表结构风险
- `docker-compose.yml` 中的默认密钥不能直接上线
- 告警配置默认只有占位通知地址，需要替换成企业微信、飞书、Slack 或 webhook

## 7. CI/CD 与版本发布

### 7.1 GitHub Actions

仓库已提供 `.github/workflows/ci-cd.yml`。建议将其作为发布前置校验，至少确保：

1. 后端 `lint`
2. 后端单元测试与 E2E
3. 后端构建
4. 前端 `lint`
5. 前端构建
6. Docker 构建校验

### 7.2 版本化发布脚本

仓库已提供：

- `ops/bin/deploy.sh <version>`
- `ops/bin/rollback.sh`
- `ops/bin/healthcheck.sh`

推荐发布方式：

```bash
export APP_VERSION=$(git rev-parse --short HEAD)
bash ops/bin/deploy.sh "$APP_VERSION"
bash ops/bin/healthcheck.sh
```

说明：

- `deploy.sh` 会在 `ops/releases/<version>` 下创建版本目录
- `current` 软链指向当前版本
- 如果已有旧版本，`previous` 软链会自动记录上一版本

### 7.3 回滚

```bash
bash ops/bin/rollback.sh
bash ops/bin/healthcheck.sh
```

## 8. 监控与健康检查

### 8.1 健康检查接口

后端内置如下接口：

- `/api/health/live`
- `/api/health/ready`
- `/api/metrics`

本地或容器中验证：

```bash
curl http://localhost:3008/api/health/live
curl http://localhost:3008/api/health/ready
curl http://localhost:3008/api/metrics
```

如果是本地开发端口，则将 `3008` 替换为 `3001`。

### 8.2 监控组件

监控配置位于 `ops/monitoring/`：

- `prometheus/prometheus.yml`：Prometheus 抓取配置
- `prometheus/alerts.yml`：内置告警规则
- `alertmanager.yml`：告警路由
- `grafana/`：预置数据源与看板

仅启动监控组件：

```bash
docker compose up -d prometheus alertmanager grafana
```

## 9. 验证清单

完成部署后，按顺序检查：

1. `docker compose ps` 中 `backend`、`frontend`、`redis` 状态正常
2. 前端首页可打开
3. 管理端登录页可打开
4. `GET /api/health/live` 返回成功
5. `GET /api/health/ready` 返回成功
6. Grafana 与 Prometheus 可访问
7. 首个管理员可登录
8. 创建一条生成任务后，任务状态能推进且图片能正常访问

## 10. 常见问题

| 问题 | 排查建议 |
|------|----------|
| 前端请求报错或 404 | 检查 `NEXT_PUBLIC_API_URL` 是否为浏览器可访问地址，不要误填容器内网地址 |
| WebSocket 连接失败 | 检查 `NEXT_PUBLIC_WS_URL` 是否使用正确协议，公网应优先使用 `wss://` |
| 后端无法连接 Redis | Docker 环境使用 `redis` 作为主机名，宿主机环境通常使用 `127.0.0.1` |
| 图片无法访问 | 检查 `BACKEND_PUBLIC_URL` 是否为公网地址，S3/MinIO 凭证是否正确 |
| 管理员未自动创建 | 仅在管理员表为空时会触发，且必须同时设置 `BOOTSTRAP_ADMIN_USERNAME` 与 `BOOTSTRAP_ADMIN_PASSWORD` |
| 生成任务一直 pending | 检查 Redis 是否正常、AI 服务是否可从后端容器访问、对象存储是否可写 |
| 构建后前端仍指向旧地址 | Next.js 公共环境变量在构建时注入，修改后需要重新构建镜像 |
