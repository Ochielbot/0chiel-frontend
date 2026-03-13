# Multi-stage build: frontend + backend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY ochiel/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY ochiel/ ./

# Build frontend
RUN npm run build:web

# Final stage: backend with built frontend
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache sqlite wget

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies
RUN npm ci --only=production

# Copy backend source
COPY backend/src ./src

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/frontend/dist ./dist

# Create data directory with proper permissions
RUN mkdir -p /app/data && chmod 755 /app/data

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the application
CMD ["node", "src/server.js"]