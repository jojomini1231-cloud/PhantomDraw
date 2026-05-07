FROM node:20-alpine AS base

FROM base AS builder
WORKDIR /app
ARG APP_VERSION=dev
ARG NEXT_PUBLIC_API_URL=http://localhost:3008/api
ARG NEXT_PUBLIC_WS_URL=ws://localhost:3008
ENV APP_VERSION=$APP_VERSION
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ARG APP_VERSION=dev
ARG NEXT_PUBLIC_API_URL=http://localhost:3008/api
ARG NEXT_PUBLIC_WS_URL=ws://localhost:3008
ENV APP_VERSION=$APP_VERSION
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

# Used by docker-compose healthcheck.
RUN apk add --no-cache curl
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
