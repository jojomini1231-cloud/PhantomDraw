# PhantomDraw

PhantomDraw 是一个面向 AI 图片生成场景的全栈项目，提供普通用户生成入口、历史记录与图库能力，同时内置独立管理端用于账号池、Provider、API Key、图库和生成日志管理。

项目采用前后端分离架构：

- `frontend/`：Next.js 应用，包含用户端与 `/admin` 管理端
- `backend/`：NestJS API、WebSocket 推送、BullMQ 队列处理
- `ops/`：监控、部署、健康检查与回滚脚本

## 核心能力

- 文生图任务创建与任务进度推送
- 生成历史与图库展示
- 管理端登录、RBAC、审计日志
- API Key 管理与倍率扣额
- 账号池、Provider、生成日志后台管理
- 生成结果写入 MinIO / S3，并通过后端资源路由访问
- 健康检查、Prometheus 指标、Grafana 看板、Alertmanager 告警

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js、React、Tailwind CSS、shadcn/ui、Zustand |
| 后端 | NestJS、TypeORM、Passport JWT、BullMQ、Socket.IO |
| 数据 | SQLite |
| 中间件 | Redis |
| 对象存储 | MinIO / S3 兼容存储 |
| 运维 | Docker Compose、GitHub Actions、Prometheus、Grafana、Alertmanager |

## 目录结构

```text
PhantomDraw/
├── frontend/              # Next.js 前端与管理端
├── backend/               # NestJS 后端
├── ops/
│   ├── bin/               # deploy / rollback / healthcheck 脚本
│   └── monitoring/        # Prometheus / Grafana / Alertmanager 配置
├── docker-compose.yml     # 全栈容器化入口
├── DEPLOYMENT.md          # 英文部署文档
└── DEPLOYMENT_CN.md       # 中文部署文档
```

## 快速开始

### 1. 环境要求

- Node.js `20+`
- npm `9+`
- Redis `7+`
- MinIO 或任意 S3 兼容对象存储
- 一个可访问的 AI 推理服务

### 2. 启动后端

```bash
cd backend
npm install
cp .env.example .env
```

编辑 `backend/.env`，至少填入以下变量：

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

默认后端地址：

- API：`http://localhost:3001/api`
- 健康检查：`http://localhost:3001/api/health/live`

### 3. 启动前端

前端已提供示例环境变量文件：

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

默认前端地址：

- 用户端：`http://localhost:4322`
- 管理端：`http://localhost:4322/admin`

### 4. 初始化首个管理员

首次启动且管理员表为空时，在 `backend/.env` 中临时加入：

```env
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=your-strong-password
```

管理员创建完成并首次登录后，请删除这两个变量并重启后端。

## Docker Compose

项目根目录提供 `docker-compose.yml`，可一键启动核心服务：

```bash
cp .env.example .env
docker compose up -d --build
```

默认会拉起以下服务：

- `redis`
- `minio`
- `backend`
- `frontend`

默认访问地址：

- 前端：`http://localhost:3000`
- 后端：`http://localhost:3008/api`
- MinIO API：`http://localhost:9000`
- MinIO Console：`http://localhost:9001`

如需监控组件，再执行：

```bash
docker compose --profile monitoring up -d
```

注意：

- 前端 `NEXT_PUBLIC_*` 变量会在镜像构建时注入，请在 `docker compose build` 前准备好根目录 `.env`
- `DB_DATABASE` 在容器部署时默认指向 `/app/data/database.sqlite`，可配合命名卷持久化 SQLite 数据
- 上线前必须替换 JWT、管理员密钥、对象存储凭证和前端公开地址

## 部署与运维

仓库已提供以下运维能力：

- `ops/bin/deploy.sh`：版本化发布
- `ops/bin/rollback.sh`：一键回滚
- `ops/bin/healthcheck.sh`：存活与就绪检查
- `ops/monitoring/`：Prometheus、Grafana、Alertmanager 配置
- `.github/workflows/ci-cd.yml`：前后端检查与 Docker 构建校验

建议优先阅读完整部署文档：

- 中文：[DEPLOYMENT_CN.md](file:///home/jojo/projects/web/PhantomDraw/DEPLOYMENT_CN.md)
- 英文：[DEPLOYMENT.md](file:///home/jojo/projects/web/PhantomDraw/DEPLOYMENT.md)

## 当前实现说明

- 后端当前使用 SQLite，适合单机或低并发场景
- TypeORM 当前配置仍为 `synchronize: true`
- 生成图片不会直接保存上游直链，而是先写入对象存储，再通过后端资源路由输出
- 管理端使用独立管理员认证、RBAC 和审计日志

## 健康检查

后端已内置：

- `/api/health/live`
- `/api/health/ready`
- `/api/metrics`

本地验证示例：

```bash
curl http://localhost:3001/api/health/live
curl http://localhost:3001/api/health/ready
curl http://localhost:3001/api/metrics
```

## 开发建议

- 先完成本地开发联调，再切换到 `docker compose`
- 修改 `NEXT_PUBLIC_*` 变量后，需要重启前端开发服务或重建镜像
- 生产环境请显式设置 `BACKEND_PUBLIC_URL`，否则生成图片链接可能指向错误地址
- 若使用 `next/image` 加载外部图片，记得同步检查 `frontend/next.config.ts` 的远程域名配置

## 已知限制

- 当前仓库具备部署基础，但并不等同于可直接公开上线
- 对公网部署而言，仍需补齐强密钥、备份恢复、告警通知、回滚演练与数据层治理
- 若任务并发较高，建议将 Redis、对象存储、AI 服务与应用实例拆分部署
