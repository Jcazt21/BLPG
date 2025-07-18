# Troubleshooting Guide

> **📖 Related Documentation:**
> - [Main README](README.md) - Project overview and quick start
> - [Setup Guide](SETUP.md) - Installation and configuration instructions
> - [Development Guide](DEVELOPMENT.md) - Code structure and development workflow
> - [API Documentation](API.md) - REST API endpoints and debugging
> - [WebSocket Events](WEBSOCKET.md) - Real-time communication troubleshooting
> - [User Guide](USER_GUIDE.md) - How to use the application
> - [Architecture Overview](ARCHITECTURE.md) - Technical system design
> - [Game Logic](GAME_LOGIC.md) - Blackjack rules and implementation details

This guide provides solutions to common issues you may encounter while setting up, running, or using the Blackjack Game application. Whether you're a developer working on the codebase or an end-user playing the game, you'll find troubleshooting steps for various scenarios.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Runtime Problems](#runtime-problems)
- [Connectivity Issues](#connectivity-issues)
- [Browser Compatibility](#browser-compatibility)
- [Performance Issues](#performance-issues)
- [Game-Specific Problems](#game-specific-problems)
- [Debugging Procedures](#debugging-procedures)
- [Frequently Asked Questions](#frequently-asked-questions)

## Installation Issues

### Node.js Version Problems

**Problem**: Application fails to start with Node.js version errors.

**Symptoms**:
- `Error: Unsupported Node.js version`
- Package installation failures
- TypeScript compilation errors

**Solutions**:

1. **Check your Node.js version**:
   ```bash
   node --version
   ```
   Required: Node.js 18.0 or higher

2. **Update Node.js**:
   - Download latest LTS from [nodejs.org](https://nodejs.org/)
   - Or use Node Version Manager (nvm):
   ```bash
   # Install nvm (macOS/Linux)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   
   # Install and use Node.js 18
   nvm install 18
   nvm use 18
   ```

3. **Windows users**:
   - Use [nvm-windows](https://github.com/coreybutler/nvm-windows)
   - Or download installer from nodejs.org

### npm Installation Failures

**Problem**: `npm install` fails with various errors.

**Common Error Messages**:
- `EACCES: permission denied`
- `ENOENT: no such file or directory`
- `network timeout`
- `peer dependency warnings`

**Solutions**:

1. **Clear npm cache**:
   ```bash
   npm cache clean --force
   ```

2. **Delete node_modules and reinstall**:
   ```bash
   # Remove existing installations
   rm -rf node_modules package-lock.json
   rm -rf backend/node_modules backend/package-lock.json
   rm -rf frontend/node_modules frontend/package-lock.json
   
   # Reinstall everything
   npm install
   cd backend && npm install && cd ..
   cd frontend && npm install && cd ..
   ```

3. **Permission issues (macOS/Linux)**:
   ```bash
   # Fix npm permissions
   sudo chown -R $(whoami) ~/.npm
   sudo chown -R $(whoami) /usr/local/lib/node_modules
   ```

4. **Network issues**:
   ```bash
   # Use different registry
   npm install --registry https://registry.npmjs.org/
   
   # Or configure proxy if behind corporate firewall
   npm config set proxy http://proxy.company.com:8080
   npm config set https-proxy http://proxy.company.com:8080
   ```

### TypeScript Compilation Errors

**Problem**: TypeScript build fails with type errors.

**Solutions**:

1. **Check TypeScript version**:
   ```bash
   cd backend
   npx tsc --version
   ```

2. **Clean TypeScript cache**:
   ```bash
   cd backend
   rm -rf dist
   rm -rf node_modules/.cache
   ```

3. **Verify tsconfig.json**:
   ```bash
   cd backend
   npx tsc --noEmit
   ```

## Runtime Problems

### Port Already in Use

**Problem**: Server fails to start with port conflict errors.

**Error Messages**:
- `Error: listen EADDRINUSE: address already in use :::5185`
- `Error: listen EADDRINUSE: address already in use :::5180`

**Solutions**:

1. **Find and kill process using the port**:

   **Windows**:
   ```cmd
   # Find process using port 5185
   netstat -ano | findstr :5185
   
   # Kill process (replace PID with actual process ID)
   taskkill /PID <PID> /F
   ```

   **macOS/Linux**:
   ```bash
   # Find and kill process using port 5185
   lsof -ti:5185 | xargs kill -9
   
   # Or find process first, then kill
   lsof -i:5185
   kill -9 <PID>
   ```

2. **Change port in environment variables**:
   ```bash
   # In backend/.env
   PORT=5186
   
   # In frontend/.env
   VITE_API_URL=http://172.16.50.34:5186
   VITE_SOCKET_URL=http://172.16.50.34:5186
   ```

### Environment Variable Issues

**Problem**: Application can't find or use environment variables.

**Symptoms**:
- Backend starts on wrong port
- Frontend can't connect to backend
- CORS errors

**Solutions**:

1. **Verify .env files exist**:
   ```bash
   # Check if files exist
   ls -la backend/.env
   ls -la frontend/.env
   ls -la .env
   ```

2. **Check .env file format**:
   ```bash
   # backend/.env should contain:
   PORT=5185
   HOST=172.16.50.34
   NODE_ENV=development
   
   # frontend/.env should contain:
   VITE_API_URL=http://172.16.50.34:5185
   VITE_SOCKET_URL=http://172.16.50.34:5185
   ```

3. **Restart servers after changing .env**:
   ```bash
   # Stop servers (Ctrl+C) and restart
   cd backend && npm run dev
   cd frontend && npm run dev
   ```

### Module Not Found Errors

**Problem**: Application fails to start with missing module errors.

**Error Examples**:
- `Cannot find module 'express'`
- `Cannot find module 'socket.io'`
- `Cannot find module 'react'`

**Solutions**:

1. **Reinstall dependencies**:
   ```bash
   # For backend modules
   cd backend
   npm install
   
   # For frontend modules
   cd frontend
   npm install
   ```

2. **Check package.json files**:
   ```bash
   # Verify dependencies are listed
   cat backend/package.json
   cat frontend/package.json
   ```

3. **Clear node_modules and reinstall**:
   ```bash
   rm -rf backend/node_modules
   rm -rf frontend/node_modules
   cd backend && npm install && cd ..
   cd frontend && npm install
   ```

## Connectivity Issues

### Frontend Cannot Connect to Backend

**Problem**: Frontend shows connection errors or API calls fail.

**Symptoms**:
- Network errors in browser console
- API requests timeout
- "Failed to fetch" errors

**Solutions**:

1. **Verify backend is running**:
   ```bash
   # Check if backend server is running
   curl http://172.16.50.34:5185/game/state
   ```

2. **Check environment variables**:
   ```bash
   # In frontend/.env, ensure URLs match backend
   VITE_API_URL=http://172.16.50.34:5185
   VITE_SOCKET_URL=http://172.16.50.34:5185
   ```

3. **Test backend directly**:
   ```bash
   # Test API endpoint
   curl -X POST http://172.16.50.34:5185/game/start \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","bet":100,"balance":1000}'
   ```

4. **Check firewall settings**:
   - Ensure ports 5185 and 5180 are not blocked
   - Disable firewall temporarily to test
   - Add exceptions for Node.js applications

### CORS (Cross-Origin) Errors

**Problem**: Browser blocks requests due to CORS policy.

**Error Messages**:
- `Access to fetch at '...' has been blocked by CORS policy`
- `Cross-Origin Request Blocked`

**Solutions**:

1. **Check backend CORS configuration**:
   ```typescript
   // In backend/src/index.ts
   app.use(cors({
     origin: process.env.CORS_ORIGIN || '*',
     credentials: true
   }));
   ```

2. **Update CORS_ORIGIN environment variable**:
   ```bash
   # In backend/.env
   CORS_ORIGIN=http://localhost:5180
   ```

3. **Temporary fix for development**:
   ```typescript
   // Allow all origins (development only)
   app.use(cors({ origin: '*' }));
   ```

### WebSocket Connection Failures

**Problem**: Real-time multiplayer features don't work.

**Symptoms**:
- Socket.IO connection errors
- Multiplayer rooms don't update
- Players can't join rooms

**Solutions**:

1. **Check Socket.IO connection**:
   ```javascript
   // In browser console
   console.log(socket.connected); // Should be true
   console.log(socket.id); // Should show socket ID
   ```

2. **Verify WebSocket URL**:
   ```javascript
   // In frontend code
   const socket = io('http://172.16.50.34:5185');
   ```

3. **Check for proxy/firewall issues**:
   - WebSocket connections may be blocked by corporate firewalls
   - Try different network or disable VPN

4. **Enable Socket.IO debugging**:
   ```javascript
   // Add to frontend
   localStorage.debug = 'socket.io-client:socket';
   ```

## Browser Compatibility

### Supported Browsers

**Fully Supported**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Limited Support**:
- Internet Explorer (not recommended)
- Older mobile browsers

### Common Browser Issues

**Problem**: Game doesn't work in specific browsers.

**Solutions**:

1. **Update browser to latest version**

2. **Clear browser cache and cookies**:
   - Chrome: Settings → Privacy → Clear browsing data
   - Firefox: Settings → Privacy → Clear Data
   - Safari: Develop → Empty Caches

3. **Disable browser extensions**:
   - Ad blockers may interfere with WebSocket connections
   - Privacy extensions may block API calls

4. **Check JavaScript console for errors**:
   - Press F12 to open developer tools
   - Look for error messages in Console tab

### Mobile Browser Issues

**Problem**: Game doesn't work properly on mobile devices.

**Solutions**:

1. **Use supported mobile browsers**:
   - Chrome Mobile
   - Safari Mobile
   - Firefox Mobile

2. **Check viewport settings**:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   ```

3. **Test touch interactions**:
   - Ensure buttons are large enough for touch
   - Test card interactions on touch devices

## Performance Issues

### Slow Loading Times

**Problem**: Application takes too long to load or respond.

**Solutions**:

1. **Check network connection**:
   ```bash
   # Test connection speed
   ping 172.16.50.34
   ```

2. **Optimize development build**:
   ```bash
   # Use production build for testing
   cd frontend
   npm run build
   npm run preview
   ```

3. **Clear development caches**:
   ```bash
   # Clear Vite cache
   cd frontend
   rm -rf node_modules/.vite
   
   # Clear TypeScript cache
   cd backend
   rm -rf dist
   ```

### High Memory Usage

**Problem**: Application consumes excessive memory.

**Solutions**:

1. **Monitor memory usage**:
   ```bash
   # Check Node.js memory usage
   node --inspect backend/dist/index.js
   ```

2. **Increase Node.js memory limit**:
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

3. **Restart development servers periodically**:
   - Memory leaks can occur during development
   - Restart servers every few hours

### Performance Optimization Tips

**Frontend Optimization**:

1. **Bundle size reduction**:
   - Use production builds for deployment
   - Enable code splitting in Vite config:
   ```javascript
   // In frontend/vite.config.js
   export default defineConfig({
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             vendor: ['react', 'react-dom'],
             game: ['./src/game/']
           }
         }
       }
     }
   });
   ```

2. **Asset optimization**:
   - Compress card images
   - Use WebP format for images
   - Lazy load non-critical assets

3. **React rendering optimization**:
   - Use React.memo for pure components
   - Implement useMemo and useCallback for expensive calculations
   - Avoid unnecessary re-renders with proper key usage

**Backend Optimization**:

1. **Database query optimization** (if applicable):
   - Index frequently queried fields
   - Use query caching

2. **Socket.IO performance**:
   - Use binary data when possible
   - Limit broadcast events
   - Implement room-based filtering

3. **Server resource management**:
   - Implement proper error handling
   - Use worker threads for CPU-intensive tasks
   - Monitor memory usage with tools like `clinic.js`

## Game-Specific Problems

### Cards Not Displaying

**Problem**: Game loads but cards don't appear.

**Solutions**:

1. **Check browser console for errors**:
   - Look for JavaScript errors
   - Check for missing image files

2. **Verify game state**:
   ```javascript
   // In browser console
   console.log(gameState);
   ```

3. **Test API endpoints**:
   ```bash
   curl -X POST http://172.16.50.34:5185/game/start \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","bet":100,"balance":1000}'
   ```

### Multiplayer Rooms Not Working

**Problem**: Players can't create or join multiplayer rooms.

**Solutions**:

1. **Check WebSocket connection**:
   ```javascript
   // In browser console
   console.log(socket.connected);
   ```

2. **Verify room codes**:
   - Room codes are case-insensitive
   - Must be exactly 6 characters
   - Only alphanumeric characters

3. **Test room creation**:
   ```javascript
   // In browser console
   socket.emit('createRoom', 'TestPlayer');
   ```

### Game State Synchronization Issues

**Problem**: Players see different game states in multiplayer.

**Solutions**:

1. **Refresh all players' browsers**

2. **Check server logs for errors**:
   ```bash
   # In backend terminal
   # Look for error messages
   ```

3. **Restart the room**:
   - Leave and rejoin the room
   - Create a new room if issues persist

## Debugging Procedures

### Frontend Debugging

1. **Open browser developer tools** (F12)

2. **Check Console tab for errors**:
   - JavaScript errors
   - Network request failures
   - WebSocket connection issues

3. **Check Network tab**:
   - API request/response details
   - Failed requests
   - Response times

4. **Check Application tab**:
   - Local storage data
   - Session storage
   - Cookies

5. **React Component Debugging**:
   - Use React DevTools extension
   - Inspect component hierarchy
   - Check component props and state
   - Verify component lifecycle events

   ```javascript
   // Example of debugging React component state
   // In browser console with React DevTools installed
   $r.state // Shows state of selected component
   $r.props // Shows props of selected component
   ```

6. **Redux State Debugging** (if applicable):
   - Use Redux DevTools extension
   - Track state changes
   - Review action history
   - Test state mutations

### Backend Debugging

1. **Check server logs**:
   ```bash
   cd backend
   npm run dev
   # Watch for error messages in terminal
   ```

2. **Test API endpoints manually**:
   ```bash
   # Test game start
   curl -X POST http://172.16.50.34:5185/game/start \
     -H "Content-Type: application/json" \
     -d '{"name":"Debug","bet":50,"balance":500}'
   ```

3. **Enable debug logging**:
   ```typescript
   // Add to backend code
   console.log('Debug info:', data);
   ```

4. **Service-Level Debugging**:
   ```typescript
   // Example of debugging game service
   // Add to backend/src/services/GameService.ts
   
   // Debug game state transitions
   console.log(`[GameService] State transition: ${oldState} -> ${newState}`);
   
   // Debug card dealing
   console.log(`[GameService] Dealt card: ${card.rank} of ${card.suit}`);
   
   // Debug player actions
   console.log(`[GameService] Player action: ${action} by ${player.name}`);
   ```

5. **Socket.IO Event Debugging**:
   ```typescript
   // Add to backend socket handlers
   io.on('connection', (socket) => {
     // Log all incoming events
     socket.onAny((event, ...args) => {
       console.log(`[Socket] ${socket.id} emitted ${event}`, args);
     });
     
     // Log room joins
     socket.on('joinRoom', (roomId) => {
       console.log(`[Socket] ${socket.id} joining room ${roomId}`);
     });
   });
   ```

### Network Debugging

1. **Test connectivity**:
   ```bash
   # Test if backend is reachable
   telnet 172.16.50.34 5185
   ```

2. **Check DNS resolution**:
   ```bash
   nslookup 172.16.50.34
   ```

3. **Test with different networks**:
   - Try mobile hotspot
   - Test from different devices

4. **WebSocket Connection Debugging**:
   ```javascript
   // In browser console
   // Enable Socket.IO debug logs
   localStorage.debug = 'socket.io-client:socket';
   
   // Manually test connection
   const socket = io('http://172.16.50.34:5185', {
     transports: ['websocket'],
     reconnection: true,
     reconnectionAttempts: 5,
     reconnectionDelay: 1000
   });
   
   socket.on('connect', () => console.log('Connected!', socket.id));
   socket.on('connect_error', (err) => console.error('Connection error:', err));
   ```

## Frequently Asked Questions

### Q: Why can't I connect to the backend?

**A**: Most commonly this is due to:
- Backend server not running
- Wrong URL in frontend environment variables
- Firewall blocking the connection
- Port conflicts

Check that backend is running on the correct port and frontend is configured with the right URL.

### Q: Why do I get CORS errors?

**A**: CORS errors occur when the frontend and backend are on different origins. Ensure:
- Backend CORS is configured to allow frontend origin
- Environment variables match between frontend and backend
- No typos in URLs

### Q: Why doesn't multiplayer work?

**A**: Multiplayer requires WebSocket connections. Common issues:
- WebSocket connections blocked by firewall
- Incorrect Socket.IO URL configuration
- Network proxy interfering with WebSocket upgrade

### Q: Why is the game slow?

**A**: Performance issues can be caused by:
- Running development builds (use production builds for better performance)
- Network latency
- Browser extensions interfering
- Insufficient system resources

### Q: Can I change the default ports?

**A**: Yes, modify the environment variables:
- Backend: Change `PORT` in `backend/.env`
- Frontend: Change `VITE_DEV_PORT` in `frontend/.env`
- Update API URLs accordingly

### Q: Why do cards sometimes not appear?

**A**: This usually indicates:
- JavaScript errors preventing rendering
- API calls failing to return game state
- Network connectivity issues
- Browser compatibility problems

### Q: How do I reset everything?

**A**: For a complete reset:
```bash
# Stop all servers
# Delete all node_modules
rm -rf node_modules backend/node_modules frontend/node_modules

# Delete lock files
rm -f package-lock.json backend/package-lock.json frontend/package-lock.json

# Reinstall everything
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Restart servers
cd backend && npm run dev &
cd frontend && npm run dev
```

### Q: Where can I get more help?

**A**: If this guide doesn't solve your issue:
1. Check the browser console for specific error messages
2. Review the server logs for backend errors
3. Verify your environment matches the setup requirements
4. Try the debugging procedures outlined above
5. Contact the development team with specific error messages and steps to reproduce

## Getting Additional Support

If you're still experiencing issues after trying these solutions:

1. **Gather information**:
   - Operating system and version
   - Node.js version (`node --version`)
   - Browser and version
   - Exact error messages
   - Steps to reproduce the issue

2. **Check logs**:
   - Browser console errors
   - Backend server logs
   - Network request details

3. **Try minimal reproduction**:
   - Test with fresh installation
   - Use default configuration
   - Test on different device/network

4. **Document the issue**:
   - What you were trying to do
   - What you expected to happen
   - What actually happened
   - What you've already tried

This information will help the development team provide more targeted assistance.#
# Debugging Procedures

### Frontend Debugging

1. **Open browser developer tools** (F12)

2. **Check Console tab for errors**:
   - JavaScript errors
   - Network request failures
   - WebSocket connection issues

3. **Check Network tab**:
   - API request/response details
   - Failed requests
   - Response times

4. **Check Application tab**:
   - Local storage data
   - Session storage
   - Cookies

5. **React Component Debugging**:
   - Use React DevTools extension
   - Inspect component hierarchy
   - Check component props and state
   - Verify component lifecycle events

   ```javascript
   // Example of debugging React component state
   // In browser console with React DevTools installed
   $r.state // Shows state of selected component
   $r.props // Shows props of selected component
   ```

6. **Redux State Debugging** (if applicable):
   - Use Redux DevTools extension
   - Track state changes
   - Review action history
   - Test state mutations

### Backend Debugging

1. **Check server logs**:
   ```bash
   cd backend
   npm run dev
   # Watch for error messages in terminal
   ```

2. **Test API endpoints manually**:
   ```bash
   # Test game start
   curl -X POST http://172.16.50.34:5185/game/start \
     -H "Content-Type: application/json" \
     -d '{"name":"Debug","bet":50,"balance":500}'
   ```

3. **Enable debug logging**:
   ```typescript
   // Add to backend code
   console.log('Debug info:', data);
   ```

4. **Service-Level Debugging**:
   ```typescript
   // Example of debugging game service
   // Add to backend/src/services/GameService.ts
   
   // Debug game state transitions
   console.log(`[GameService] State transition: ${oldState} -> ${newState}`);
   
   // Debug card dealing
   console.log(`[GameService] Dealt card: ${card.rank} of ${card.suit}`);
   
   // Debug player actions
   console.log(`[GameService] Player action: ${action} by ${player.name}`);
   ```

5. **Socket.IO Event Debugging**:
   ```typescript
   // Add to backend socket handlers
   io.on('connection', (socket) => {
     // Log all incoming events
     socket.onAny((event, ...args) => {
       console.log(`[Socket] ${socket.id} emitted ${event}`, args);
     });
     
     // Log room joins
     socket.on('joinRoom', (roomId) => {
       console.log(`[Socket] ${socket.id} joining room ${roomId}`);
     });
   });
   ```

### Network Debugging

1. **Test connectivity**:
   ```bash
   # Test if backend is reachable
   telnet 172.16.50.34 5185
   ```

2. **Check DNS resolution**:
   ```bash
   nslookup 172.16.50.34
   ```

3. **Test with different networks**:
   - Try mobile hotspot
   - Test from different devices

4. **WebSocket Connection Debugging**:
   ```javascript
   // In browser console
   // Enable Socket.IO debug logs
   localStorage.debug = 'socket.io-client:socket';
   
   // Manually test connection
   const socket = io('http://172.16.50.34:5185', {
     transports: ['websocket'],
     reconnection: true,
     reconnectionAttempts: 5,
     reconnectionDelay: 1000
   });
   
   socket.on('connect', () => console.log('Connected!', socket.id));
   socket.on('connect_error', (err) => console.error('Connection error:', err));
   ```

# Deployment Issues

### Production Build Problems

**Problem**: Production build fails or behaves differently than development.

**Solutions**:

1. **Verify build process**:
   ```bash
   # Clean and rebuild frontend
   cd frontend
   rm -rf dist
   npm run build
   
   # Clean and rebuild backend
   cd ../backend
   rm -rf dist
   npm run build
   ```

2. **Check environment variables**:
   ```bash
   # Production environment variables should be set
   # In backend/.env.production
   NODE_ENV=production
   PORT=5185
   HOST=0.0.0.0
   
   # In frontend/.env.production
   VITE_API_URL=https://your-production-domain.com
   VITE_SOCKET_URL=https://your-production-domain.com
   ```

3. **Test production build locally**:
   ```bash
   # Test backend production build
   cd backend
   npm run build
   node dist/index.js
   
   # Test frontend production build
   cd ../frontend
   npm run build
   npm run preview
   ```

### Server Deployment Issues

**Problem**: Application doesn't run correctly on production server.

**Solutions**:

1. **Check server requirements**:
   - Node.js 18+ installed
   - Sufficient memory (minimum 1GB RAM)
   - Required ports open (5185 for backend)

2. **Verify file permissions**:
   ```bash
   # Set correct permissions
   chmod -R 755 /path/to/application
   ```

3. **Configure process manager**:
   ```bash
   # PM2 configuration example
   # ecosystem.config.js
   module.exports = {
     apps: [
       {
         name: 'blackjack-backend',
         script: './backend/dist/index.js',
         env: {
           NODE_ENV: 'production',
           PORT: 5185
         },
         instances: 1,
         autorestart: true,
         watch: false,
         max_memory_restart: '500M'
       }
     ]
   };
   
   # Start with PM2
   pm2 start ecosystem.config.js
   ```

### Docker Deployment Issues

**Problem**: Docker containers fail to start or communicate.

**Solutions**:

1. **Check Docker logs**:
   ```bash
   docker logs blackjack-backend
   docker logs blackjack-frontend
   ```

2. **Verify Docker network**:
   ```bash
   # Create custom network if needed
   docker network create blackjack-network
   
   # Verify containers are on same network
   docker network inspect blackjack-network
   ```

3. **Check Docker Compose configuration**:
   ```yaml
   # docker-compose.yml should include:
   version: '3'
   services:
     backend:
       build: ./backend
       ports:
         - "5185:5185"
       environment:
         - NODE_ENV=production
         - PORT=5185
     frontend:
       build: ./frontend
       ports:
         - "80:80"
       depends_on:
         - backend
   ```

## File Structure and Codebase Navigation

### Project Structure Overview

**Problem**: Difficulty understanding the codebase organization.

**Solution**: Here's a breakdown of the key directories and files:

```
blackjack-game/
├── backend/                  # Backend Node.js/Express application
│   ├── src/
│   │   ├── controllers/      # API endpoint controllers
│   │   ├── models/           # Game data models
│   │   ├── services/         # Business logic services
│   │   ├── socket/           # Socket.IO event handlers
│   │   └── index.ts          # Main application entry point
│   ├── package.json          # Backend dependencies
│   └── tsconfig.json         # TypeScript configuration
├── frontend/                 # React frontend application
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── components/       # React UI components
│   │   ├── contexts/         # React context providers
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Page components
│   │   ├── services/         # API and Socket services
│   │   ├── utils/            # Utility functions
│   │   └── App.tsx           # Main React component
│   ├── package.json          # Frontend dependencies
│   └── vite.config.js        # Vite configuration
└── docs/                     # Documentation files
```

### Common File Location Issues

**Problem**: Can't find specific files or code.

**Solutions**:

1. **Frontend component structure**:
   - UI components: `frontend/src/components/`
   - Game logic: `frontend/src/services/game.ts`
   - API calls: `frontend/src/services/api.ts`
   - Socket events: `frontend/src/services/socket.ts`

2. **Backend code organization**:
   - Game logic: `backend/src/services/GameService.ts`
   - API routes: `backend/src/controllers/`
   - Socket handlers: `backend/src/socket/`
   - Server configuration: `backend/src/index.ts`

3. **Configuration files**:
   - Environment variables: `.env`, `backend/.env`, `frontend/.env`
   - TypeScript config: `backend/tsconfig.json`
   - Vite config: `frontend/vite.config.js`
   - Package dependencies: `backend/package.json`, `frontend/package.json`

### React Component Hierarchy

**Problem**: Difficulty understanding React component relationships.

**Solution**: Here's the component hierarchy:

```
App
├── Router
│   ├── HomePage
│   │   └── GameModeSelector
│   ├── SinglePlayerPage
│   │   ├── GameBoard
│   │   │   ├── PlayerHand
│   │   │   ├── DealerHand
│   │   │   └── GameControls
│   │   └── GameStatus
│   ├── MultiplayerLobbyPage
│   │   ├── CreateRoomForm
│   │   └── JoinRoomForm
│   └── MultiplayerGamePage
│       ├── GameBoard
│       │   ├── PlayerHand (multiple)
│       │   ├── DealerHand
│       │   └── GameControls
│       ├── GameStatus
│       └── ChatBox
```

### Backend Service Architecture

**Problem**: Difficulty understanding backend service relationships.

**Solution**: Here's the backend architecture:

```
Express Application
├── Routes
│   ├── GameController
│   │   └── GameService
│   └── UserController
│       └── UserService
├── Socket.IO Server
│   ├── ConnectionHandler
│   ├── RoomHandler
│   │   └── RoomService
│   └── GameHandler
│       └── GameService
└── Shared Services
    ├── DeckService
    └── ScoreCalculationService
```
## 
Blackjack Game-Specific Troubleshooting

### Betting Issues

**Problem**: Unable to place bets or bet amounts not registering correctly.

**Symptoms**:
- Bet buttons don't respond
- Bet amount shows incorrectly
- Balance doesn't update after betting

**Solutions**:

1. **Check game state**:
   ```javascript
   // In browser console
   console.log(gameState.phase); // Should be "betting" to allow bets
   ```

2. **Verify player balance**:
   ```javascript
   // In browser console
   console.log(gameState.players[0].balance);
   ```

3. **Reset game state**:
   ```javascript
   // In browser console (single-player)
   socket.emit('resetGame');
   
   // Or via API
   fetch('http://172.16.50.34:5185/game/reset', {method: 'POST'});
   ```

### Card Dealing Problems

**Problem**: Cards are dealt incorrectly or not at all.

**Symptoms**:
- Missing cards in player or dealer hands
- Wrong number of cards dealt
- Cards appear in wrong positions

**Solutions**:

1. **Check deck state**:
   ```javascript
   // In browser console
   console.log(gameState.deck.length); // Should have cards remaining
   ```

2. **Verify hand arrays**:
   ```javascript
   // In browser console
   console.log(gameState.players[0].hand);
   console.log(gameState.dealer.hand);
   ```

3. **Inspect card rendering components**:
   - Check if card images are loading correctly
   - Verify CSS for card positioning
   - Check if card components receive proper props

### Scoring Calculation Issues

**Problem**: Hand scores are calculated incorrectly.

**Symptoms**:
- Wrong score displayed for hands
- Aces not counting as 1 or 11 properly
- Blackjack not being detected

**Solutions**:

1. **Check score calculation logic**:
   ```javascript
   // In browser console
   console.log(gameState.players[0].hand); // Check cards in hand
   console.log(gameState.players[0].score); // Check calculated score
   ```

2. **Verify ace handling**:
   ```javascript
   // Test with a hand containing an ace
   const hand = [{rank: 'A', suit: 'hearts'}, {rank: '7', suit: 'clubs'}];
   // Score should be 18 (Ace counted as 11)
   
   const hand2 = [{rank: 'A', suit: 'hearts'}, {rank: 'K', suit: 'clubs'}, {rank: 'Q', suit: 'diamonds'}];
   // Score should be 21 (Ace counted as 1)
   ```

3. **Check blackjack detection**:
   ```javascript
   // A hand with Ace + 10-value card should be blackjack
   const hand = [{rank: 'A', suit: 'hearts'}, {rank: 'K', suit: 'clubs'}];
   // Should trigger blackjack condition
   ```

### Game Action Issues

**Problem**: Game actions (hit, stand, double, split) don't work properly.

**Symptoms**:
- Buttons don't respond
- Actions don't affect game state
- Incorrect game flow after action

**Solutions**:

1. **Check game phase**:
   ```javascript
   // In browser console
   console.log(gameState.phase); // Should be "player_turn" for most actions
   ```

2. **Verify action handlers**:
   ```javascript
   // Test hit action manually
   socket.emit('playerAction', {action: 'hit'});
   
   // Test stand action manually
   socket.emit('playerAction', {action: 'stand'});
   ```

3. **Check for action restrictions**:
   - Double only allowed on first two cards
   - Split only allowed with matching card values
   - Actions disabled during dealer turn

### Multiplayer Turn Management Issues

**Problem**: Player turns not advancing correctly in multiplayer.

**Symptoms**:
- Wrong player gets turn
- Turn doesn't advance after player action
- Multiple players can act simultaneously

**Solutions**:

1. **Check current player index**:
   ```javascript
   // In browser console
   console.log(gameState.currentPlayerIndex);
   console.log(gameState.players.map(p => p.name)); // To see player order
   ```

2. **Verify turn advancement logic**:
   ```javascript
   // After standing, check if turn advances
   socket.emit('playerAction', {action: 'stand'});
   // Should see currentPlayerIndex increment
   ```

3. **Synchronize game state**:
   ```javascript
   // Room host can reset the game
   socket.emit('resetGame');
   ```

## Windows-Specific Troubleshooting

### Command Line Issues on Windows

**Problem**: Command line commands fail on Windows.

**Solutions**:

1. **Use correct path separators**:
   ```cmd
   cd backend
   cd frontend
   ```

2. **Run multiple commands**:
   ```cmd
   cd backend && npm run dev
   ```

3. **Fix permission issues**:
   - Run Command Prompt as Administrator
   - Check Windows Defender or antivirus blocking

### Windows Port Conflicts

**Problem**: Windows-specific port conflicts.

**Solutions**:

1. **Find processes using ports**:
   ```cmd
   netstat -ano | findstr :5185
   netstat -ano | findstr :5180
   ```

2. **Kill processes by PID**:
   ```cmd
   taskkill /PID 1234 /F
   ```

3. **Check Windows Firewall**:
   - Open Windows Defender Firewall
   - Allow Node.js through firewall
   - Add exceptions for ports 5185 and 5180

## Cross-References to Other Documentation

For more detailed information on specific topics, refer to these related documentation files:

- **API Issues**: See [API Documentation](API.md) for endpoint details and request formats
- **WebSocket Problems**: Check [WebSocket Events](WEBSOCKET.md) for event payloads and connection handling
- **Game Logic Questions**: Refer to [Game Logic](GAME_LOGIC.md) for rules implementation details
- **Setup Problems**: Review [Setup Guide](SETUP.md) for installation requirements
- **Architecture Questions**: See [Architecture Overview](ARCHITECTURE.md) for system design
- **Development Workflow**: Check [Development Guide](DEVELOPMENT.md) for code structure

## Troubleshooting Checklist

Use this quick checklist to systematically troubleshoot issues:

1. **Environment Setup**
   - [ ] Node.js version is 18.0+
   - [ ] All dependencies installed
   - [ ] Environment variables configured correctly

2. **Application Startup**
   - [ ] Backend server starts without errors
   - [ ] Frontend development server starts without errors
   - [ ] No port conflicts

3. **Connectivity**
   - [ ] Backend API endpoints reachable
   - [ ] WebSocket connection established
   - [ ] No CORS errors in console

4. **Game Functionality**
   - [ ] Game state initializes correctly
   - [ ] Cards deal properly
   - [ ] Game actions work as expected
   - [ ] Scoring calculates correctly

5. **Multiplayer Features**
   - [ ] Room creation works
   - [ ] Players can join rooms
   - [ ] Game state syncs between players
   - [ ] Turn management works correctly

This systematic approach will help identify and resolve most issues you might encounter with the Blackjack Game application.