FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

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

# Install tsx for running server.ts directly
RUN npm install -g tsx

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3000

CMD ["tsx", "server.ts"]
