# Design Document

## Overview

This design document outlines the technical implementation for four major enhancements to the Blackjack game application:

1. **Multiplayer Betting System with Casino Table Experience** - Realistic casino table UI with individual betting controls
2. **Docker Containerization** - Single container deployment for both services
3. **Secure Environment Configuration** - IP-focused environment variable management
4. **Code Optimization and Performance** - Performance improvements without breaking changes

## Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Container                          │
│  ┌─────────────────┐         ┌─────────────────────────────┐ │
│  │   Frontend      │         │        Backend              │ │
│  │   (React)       │◄────────┤   (Express + Socket.IO)    │ │
│  │                 │         │                             │ │
│  │ - Casino Table  │         │ - Betting Logic             │ │
│  │ - Betting UI    │         │ - Card Dealing              │ │
│  │ - Card Display  │         │ - Room Management           │ │
│  └─────────────────┘         └─────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Environment Configuration                   │ │
│  │  - HOST/IP variables from .env                          │ │
│  │  - Port mappings                                        │ │
│  │  - Service URLs                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Multiplayer Betting System and Casino Table

#### Frontend Components

**CasinoTable Component**
```typescript
interface CasinoTableProps {
  players: Player[];
  dealer: Dealer;
  gamePhase: GamePhase;
  currentTurn: number;
}

interface Player {
  id: string;
  name: string;
  position: number; // Table position (0-6)
  cards: Card[];
  total: number;
  bet: number;
  balance: number;
  status: 'playing' | 'stand' | 'bust' | 'blackjack';
  isCurrentPlayer: boolean;
}
```

**BettingPanel Component** (Reused from Single-Player)
```typescript
interface BettingPanelProps {
  balance: number;
  currentBet: number;
  onChipClick: (chipValue: number) => void;
  onAllIn: () => void;
  onClearBet: () => void;
  onPlaceBet: () => void;
  disabled: boolean;
}
```

**PlayerPosition Component**
```typescript
interface PlayerPositionProps {
  player: Player;
  isCurrentTurn: boolean;
  showCards: boolean;
}
```

#### Backend Data Models

**Enhanced Room Interface**
```typescript
interface Room {
  code: string;
  sockets: Set<string>;
  players: Map<string, MultiplayerPlayer>;
  creator: string;
  gameState: MultiplayerGameState | null;
  bettingPhase: boolean;
  playersReady: Set<string>;
}

interface MultiplayerPlayer {
  id: string;
  name: string;
  position: number;
  hand: Card[];
  total: number;
  bet: number;
  balance: number;
  status: PlayerStatus;
  hasPlacedBet: boolean;
}
```

#### Card Dealing Sequence Implementation

```typescript
class DealingSequence {
  static dealInitialCards(players: MultiplayerPlayer[], dealer: Dealer): void {
    // Round 1: One card face-up to each player
    players.forEach(player => {
      const card = this.drawCard();
      player.hand.push(card);
    });
    
    // Dealer gets one card face-up
    const dealerCard1 = this.drawCard();
    dealer.visibleCards.push(dealerCard1);
    
    // Round 2: Second card face-up to each player
    players.forEach(player => {
      const card = this.drawCard();
      player.hand.push(card);
      player.total = this.calculateHand(player.hand);
    });
    
    // Dealer gets hole card (face-down)
    const holeCard = this.drawCard();
    dealer.holeCard = holeCard;
  }
}
```

### 2. Docker Containerization

#### Dockerfile Structure
```dockerfile
# Multi-stage build for single container
FROM node:18-alpine AS builder

# Build backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ ./
RUN npm run build

# Build frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Copy backend build
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/package.json ./backend/

# Copy frontend build
COPY --from=builder /app/frontend/dist ./frontend/dist

# Install serve for frontend
RUN npm install -g serve concurrently

# Expose ports
EXPOSE 5185 5180

# Start both services
CMD ["concurrently", "\"cd backend && node dist/index.js\"", "\"serve -s frontend/dist -l 5180\""]
```

#### Docker Compose Configuration
```yaml
version: '3.8'
services:
  blackjack-app:
    build: .
    ports:
      - "${FRONTEND_PORT:-5180}:5180"
      - "${BACKEND_PORT:-5185}:5185"
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - HOST=${HOST:-0.0.0.0}
      - PORT=${BACKEND_PORT:-5185}
      - FRONTEND_URL=${FRONTEND_URL:-http://localhost:5180}
    env_file:
      - .env
    restart: unless-stopped
```

### 3. Environment Configuration System

#### Environment Variable Structure
```typescript
// config/environment.ts
interface EnvironmentConfig {
  // Network Configuration
  HOST: string;
  BACKEND_PORT: number;
  FRONTEND_PORT: number;
  
  // Service URLs
  API_BASE_URL: string;
  WEBSOCKET_URL: string;
  FRONTEND_URL: string;
  
  // Environment
  NODE_ENV: 'development' | 'production' | 'test';
  
  // CORS
  CORS_ORIGIN: string;
}

class ConfigManager {
  private static config: EnvironmentConfig;
  
  static load(): EnvironmentConfig {
    const requiredVars = ['HOST'];
    const missing = requiredVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    this.config = {
      HOST: process.env.HOST!,
      BACKEND_PORT: parseInt(process.env.BACKEND_PORT || '5185'),
      FRONTEND_PORT: parseInt(process.env.FRONTEND_PORT || '5180'),
      API_BASE_URL: `http://${process.env.HOST}:${process.env.BACKEND_PORT || '5185'}`,
      WEBSOCKET_URL: `ws://${process.env.HOST}:${process.env.BACKEND_PORT || '5185'}`,
      FRONTEND_URL: `http://${process.env.HOST}:${process.env.FRONTEND_PORT || '5180'}`,
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
    };
    
    return this.config;
  }
}
```

#### Environment Files Structure
```bash
# .env.example
HOST=192.168.1.100
BACKEND_PORT=5185
FRONTEND_PORT=5180
NODE_ENV=production
CORS_ORIGIN=*

# .env.development
HOST=localhost
BACKEND_PORT=5185
FRONTEND_PORT=5180
NODE_ENV=development
CORS_ORIGIN=http://localhost:5180

# .env.production
HOST=0.0.0.0
BACKEND_PORT=5185
FRONTEND_PORT=5180
NODE_ENV=production
CORS_ORIGIN=*
```

### 4. Code Optimization Strategy

#### React Component Optimizations

**Memoized Components**
```typescript
// Optimize heavy components
const CasinoTable = React.memo(({ players, dealer, gamePhase }: CasinoTableProps) => {
  const memoizedPlayers = useMemo(() => 
    players.map(player => ({
      ...player,
      displayCards: player.cards.map(card => ({ ...card }))
    })), [players]
  );
  
  return (
    <div className="casino-table">
      {memoizedPlayers.map(player => (
        <PlayerPosition key={player.id} player={player} />
      ))}
    </div>
  );
});

// Optimize betting panel
const BettingPanel = React.memo(({ balance, currentBet, onChipClick }: BettingPanelProps) => {
  const handleChipClick = useCallback((chipValue: number) => {
    onChipClick(chipValue);
  }, [onChipClick]);
  
  return (
    <div className="betting-panel">
      {CHIP_VALUES.map(value => (
        <ChipButton key={value} value={value} onClick={handleChipClick} />
      ))}
    </div>
  );
});
```

#### Backend Optimizations

**Efficient WebSocket Broadcasting**
```typescript
class OptimizedRoomManager {
  // Only send necessary data
  broadcastGameState(roomCode: string, gameState: MultiplayerGameState): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    
    // Create minimal state for broadcasting
    const minimalState = {
      players: gameState.players.map(p => ({
        id: p.id,
        name: p.name,
        cards: p.cards,
        total: p.total,
        bet: p.bet,
        status: p.status
      })),
      dealer: {
        visibleCards: gameState.dealer.visibleCards,
        total: gameState.dealer.total
      },
      phase: gameState.phase,
      turn: gameState.turn
    };
    
    room.sockets.forEach(socketId => {
      const socket = this.io.sockets.sockets.get(socketId);
      socket?.emit('gameStateUpdate', minimalState);
    });
  }
  
  // Batch operations
  async processBettingPhase(roomCode: string): Promise<void> {
    const room = this.rooms.get(roomCode);
    if (!room || room.playersReady.size !== room.players.size) return;
    
    // Process all bets in batch
    const updates = Array.from(room.players.values()).map(player => ({
      playerId: player.id,
      newBalance: player.balance - player.bet
    }));
    
    // Apply all updates atomically
    updates.forEach(update => {
      const player = room.players.get(update.playerId);
      if (player) player.balance = update.newBalance;
    });
    
    this.startGameRound(roomCode);
  }
}
```

## Data Models

### Enhanced Multiplayer Game State
```typescript
interface MultiplayerGameState {
  started: boolean;
  players: MultiplayerPlayer[];
  dealer: {
    visibleCards: Card[];
    holeCard?: Card;
    total: number;
    isBust: boolean;
    isBlackjack: boolean;
  };
  deck: Card[];
  turn: number;
  phase: 'betting' | 'dealing' | 'playing' | 'dealer' | 'result';
  bettingComplete: boolean;
  results?: { [playerId: string]: GameResult };
}

interface GameResult {
  status: 'win' | 'lose' | 'draw' | 'bust' | 'blackjack';
  payout: number;
  finalBalance: number;
}
```

## Error Handling

### Environment Configuration Errors
```typescript
class ConfigurationError extends Error {
  constructor(message: string, public missingVars: string[]) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

// Startup validation
try {
  const config = ConfigManager.load();
  console.log('✅ Configuration loaded successfully');
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error('❌ Configuration Error:', error.message);
    console.error('Missing variables:', error.missingVars);
    process.exit(1);
  }
}
```

### Docker Health Checks
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5185/health && curl -f http://localhost:5180 || exit 1
```

## Testing Strategy

### Component Testing
- Unit tests for betting logic
- Integration tests for casino table rendering
- WebSocket event testing for multiplayer scenarios

### Docker Testing
- Container build verification
- Service connectivity testing
- Environment variable validation

### Performance Testing
- React component render performance
- WebSocket message throughput
- Memory usage optimization validation

This design provides a comprehensive approach to implementing all four requirements while maintaining code quality and system reliability.