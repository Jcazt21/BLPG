# Multi-stage Dockerfile for Blackjack Application
# Builds both frontend and backend in a single container

# Stage 1: Build Backend
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./
RUN npm ci

# Copy backend source code
COPY backend/ ./

# Build backend TypeScript
RUN npm run build

# Install only production dependencies for runtime
RUN npm ci --only=production

# Stage 2: Build Frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source code and environment files
COPY frontend/ ./
COPY .env* ../

# Build frontend for production with environment variables
ARG VITE_HOST
ARG VITE_BACKEND_PORT
ARG VITE_FRONTEND_PORT
ENV VITE_HOST=${VITE_HOST}
ENV VITE_BACKEND_PORT=${VITE_BACKEND_PORT}
ENV VITE_FRONTEND_PORT=${VITE_FRONTEND_PORT}
RUN npm run build

# Stage 3: Production Runtime
FROM node:18-alpine AS production

WORKDIR /app

# Install global dependencies for serving
RUN npm install -g concurrently serve

# Copy backend build and dependencies
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package.json ./backend/

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy environment files
COPY .env* ./

# Create health check script that uses runtime environment variables
RUN echo '#!/bin/sh\n\
curl -f http://localhost:$BACKEND_PORT/health > /dev/null 2>&1 || exit 1\n\
curl -f http://localhost:$FRONTEND_PORT > /dev/null 2>&1 || exit 1' > /app/healthcheck.sh && \
chmod +x /app/healthcheck.sh

# Install curl for health checks
RUN apk add --no-cache curl

# Expose ports (these will be overridden by docker-compose port mapping)
EXPOSE 5185 5180

# Health check for both services
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD /app/healthcheck.sh

# Start both services using concurrently
CMD ["sh", "-c", "concurrently \"cd backend && HOST=0.0.0.0 PORT=${BACKEND_PORT} node dist/index.js\" \"serve -s frontend/dist -l ${FRONTEND_PORT}\""]