# Eenvoudige en stabiele Dockerfile voor Node.js / Vite apps
FROM node:20-alpine

WORKDIR /app

# Kopieer package bestanden en installeer alle packages (inclusief devDependencies voor de build)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Kopieer de rest van de broncode
COPY . .

# Bouw de frontend
RUN npm run build

# Omgevingsvariabelen
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

# Zorg dat de datamap bestaat
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3000

# Start de server
CMD ["npx", "tsx", "server.ts"]
