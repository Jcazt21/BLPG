# Docker Deployment Guide

## Overview

The BLPG (Blackjack Multiplayer Game) application is containerized using Docker with a single-container architecture that runs both the React frontend and Node.js backend together.

## Architecture

- **Single Container**: Both frontend and backend run in one container
- **Multi-stage Build**: Optimized production build process
- **Health Monitoring**: Built-in health checks for both services
- **Environment Configuration**: Flexible network and port configuration

## Prerequisites

- Docker Desktop installed and running
- At least 2GB of available RAM
- Ports 5180 and 5185 available on your system

## Quick Start

### Option 1: Using the Batch Script (Windows)
```bash
# Simply double-click or run:
run-docker.bat
```

### Option 2: Using Docker Compose Directly
```bash
# Build and start the application
docker-compose up --build

# Run in detached mode (background)
docker-compose up --build -d

# Stop the application
docker-compose down
```

## Network Configuration

The application's network behavior is controlled by the `.env` file:

### Local Access Only (Default)
```env
HOST=localhost
VITE_HOST=localhost
```
- **Access**: Only from the same machine
- **URLs**: 
  - Frontend: http://localhost:5180
  - Backend: http://localhost:5185

### Network Access (LAN/Remote)
```env
HOST=0.0.0.0
VITE_HOST=192.168.1.100  # Your actual IP address
```
- **Access**: From any device on the network
- **URLs**:
  - Frontend: http://192.168.1.100:5180
  - Backend: http://192.168.1.100:5185

## Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `HOST` | Server bind address | `localhost` | `0.0.0.0` for network access |
| `BACKEND_PORT` | Backend service port | `5185` | `5185` |
| `FRONTEND_PORT` | Frontend service port | `5180` | `5180` |
| `NODE_ENV` | Environment mode | `production` | `production` |
| `CORS_ORIGIN` | CORS allowed origins | `*` | `http://192.168.1.100:5180` |
| `VITE_HOST` | Frontend API host | `localhost` | Your IP address |
| `VITE_BACKEND_PORT` | Frontend API port | `5185` | `5185` |
| `VITE_FRONTEND_PORT` | Frontend port | `5180` | `5180` |

## Configuration Examples

### Example 1: Local Development
```env
HOST=localhost
BACKEND_PORT=5185
FRONTEND_PORT=5180
NODE_ENV=production
CORS_ORIGIN=*
VITE_HOST=localhost
VITE_BACKEND_PORT=5185
VITE_FRONTEND_PORT=5180
```

### Example 2: Network Access
```env
HOST=0.0.0.0
BACKEND_PORT=5185
FRONTEND_PORT=5180
NODE_ENV=production
CORS_ORIGIN=http://192.168.1.100:5180
VITE_HOST=192.168.1.100
VITE_BACKEND_PORT=5185
VITE_FRONTEND_PORT=5180
```

## Docker Commands Reference

### Basic Operations
```bash
# Build the image
docker-compose build

# Start services
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f
```

### Advanced Operations
```bash
# Rebuild without cache
docker-compose build --no-cache

# Remove all containers and networks
docker-compose down --volumes --remove-orphans

# View running containers
docker ps

# Execute commands in running container
docker exec -it BLPG sh
```

## Health Monitoring

The container includes built-in health checks:

- **Health Check Endpoint**: http://localhost:5185/health
- **Check Interval**: Every 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3 attempts
- **Start Period**: 40 seconds

### Check Health Status
```bash
# View container health
docker ps

# Detailed health information
docker inspect BLPG | grep -A 10 Health
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 5180 or 5185
netstat -ano | findstr :5180
netstat -ano | findstr :5185

# Kill process by PID
taskkill /PID <PID> /F
```

#### Docker Not Running
- Start Docker Desktop
- Wait for Docker to fully initialize
- Check Docker status: `docker info`

#### Container Won't Start
```bash
# Check logs for errors
docker-compose logs blpg-app

# Rebuild without cache
docker-compose build --no-cache
```

#### Network Access Issues
1. Ensure `HOST=0.0.0.0` in `.env`
2. Update `VITE_HOST` to your machine's IP
3. Check firewall settings
4. Verify IP address is correct

### Getting Your IP Address

#### Windows
```cmd
ipconfig | findstr IPv4
```

#### Linux/Mac
```bash
ip addr show | grep inet
# or
ifconfig | grep inet
```

## Performance Optimization

### Resource Limits
Add to `docker-compose.yml`:
```yaml
services:
  blpg-app:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
```

### Build Optimization
- The `.dockerignore` file excludes unnecessary files
- Multi-stage build reduces final image size
- Production dependencies only in final stage

## Security Considerations

### Production Deployment
1. **CORS Configuration**: Set specific origins instead of `*`
2. **Environment Variables**: Use secrets for sensitive data
3. **Network Security**: Use reverse proxy (nginx) for production
4. **Updates**: Regularly update base images

### Example Production CORS
```env
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

## File Structure

```
├── Dockerfile              # Multi-stage production build
├── docker-compose.yml      # Container orchestration
├── .dockerignore          # Build context optimization
├── .env                   # Environment configuration
├── run-docker.bat         # Windows startup script
└── docs/
    └── DOCKER.md          # This documentation
```

## Support

For issues related to:
- **Docker setup**: Check this documentation
- **Application bugs**: See main README.md
- **Game mechanics**: See docs/GAME_LOGIC.md
- **API documentation**: See docs/API.md