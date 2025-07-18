# Setup Guide

This guide provides step-by-step instructions for setting up the Blackjack Game application locally for development and production environments.

> **📖 Related Documentation:**
> - [Main README](README.md) - Project overview and quick start
> - [Architecture Overview](ARCHITECTURE.md) - Technical system design
> - [Development Guide](DEVELOPMENT.md) - Code structure and workflow
> - [API Documentation](API.md) - REST API endpoints
> - [WebSocket Events](WEBSOCKET.md) - Real-time communication
> - [Troubleshooting Guide](TROUBLESHOOTING.md) - Common setup issues

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Docker Setup (Recommended)](#docker-setup-recommended)
- [Development Setup](#development-setup)
- [Production Setup](#production-setup)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before setting up the application, ensure you have the following installed on your system:

### Required Software

- **Node.js** (version 18.0 or higher)
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify installation: `node --version`
- **npm** (comes with Node.js)
  - Verify installation: `npm --version`
- **Git** (for cloning the repository)
  - Download from [git-scm.com](https://git-scm.com/)

### System Requirements

- **Operating System**: Windows, macOS, or Linux
- **RAM**: Minimum 4GB (8GB recommended)
- **Disk Space**: At least 500MB free space
- **Network**: Internet connection for downloading dependencies

## Quick Start

For a rapid setup to get the application running:

```bash
# 1. Clone the repository
git clone <repository-url>
cd blackjack-game

# 2. Install root dependencies
npm install

# 3. Install backend dependencies
cd backend
npm install
cd ..

# 4. Install frontend dependencies
cd frontend
npm install
cd ..

# 5. Start development servers
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend (in a new terminal)
cd frontend
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5180
- **Backend**: http://172.16.50.34:5185 (or your configured HOST)

## Docker Setup (Recommended)

Docker provides the easiest way to run the application with a single container that includes both frontend and backend services.

### Prerequisites for Docker

- **Docker** (version 20.0 or higher)
  - Download from [docker.com](https://www.docker.com/get-started)
  - Verify installation: `docker --version`
- **Docker Compose** (usually included with Docker Desktop)
  - Verify installation: `docker-compose --version`

### Quick Docker Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd blackjack-game

# 2. Configure environment (optional - uses defaults if skipped)
cp .env.example .env
# Edit .env file to set your HOST IP address

# 3. Start the application
docker-compose up --build
```

The application will be available at:
- **Frontend**: http://localhost:5180 (or your configured HOST:FRONTEND_PORT)
- **Backend**: http://localhost:5185 (or your configured HOST:BACKEND_PORT)

### Docker Development Mode

For development with hot reloading:

```bash
# Start in development mode (uses docker-compose.override.yml automatically)
docker-compose up --build

# Or explicitly specify development configuration
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build
```

**Development Features:**
- Hot reloading for both frontend and backend
- Source code mounted as volumes
- Development dependencies included
- Automatic restart on file changes

### Docker Production Mode

For production deployment:

```bash
# Use production environment file
cp .env.production .env
# Edit .env to set your production HOST IP

# Build and start production container
docker-compose -f docker-compose.yml up --build -d
```

**Production Features:**
- Optimized builds for both services
- Minimal container size
- Health checks enabled
- Automatic restart on failure

### Docker Commands Reference

```bash
# Build the container
docker-compose build

# Start services in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up --build --force-recreate

# Check service health
docker-compose ps

# Access container shell
docker-compose exec blackjack-app sh
```

### Docker Environment Configuration

The Docker setup uses the same environment variables as the manual setup. Key variables for Docker:

```env
# Network Configuration - IMPORTANT for Docker
HOST=0.0.0.0              # For container networking
BACKEND_PORT=5185         # Backend service port
FRONTEND_PORT=5180        # Frontend service port

# Environment
NODE_ENV=production       # or development

# CORS Configuration
CORS_ORIGIN=*            # Adjust for production security
```

**Important Docker Notes:**
- Set `HOST=0.0.0.0` for proper container networking
- The container exposes both ports automatically
- Environment variables are passed from `.env` file to container
- Health checks monitor both frontend and backend services

### Docker Troubleshooting

#### Container Build Issues

**Problem**: Docker build fails with dependency errors.

**Solution**:
```bash
# Clear Docker cache and rebuild
docker system prune -a
docker-compose build --no-cache
```

#### Port Conflicts

**Problem**: "Port already in use" errors.

**Solution**:
```bash
# Check what's using the ports
docker ps
netstat -tulpn | grep :5185

# Stop conflicting containers
docker-compose down
docker stop $(docker ps -q)

# Change ports in .env file if needed
```

#### Health Check Failures

**Problem**: Container shows as unhealthy.

**Solution**:
```bash
# Check health check logs
docker-compose logs blackjack-app

# Manually test health endpoints
curl http://localhost:5185/health
curl http://localhost:5180

# Restart with fresh build
docker-compose down
docker-compose up --build
```

## Development Setup

### Step 1: Clone and Navigate

```bash
git clone <repository-url>
cd blackjack-game
```

### Step 2: Install Root Dependencies

```bash
npm install
```

This installs shared dependencies like `dotenv`.

### Step 3: Backend Setup

```bash
cd backend
npm install
```

**Backend Dependencies Installed:**
- **Runtime**: `express`, `socket.io`, `cors`, `dotenv`
- **Development**: `typescript`, `ts-node`, `jest`, `@types/*`

### Step 4: Frontend Setup

```bash
cd frontend
npm install
```

**Frontend Dependencies Installed:**
- **Runtime**: `react`, `react-dom`, `socket.io-client`, `cors`
- **Development**: `vite`, `eslint`, `tailwindcss`, `@types/*`

### Step 5: Environment Configuration

Create environment files (see [Environment Variables](#environment-variables) section).

### Step 6: Start Development Servers

**Backend Server:**
```bash
cd backend
npm run dev
```
- Runs with `ts-node` for TypeScript compilation
- Enables hot reloading
- Default: http://172.16.50.34:5185

**Frontend Server:**
```bash
cd frontend
npm run dev
```
- Runs with Vite development server
- Enables hot module replacement
- Default: http://localhost:5180

## Production Setup

### Step 1: Build Applications

**Build Backend:**
```bash
cd backend
npm run build
```
- Compiles TypeScript to JavaScript in `dist/` folder

**Build Frontend:**
```bash
cd frontend
npm run build
```
- Creates optimized production build in `dist/` folder

### Step 2: Start Production Servers

**Backend:**
```bash
cd backend
npm start
```
- Runs compiled JavaScript from `dist/index.js`

**Frontend:**
```bash
cd frontend
npm run preview
```
- Serves the built application for testing
- For actual production, serve `dist/` folder with a web server

### Step 3: Production Web Server (Optional)

For production deployment, serve the frontend build with a web server:

**Using nginx:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5185;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Using Apache:**
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/frontend/dist
    
    ProxyPass /api http://localhost:5185/
    ProxyPassReverse /api http://localhost:5185/
    
    <Directory "/path/to/frontend/dist">
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

## Environment Variables

> **🔗 Related Documentation:**
> - For WebSocket configuration details, see [WebSocket Events](WEBSOCKET.md#connection-setup)
> - For API configuration, see [API Documentation](API.md)
> - For troubleshooting environment issues, see [Troubleshooting Guide](TROUBLESHOOTING.md#environment-variable-issues)

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=5185
HOST=172.16.50.34

# Development/Production Mode
NODE_ENV=development

# CORS Configuration (optional)
CORS_ORIGIN=http://localhost:5180
```

**Variable Descriptions:**

- `PORT`: Port number for the backend server (default: 5185)
- `HOST`: Host address for the server (default: 172.16.50.34)
- `NODE_ENV`: Environment mode (`development` or `production`)
- `CORS_ORIGIN`: Allowed origins for CORS (optional)

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
# Backend API Configuration
VITE_API_URL=http://172.16.50.34:5185
VITE_SOCKET_URL=http://172.16.50.34:5185

# Development Configuration
VITE_DEV_PORT=5180
```

**Variable Descriptions:**

- `VITE_API_URL`: Backend API base URL
- `VITE_SOCKET_URL`: Socket.IO server URL
- `VITE_DEV_PORT`: Development server port

### Root Environment Variables

Create a `.env` file in the root directory for shared configuration:

```env
# Shared configuration
NODE_ENV=development
```

## Troubleshooting

For more comprehensive troubleshooting information, see the [Troubleshooting Guide](TROUBLESHOOTING.md).

### Common Installation Issues

#### Node.js Version Conflicts

**Problem**: Application fails to start due to Node.js version mismatch.

**Solution**:
```bash
# Check Node.js version
node --version

# If version is below 18.0, update Node.js
# Use Node Version Manager (nvm) for version management
nvm install 18
nvm use 18
```

#### npm Install Failures

**Problem**: `npm install` fails with permission errors.

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install
```

#### Port Already in Use

**Problem**: "Port 5185 is already in use" or "Port 5180 is already in use".

**Solution**:
```bash
# Find process using the port (Windows)
netstat -ano | findstr :5185
taskkill /PID <process-id> /F

# Find process using the port (macOS/Linux)
lsof -ti:5185
kill -9 <process-id>

# Or change port in environment variables
```

### Runtime Issues

#### Backend Connection Errors

**Problem**: Frontend cannot connect to backend.

**Solutions**:
1. **Check backend server status**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Verify environment variables**:
   - Ensure `VITE_API_URL` in frontend matches backend URL
   - Check `HOST` and `PORT` in backend `.env`

3. **Check firewall settings**:
   - Ensure ports 5185 and 5180 are not blocked

#### Socket.IO Connection Issues

**Problem**: Real-time multiplayer features not working.

**Solutions**:
1. **Verify Socket.IO URL**:
   ```javascript
   // In frontend code, check socket connection
   const socket = io('http://172.16.50.34:5185');
   ```

2. **Check CORS configuration**:
   ```typescript
   // In backend index.ts
   const io = new SocketIOServer(httpServer, { 
     cors: { origin: '*' } 
   });
   ```

#### Build Errors

**Problem**: TypeScript compilation errors during build.

**Solution**:
```bash
# Check TypeScript configuration
cd backend
npx tsc --noEmit

# Fix type errors and rebuild
npm run build
```

### Performance Issues

#### Slow Development Server

**Problem**: Development servers are slow to start or reload.

**Solutions**:
1. **Increase Node.js memory limit**:
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

2. **Clear development caches**:
   ```bash
   # Clear Vite cache
   cd frontend
   rm -rf node_modules/.vite

   # Clear TypeScript cache
   cd backend
   rm -rf dist
   ```

#### High Memory Usage

**Problem**: Application consumes too much memory.

**Solutions**:
1. **Monitor memory usage**:
   ```bash
   # Check Node.js memory usage
   node --inspect backend/dist/index.js
   ```

2. **Optimize build configuration**:
   ```javascript
   // In vite.config.js
   export default defineConfig({
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             vendor: ['react', 'react-dom'],
             socket: ['socket.io-client']
           }
         }
       }
     }
   });
   ```

### Network and Connectivity

#### CORS Errors

**Problem**: Cross-origin request blocked errors.

**Solution**:
```typescript
// In backend index.ts, configure CORS properly
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5180',
  credentials: true
}));
```

#### WebSocket Connection Failures

**Problem**: WebSocket connections fail in production.

**Solutions**:
1. **Check proxy configuration**:
   ```nginx
   # In nginx configuration
   location /socket.io/ {
       proxy_pass http://localhost:5185;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }
   ```

2. **Verify SSL/TLS configuration** for HTTPS deployments.

### Getting Help

If you encounter issues not covered in this guide:

1. **Check the logs**:
   - Backend logs in terminal running `npm run dev`
   - Frontend logs in browser developer console

2. **Verify all dependencies are installed**:
   ```bash
   npm list --depth=0
   ```

3. **Ensure all environment variables are set correctly**

4. **Try a clean installation**:
   ```bash
   # Remove all node_modules
   rm -rf node_modules backend/node_modules frontend/node_modules
   
   # Remove lock files
   rm -f package-lock.json backend/package-lock.json frontend/package-lock.json
   
   # Reinstall everything
   npm install
   cd backend && npm install && cd ..
   cd frontend && npm install && cd ..
   ```

For additional support, check the project documentation or contact the development team.