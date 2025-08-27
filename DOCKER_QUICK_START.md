# 🐳 Docker Quick Start Guide

## 1. Prerequisites
- Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Start Docker Desktop and wait for it to fully load

## 2. Choose Your Setup

### 🏠 Local Access Only (Default)
Perfect for testing on your own machine:
```bash
# No changes needed - just run:
run-docker.bat
```
**Access**: http://localhost:5180

### 🌐 Network Access (Share with Others)
Allow others on your network to play:

1. **Find your IP address**:
   ```cmd
   ipconfig | findstr IPv4
   ```
   Example output: `192.168.1.100`

2. **Update `.env` file**:
   ```env
   HOST=0.0.0.0
   VITE_HOST=192.168.1.100  # Use YOUR IP here
   CORS_ORIGIN=http://192.168.1.100:5180
   ```

3. **Run the application**:
   ```bash
   run-docker.bat
   ```

**Access**: http://192.168.1.100:5180 (replace with your IP)

## 3. Running the Application

### Windows (Recommended)
```bash
# Double-click or run in command prompt:
run-docker.bat
```

### Manual Docker Commands
```bash
# Build and start
docker-compose up --build

# Stop (Ctrl+C, then):
docker-compose down
```

## 4. Access Points

| Service | Local URL | Network URL (example) |
|---------|-----------|----------------------|
| **Game Frontend** | http://localhost:5180 | http://192.168.1.100:5180 |
| **API Backend** | http://localhost:5185 | http://192.168.1.100:5185 |
| **Health Check** | http://localhost:5185/health | http://192.168.1.100:5185/health |

## 5. Troubleshooting

### ❌ "Port already in use"
```bash
# Find what's using the port
netstat -ano | findstr :5180

# Kill the process (replace PID)
taskkill /PID 1234 /F
```

### ❌ "Docker not running"
- Open Docker Desktop
- Wait for the whale icon to stop animating
- Try again

### ❌ "Can't access from other devices"
1. Check your `.env` file has `HOST=0.0.0.0`
2. Update `VITE_HOST` to your actual IP address
3. Check Windows Firewall settings

## 6. Quick Commands

```bash
# View logs
docker-compose logs

# Stop everything
docker-compose down

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up
```

## 🎮 Ready to Play!

Once running, you can:
1. Open the game in your browser
2. Create or join multiplayer rooms
3. Play blackjack with friends!

For detailed documentation, see [docs/DOCKER.md](docs/DOCKER.md)