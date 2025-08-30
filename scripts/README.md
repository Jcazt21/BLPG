# 🐳 Docker Scripts

This directory contains various scripts to help you run and manage the BLPG application with Docker.

## Available Scripts

### 🚀 Production Scripts

#### `run-docker.bat` (Recommended)
**Enhanced Windows batch script for production use**

Features:
- ✅ Automatic .env file creation from template
- ✅ Docker status verification
- ✅ Port conflict detection
- ✅ Optional cleanup before start
- ✅ Colored output for better readability
- ✅ Error handling and exit codes
- ✅ Health check URLs display

```bash
# Double-click or run from command prompt
run-docker.bat
```

#### `run-docker.ps1`
**Modern PowerShell version with advanced options**

```powershell
# Basic usage
.\run-docker.ps1

# Start without rebuilding
.\run-docker.ps1 -NoBuild

# Clean and rebuild
.\run-docker.ps1 -Clean

# Development mode
.\run-docker.ps1 -Dev

# Show help
.\run-docker.ps1 -Help
```

### 🛠️ Development Scripts

#### `docker-dev.bat`
**Interactive development menu with multiple options**

Features:
- 📋 Interactive menu interface
- 🔨 Build with/without cache
- 📊 Live log viewing
- 🧹 Cleanup utilities
- 🔍 Health checks
- 🐚 Container shell access

```bash
# Run the interactive menu
docker-dev.bat
```

Menu Options:
1. **Start application (build + run)** - Full build and start
2. **Start application (no build)** - Quick start without rebuilding
3. **Stop application** - Gracefully stop all services
4. **View logs** - Real-time log monitoring
5. **Clean up** - Remove containers and unused images
6. **Full reset** - Complete cleanup and rebuild
7. **Health check** - Test if services are responding
8. **Shell into container** - Access container command line
9. **Exit** - Close the menu

#### `run-tests.js`
**Node.js script for running various test suites**

```bash
node scripts/run-tests.js
```

## 🎯 Quick Start Guide

### For New Users
1. **First time setup**: Use `run-docker.bat` - it will create your .env file automatically
2. **Development**: Use `docker-dev.bat` for the interactive menu
3. **Advanced users**: Use `run-docker.ps1` with parameters

### For Experienced Users
```bash
# Quick production start
scripts\run-docker.bat

# Development with menu
scripts\docker-dev.bat

# PowerShell with options
scripts\run-docker.ps1 -Clean
```

## 🔧 Troubleshooting

### Common Issues

**"Docker is not running"**
- Start Docker Desktop and wait for it to fully load
- Check that the Docker whale icon is not animating

**"Port already in use"**
- The scripts will warn you about port conflicts
- Stop other services using ports 5180 or 5185
- Or use `docker-dev.bat` → option 5 to clean up

**"Permission denied"**
- Run Command Prompt as Administrator
- Or use PowerShell: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

**".env file missing"**
- The scripts will create it automatically from .env.example
- Or manually copy: `copy .env.example .env`

### Performance Tips

1. **Use `-NoBuild` flag** when you haven't changed dependencies
2. **Regular cleanup** with option 5 in docker-dev.bat
3. **Close unused applications** to free up system resources
4. **Allocate more memory** to Docker Desktop if needed

## 📝 Script Comparison

| Feature | run-docker.bat | run-docker.ps1 | docker-dev.bat |
|---------|----------------|----------------|----------------|
| Auto .env creation | ✅ | ✅ | ❌ |
| Port conflict check | ✅ | ✅ | ❌ |
| Colored output | ✅ | ✅ | ✅ |
| Interactive menu | ❌ | ❌ | ✅ |
| Command line options | ❌ | ✅ | ❌ |
| Health checks | ✅ | ✅ | ✅ |
| Container shell access | ❌ | ❌ | ✅ |
| Log viewing | ❌ | ❌ | ✅ |

## 🚀 Advanced Usage

### Custom Environment Variables
Edit your `.env` file to customize:
- **Network access**: Change `HOST` and `VITE_HOST` to your IP
- **Ports**: Modify `FRONTEND_PORT` and `BACKEND_PORT`
- **CORS**: Update `CORS_ORIGIN` for production

### Docker Compose Commands
All scripts use `docker-compose` under the hood. You can also run:
```bash
# Manual commands
docker-compose up --build
docker-compose down
docker-compose logs -f
```

### Health Monitoring
Check if services are running:
- **Frontend**: http://localhost:5180
- **Backend**: http://localhost:5185/health
- **API docs**: http://localhost:5185 (if available)