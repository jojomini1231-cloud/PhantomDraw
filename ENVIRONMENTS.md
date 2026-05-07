# Development Environments

This project supports two local development modes:

- `local`: everything stays on localhost
- `tunnel`: frontend and backend generate public URLs for Cloudflare Tunnel or similar intranet tunneling

## Backend

Create one of these files from the examples in `backend/`:

- `.env.localdev`
- `.env.tunnel`

Then start the backend with:

```bash
cd backend
npm run start:dev:local
```

or:

```bash
cd backend
npm run start:dev:tunnel
```

## Frontend

Create one of these files from the examples in `frontend/`:

- `.env.localdev`
- `.env.tunnel`

Then start the frontend with:

```bash
cd frontend
npm run dev:local
```

or:

```bash
cd frontend
npm run dev:tunnel
```

## Recommended Tunnel Pair

For public tunnel testing, start both:

```bash
cd backend && npm run start:dev:tunnel
```

```bash
cd frontend && npm run dev:tunnel
```
