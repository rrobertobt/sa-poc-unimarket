FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --omit=optional && \
    (npm install oracledb --omit=dev || echo "oracledb omitido: instalar solo si DB_DRIVER=oracle")

COPY src ./src

ENV PORT=8080
EXPOSE 8080

# Healthcheck util para Fargate/Cloud Run/Container Apps/Container Instances
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["node", "src/index.js"]
