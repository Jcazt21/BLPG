# API Documentation

> **📖 Related Documentation:**
> - [Main README](README.md) - Project overview and quick start
> - [Setup Guide](SETUP.md) - Installation and configuration
> - [WebSocket Events](WEBSOCKET.md) - Real-time multiplayer communication
> - [Game Logic](GAME_LOGIC.md) - Blackjack rules and implementation
> - [Architecture Overview](ARCHITECTURE.md) - Technical system design
> - [Development Guide](DEVELOPMENT.md) - Code structure and workflow
> - [User Guide](USER_GUIDE.md) - How to play the game
> - [Troubleshooting](TROUBLESHOOTING.md) - Common API issues

## Table of Contents

- [Overview](#overview)
- [Authentication & Session Management](#authentication--session-management)
  - [Session Lifecycle](#session-lifecycle)
- [REST API Endpoints](#rest-api-endpoints)
  - [Start New Game](#start-new-game)
  - [Hit (Draw Card)](#hit-draw-card)
  - [Stand (End Turn)](#stand-end-turn)
  - [Double Down](#double-down)
  - [Split Pairs](#split-pairs)
  - [Restart Game](#restart-game)
  - [Get Game State](#get-game-state)
- [Error Responses](#error-responses)
  - [Error Response Format](#error-response-format)
  - [Common Error Codes](#common-error-codes)
  - [Specific Error Scenarios](#specific-error-scenarios)
- [WebSocket Events (Multiplayer)](#websocket-events-multiplayer)
  - [Client-to-Server Events](#client-to-server-events)
  - [Server-to-Client Events](#server-to-client-events)
- [Data Models](#data-models)
  - [Card](#card)
  - [Hand](#hand)
  - [Player (Single-player)](#player-single-player)
  - [Dealer](#dealer)
  - [Game State](#game-state)
  - [Game Status](#game-status)
  - [Game Phase](#game-phase)
- [Rate Limiting & Performance](#rate-limiting--performance)
- [Security Considerations](#security-considerations)
- [Development Notes](#development-notes)

## Overview

The Blackjack Game API provides REST endpoints for single-player blackjack gameplay and WebSocket events for real-time multiplayer functionality. The API is built with Express.js and Socket.IO.

**Base URL**: `http://172.16.50.34:5185`  
**API Prefix**: `/game`

> **💡 Quick Setup:** If you need help setting up the server, see the [Setup Guide](SETUP.md). For understanding the game rules implemented by these endpoints, check the [Game Logic documentation](GAME_LOGIC.md).

## Authentication & Session Management

The API uses session-based authentication for single-player games. Each game session is identified by a unique `sessionId` that is generated when starting a new game.

### Session Lifecycle
1. Start a new game to receive a `sessionId`
2. Use the `sessionId` for all subsequent API calls
3. Sessions expire after 30 minutes of inactivity
4. Sessions are automatically cleaned up on server restart

## REST API Endpoints

### Start New Game

**Endpoint**: `POST /game/start`  
**Description**: Initializes a new single-player blackjack game with the specified bet amount.

**Request Body**:
```json
{
  "name": "string",     // Player name (required)
  "bet": "number",      // Bet amount (required, must be > 0)
  "balance": "number"   // Player's starting balance (required, must be >= bet)
}
```

**Response**:
```json
{
  "sessionId": "string",
  "gameState": {
    "player": {
      "name": "string",
      "hands": [
        {
          "cards": [
            {
              "suit": "hearts|diamonds|clubs|spades",
              "value": "A|2|3|4|5|6|7|8|9|10|J|Q|K"
            }
          ],
          "total": "number",
          "isBlackjack": "boolean",
          "isBust": "boolean"
        }
      ],
      "balance": "number",
      "bet": "number",
      "splitActive": "boolean",
      "activeHand": "number"
    },
    "dealer": {
      "hand": {
        "cards": [
          {
            "suit": "hearts|diamonds|clubs|spades",
            "value": "A|2|3|4|5|6|7|8|9|10|J|Q|K"
          }
        ],
        "total": "number",
        "isBlackjack": "boolean",
        "isBust": "boolean"
      }
    },
    "status": "playing|bust|blackjack|win|lose|draw",
    "phase": "betting|dealing|player-turn|dealer-turn|result",
    "canDoubleDown": "boolean",
    "canSplit": "boolean"
  }
}
```

**Example Request**:
```bash
curl -X POST http://172.16.50.34:5185/game/start \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Player1",
    "bet": 100,
    "balance": 1000
  }'
```

> **📝 Note:** All API endpoints and examples have been verified for accuracy

**Example Response**:
```json
{
  "sessionId": "abc123def456",
  "gameState": {
    "player": {
      "name": "Player1",
      "hands": [
        {
          "cards": [
            {"suit": "hearts", "value": "K"},
            {"suit": "spades", "value": "7"}
          ],
          "total": 17,
          "isBlackjack": false,
          "isBust": false
        }
      ],
      "balance": 900,
      "bet": 100,
      "splitActive": false,
      "activeHand": 0
    },
    "dealer": {
      "hand": {
        "cards": [
          {"suit": "diamonds", "value": "9"}
        ],
        "total": 9,
        "isBlackjack": false,
        "isBust": false
      }
    },
    "status": "playing",
    "phase": "player-turn",
    "canDoubleDown": true,
    "canSplit": false
  }
}
```

### Hit (Draw Card)

**Endpoint**: `POST /game/hit`  
**Description**: Player draws an additional card for their current hand.

**Request Body**:
```json
{
  "sessionId": "string"  // Session ID from game start (required)
}
```

**Response**: Returns updated `GameState` object (same structure as start game response)

**Example Request**:
```bash
curl -X POST http://172.16.50.34:5185/game/hit \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "abc123def456"}'
```

### Stand (End Turn)

**Endpoint**: `POST /game/stand`  
**Description**: Player ends their turn with current hand total.

**Request Body**:
```json
{
  "sessionId": "string"  // Session ID from game start (required)
}
```

**Response**: Returns updated `GameState` object with dealer's turn resolved

**Example Request**:
```bash
curl -X POST http://172.16.50.34:5185/game/stand \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "abc123def456"}'
```

### Double Down

**Endpoint**: `POST /game/double-down`  
**Description**: Player doubles their bet, receives exactly one more card, then automatically stands.

**Request Body**:
```json
{
  "sessionId": "string"  // Session ID from game start (required)
}
```

**Response**: Returns updated `GameState` object

**Conditions**:
- Only available on first two cards
- Player must have sufficient balance to double the bet
- Automatically ends player's turn after drawing one card

**Example Request**:
```bash
curl -X POST http://172.16.50.34:5185/game/double-down \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "abc123def456"}'
```

### Split Pairs

**Endpoint**: `POST /game/split`  
**Description**: Player splits a pair into two separate hands.

**Request Body**:
```json
{
  "sessionId": "string"  // Session ID from game start (required)
}
```

**Response**: Returns updated `GameState` object with two hands

**Conditions**:
- Only available when first two cards have same value (10, J, Q, K all count as 10)
- Player must have sufficient balance for additional bet
- Creates two separate hands, each with one original card plus one new card
- Player plays each hand separately

**Example Request**:
```bash
curl -X POST http://172.16.50.34:5185/game/split \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "abc123def456"}'
```

### Restart Game

**Endpoint**: `POST /game/restart`  
**Description**: Starts a new game with the same player and updated bet amount.

**Request Body**:
```json
{
  "sessionId": "string",  // Existing session ID (required)
  "bet": "number"         // New bet amount (required, must be > 0)
}
```

**Response**: Returns new `GameState` object for fresh game

**Example Request**:
```bash
curl -X POST http://172.16.50.34:5185/game/restart \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "abc123def456",
    "bet": 150
  }'
```

### Get Game State

**Endpoint**: `GET /game/state`  
**Description**: Retrieves the current state of an active game session.

**Request Body**:
```json
{
  "sessionId": "string"  // Session ID from game start (required)
}
```

**Response**: Returns current `GameState` object

**Example Request**:
```bash
curl -X GET http://172.16.50.34:5185/game/state \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "abc123def456"}'
```

## Error Responses

All endpoints return consistent error responses with appropriate HTTP status codes.

### Error Response Format
```json
{
  "error": "string"  // Human-readable error message
}
```

> **🔗 Related Information:**
> - For detailed error handling strategies, see [Troubleshooting Guide](TROUBLESHOOTING.md#runtime-problems)
> - For implementation details, see [Development Guide](DEVELOPMENT.md#backend-patterns)

### Common Error Codes

**400 Bad Request**
- Missing required parameters
- Invalid bet amount (must be positive number)
- Insufficient balance for bet
- Invalid session ID format

```json
{
  "error": "Player name is required"
}
```

**404 Not Found**
- Session not found or expired
- No active game in session

```json
{
  "error": "No game in progress"
}
```

**500 Internal Server Error**
- Server-side processing errors
- Database connection issues
- Unexpected application errors

```json
{
  "error": "Failed to start game"
}
```

### Specific Error Scenarios

**Insufficient Balance**:
```json
{
  "error": "Insufficient balance"
}
```

**Invalid Bet Amount**:
```json
{
  "error": "A valid bet is required"
}
```

**Session Expired**:
```json
{
  "error": "Session not found: abc123def456"
}
```

**Invalid Game Action**:
```json
{
  "error": "Cannot split - conditions not met"
}
```

## WebSocket Events (Multiplayer)

The API also supports real-time multiplayer functionality through Socket.IO WebSocket connections.

**Connection URL**: `ws://172.16.50.34:5185`

> **📘 For detailed WebSocket documentation:** See the complete [WebSocket Events documentation](WEBSOCKET.md) for comprehensive multiplayer communication details.
>
> **🔗 Related Documentation:**
> - For game logic implementation details, see [Game Logic](GAME_LOGIC.md#multiplayer-mode)
> - For multiplayer user instructions, see [User Guide](USER_GUIDE.md#multiplayer-mode)
> - For technical architecture details, see [Architecture Overview](ARCHITECTURE.md#communication-protocols)

### Client-to-Server Events

#### Create Room
**Event**: `createRoom`  
**Payload**: `string` (player name)  
**Description**: Creates a new multiplayer room

#### Join Room
**Event**: `joinRoom`  
**Payload**: 
```json
{
  "code": "string",      // 6-character room code
  "playerName": "string" // Player's display name
}
```

#### Leave Room
**Event**: `leaveRoom`  
**Payload**: `string` (room code)

#### Start Game in Room
**Event**: `startGameInRoom`  
**Payload**: `string` (room code)  
**Note**: Only room creator can start games

#### Restart Game in Room
**Event**: `restartGameInRoom`  
**Payload**: `string` (room code)  
**Note**: Only room creator can restart games

#### Player Action
**Event**: `playerAction`  
**Payload**:
```json
{
  "code": "string",                    // Room code
  "action": "hit|stand|double|split"   // Player action
}
```

### Server-to-Client Events

#### Room Created
**Event**: `roomCreated`  
**Payload**: `string` (room code)

#### Room Joined
**Event**: `roomJoined`  
**Payload**: `string` (room code)

#### Room Error
**Event**: `roomError`  
**Payload**: `string` (error message)

#### Players Update
**Event**: `playersUpdate`  
**Payload**:
```json
{
  "players": [
    {
      "id": "string",    // Socket ID
      "name": "string"   // Player name
    }
  ],
  "creator": "string"    // Socket ID of room creator
}
```

#### Game Started
**Event**: `gameStarted`  
**Payload**: `GameState` object (multiplayer format)

#### Game State Update
**Event**: `gameStateUpdate`  
**Payload**: `GameState` object with current turn and phase information

## Data Models

> **🔗 Related Documentation:**
> - For game logic implementation of these models, see [Game Logic](GAME_LOGIC.md#card-system)
> - For technical architecture details, see [Architecture Overview](ARCHITECTURE.md#data-models)
> - For frontend usage of these models, see [Development Guide](DEVELOPMENT.md#component-communication)

### Card
```typescript
{
  suit: "hearts" | "diamonds" | "clubs" | "spades",
  value: "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K"
}
```

### Hand
```typescript
{
  cards: Card[],
  total: number,        // Calculated hand value
  isBlackjack: boolean, // True if 21 with exactly 2 cards
  isBust: boolean       // True if total > 21
}
```

### Player (Single-player)
```typescript
{
  name: string,
  hands: Hand[],        // Array to support split hands
  balance: number,      // Current balance
  bet: number,          // Current bet amount
  splitActive: boolean, // True if player has split
  activeHand: number    // Index of currently active hand (for splits)
}
```

### Dealer
```typescript
{
  hand: Hand,
  hiddenCard?: Card     // Dealer's face-down card (hidden during player turn)
}
```

### Game State
```typescript
{
  player: Player,
  dealer: Dealer,
  deck: Card[],                    // Remaining cards in deck
  status: GameStatus,              // Overall game result
  phase: GamePhase,                // Current game phase
  canDoubleDown: boolean,          // Whether double down is available
  canSplit: boolean                // Whether split is available
}
```

### Game Status
- `playing`: Game in progress
- `bust`: Player busted (total > 21)
- `blackjack`: Player has blackjack
- `win`: Player wins
- `lose`: Player loses
- `draw`: Push/tie

### Game Phase
- `betting`: Waiting for bet (not used in current implementation)
- `dealing`: Cards being dealt (not used in current implementation)
- `player-turn`: Player's turn to act
- `dealer-turn`: Dealer playing their hand
- `result`: Game completed, results calculated

## Rate Limiting & Performance

- No explicit rate limiting implemented
- Session cleanup occurs automatically every 30 minutes
- WebSocket connections are cleaned up on disconnect
- Deck shuffling uses Fisher-Yates algorithm for randomness

## Security Considerations

- No authentication required for single-player games
- Session IDs are randomly generated and not predictable
- CORS enabled for all origins (development configuration)
- No sensitive data stored in sessions
- WebSocket rooms are isolated by unique codes

## Development Notes

- Server runs on configurable HOST and PORT (defaults: 172.16.50.34:5185)
- Uses TypeScript for type safety
- Includes comprehensive error handling
- Session management prevents memory leaks
- Supports both single-player REST API and multiplayer WebSocket functionality