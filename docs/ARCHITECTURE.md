# Technical Architecture Documentation

> **📖 Related Documentation:**
> - [Main README](README.md) - Project overview and quick start
> - [Setup Guide](SETUP.md) - Installation and configuration
> - [Development Guide](DEVELOPMENT.md) - Code structure and workflow
> - [API Documentation](API.md) - REST API endpoints
> - [WebSocket Events](WEBSOCKET.md) - Real-time communication
> - [Game Logic](GAME_LOGIC.md) - Blackjack implementation details
> - [User Guide](USER_GUIDE.md) - How to play the game
> - [Troubleshooting](TROUBLESHOOTING.md) - Common issues and solutions

## Table of Contents

- [System Overview](#system-overview)
- [Technology Stack](#technology-stack)
- [Frontend Architecture](#frontend-architecture)
  - [Component Hierarchy](#component-hierarchy)
  - [State Management](#state-management)
  - [Component Design Patterns](#component-design-patterns)
- [Backend Architecture](#backend-architecture)
  - [Service Architecture](#service-architecture)
  - [Core Services](#core-services)
  - [Data Models](#data-models)
- [Communication Protocols](#communication-protocols)
  - [REST API Endpoints](#rest-api-endpoints)
  - [WebSocket Events](#websocket-events)
- [Data Flow](#data-flow)
  - [Single-Player Flow](#single-player-flow)
  - [Multiplayer Flow](#multiplayer-flow)
- [Security Considerations](#security-considerations)
- [Performance Optimizations](#performance-optimizations)
- [Deployment Architecture](#deployment-architecture)
- [Testing Strategy](#testing-strategy)
- [Scalability Considerations](#scalability-considerations)
- [Future Architecture Enhancements](#future-architecture-enhancements)

## System Overview

The Blackjack application is a full-stack web application built with a modern JavaScript/TypeScript stack, featuring both single-player and multiplayer game modes. The system follows a client-server architecture with real-time communication capabilities.

### High-Level Architecture

```
┌─────────────────┐    HTTP/REST     ┌─────────────────┐
│                 │ ◄──────────────► │                 │
│   React Client  │                  │  Express Server │
│   (Frontend)    │                  │   (Backend)     │
│                 │ ◄──────────────► │                 │
└─────────────────┘   WebSocket      └─────────────────┘
                      (Socket.IO)
```

## Technology Stack

> **📝 Note:** All version information has been verified against package.json files

### Frontend Technologies
- **React 19.1.0**: Modern UI library with hooks and functional components
- **Vite 7.0.0**: Fast build tool and development server
- **Socket.IO Client 4.7.5**: Real-time bidirectional communication
- **Tailwind CSS 4.1.11**: Utility-first CSS framework
- **ESLint**: Code linting and quality assurance

### Backend Technologies
- **Node.js**: JavaScript runtime environment
- **Express 5.1.0**: Web application framework
- **TypeScript 5.8.3**: Type-safe JavaScript superset
- **Socket.IO 4.7.5**: Real-time WebSocket communication
- **CORS 2.8.5**: Cross-origin resource sharing middleware
- **Jest 29.0.0**: Testing framework
- **dotenv 17.0.1**: Environment variable management

### Development Tools
- **ts-node**: TypeScript execution for development
- **Vite Dev Server**: Hot module replacement and fast refresh
- **ESLint**: Code quality and consistency
- **TypeScript Compiler**: Type checking and compilation

## Frontend Architecture

> **🔗 Related Documentation:**
> - For development workflow details, see [Development Guide](DEVELOPMENT.md#frontend-architecture)
> - For user interface details, see [User Guide](USER_GUIDE.md#game-controls)
> - For troubleshooting frontend issues, see [Troubleshooting Guide](TROUBLESHOOTING.md#browser-compatibility)

### Component Hierarchy

```
App (Root Component)
├── Mode Selection
│   ├── Solo Mode
│   └── Multiplayer Mode
├── Game Interface
│   ├── Dealer Section
│   │   ├── PlayingCard Components
│   │   └── Hand Total Display
│   ├── Player Section
│   │   ├── PlayingCard Components
│   │   ├── Hand Total Display
│   │   └── Action Buttons
│   └── Betting Panel
│       ├── Chip Buttons
│       ├── Bet Controls
│       └── Balance Display
└── Multiplayer Lobby
    ├── Room Creation/Joining
    ├── Player List
    └── Game Controls
```

### State Management

The application uses React's built-in state management with hooks:

#### Core State Variables
- `mode`: Game mode selection ('solo' | 'multi' | null)
- `gameState`: Current game state from backend
- `sessionId`: Unique session identifier for API calls
- `playerName`: Player's display name
- `balance`: Player's current chip balance
- `bet`: Current bet amount
- `status`: Game status ('idle' | 'playing' | 'win' | 'lose' | 'draw' | 'blackjack' | 'bust')

#### Multiplayer State
- `roomCode`: Current room identifier
- `joinedRoom`: Room the player has joined
- `players`: List of players in the room
- `multiGameState`: Multiplayer game state
- `socketId`: Socket.IO connection identifier
- `creatorId`: Room creator's socket ID

### Component Design Patterns

#### PlayingCard Component
```javascript
PlayingCard({ value, suit, faceDown, flipped })
```
- **Props**: Card value, suit, face-down state, flip animation state
- **Styling**: CSS-based card design with suit colors and symbols
- **Animation**: Flip transitions for card reveals

#### State Updates
- **API Integration**: RESTful calls for single-player actions
- **WebSocket Events**: Real-time multiplayer communication
- **Error Handling**: User-friendly error messages and validation

## Backend Architecture

> **🔗 Related Documentation:**
> - For development workflow details, see [Development Guide](DEVELOPMENT.md#backend-architecture)
> - For API implementation details, see [API Documentation](API.md)
> - For troubleshooting backend issues, see [Troubleshooting Guide](TROUBLESHOOTING.md#runtime-problems)

### Service Architecture

```
┌─────────────────┐
│   HTTP Server   │
│   (Express)     │
├─────────────────┤
│   Routes        │
│ ┌─────────────┐ │
│ │ gameRoutes  │ │
│ └─────────────┘ │
├─────────────────┤
│  Controllers    │
│ ┌─────────────┐ │
│ │gameController│ │
│ └─────────────┘ │
├─────────────────┤
│   Services      │
│ ┌─────────────┐ │
│ │ gameService │ │
│ └─────────────┘ │
├─────────────────┤
│   Types         │
│ ┌─────────────┐ │
│ │ gameTypes   │ │
│ └─────────────┘ │
└─────────────────┘

┌─────────────────┐
│ WebSocket Server│
│  (Socket.IO)    │
├─────────────────┤
│ Room Management │
│ Event Handlers  │
│ Game Logic      │
└─────────────────┘
```

### Core Services

#### GameService (Single-Player)
- **Session Management**: Unique session tracking with timeout cleanup
- **Game Logic**: Card dealing, hand calculation, game rules enforcement
- **State Persistence**: In-memory game state storage
- **Payout Calculation**: Betting and winning calculations

#### Socket.IO Server (Multiplayer)
- **Room Management**: Create, join, leave room functionality
- **Player Synchronization**: Real-time game state updates
- **Turn Management**: Sequential player turn handling
- **Game State Broadcasting**: Synchronized game state across clients

### Data Models

#### Core Game Types
```typescript
interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
}

interface Hand {
  cards: Card[];
  total: number;
  isBlackjack: boolean;
  isBust: boolean;
}

interface Player {
  name: string;
  hands: Hand[];
  balance: number;
  bet: number;
  splitActive?: boolean;
  activeHand?: number;
}

interface GameState {
  player: Player;
  dealer: Dealer;
  deck: Deck;
  status: GameStatus;
  phase: GamePhase;
  canDoubleDown?: boolean;
  canSplit?: boolean;
}
```

#### Multiplayer Types
```typescript
interface Room {
  sockets: Set<string>;
  players: Player[];
  creator: string;
  gameState: GameState | null;
}

interface MultiplayerGameState {
  started: boolean;
  players: Player[];
  dealer: Dealer;
  deck: Card[];
  turn: number;
  phase: 'betting' | 'playing' | 'dealer' | 'result';
  results?: { [playerId: string]: 'win' | 'lose' | 'draw' | 'bust' | 'blackjack' };
}
```

## Communication Protocols

### REST API Endpoints

#### Single-Player Game API
- `POST /game/start`: Initialize new game session
- `POST /game/hit`: Draw additional card
- `POST /game/stand`: End player turn
- `POST /game/double`: Double down bet and draw one card
- `POST /game/split`: Split pair into two hands
- `POST /game/restart`: Start new round with same session

### WebSocket Events

#### Room Management
- `createRoom`: Create new multiplayer room
- `joinRoom`: Join existing room by code
- `leaveRoom`: Leave current room
- `playersUpdate`: Broadcast player list changes

#### Game Events
- `startGameInRoom`: Initialize multiplayer game
- `restartGameInRoom`: Start new round
- `playerAction`: Player game actions (hit, stand, double, split)
- `gameStarted`: Game initialization broadcast
- `gameStateUpdate`: Real-time game state synchronization

## Data Flow

### Single-Player Flow
1. **Session Creation**: Player starts game, backend creates session
2. **Game Initialization**: Cards dealt, initial state established
3. **Player Actions**: Frontend sends action requests to backend
4. **State Updates**: Backend processes actions, returns updated state
5. **Game Resolution**: Final results calculated and returned

### Multiplayer Flow
1. **Room Creation/Joining**: Players connect via WebSocket
2. **Game Initialization**: Creator starts game, state broadcast to all players
3. **Turn Management**: Sequential player actions with state synchronization
4. **Real-time Updates**: All players receive immediate state updates
5. **Game Resolution**: Results calculated and broadcast to all players

## Security Considerations

> **🔗 Related Documentation:**
> - For API security details, see [API Documentation](API.md#security-considerations)
> - For WebSocket security, see [WebSocket Events](WEBSOCKET.md#security-considerations)
> - For troubleshooting security issues, see [Troubleshooting Guide](TROUBLESHOOTING.md)

### Session Management
- **Session Timeout**: 30-minute inactivity timeout
- **Session Isolation**: Each session maintains separate game state
- **Input Validation**: Server-side validation of all game actions

### Network Security
- **CORS Configuration**: Controlled cross-origin access
- **WebSocket Authentication**: Socket ID-based player identification
- **Room Access Control**: Creator-only game control permissions

## Performance Optimizations

### Frontend Optimizations
- **Component Memoization**: Prevent unnecessary re-renders
- **State Batching**: Efficient state updates
- **Asset Optimization**: Optimized card graphics and animations

### Backend Optimizations
- **Session Cleanup**: Automatic removal of expired sessions
- **Memory Management**: Efficient deck and hand calculations
- **Connection Pooling**: Optimized WebSocket connection handling

## Deployment Architecture

### Development Environment
- **Frontend**: Vite dev server on port 5180
- **Backend**: Express server on port 5185
- **Host Configuration**: Configurable host binding (default: 172.16.50.34)

### Build Process
- **Frontend Build**: Vite production build with asset optimization
- **Backend Build**: TypeScript compilation to JavaScript
- **Environment Configuration**: Environment variable support

### Production Considerations
- **Process Management**: PM2 or similar process manager
- **Reverse Proxy**: Nginx for static file serving and load balancing
- **SSL/TLS**: HTTPS encryption for production deployment
- **Database Integration**: Future database integration for persistent storage

## Testing Strategy

### Backend Testing
- **Unit Tests**: Jest-based service and utility testing
- **Integration Tests**: API endpoint testing
- **Game Logic Tests**: Comprehensive blackjack rule validation

### Frontend Testing
- **Component Tests**: React component unit testing
- **Integration Tests**: User interaction flow testing
- **E2E Tests**: Full application workflow validation

## Scalability Considerations

### Horizontal Scaling
- **Stateless Design**: Session-based architecture supports load balancing
- **WebSocket Clustering**: Socket.IO clustering for multiple server instances
- **Database Integration**: Future persistent storage for user data

### Performance Monitoring
- **Session Metrics**: Active session tracking
- **Connection Monitoring**: WebSocket connection health
- **Error Tracking**: Comprehensive error logging and monitoring

## Future Architecture Enhancements

### Planned Improvements
- **Database Integration**: PostgreSQL or MongoDB for persistent storage
- **User Authentication**: JWT-based user authentication system
- **Game Statistics**: Player statistics and game history tracking
- **Tournament Mode**: Multi-table tournament functionality
- **Mobile Optimization**: Progressive Web App (PWA) capabilities

### Technical Debt
- **Type Safety**: Complete TypeScript migration for frontend
- **Error Boundaries**: React error boundary implementation
- **State Management**: Consider Redux for complex state scenarios
- **Testing Coverage**: Increase test coverage to 90%+