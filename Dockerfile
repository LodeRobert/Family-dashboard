# Multi-stage Dockerfile voor HomeBoard
# Stage 1: Build frontend
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY server.ts ./
COPY firebase-applet-config.json ./

# Zorg dat de persistente datamap bestaat
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3000

# Start de full-stack server
CMD ["npx", "tsx", "server.ts"]
