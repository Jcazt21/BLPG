# WebSocket Documentation (Socket.IO)

> **📖 Related Documentation:**
> - [Main README](README.md) - Project overview and quick start
> - [API Documentation](API.md) - REST API endpoints and schemas
> - [Game Logic](GAME_LOGIC.md) - Blackjack rules and multiplayer differences
> - [User Guide](USER_GUIDE.md) - How to play multiplayer mode
> - [Architecture Overview](ARCHITECTURE.md) - Technical system design
> - [Development Guide](DEVELOPMENT.md) - Code structure and workflow
> - [Setup Guide](SETUP.md) - Installation and configuration
> - [Troubleshooting](TROUBLESHOOTING.md) - WebSocket connection issues

## Table of Contents

- [Connection Setup](#connection-setup)
  - [Server Configuration](#server-configuration)
  - [Client Connection](#client-connection)
- [Connection Events](#connection-events)
  - [connect](#connect)
  - [disconnect](#disconnect)
- [Room Management Events](#room-management-events)
  - [createRoom](#createroom)
  - [roomCreated](#roomcreated)
  - [joinRoom](#joinroom)
  - [roomJoined](#roomjoined)
  - [leaveRoom](#leaveroom)
  - [roomError](#roomerror)
  - [playersUpdate](#playersupdate)
- [Game Events](#game-events)
  - [startGameInRoom](#startgameinroom)
  - [restartGameInRoom](#restartgameinroom)
  - [gameStarted](#gamestarted)
  - [gameStateUpdate](#gamestateupdate)
- [Player Actions](#player-actions)
  - [playerAction](#playeraction)
- [Data Structures](#data-structures)
  - [Player Object](#player-object)
  - [Dealer Object](#dealer-object)
  - [Game State Object](#game-state-object)
  - [Card Object](#card-object)
- [Game Flow and Phases](#game-flow-and-phases)
  - [1. Room Setup Phase](#1-room-setup-phase)
  - [2. Game Start Phase](#2-game-start-phase)
  - [3. Playing Phase](#3-playing-phase)
  - [4. Dealer Phase](#4-dealer-phase)
  - [5. Result Phase](#5-result-phase)
- [Turn Management](#turn-management)
  - [Turn Order](#turn-order)
  - [Turn Validation](#turn-validation)
- [Error Handling](#error-handling)
  - [Connection Errors](#connection-errors)
  - [Room Errors](#room-errors)
  - [Game State Errors](#game-state-errors)
- [Cleanup and Disconnection](#cleanup-and-disconnection)
  - [Automatic Cleanup](#automatic-cleanup)
  - [Manual Cleanup](#manual-cleanup)
- [Performance Considerations](#performance-considerations)
  - [Room Limits](#room-limits)
  - [Message Frequency](#message-frequency)
  - [Memory Management](#memory-management)
- [Security Considerations](#security-considerations)
  - [Input Validation](#input-validation)
  - [Access Control](#access-control)
  - [Data Exposure](#data-exposure)

This document describes the real-time communication system used for multiplayer blackjack functionality. The application uses Socket.IO for bidirectional communication between the frontend and backend.

## Connection Setup

### Server Configuration
- **URL**: Same as API base URL without `/game` suffix
- **CORS**: Enabled for all origins (`*`)
- **Auto-connect**: Disabled by default (manual connection required)
- **Configuration Details**: For server setup information, see [Setup Guide](SETUP.md#environment-variables)

### Client Connection
```javascript
import { io } from 'socket.io-client';

const WS_URL = 'http://172.16.50.34:5185';
const socket = io(WS_URL, { autoConnect: false });

// Connect when entering multiplayer mode
socket.connect();
```

> **🔗 Related Setup:** For server configuration details, see the [Setup Guide](SETUP.md). For understanding the game rules behind these events, check [Game Logic](GAME_LOGIC.md).

## Connection Events

### `connect`
**Direction**: Server → Client  
**Description**: Fired when client successfully connects to server  
**Payload**: None  

**Client Handler**:
```javascript
socket.on('connect', () => {
  console.log('Connected with ID:', socket.id);
});
```

### `disconnect`
**Direction**: Server → Client  
**Description**: Fired when client disconnects from server  
**Payload**: None  

**Client Handler**:
```javascript
socket.on('disconnect', () => {
  console.log('Disconnected from server');
});
```

## Room Management Events

### `createRoom`
**Direction**: Client → Server  
**Description**: Creates a new multiplayer room  
**Payload**: 
```typescript
playerName: string
```

**Example**:
```javascript
socket.emit('createRoom', 'PlayerName');
```

### `roomCreated`
**Direction**: Server → Client  
**Description**: Confirms room creation and provides room code  
**Payload**:
```typescript
roomCode: string // 6-character alphanumeric code
```

**Example Response**:
```javascript
socket.on('roomCreated', (code) => {
  console.log('Room created:', code); // e.g., "ABC123"
});
```

### `joinRoom`
**Direction**: Client → Server  
**Description**: Attempts to join an existing room  
**Payload**:
```typescript
{
  code: string,      // Room code (case-insensitive)
  playerName: string // Player's display name
}
```

**Example**:
```javascript
socket.emit('joinRoom', { 
  code: 'ABC123', 
  playerName: 'PlayerName' 
});
```

### `roomJoined`
**Direction**: Server → Client  
**Description**: Confirms successful room join  
**Payload**:
```typescript
roomCode: string
```

**Example Response**:
```javascript
socket.on('roomJoined', (code) => {
  console.log('Joined room:', code);
});
```

### `leaveRoom`
**Direction**: Client → Server  
**Description**: Leaves the current room  
**Payload**:
```typescript
roomCode: string
```

**Example**:
```javascript
socket.emit('leaveRoom', 'ABC123');
```

### `roomError`
**Direction**: Server → Client  
**Description**: Reports room-related errors  
**Payload**:
```typescript
errorMessage: string
```

**Common Error Messages**:
- `"La sala no existe"` - Room doesn't exist
- `"Ya estás en la sala"` - Already in the room
- `"Solo el creador puede iniciar la partida"` - Only creator can start game
- `"Solo el creador puede reiniciar la partida"` - Only creator can restart game

**Example Response**:
```javascript
socket.on('roomError', (message) => {
  console.error('Room error:', message);
});
```

### `playersUpdate`
**Direction**: Server → Client  
**Description**: Updates the list of players in the room  
**Payload**:
```typescript
{
  players: Array<{
    id: string,    // Socket ID
    name: string   // Display name
  }>,
  creator: string  // Socket ID of room creator
}
```

**Example Response**:
```javascript
socket.on('playersUpdate', (data) => {
  console.log('Players:', data.players);
  console.log('Creator:', data.creator);
});
```

## Game Events

### `startGameInRoom`
**Direction**: Client → Server  
**Description**: Starts a new game in the room (creator only)  
**Payload**:
```typescript
roomCode: string
```

**Example**:
```javascript
socket.emit('startGameInRoom', 'ABC123');
```

### `restartGameInRoom`
**Direction**: Client → Server  
**Description**: Starts next round in the room (creator only)  
**Payload**:
```typescript
roomCode: string
```

**Example**:
```javascript
socket.emit('restartGameInRoom', 'ABC123');
```

### `gameStarted`
**Direction**: Server → Client  
**Description**: Notifies all players that game has started  
**Payload**:
```typescript
GameState // Complete game state object
```

### `gameStateUpdate`
**Direction**: Server → Client  
**Description**: Broadcasts updated game state to all players  
**Payload**:
```typescript
GameState // Complete game state object
```

## Player Actions

### `playerAction`
**Direction**: Client → Server  
**Description**: Performs a game action during player's turn  
**Payload**:
```typescript
{
  code: string,                           // Room code
  action: 'hit' | 'stand' | 'double' | 'split'  // Action type
}
```

**Examples**:
```javascript
// Hit (request another card)
socket.emit('playerAction', { 
  code: 'ABC123', 
  action: 'hit' 
});

// Stand (end turn)
socket.emit('playerAction', { 
  code: 'ABC123', 
  action: 'stand' 
});

// Double down (not implemented in current version)
socket.emit('playerAction', { 
  code: 'ABC123', 
  action: 'double' 
});

// Split (not implemented in current version)
socket.emit('playerAction', { 
  code: 'ABC123', 
  action: 'split' 
});
```

## Data Structures

### Player Object
```typescript
type Player = {
  id: string;           // Socket ID
  name: string;         // Display name
  hand: Card[];         // Current cards
  total: number;        // Hand total value
  isBust: boolean;      // Whether hand exceeds 21
  isStand: boolean;     // Whether player has chosen to stand
  isBlackjack: boolean; // Whether player has blackjack
  bet: number;          // Current bet amount (fixed at 100)
  balance: number;      // Player's chip balance (fixed at 1000)
};
```

> **🔗 Related Documentation:**
> - For detailed game logic implementation, see [Game Logic](GAME_LOGIC.md#hand-calculation)
> - For API data structures, see [API Documentation](API.md#data-models)

### Dealer Object
```typescript
type Dealer = {
  hand: Card[];         // Visible cards
  hiddenCard?: Card;    // Face-down card (during player turns)
  total: number;        // Hand total value
  isBust: boolean;      // Whether hand exceeds 21
  isBlackjack: boolean; // Whether dealer has blackjack
};
```

### Game State Object
```typescript
type GameState = {
  started: boolean;     // Whether game is active
  players: Player[];    // Array of all players
  dealer: Dealer;       // Dealer's state
  deck: Card[];         // Remaining cards in deck
  turn: number;         // Index of current player
  phase: 'betting' | 'playing' | 'dealer' | 'result';
  results?: {           // Game results (only in 'result' phase)
    [playerId: string]: 'win' | 'lose' | 'draw' | 'bust' | 'blackjack'
  };
};
```

### Card Object
```typescript
type Card = {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
};
```

## Game Flow and Phases

> **🔗 Related Documentation:**
> - For detailed game logic implementation, see [Game Logic](GAME_LOGIC.md#multiplayer-game-phases)
> - For user instructions on multiplayer gameplay, see [User Guide](USER_GUIDE.md#multiplayer-gameplay)
> - For technical architecture details, see [Architecture Overview](ARCHITECTURE.md#data-flow)

### 1. Room Setup Phase
1. Player creates room with `createRoom`
2. Server responds with `roomCreated` and room code
3. Other players join with `joinRoom`
4. Server broadcasts `playersUpdate` to all room members
5. Creator starts game with `startGameInRoom`

### 2. Game Start Phase
1. Server initializes game state:
   - Creates shuffled deck
   - Deals 2 cards to each player
   - Deals 2 cards to dealer (1 hidden)
   - Sets initial bets and balances
2. Server broadcasts `gameStarted` and `gameStateUpdate`

### 3. Playing Phase (`phase: 'playing'`)
1. Players take turns based on `turn` index
2. Current player can `hit` or `stand`
3. Server updates game state after each action
4. Server broadcasts `gameStateUpdate` to all players
5. Turn advances to next player or moves to dealer phase

### 4. Dealer Phase (`phase: 'dealer'`)
1. Dealer's hidden card is revealed
2. Dealer automatically hits until total ≥ 17
3. Server calculates final dealer state

### 5. Result Phase (`phase: 'result'`)
1. Server calculates win/lose/draw for each player
2. Results are included in `gameStateUpdate`
3. Creator can start next round with `restartGameInRoom`

## Turn Management

### Turn Order
- Players take turns in the order they joined the room
- Turn index cycles through active players
- Players who bust or stand are skipped in subsequent turns

### Turn Validation
- Server validates that only the current player can take actions
- Invalid turn attempts result in `roomError` emission
- Turn automatically advances when player busts or stands

## Error Handling

### Connection Errors
- Automatic reconnection is handled by Socket.IO client
- Connection state should be monitored for UI updates
- Failed connections should display appropriate error messages

### Room Errors
All room errors are sent via `roomError` event:
- Invalid room codes
- Permission errors (non-creator trying to start game)
- Duplicate join attempts
- Turn validation errors

### Game State Errors
- Invalid actions during wrong game phases
- Actions by non-current players
- Server-side game logic errors

## Cleanup and Disconnection

### Automatic Cleanup
- Players are automatically removed from rooms on disconnect
- Empty rooms are automatically deleted
- Game state is preserved if at least one player remains

### Manual Cleanup
- Players can leave rooms with `leaveRoom`
- Rooms are deleted when last player leaves
- Game state is lost when room is deleted

## Performance Considerations

### Room Limits
- No explicit limit on players per room
- Recommended maximum: 6 players for optimal gameplay
- Large rooms may impact performance

### Message Frequency
- Game state updates are sent after each player action
- No throttling or batching of updates
- High-frequency actions may cause performance issues

### Memory Management
- Rooms and game states are stored in server memory
- No persistence across server restarts
- Memory usage scales with number of active rooms

## Security Considerations

### Input Validation
- Room codes are validated and sanitized
- Player names are limited to 20 characters
- Action validation prevents cheating

### Access Control
- Only room creators can start/restart games
- Players can only act during their turn
- Room codes provide basic access control

### Data Exposure
- All players see complete game state
- No hidden information except dealer's face-down card
- Player balances and bets are visible to all room members