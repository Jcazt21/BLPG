# Development Guide

> **📖 Related Documentation:**
> - [Main README](README.md) - Project overview and quick start
> - [Setup Guide](SETUP.md) - Installation and configuration
> - [Architecture Overview](ARCHITECTURE.md) - Technical system design
> - [API Documentation](API.md) - REST API endpoints
> - [WebSocket Events](WEBSOCKET.md) - Real-time communication
> - [Game Logic](GAME_LOGIC.md) - Blackjack implementation details
> - [User Guide](USER_GUIDE.md) - How to play the game
> - [Troubleshooting](TROUBLESHOOTING.md) - Common development issues

## Table of Contents
- [Project Overview](#project-overview)
  - [Technology Stack](#technology-stack)
- [Codebase Structure](#codebase-structure)
  - [Key Directories Explained](#key-directories-explained)
- [Frontend Architecture](#frontend-architecture)
  - [React Component Hierarchy](#react-component-hierarchy)
  - [State Management](#state-management)
  - [Component Communication](#component-communication)
- [Backend Architecture](#backend-architecture)
  - [Service Layer Pattern](#service-layer-pattern)
  - [Session Management](#session-management)
  - [Multiplayer Architecture](#multiplayer-architecture)
- [Development Workflow](#development-workflow)
  - [Getting Started](#getting-started)
  - [Available Scripts](#available-scripts)
  - [Development Server Configuration](#development-server-configuration)
- [Code Style Guidelines](#code-style-guidelines)
  - [TypeScript/JavaScript Standards](#typescriptjavascript-standards)
  - [React Best Practices](#react-best-practices)
  - [Backend Patterns](#backend-patterns)
  - [File Naming Conventions](#file-naming-conventions)
- [Testing](#testing)
  - [Backend Testing](#backend-testing)
  - [Frontend Testing](#frontend-testing)
- [Contribution Guidelines](#contribution-guidelines)
  - [Before Contributing](#before-contributing)
  - [Making Changes](#making-changes)
  - [Pull Request Process](#pull-request-process)
  - [Code Review Guidelines](#code-review-guidelines)
  - [Common Development Tasks](#common-development-tasks)

## Project Overview

This is a full-stack blackjack game application built with modern web technologies. The project supports both single-player and multiplayer modes, featuring real-time communication through WebSockets.

### Technology Stack
- **Frontend**: React 19.1.0 with Vite build tool
- **Backend**: Node.js with Express.js and TypeScript
- **Real-time Communication**: Socket.IO for multiplayer functionality
- **Styling**: CSS with Tailwind CSS
- **Testing**: Jest for backend unit tests
- **Development Tools**: ESLint, TypeScript compiler

## Codebase Structure

```
project-root/
├── backend/                    # Backend Node.js application
│   ├── src/
│   │   ├── controllers/        # Request handlers and business logic
│   │   ├── routes/            # API route definitions
│   │   ├── services/          # Core game logic and session management
│   │   ├── types/             # TypeScript type definitions
│   │   └── index.ts           # Main server entry point
│   ├── package.json           # Backend dependencies and scripts
│   └── tsconfig.json          # TypeScript configuration
├── frontend/                  # React frontend application
│   ├── src/
│   │   ├── assets/            # Static assets (images, icons)
│   │   ├── App.jsx            # Main React component
│   │   ├── PlayingCard.jsx    # Card component
│   │   ├── main.jsx           # React app entry point
│   │   └── *.css              # Component styles
│   ├── public/                # Public static files
│   ├── package.json           # Frontend dependencies and scripts
│   ├── vite.config.js         # Vite build configuration
│   └── eslint.config.js       # ESLint configuration
├── docs/                      # Project documentation
├── .kiro/                     # Kiro IDE configuration
└── package.json               # Root package.json for shared dependencies
```

### Key Directories Explained

#### Backend Structure (`backend/src/`)
- **`controllers/`**: Contains HTTP request handlers that process API calls
- **`routes/`**: Defines API endpoints and maps them to controller functions
- **`services/`**: Core business logic, game state management, and session handling
- **`types/`**: TypeScript interfaces and type definitions for game entities
- **`index.ts`**: Main server file that sets up Express, Socket.IO, and multiplayer logic

#### Frontend Structure (`frontend/src/`)
- **`App.jsx`**: Main React component containing all game UI and state management
- **`PlayingCard.jsx`**: Reusable component for rendering playing cards
- **`main.jsx`**: React application entry point and root rendering
- **`assets/`**: Images, logos, and other static resources

## Frontend Architecture

> **🔗 Related Documentation:**
> - For user interface details, see [User Guide](USER_GUIDE.md#game-controls)
> - For technical architecture, see [Architecture Overview](ARCHITECTURE.md#frontend-architecture)
> - For multiplayer UI, see [WebSocket Events](WEBSOCKET.md#game-flow-and-phases)

### React Component Hierarchy

```
App (Main Component)
├── Mode Selection UI
├── Single Player Game UI
│   ├── PlayingCard components (Dealer hand)
│   ├── PlayingCard components (Player hand)
│   ├── Betting Panel
│   └── Action Buttons
└── Multiplayer Game UI
    ├── Room Management
    ├── Player List
    ├── Game State Display
    └── Turn-based Actions
```

### State Management

The application uses React's built-in `useState` hooks for state management:

**Core Game State:**
- `gameState`: Current game state from backend
- `sessionId`: Unique session identifier for API calls
- `status`: Game status ('idle', 'playing', 'win', 'lose', etc.)
- `balance`: Player's current chip balance
- `bet`: Current bet amount

**UI State:**
- `mode`: Game mode ('solo' or 'multi')
- `playerName`: Player's display name
- `betLocked`: Whether betting is currently disabled
- `cardFlipped`: Animation state for card reveals

**Multiplayer State:**
- `roomCode`: Current room identifier
- `joinedRoom`: Room the player has joined
- `players`: List of players in the room
- `multiGameState`: Multiplayer game state from Socket.IO

### Component Communication

- **Parent-Child**: Props are passed down from App to PlayingCard
- **API Communication**: Fetch API for REST endpoints
- **Real-time Communication**: Socket.IO for multiplayer events

## Backend Architecture

### Service Layer Pattern

The backend follows a layered architecture:

```
HTTP Request → Routes → Controllers → Services → Response
```

#### Controllers (`controllers/gameController.ts`)
- Handle HTTP request validation
- Extract request parameters
- Call appropriate service methods
- Format and return responses
- Handle error cases

#### Services (`services/gameService.ts`)
- Core game logic implementation
- Session management
- Game state calculations
- Card dealing and shuffling algorithms
- Blackjack rules enforcement

#### Types (`types/gameTypes.ts`)
- TypeScript interfaces for type safety
- Game entity definitions (Card, Player, Dealer, GameState)
- Ensures consistent data structures across the application

### Session Management

The backend implements a session-based architecture:

```typescript
interface UserSession {
  gameState: GameState | null;
  lastActivity: number;
  playerId: string;
}
```

- **Session Creation**: Each player gets a unique session ID
- **Session Cleanup**: Automatic cleanup of expired sessions (30-minute timeout)
- **State Persistence**: Game state is maintained per session
- **Concurrency**: Multiple players can play simultaneously

### Multiplayer Architecture

Real-time multiplayer is handled through Socket.IO:

**Room Management:**
- Players create or join rooms using 6-character codes
- Room state includes players, game state, and creator information
- Automatic cleanup when rooms become empty

**Game Synchronization:**
- Turn-based gameplay with server-side state management
- Real-time updates broadcast to all room participants
- Consistent game state across all clients

## Development Workflow

> **🔗 Related Documentation:**
> - For detailed installation instructions, see [Setup Guide](SETUP.md)
> - For troubleshooting development issues, see [Troubleshooting Guide](TROUBLESHOOTING.md#installation-issues)
> - For understanding the architecture, see [Architecture Overview](ARCHITECTURE.md)

### Getting Started

1. **Clone and Install Dependencies**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Environment Setup**
   - Copy `.env.example` to `.env` (if exists)
   - Configure environment variables as needed

3. **Development Servers**
   ```bash
   # Terminal 1: Backend development server
   cd backend
   npm run dev

   # Terminal 2: Frontend development server
   cd frontend
   npm run dev
   ```

### Available Scripts

#### Backend Scripts
```bash
npm run dev      # Start development server with hot reload
npm run build    # Compile TypeScript to JavaScript
npm run start    # Start production server
npm test         # Run Jest tests
```

#### Frontend Scripts
```bash
npm run dev      # Start Vite development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Development Server Configuration

> **🔗 Related Documentation:**
> - For detailed environment setup, see [Setup Guide](SETUP.md#environment-variables)
> - For troubleshooting environment issues, see [Troubleshooting Guide](TROUBLESHOOTING.md#environment-variable-issues)

- **Backend**: Runs on `http://172.16.50.34:5185`
- **Frontend**: Runs on `http://0.0.0.0:5180`
- **Hot Reload**: Both servers support hot reloading during development

## Code Style Guidelines

### TypeScript/JavaScript Standards

- Use TypeScript for all backend code
- Follow ESLint configuration for frontend code
- Use meaningful variable and function names
- Add JSDoc comments for complex functions

### React Best Practices

- Use functional components with hooks
- Keep components focused and single-purpose
- Use descriptive prop names
- Handle loading and error states appropriately

### Backend Patterns

- Follow RESTful API conventions
- Use proper HTTP status codes
- Implement comprehensive error handling
- Validate all input parameters

### File Naming Conventions

- **Components**: PascalCase (e.g., `PlayingCard.jsx`)
- **Services**: camelCase (e.g., `gameService.ts`)
- **Types**: camelCase with descriptive names (e.g., `gameTypes.ts`)
- **CSS**: kebab-case (e.g., `playing-card.css`)

## Testing

> **🔗 Related Documentation:**
> - For game logic implementation details, see [Game Logic](GAME_LOGIC.md#implementation-notes)
> - For API endpoints to test, see [API Documentation](API.md#rest-api-endpoints)
> - For troubleshooting test issues, see [Troubleshooting Guide](TROUBLESHOOTING.md#debugging-procedures)
> - For WebSocket testing, see [WebSocket Events](WEBSOCKET.md#connection-events)

### Backend Testing

The backend uses Jest for unit testing:

```bash
cd backend
npm test
```

**Test Structure:**
- Tests are located alongside source files (e.g., `gameService.test.ts`)
- Focus on testing core game logic and edge cases
- Mock external dependencies when necessary

**Key Test Areas:**
- Game logic calculations (hand totals, blackjack detection)
- Session management
- API endpoint validation
- Error handling scenarios

### Frontend Testing

Currently, the frontend relies on manual testing. Consider adding:
- Component testing with React Testing Library
- End-to-end testing with Cypress or Playwright
- Visual regression testing

## Contribution Guidelines

### Before Contributing

1. **Understand the Architecture**: Review this document and existing code
2. **Set Up Development Environment**: Follow the getting started guide
3. **Run Tests**: Ensure all existing tests pass
4. **Check Code Style**: Run linting tools

### Making Changes

1. **Create Feature Branch**: Use descriptive branch names
   ```bash
   git checkout -b feature/add-insurance-betting
   ```

2. **Follow Coding Standards**: Adhere to established patterns
3. **Write Tests**: Add tests for new functionality
4. **Update Documentation**: Update relevant documentation files

### Pull Request Process

1. **Test Your Changes**: Ensure all tests pass
2. **Update Documentation**: Include any necessary documentation updates
3. **Describe Changes**: Provide clear description of what was changed and why
4. **Review Checklist**:
   - [ ] Code follows established patterns
   - [ ] Tests are included and passing
   - [ ] Documentation is updated
   - [ ] No breaking changes (or properly documented)

### Code Review Guidelines

- Focus on code quality, maintainability, and performance
- Ensure changes align with project architecture
- Verify that new features work in both single-player and multiplayer modes
- Check for proper error handling and edge cases

### Common Development Tasks

#### Adding a New Game Feature

1. **Define Types**: Add necessary TypeScript interfaces in `types/gameTypes.ts`
2. **Implement Logic**: Add core logic to `services/gameService.ts`
3. **Create API Endpoint**: Add route and controller methods
4. **Update Frontend**: Modify React components to use new feature
5. **Add Tests**: Write unit tests for the new functionality

#### Modifying UI Components

1. **Update Component**: Modify the React component
2. **Update Styles**: Adjust CSS as needed
3. **Test Responsiveness**: Ensure UI works on different screen sizes
4. **Test Both Modes**: Verify changes work in single-player and multiplayer

#### Debugging Common Issues

- **Session Issues**: Check session management in `gameService.ts`
- **Socket.IO Problems**: Review multiplayer logic in `backend/src/index.ts`
- **State Synchronization**: Ensure frontend state matches backend responses
- **Card Rendering**: Check `PlayingCard.jsx` component and CSS

This development guide provides the foundation for understanding and contributing to the blackjack game codebase. For specific implementation details, refer to the inline code comments and other documentation files.