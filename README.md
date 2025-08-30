# Blackjack Casino Game

A modern, full-stack Blackjack game with real-time multiplayer support, intelligent dealer assistance, and comprehensive betting features.

## 🎯 Project Overview

This is a professional web-based Blackjack casino game built with React and Node.js. The application features both single-player and multiplayer modes with real-time synchronization, an intelligent help system, and a complete betting framework.

### Key Features
- **Single-player mode**: Play against an intelligent computer dealer
- **Multiplayer mode**: Real-time multiplayer games with room management
- **Intelligent Help System**: AI-powered dealer assistant for game guidance
- **Complete Betting System**: Full casino-style betting with victory tracking
- **Real-time Communication**: Socket.IO for instant game updates
- **Modern UI**: React with responsive design and casino aesthetics
- **TypeScript Support**: Type-safe development across the stack

## 🛠️ Technology Stack

### Frontend
- **React 19.1.0** - Modern UI library with hooks
- **Vite 7.0.0** - Fast build tool and dev server
- **Tailwind CSS 4.1.11** - Utility-first CSS framework
- **Socket.IO Client 4.7.5** - Real-time communication

### Backend
- **Node.js** - JavaScript runtime
- **Express 5.1.0** - Web application framework
- **Socket.IO 4.7.5** - Real-time bidirectional communication
- **TypeScript 5.8.3** - Type-safe server development
- **Jest 29.0.0** - Testing framework

### AI & Intelligence
- **Gemini AI Integration** - Intelligent dealer assistance
- **Advanced Prompt Engineering** - Context-aware help system
- **Rate Limiting & Usage Tracking** - Production-ready AI features

## 📁 Project Structure

```
blackjack-casino/
├── frontend/                    # React frontend application
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── help/          # AI help system components
│   │   │   └── *.jsx          # Game components
│   │   ├── services/          # Frontend services
│   │   └── App.jsx            # Main application
│   └── package.json
│
├── backend/                     # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── services/          # Business logic
│   │   │   ├── helpAssistant/ # AI help system
│   │   │   └── *.ts           # Game services
│   │   ├── sockets/           # Socket.IO handlers
│   │   ├── types/             # TypeScript definitions
│   │   └── index.ts           # Server entry point
│   ├── scripts/               # Backend utility scripts
│   └── package.json
│
├── docs/                        # 📚 Comprehensive Documentation
│   ├── features/               # Feature-specific documentation
│   │   ├── victory-counter/    # Victory tracking system docs
│   │   └── dealer-assistant/   # AI help system docs
│   ├── development/            # Development guides
│   │   └── PROJECT_MIGRATION.md
│   ├── API.md                  # REST API documentation
│   ├── ARCHITECTURE.md         # System architecture
│   ├── DEVELOPMENT.md          # Development workflow
│   ├── GAME_LOGIC.md          # Blackjack rules & logic
│   ├── SETUP.md               # Installation guide
│   ├── TROUBLESHOOTING.md     # Problem solving
│   └── USER_GUIDE.md          # How to play
│
├── tests/                       # 🧪 Organized Test Suite
│   ├── e2e/                   # End-to-end tests
│   ├── integration/           # Integration tests
│   │   └── dealer/            # Dealer system tests
│   ├── unit/                  # Unit tests
│   │   ├── dealer/            # Dealer logic tests
│   │   └── victory/           # Victory system tests
│   └── performance/           # Performance tests
│
├── scripts/                     # 🔧 Project Scripts
│   ├── run-tests.js           # Test runner utility
│   └── run-docker.bat         # Docker startup script
│
├── tools/                       # 🛠️ Development Tools
│   └── testing/               # Testing utilities
│       └── test-victory-display.html
│
├── .kiro/                       # Kiro AI assistant specs
├── docker-compose.yml          # Docker configuration
├── Dockerfile                  # Container definition
└── package.json               # Root dependencies
```

## 🚀 Quick Start

### Option 1: Docker (Recommended)

**Prerequisites:**
- Docker and Docker Compose

**Setup:**
```bash
# 1. Clone the repository
git clone <repository-url>
cd blackjack-casino

# 2. Start with Docker
docker-compose up --build
```

**Access the Application:**
- Frontend: http://localhost:5180
- Backend API: http://localhost:5185

### Option 2: Manual Setup

**Prerequisites:**
- Node.js (v18 or higher)
- npm package manager

**Setup:**
```bash
# 1. Clone and install dependencies
git clone <repository-url>
cd blackjack-casino
npm install

# 2. Setup Frontend
cd frontend
npm install

# 3. Setup Backend
cd ../backend
npm install

# 4. Start development servers
npm run dev:backend    # Terminal 1
npm run dev:frontend   # Terminal 2
```

## 🎮 Game Features

### Core Blackjack Gameplay
- Standard Blackjack rules with splitting, doubling down
- Professional dealer AI with realistic behavior
- Complete betting system with victory tracking
- Real-time multiplayer support

### Intelligent Help System
- AI-powered dealer assistant using Gemini
- Context-aware game guidance
- Rate-limited and usage-tracked for production use
- Interactive chat interface

### Victory Counter System
- Persistent victory tracking across sessions
- Frontend victory display and management
- Backend victory persistence and validation

## 🧪 Testing

The project includes a comprehensive test suite organized by type:

```bash
# Run all tests
npm run test

# Run specific test categories
npm run test:unit           # Unit tests
npm run test:integration    # Integration tests
npm run test:e2e           # End-to-end tests

# Run tests with coverage
npm run test:coverage
```

### Test Organization
- **Unit Tests**: Individual component and service testing
- **Integration Tests**: Multi-component interaction testing
- **E2E Tests**: Full application workflow testing
- **Performance Tests**: Load and performance validation

## 📚 Documentation

### For Developers
- **[Setup Guide](docs/SETUP.md)** - Installation and configuration
- **[Architecture](docs/ARCHITECTURE.md)** - System design and structure
- **[Development Guide](docs/DEVELOPMENT.md)** - Code workflow and standards
- **[API Documentation](docs/API.md)** - REST API reference
- **[WebSocket Events](docs/WEBSOCKET.md)** - Real-time communication

### For Features
- **[Victory Counter](docs/features/victory-counter/)** - Victory tracking system
- **[Dealer Assistant](docs/features/dealer-assistant/)** - AI help system

### For Users
- **[User Guide](docs/USER_GUIDE.md)** - How to play the game
- **[Game Logic](docs/GAME_LOGIC.md)** - Blackjack rules and mechanics
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

## 🏗️ Project Organization Benefits

This project follows a clean, organized structure that provides:

### ✅ **Clear Separation of Concerns**
- Frontend and backend are clearly separated
- Tests are organized by type and scope
- Documentation is categorized by audience and purpose

### ✅ **Easy Navigation**
- Logical directory structure makes finding files intuitive
- Feature-specific documentation is grouped together
- Development tools and scripts are in dedicated directories

### ✅ **Scalable Architecture**
- Modular component structure supports growth
- Organized test suite enables confident refactoring
- Clear documentation structure supports team collaboration

### ✅ **Professional Development Workflow**
- Comprehensive testing at all levels
- Organized scripts and tools for common tasks
- Clear documentation for onboarding and maintenance

## 🔧 Development Scripts

```bash
# Development
npm run dev:frontend     # Start frontend dev server
npm run dev:backend      # Start backend dev server
npm run dev             # Start both frontend and backend

# Testing
npm run test            # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage

# Building
npm run build:frontend  # Build frontend for production
npm run build:backend   # Build backend for production
npm run build          # Build entire application

# Docker
npm run docker:up       # Start with Docker Compose
npm run docker:down     # Stop Docker containers
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the development guidelines in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
4. Add tests for new functionality
5. Update documentation as needed
6. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🔗 Quick Navigation

- **New Developer?** → [Setup Guide](docs/SETUP.md) → [Development Guide](docs/DEVELOPMENT.md)
- **Understanding the Code?** → [Architecture](docs/ARCHITECTURE.md) → [API Docs](docs/API.md)
- **Learning to Play?** → [User Guide](docs/USER_GUIDE.md) → [Game Logic](docs/GAME_LOGIC.md)
- **Having Issues?** → [Troubleshooting](docs/TROUBLESHOOTING.md)
- **Working on Features?** → [Feature Docs](docs/features/)

**Need help?** Check our comprehensive [documentation](docs/) or review the [troubleshooting guide](docs/TROUBLESHOOTING.md).