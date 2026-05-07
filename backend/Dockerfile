FROM node:20-alpine

WORKDIR /app
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION

# Used by docker-compose healthcheck.
RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3008
CMD ["npm", "run", "start:prod"]
