# PhantomDraw - Deployment Guide

This project is fully containerized for scalable deployment. 

## Dockerization

### 1. Build and Run via Docker Compose

We provide a `docker-compose.yml` to spin up the entire stack locally or on a single cloud VM.

#### Create `.env` files
Create a `.env` in the root directory merging variables from `frontend/.env.local` and `backend/.env`.
```bash
cp .env.example .env
```

#### Run the stack
```bash
docker-compose up -d --build
```

### 2. Architecture Overview
- **Frontend Container**: Next.js app serving static & SSR pages.
- **Backend Container**: NestJS API & WebSocket server.
- **Redis Container**: Used by BullMQ for task queue management.
- **MinIO Container (Optional)**: Can be added to the stack for S3-compatible object storage if not using AWS.

## Cloud Deployment Recommendations (SaaS Scalability)

To scale this application to a production SaaS, we recommend the following architecture:

### 1. Frontend (Next.js)
- **Vercel** or **AWS Amplify**: Easiest and most performant deployment for Next.js App Router, leveraging edge caching automatically.

### 2. Backend (NestJS + BullMQ)
- **AWS ECS (Fargate) / EKS** or **Google Cloud Run**: Run your backend API and WebSocket servers in containerized, auto-scaling clusters.
- **Dedicated Worker Nodes**: For high volume image generation, deploy a separate group of backend instances that ONLY run the `GenerateProcessor` (Worker). This decouples API/WS traffic from heavy GPU/generation tasks.

### 3. Database & Cache
- **Database**: Migrate from SQLite to **PostgreSQL** (e.g. AWS RDS or Supabase) for concurrent writes and reliability.
- **Cache & Queue**: Use managed Redis like **AWS ElastiCache** or **Upstash** for reliable BullMQ operation.

### 4. Storage (Images)
- **AWS S3** or **Cloudflare R2**: Store generated images securely. Configure a CDN (like CloudFront) in front of S3 for fast image delivery on the frontend Gallery.

### 5. AI Generation
- Connect the backend `GenerateProcessor` to a robust GPU inference provider:
  - **Replicate API**
  - **RunPod**
  - **OpenAI DALL-E 3 API**
  - Or your own custom ComfyUI/A1111 endpoints hosted on AWS EC2 (g4dn/g5 instances).