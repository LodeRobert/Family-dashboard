ARG BUILD_FROM=node:24-alpine
FROM $BUILD_FROM

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

# Kopieer applicatiebestanden (voor lokale builds wanneer de volledige repo in /addons/homeboard staat)
COPY . .

RUN if [ -f package.json ]; then \
      npm install --no-audit --no-fund && \
      npm run build && \
      npm prune --omit=dev; \
    fi

RUN mkdir -p /data /data/avatars && \
    if [ -f /app/homeboard/run.sh ]; then \
      cp /app/homeboard/run.sh /run.sh; \
    elif [ -f /app/run.sh ]; then \
      cp /app/run.sh /run.sh; \
    else \
      printf '#!/bin/sh\ncd /app && exec ./node_modules/.bin/tsx server.ts\n' > /run.sh; \
    fi && \
    chmod +x /run.sh

EXPOSE 3000

CMD ["/run.sh"]
