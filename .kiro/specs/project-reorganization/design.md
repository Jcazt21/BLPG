# Design Document

## Overview

This design outlines the approach for reorganizing the blackjack game application's structure to improve maintainability, scalability, and code organization. The reorganization will focus on creating a more logical directory structure, improving code modularity, and establishing consistent naming conventions and coding standards.

## Architecture

### Current Structure

The current project structure has several issues:

1. Test files are scattered in the root directory
2. Backend code has multiplayer logic mixed with the main server file
3. Frontend components are not organized by feature or type
4. Lack of consistent naming conventions and organization patterns

### Proposed Structure

```
/
├── backend/
│   ├── src/
│   │   ├── config/           # Configuration files
│   │   ├── controllers/      # Route controllers
│   │   ├── middlewares/      # Express middlewares
│   │   ├── models/           # Data models
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   │   ├── game/         # Single-player game logic
│   │   │   └── multiplayer/  # Multiplayer game logic
│   │   ├── types/            # TypeScript type definitions
│   │   ├── utils/            # Utility functions
│   │   └── index.ts          # Application entry point
│   ├── tests/                # Backend-specific tests
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── assets/           # Static assets
│   │   ├── components/       # React components
│   │   │   ├── common/       # Shared components
│   │   │   ├── game/         # Game-specific components
│   │   │   ├── multiplayer/  # Multiplayer-specific components
│   │   │   └── ui/           # UI components (buttons, inputs, etc.)
│   │   ├── config/           # Frontend configuration
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Page components
│   │   ├── services/         # API and socket services
│   │   ├── types/            # TypeScript type definitions
│   │   ├── utils/            # Utility functions
│   │   ├── App.jsx           # Main App component
│   │   └── main.jsx          # Entry point
│   └── package.json
├── tests/                    # Project-wide tests
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   ├── e2e/                  # End-to-end tests
│   └── performance/          # Performance tests
├── .env                      # Environment variables
├── .env.example              # Example environment variables
├── docker-compose.yml        # Docker Compose configuration
├── Dockerfile                # Docker configuration
└── package.json              # Root package.json
```

## Components and Interfaces

### Backend Components

#### 1. Server Component
- **Purpose**: Main Express server setup and configuration
- **Location**: `/backend/src/index.ts`
- **Responsibilities**: 
  - Configure Express server
  - Set up middleware
  - Initialize routes
  - Start HTTP server
  - Health check endpoint

#### 2. Multiplayer Service
- **Purpose**: Handle multiplayer game logic
- **Location**: `/backend/src/services/multiplayer/`
- **Files**:
  - `roomManager.ts`: Room creation and management
  - `gameState.ts`: Multiplayer game state management
  - `eventHandlers.ts`: Socket.IO event handlers
  - `types.ts`: Multiplayer-specific types

#### 3. Game Service
- **Purpose**: Handle single-player game logic
- **Location**: `/backend/src/services/game/`
- **Files**:
  - `gameService.ts`: Game logic implementation
  - `dealingSequence.ts`: Card dealing logic
  - `sessionManager.ts`: Session management

### Frontend Components

#### 1. Game Components
- **Purpose**: Components specific to the game UI
- **Location**: `/frontend/src/components/game/`
- **Files**:
  - `PlayingCard.jsx`: Card display component
  - `DealerHand.jsx`: Dealer's hand component
  - `PlayerHand.jsx`: Player's hand component
  - `GameControls.jsx`: Game action buttons

#### 2. Multiplayer Components
- **Purpose**: Components specific to multiplayer functionality
- **Location**: `/frontend/src/components/multiplayer/`
- **Files**:
  - `RoomCreation.jsx`: Room creation form
  - `RoomJoining.jsx`: Room joining form
  - `PlayersList.jsx`: List of players in room
  - `MultiplayerControls.jsx`: Multiplayer-specific controls

#### 3. Common Components
- **Purpose**: Shared components used across the application
- **Location**: `/frontend/src/components/common/`
- **Files**:
  - `Header.jsx`: Application header
  - `Footer.jsx`: Application footer
  - `Layout.jsx`: Page layout wrapper

## Data Models

### Game Models
```typescript
// /backend/src/models/Card.ts
export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
}

// /backend/src/models/Hand.ts
export interface Hand {
  cards: Card[];
  total: number;
  isBlackjack: boolean;
  isBust: boolean;
}

// /backend/src/models/Player.ts
export interface Player {
  name: string;
  hands: Hand[];
  balance: number;
  bet: number;
  splitActive?: boolean;
  activeHand?: number;
}
```

### Multiplayer Models
```typescript
// /backend/src/models/Room.ts
export interface Room {
  code: string;
  sockets: Set<string>;
  players: Map<string, MultiplayerPlayer>;
  creator: string;
  gameState: MultiplayerGameState | null;
  bettingPhase: boolean;
  playersReady: Set<string>;
}

// /backend/src/models/MultiplayerPlayer.ts
export interface MultiplayerPlayer {
  id: string;
  name: string;
  position: number;
  hand: Card[];
  total: number;
  isBust: boolean;
  isStand: boolean;
  isBlackjack: boolean;
  bet: number;
  balance: number;
  hasPlacedBet: boolean;
  status: 'playing' | 'stand' | 'bust' | 'blackjack';
}
```

## Implementation Approach

### Phase 1: Test Reorganization
1. Create the `/tests` directory structure
2. Move existing test files to appropriate subdirectories
3. Update test scripts in package.json

### Phase 2: Backend Reorganization
1. Create new directory structure in backend
2. Extract multiplayer logic from index.ts to dedicated files
3. Organize types and models into appropriate files
4. Update imports and references

### Phase 3: Frontend Reorganization
1. Create new directory structure in frontend
2. Organize components by feature and type
3. Create dedicated directories for contexts, hooks, and services
4. Update imports and references

### Phase 4: Documentation and Standards
1. Update documentation to reflect new structure
2. Establish coding standards and naming conventions
3. Create README files for key directories
4. Update development workflow documentation

## Migration Strategy

To minimize disruption during the reorganization:

1. **Incremental Approach**: Implement changes in small, testable increments
2. **Maintain Functionality**: Ensure each change preserves existing functionality
3. **Comprehensive Testing**: Run tests after each significant change
4. **Feature Branches**: Use feature branches for each phase of reorganization
5. **Documentation**: Update documentation alongside code changes

## Naming Conventions

### Files and Directories
- **React Components**: PascalCase (e.g., `PlayingCard.jsx`)
- **Services, Utilities**: camelCase (e.g., `gameService.ts`)
- **Directories**: lowercase with hyphens for multi-word names (e.g., `game-logic`)
- **Test Files**: Original filename with `.test` or `.spec` suffix (e.g., `gameService.test.ts`)

### Code Conventions
- **Interfaces/Types**: PascalCase with descriptive names (e.g., `PlayerState`)
- **Functions**: camelCase with verb prefixes (e.g., `calculateHandTotal`)
- **Constants**: UPPER_SNAKE_CASE for true constants (e.g., `MAX_PLAYERS`)
- **Component Props**: Defined as interfaces with `Props` suffix (e.g., `CardProps`)

## Testing Strategy

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test interactions between components and services
- **E2E Tests**: Test complete user flows from UI to backend and back
- **Performance Tests**: Test system performance under various conditions

Each test type will have its own directory and can be run independently or as part of a complete test suite.