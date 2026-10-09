# Multi-stage Dockerfile for Choreo (Puppet Dashboard)
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем зависимости
COPY package*.json ./
RUN npm ci

# Копируем исходный код и собираем продакшен-бандл
COPY . ./
RUN npm run build

# Продакшен-образ
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Устанавливаем curl для healthcheck
RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Копируем скомпилированные артефакты
COPY --from=builder /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/metrics || exit 1

CMD ["node", "dist/server.cjs"]
