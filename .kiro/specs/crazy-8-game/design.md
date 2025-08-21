# Design Document

## Overview

This document outlines the technical design for implementing Crazy 8 as an addition to the existing Blackjack multiplayer platform. The design leverages the existing Socket.IO infrastructure, room management system, and card rendering components while introducing new game-specific logic and UI components.

## Architecture

### High-Level Architecture

```
Frontend (React)           Backend (Node.js + Socket.IO)
├── Game Selection Menu    ├── Game Router
├── Crazy8 Components      ├── Crazy8 Game Service  
├── Shared Card System     ├── Shared Room Service
└── Shared UI Components   └── Shared Socket Handlers
```

### Component Hierarchy

```
App
├── GameModeSelector (NEW)
│   ├── BlackjackMode
│   └── Crazy8Mode (NEW)
├── Crazy8Game (NEW)
│   ├── Crazy8Table (NEW)
│   ├── PlayerHand (NEW)
│   ├── DiscardPile (NEW)
│   ├── SuitSelector (NEW)
│   └── GameStatus (NEW)
└── Shared Components
    ├── PlayingCard (REUSE)
    ├── PlayerPosition (ADAPT)
    └── CasinoTable (ADAPT)
```

## Components and Interfaces

### Backend Components

#### 1. Crazy8GameService

```typescript
class Crazy8GameService {
  private io: Server;
  private dealingService: DealingService;
  
  // Core game methods
  startGame(roomCode: string, players: Crazy8Player[]): void
  playCard(roomCode: string, playerId: string, card: Card): boolean
  drawCard(roomCode: string, playerId: string): void
  chooseSuit(roomCode: string, playerId: string, suit: Suit): void
  
  // Game state management
  private validatePlay(card: Card, topCard: Card, activeSuit: Suit): boolean
  private checkWinCondition(player: Crazy8Player): boolean
  private calculateScore(players: Crazy8Player[]): ScoreResult[]
  private advanceTurn(gameState: Crazy8GameState): void
}
```

#### 2. Enhanced Room Service

```typescript
interface Crazy8Room extends Room {
  gameType: 'blackjack' | 'crazy8';
  gameState: Crazy8GameState | null;
  maxPlayers: number; // 2-6 for Crazy8
}
```

#### 3. Game State Types

```typescript
interface Crazy8Player {
  id: string;
  name: string;
  hand: Card[];
  cardCount: number; // For other players
  isCurrentTurn: boolean;
  hasWon: boolean;
  score: number;
}

interface Crazy8GameState {
  players: Crazy8Player[];
  currentPlayerIndex: number;
  direction: 1 | -1; // For future expansion
  discardPile: Card[];
  topCard: Card;
  activeSuit: Suit;
  deckCount: number;
  phase: 'waiting' | 'playing' | 'suit-selection' | 'finished';
  winner?: string;
  scores?: ScoreResult[];
}

interface ScoreResult {
  playerId: string;
  playerName: string;
  remainingCards: number;
  points: number;
}
```

### Frontend Components

#### 1. GameModeSelector Component

```jsx
const GameModeSelector = () => {
  return (
    <div className="game-mode-selector">
      <h2>Choose Your Game</h2>
      <div className="game-options">
        <GameModeCard 
          title="Blackjack"
          description="Classic 21 card game"
          onClick={() => setMode('blackjack')}
        />
        <GameModeCard 
          title="Crazy 8"
          description="Match suits and numbers"
          onClick={() => setMode('crazy8')}
        />
      </div>
    </div>
  );
};
```

#### 2. Crazy8Table Component

```jsx
const Crazy8Table = ({ gameState, currentPlayer, onCardPlay, onDrawCard }) => {
  return (
    <div className="crazy8-table">
      <div className="other-players">
        {gameState.players.map(player => (
          <OtherPlayerView 
            key={player.id}
            player={player}
            isCurrentTurn={player.isCurrentTurn}
          />
        ))}
      </div>
      
      <div className="center-area">
        <DeckPile count={gameState.deckCount} onDraw={onDrawCard} />
        <DiscardPile 
          topCard={gameState.topCard}
          activeSuit={gameState.activeSuit}
        />
      </div>
      
      <PlayerHand 
        cards={currentPlayer.hand}
        playableCards={getPlayableCards(currentPlayer.hand, gameState)}
        onCardPlay={onCardPlay}
        isMyTurn={currentPlayer.isCurrentTurn}
      />
    </div>
  );
};
```

#### 3. PlayerHand Component

```jsx
const PlayerHand = ({ cards, playableCards, onCardPlay, isMyTurn }) => {
  return (
    <div className="player-hand">
      <div className="hand-cards">
        {cards.map((card, index) => (
          <PlayingCard
            key={`${card.suit}-${card.value}-${index}`}
            card={card}
            isPlayable={playableCards.includes(card)}
            onClick={() => isMyTurn && onCardPlay(card)}
            className={`hand-card ${isMyTurn ? 'interactive' : 'disabled'}`}
          />
        ))}
      </div>
      <div className="hand-info">
        Cards: {cards.length}
      </div>
    </div>
  );
};
```

#### 4. SuitSelector Component

```jsx
const SuitSelector = ({ isVisible, onSuitSelect }) => {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  
  if (!isVisible) return null;
  
  return (
    <div className="suit-selector-overlay">
      <div className="suit-selector">
        <h3>Choose a suit:</h3>
        <div className="suit-options">
          {suits.map(suit => (
            <button
              key={suit}
              className={`suit-option ${suit}`}
              onClick={() => onSuitSelect(suit)}
            >
              {getSuitSymbol(suit)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
```

## Data Models

### Card System (Reuse Existing)

```typescript
interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
}
```

### Game Logic

#### Card Validation Logic

```typescript
const isValidPlay = (playCard: Card, topCard: Card, activeSuit: Suit): boolean => {
  // 8s can always be played
  if (playCard.value === '8') return true;
  
  // Must match suit or value
  return playCard.suit === activeSuit || playCard.value === topCard.value;
};

const getPlayableCards = (hand: Card[], topCard: Card, activeSuit: Suit): Card[] => {
  return hand.filter(card => isValidPlay(card, topCard, activeSuit));
};
```

#### Scoring System

```typescript
const calculateCardPoints = (card: Card): number => {
  if (card.value === '8') return 50;
  if (['J', 'Q', 'K'].includes(card.value)) return 10;
  if (card.value === 'A') return 1;
  return parseInt(card.value);
};

const calculatePlayerScore = (hand: Card[]): number => {
  return hand.reduce((total, card) => total + calculateCardPoints(card), 0);
};
```

## Error Handling

### Client-Side Error Handling

```typescript
// Invalid move handling
const handleInvalidMove = (error: string) => {
  showErrorMessage(error);
  // Highlight valid moves
  highlightPlayableCards();
};

// Connection error handling
const handleConnectionError = () => {
  showReconnectingMessage();
  attemptReconnection();
};
```

### Server-Side Error Handling

```typescript
// Game state validation
const validateGameAction = (action: GameAction, gameState: Crazy8GameState): boolean => {
  // Validate player turn
  if (action.playerId !== gameState.players[gameState.currentPlayerIndex].id) {
    return false;
  }
  
  // Validate card ownership
  const player = gameState.players.find(p => p.id === action.playerId);
  if (!player?.hand.some(card => cardEquals(card, action.card))) {
    return false;
  }
  
  return true;
};
```

## Testing Strategy

### Unit Tests

1. **Game Logic Tests**
   - Card validation logic
   - Turn advancement
   - Win condition detection
   - Scoring calculations

2. **Component Tests**
   - Card rendering
   - Hand management
   - Suit selection
   - Game state display

### Integration Tests

1. **Socket Communication**
   - Room creation and joining
   - Game state synchronization
   - Real-time updates

2. **Game Flow Tests**
   - Complete game simulation
   - Player disconnection handling
   - Error recovery

### Performance Tests

1. **Concurrent Games**
   - Multiple rooms running simultaneously
   - Memory usage monitoring
   - Response time measurement

2. **UI Performance**
   - Card animation smoothness
   - Large hand rendering
   - Real-time updates

## Migration Strategy

### Phase 1: Core Implementation (Week 1)
- Implement basic Crazy8GameService
- Create core UI components
- Add game mode selection

### Phase 2: Game Logic (Week 2)
- Implement card validation
- Add turn management
- Create suit selection

### Phase 3: Polish and Testing (Week 3)
- Add animations and effects
- Implement error handling
- Comprehensive testing

### Phase 4: Integration (Week 4)
- Integrate with existing platform
- Performance optimization
- User acceptance testing

## Security Considerations

### Game State Validation
- All moves validated server-side
- Player hand verification
- Turn order enforcement

### Anti-Cheating Measures
- Server-side card dealing
- Move validation
- State synchronization checks

## Performance Optimizations

### Client-Side
- Card component memoization
- Efficient re-rendering
- Optimized animations

### Server-Side
- Minimal state broadcasting
- Efficient game state updates
- Memory cleanup for finished games