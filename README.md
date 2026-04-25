# PhantomDraw - AI Image Generation Platform

This is a Midjourney / Stable Diffusion WebUI alternative platform, supporting Text-to-Image, Image-to-Image, and Prompt optimization.

## 🏗 Directory Structure

The project follows a separated frontend and backend architecture:

- `frontend/`: Next.js (App Router) application.
- `backend/`: NestJS backend application.

### Frontend
- **Framework**: Next.js (App Router)
- **UI & Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Internationalization**: next-intl (planned)
- **Features**: Lazy loading, waterfall layout, dark mode default.

### Backend
- **Framework**: Node.js + NestJS
- **Database**: SQLite (via TypeORM)
- **Task Queue**: BullMQ + Redis
- **Authentication**: JWT + Refresh Token
- **Storage**: S3-compatible (e.g., MinIO)
- **Features**: RESTful API, WebSocket for real-time task progress.

## 🛠 Environment Setup

### Prerequisites
- Node.js (v18+)
- Redis Server (for task queues and caching)
- SQLite (built-in)
- MinIO / S3 (optional for local testing, required for production)

### Getting Started

1. **Clone the repository**
2. **Setup Frontend**:
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   npm run dev
   ```
3. **Setup Backend**:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npm run start:dev
   ```

## 🚀 Phase 1: Project Initialization Completed
- Initialized frontend with Next.js and Tailwind CSS.
- Initialized backend with NestJS.
- Configured frontend dependencies (shadcn/ui, Zustand, lucide-react).
- Configured backend dependencies (SQLite, TypeORM, Redis, BullMQ).
- Created `.env.example` configuration files for both sub-projects.
