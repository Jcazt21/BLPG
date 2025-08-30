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

This is a full-stack blackjack casino game application built with modern web technologies. The project supports both single-player and multiplayer modes, featuring real-time communication through WebSockets, an intelligent AI help system, and comprehensive victory tracking.

### Technology Stack
- **Frontend**: React 19.1.0 with Vite build tool and Tailwind CSS
- **Backend**: Node.js with Express.js and TypeScript
- **Real-time Communication**: Socket.IO for multiplayer functionality
- **AI Integration**: Gemini AI for intelligent dealer assistance
- **Testing**: Jest for backend, organized test suite for comprehensive testing
- **Development Tools**: ESLint, TypeScript compiler, organized scripts and tools

### Project Organization

This project follows a clean, organized structure that was recently reorganized for better maintainability:

#### ✅ **Benefits of Current Organization**
- **Clear Separation**: Tests, documentation, and scripts are in dedicated directories
- **Feature-Based Docs**: Documentation is organized by feature and audience
- **Scalable Testing**: Comprehensive test suite organized by type and scope
- **Professional Structure**: Clean root directory with logical file placement
- **Easy Navigation**: Intuitive directory structure for finding files quickly

#### 📋 **Migration Information**
The project was recently reorganized from a scattered file structure to the current organized approach. For details about what was moved and why, see [Project Migration Guide](development/PROJECT_MIGRATION.md).

## Codebase Structure

```
blackjack-casino/
├── backend/                    # Backend Node.js application
│   ├── src/
│   │   ├── controllers/        # Request handlers and business logic
│   │   ├── routes/            # API route definitions
│   │   ├── services/          # Core game logic and session management
│   │   │   ├── helpAssistant/ # AI help system services
│   │   │   └── *.ts           # Game services
│   │   ├── sockets/           # Socket.IO handlers and namespaces
│   │   ├── types/             # TypeScript type definitions
│   │   └── index.ts           # Main server entry point
│   ├── scripts/               # Backend utility scripts
│   ├── package.json           # Backend dependencies and scripts
│   └── tsconfig.json          # TypeScript configuration
├── frontend/                  # React frontend application
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── help/          # AI help system components
│   │   │   └── *.jsx          # Game components
│   │   ├── services/          # Frontend services
│   │   ├── assets/            # Static assets (images, icons)
│   │   ├── App.jsx            # Main React component
│   │   └── main.jsx           # React app entry point
│   ├── public/                # Public static files
│   ├── package.json           # Frontend dependencies and scripts
│   ├── vite.config.js         # Vite build configuration
│   └── eslint.config.js       # ESLint configuration
├── docs/                      # 📚 Comprehensive Documentation
│   ├── features/              # Feature-specific documentation
│   │   ├── victory-counter/   # Victory tracking system docs
│   │   └── dealer-assistant/  # AI help system docs
│   ├── development/           # Development guides and migration docs
│   ├── *.md                   # Core documentation files
├── tests/                     # 🧪 Organized Test Suite
│   ├── e2e/                   # End-to-end tests
│   ├── integration/           # Integration tests
│   │   └── dealer/            # Dealer system integration tests
│   ├── unit/                  # Unit tests
│   │   ├── dealer/            # Dealer logic unit tests
│   │   └── victory/           # Victory system unit tests
│   ├── performance/           # Performance tests
│   └── *.js                   # Additional test files
├── scripts/                   # 🔧 Project Scripts
│   ├── run-tests.js           # Test runner utility
│   └── run-docker.bat         # Docker startup script
├── tools/                     # 🛠️ Development Tools
│   └── testing/               # Testing utilities and tools
├── .kiro/                     # Kiro AI assistant specifications
└── package.json               # Root package.json for shared dependencies
```

### Key Directories Explained

#### Backend Structure (`backend/src/`)
- **`controllers/`**: Contains HTTP request handlers that process API calls
- **`routes/`**: Defines API endpoints and maps them to controller functions
- **`services/`**: Core business logic, game state management, and session handling
  - **`helpAssistant/`**: AI-powered help system with Gemini integration
- **`sockets/`**: Socket.IO namespaces, handlers, and real-time communication logic
- **`types/`**: TypeScript interfaces and type definitions for game entities
- **`index.ts`**: Main server file that sets up Express, Socket.IO, and multiplayer logic

#### Frontend Structure (`frontend/src/`)
- **`components/`**: React components organized by functionality
  - **`help/`**: AI help system UI components (chat, buttons, messages)
- **`services/`**: Frontend service layer for API communication
- **`App.jsx`**: Main React component containing all game UI and state management
- **`main.jsx`**: React application entry point and root rendering
- **`assets/`**: Images, logos, and other static resources

#### Documentation Structure (`docs/`)
- **`features/`**: Feature-specific documentation organized by system
  - **`victory-counter/`**: Victory tracking system documentation
  - **`dealer-assistant/`**: AI help system documentation and templates
- **`development/`**: Development guides, migration docs, and technical references
- **Core files**: API docs, architecture, setup guides, and user documentation

#### Test Structure (`tests/`)
- **`e2e/`**: End-to-end tests for complete user workflows
- **`integration/`**: Multi-component integration tests
  - **`dealer/`**: Dealer system integration tests
- **`unit/`**: Individual component and service unit tests
  - **`dealer/`**: Dealer logic and behavior unit tests
  - **`victory/`**: Victory counter system unit tests
- **`performance/`**: Load testing and performance validation

#### Scripts and Tools
- **`scripts/`**: Project-level utility scripts for testing and deployment
- **`tools/`**: Development tools, testing utilities, and helper applications

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

#### Root Project Scripts
```bash
npm run dev              # Start both frontend and backend
npm run dev:frontend     # Start frontend development server
npm run dev:backend      # Start backend development server
npm run test             # Run all tests using organized test suite
npm run test:unit        # Run unit tests only
npm run test:integration # Run integration tests only
npm run test:e2e         # Run end-to-end tests only
npm run build            # Build entire application
```

#### Backend Scripts
```bash
npm run dev      # Start development server with hot reload
npm run build    # Compile TypeScript to JavaScript
npm run start    # Start production server
npm test         # Run Jest tests
npm run test:coverage # Run tests with coverage report
```

#### Frontend Scripts
```bash
npm run dev      # Start Vite development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

#### Utility Scripts
```bash
# Located in scripts/ directory
scripts/run-tests.js     # Organized test runner with categories
scripts/run-docker.bat   # Docker startup utility (Windows)

# Docker commands
npm run docker:up        # Start with Docker Compose
npm run docker:down      # Stop Docker containers
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

The project includes a comprehensive, organized test suite with multiple testing levels:

### Test Organization

```bash
# Run all tests using the organized test runner
npm run test                    # All tests
scripts/run-tests.js           # Custom test runner with categories

# Run specific test categories
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests only  
npm run test:e2e              # End-to-end tests only
npm run test:performance      # Performance tests only
```

### Test Structure

#### Unit Tests (`tests/unit/`)
- **Location**: `tests/unit/`
- **Purpose**: Test individual components and services in isolation
- **Categories**:
  - `dealer/`: Dealer logic, AI behavior, and response systems
  - `victory/`: Victory counter logic and persistence
  - Backend services: Located alongside source files (e.g., `gameService.test.ts`)

#### Integration Tests (`tests/integration/`)
- **Location**: `tests/integration/`
- **Purpose**: Test multi-component interactions and system integration
- **Categories**:
  - `dealer/`: Dealer system integration with game logic
  - Socket.IO integration tests
  - API endpoint integration tests

#### End-to-End Tests (`tests/e2e/`)
- **Location**: `tests/e2e/`
- **Purpose**: Test complete user workflows and game scenarios
- **Examples**:
  - Complete 8-player game scenarios
  - Full game lifecycle testing
  - Cross-browser compatibility tests

#### Performance Tests (`tests/performance/`)
- **Location**: `tests/performance/`
- **Purpose**: Validate system performance under load
- **Focus Areas**:
  - Concurrent player handling
  - Socket.IO performance
  - Memory usage validation

### Backend Testing

The backend uses Jest for comprehensive testing:

```bash
cd backend
npm test                       # Run backend unit tests
npm run test:coverage         # Run with coverage report
npm run test:watch           # Watch mode for development
```

**Test Structure:**
- Unit tests are located alongside source files (e.g., `gameService.test.ts`)
- Integration tests are in `tests/integration/`
- Focus on testing core game logic and edge cases
- Mock external dependencies when necessary

**Key Test Areas:**
- Game logic calculations (hand totals, blackjack detection)
- Session management and cleanup
- API endpoint validation and error handling
- Socket.IO real-time communication
- AI help system integration
- Victory counter persistence

### Frontend Testing

The frontend testing includes both automated and manual testing approaches:

**Current Testing:**
- Manual testing for UI components and user interactions
- Integration testing through the organized test suite

**Recommended Additions:**
- Component testing with React Testing Library
- End-to-end testing with Cypress or Playwright
- Visual regression testing for UI consistency

### Test Runner Utility

The project includes a custom test runner (`scripts/run-tests.js`) that provides:

- **Categorized Test Execution**: Run specific types of tests
- **Flexible Test Selection**: Choose which test files to run
- **Environment Configuration**: Set up proper test environments
- **Reporting**: Comprehensive test result reporting

**Usage Examples:**
```bash
# Run specific test categories
node scripts/run-tests.js --category=unit
node scripts/run-tests.js --category=integration
node scripts/run-tests.js --category=e2e

# Run specific test files
node scripts/run-tests.js --file=dealer-personality
node scripts/run-tests.js --file=victory-persistence
```

### Testing Best Practices

1. **Test Organization**: Keep tests organized by type and functionality
2. **Comprehensive Coverage**: Include unit, integration, and e2e tests
3. **Mock External Dependencies**: Use mocks for external services and APIs
4. **Test Real Scenarios**: E2E tests should reflect actual user workflows
5. **Performance Validation**: Include performance tests for critical paths
6. **Continuous Testing**: Run tests frequently during development

### Debugging Tests

For troubleshooting test issues:

1. **Check Test Logs**: Review detailed output from test runners
2. **Isolate Tests**: Run individual test files to identify issues
3. **Verify Environment**: Ensure test environment is properly configured
4. **Review Dependencies**: Check that all test dependencies are installed
5. **Consult Documentation**: See [Troubleshooting Guide](TROUBLESHOOTING.md#debugging-procedures)

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