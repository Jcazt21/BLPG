# Blackjack Game Documentation

Welcome to the comprehensive documentation for the full-stack Blackjack game application. This project features both single-player and multiplayer modes with real-time gameplay.

## 🎯 Project Overview

This is a modern web-based Blackjack game built with a React frontend and Node.js/Express backend. The application supports both single-player mode against the computer and multiplayer mode with real-time synchronization using Socket.IO.

### Key Features
- **Single-player mode**: Play against the computer dealer
- **Multiplayer mode**: Real-time multiplayer games with room management
- **Full Blackjack rules**: Including splitting, doubling down, and betting
- **Real-time communication**: Socket.IO for instant game updates
- **Modern UI**: React with Tailwind CSS for responsive design
- **TypeScript support**: Type-safe development experience

## 🛠️ Technology Stack

### Frontend
- **React 19.1.0** - Modern UI library with hooks
- **Vite 7.0.0** - Fast build tool and dev server
- **Tailwind CSS 4.1.11** - Utility-first CSS framework
- **Socket.IO Client 4.7.5** - Real-time communication
- **TypeScript** - Type safety and better developer experience

> **📝 Note:** Version information verified against package.json files

### Backend
- **Node.js** - JavaScript runtime
- **Express 5.1.0** - Web application framework
- **Socket.IO 4.7.5** - Real-time bidirectional communication
- **TypeScript 5.8.3** - Type-safe server development
- **Jest 29.0.0** - Testing framework
- **CORS 2.8.5** - Cross-origin resource sharing

> **📝 Note:** Version information verified against package.json files

### Development Tools
- **ESLint** - Code linting and formatting
- **ts-node** - TypeScript execution for development
- **dotenv** - Environment variable management

## 📁 Project Structure

```
blackjack-game/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── assets/          # Static assets (images, icons)
│   │   ├── App.jsx          # Main application component
│   │   ├── PlayingCard.jsx  # Playing card component
│   │   ├── main.jsx         # Application entry point
│   │   └── *.css           # Styling files
│   ├── public/             # Public static files
│   ├── package.json        # Frontend dependencies
│   └── vite.config.js      # Vite configuration
│
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   │   └── gameController.ts
│   │   ├── routes/         # API route definitions
│   │   │   └── gameRoutes.ts
│   │   ├── services/       # Business logic
│   │   │   ├── gameService.ts
│   │   │   └── gameService.test.ts
│   │   ├── types/          # TypeScript type definitions
│   │   │   └── gameTypes.ts
│   │   └── index.ts        # Server entry point
│   ├── package.json        # Backend dependencies
│   └── tsconfig.json       # TypeScript configuration
│
├── docs/                   # Documentation (this directory)
├── package.json           # Root project dependencies
└── .gitignore            # Git ignore rules
```

## 🚀 Quick Start

### Option 1: Docker (Recommended)

**Prerequisites:**
- Docker and Docker Compose

**Setup:**
```bash
# 1. Clone the repository
git clone <repository-url>
cd blackjack-game

# 2. Start with Docker
docker-compose up --build
```

**Access the Application:**
- Frontend: http://localhost:5180
- Backend API: http://localhost:5185

### Option 2: Manual Setup

**Prerequisites:**
- Node.js (v18 or higher)
- npm or yarn package manager

**Setup:**
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd blackjack-game
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   ```

4. **Setup Backend**
   ```bash
   cd ../backend
   npm install
   ```

5. **Start Development Servers**
   
   **Backend** (Terminal 1):
   ```bash
   cd backend
   npm run dev
   ```
   
   **Frontend** (Terminal 2):
   ```bash
   cd frontend
   npm run dev
   ```

6. **Access the Application**
   - Frontend: http://localhost:5180
   - Backend API: http://localhost:5185

## 📚 Documentation Navigation

### For Developers
- **[Setup Guide](SETUP.md)** - Detailed installation and configuration instructions
- **[Architecture Overview](ARCHITECTURE.md)** - System design and technical architecture
- **[API Documentation](API.md)** - REST API endpoints and schemas
- **[WebSocket Events](WEBSOCKET.md)** - Socket.IO real-time communication
- **[Development Guide](DEVELOPMENT.md)** - Code structure and development workflow

### For Understanding the Game
- **[Game Logic](GAME_LOGIC.md)** - Blackjack rules and implementation details
- **[User Guide](USER_GUIDE.md)** - How to play the game (single-player & multiplayer)

### For Troubleshooting
- **[Troubleshooting](TROUBLESHOOTING.md)** - Common issues and solutions

---

## 📋 Complete Documentation Index

| Document | Purpose | Target Audience |
|----------|---------|-----------------|
| **[README.md](README.md)** | Project overview and quick start | All users |
| **[SETUP.md](SETUP.md)** | Installation and configuration | Developers, new users |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Technical system design | Developers, architects |
| **[API.md](API.md)** | REST API reference | Frontend developers, integrators |
| **[WEBSOCKET.md](WEBSOCKET.md)** | Real-time communication | Multiplayer developers |
| **[GAME_LOGIC.md](GAME_LOGIC.md)** | Blackjack rules and algorithms | Game developers, testers |
| **[USER_GUIDE.md](USER_GUIDE.md)** | How to play the game | End users, testers |
| **[DEVELOPMENT.md](DEVELOPMENT.md)** | Code structure and workflow | Contributors, maintainers |
| **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** | Problem solving guide | All users experiencing issues |

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Documentation Navigation](#-documentation-navigation)
- [Game Modes](#-game-modes)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🔗 Quick Links

- **New to the project?** Start with the [Setup Guide](SETUP.md)
- **Want to understand the code?** Check the [Architecture Overview](ARCHITECTURE.md) and [Development Guide](DEVELOPMENT.md)
- **Building integrations?** Review the [API Documentation](API.md) and [WebSocket Events](WEBSOCKET.md)
- **Learning to play?** Read the [User Guide](USER_GUIDE.md) and [Game Logic](GAME_LOGIC.md)
- **Having issues?** Visit the [Troubleshooting Guide](TROUBLESHOOTING.md)

## 🎮 Game Modes

### Single-Player Mode
Play against the computer dealer with standard Blackjack rules. Perfect for practicing or casual gameplay.

### Multiplayer Mode
Join or create rooms to play with other players in real-time. Features include:
- Room creation and management
- Real-time game state synchronization
- Turn-based gameplay
- Live player actions and updates

## 🧪 Testing

> **🔗 Related Documentation:**
> - For detailed testing procedures, see [Development Guide](DEVELOPMENT.md#testing)
> - For troubleshooting test issues, see [Troubleshooting Guide](TROUBLESHOOTING.md#debugging-procedures)

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Development
```bash
cd frontend
npm run dev    # Development server
npm run build  # Production build
npm run lint   # Code linting
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

**Need help?** Check out our [Troubleshooting Guide](TROUBLESHOOTING.md) or review the specific documentation sections above.