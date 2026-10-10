# Multi-stage Dockerfile for Choreo (Puppet Dashboard)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and install dependencies for building
COPY package.json ./
RUN npm install

# Copy source code and build the production bundle
COPY . ./
RUN npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install curl for healthcheck
RUN apk add --no-cache curl

# Install only production dependencies
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled artifacts from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/metrics || exit 1

CMD ["node", "dist/server.cjs"]