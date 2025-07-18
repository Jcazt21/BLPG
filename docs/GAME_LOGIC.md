# Game Logic and Rules Implementation

> **📖 Related Documentation:**
> - [Main README](README.md) - Project overview and quick start
> - [User Guide](USER_GUIDE.md) - How to play the game
> - [API Documentation](API.md) - Game endpoints and data structures
> - [WebSocket Events](WEBSOCKET.md) - Multiplayer game communication
> - [Architecture Overview](ARCHITECTURE.md) - Technical implementation details
> - [Development Guide](DEVELOPMENT.md) - Code structure and testing
> - [Setup Guide](SETUP.md) - Installation and configuration
> - [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues and solutions

## Table of Contents

- [Basic Blackjack Rules](#basic-blackjack-rules)
  - [Objective](#objective)
  - [Card Values](#card-values)
  - [Winning Conditions](#winning-conditions)
- [Card System](#card-system)
  - [Card Structure](#card-structure)
  - [Deck Management](#deck-management)
  - [Shuffle Implementation](#shuffle-implementation)
- [Hand Calculation](#hand-calculation)
  - [Algorithm Overview](#algorithm-overview)
  - [Core Calculation Logic](#core-calculation-logic)
  - [Hand Status Determination](#hand-status-determination)
- [Game Flow](#game-flow)
  - [Single-Player Game Phases](#single-player-game-phases)
  - [Game State Management](#game-state-management)
- [Betting System](#betting-system)
  - [Starting Balance](#starting-balance)
  - [Chip Denominations](#chip-denominations)
  - [Betting Rules](#betting-rules)
  - [Balance Management](#balance-management)
- [Advanced Features](#advanced-features)
  - [Double Down](#double-down)
  - [Splitting Pairs](#splitting-pairs)
  - [Split Hand Management](#split-hand-management)
- [Single-Player vs Multiplayer](#single-player-vs-multiplayer)
  - [Single-Player Mode](#single-player-mode)
  - [Multiplayer Mode](#multiplayer-mode)
  - [Multiplayer Game Phases](#multiplayer-game-phases)
- [Payout System](#payout-system)
  - [Payout Multipliers](#payout-multipliers)
  - [Result Determination Logic](#result-determination-logic)
  - [Payout Examples](#payout-examples)
- [Error Handling](#error-handling)
  - [Input Validation](#input-validation)
  - [Game State Errors](#game-state-errors)
  - [Network Errors](#network-errors)

## Overview

This document provides a comprehensive guide to the blackjack game logic and rules implementation in our full-stack application. The game supports both single-player and multiplayer modes with standard blackjack rules, advanced features like splitting and doubling down, and a robust betting system.

## Basic Blackjack Rules

### Objective
The goal is to get a hand value as close to 21 as possible without exceeding it (busting), while beating the dealer's hand.

### Card Values
- **Number cards (2-10)**: Face value
- **Face cards (J, Q, K)**: Worth 10 points each
- **Aces**: Worth 11 points, but automatically convert to 1 point when needed to prevent busting

### Winning Conditions
1. **Blackjack**: 21 with exactly 2 cards (Ace + 10-value card) - pays 3:2
2. **Regular Win**: Hand total closer to 21 than dealer without busting - pays 1:1
3. **Push/Draw**: Same total as dealer - bet returned
4. **Bust**: Hand total exceeds 21 - automatic loss

## Card System

### Card Structure
```typescript
interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
}
```

### Deck Management
- **Standard 52-card deck** with 4 suits and 13 values each
- **Fisher-Yates shuffle algorithm** ensures random card distribution
- **Single deck per game** - reshuffled for each new game
- **Card drawing** removes cards from deck to prevent duplicates

### Shuffle Implementation
```typescript
// Fisher-Yates shuffle algorithm
for (let i = deck.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [deck[i], deck[j]] = [deck[j], deck[i]];
}
```

## Hand Calculation

> **🔗 Related Documentation:**
> - For API implementation of hand calculation, see [API Documentation](API.md#data-models)
> - For frontend display of hand totals, see [User Guide](USER_GUIDE.md#scoring-and-rules)
> - For technical implementation details, see [Architecture Overview](ARCHITECTURE.md#data-models)

### Algorithm Overview
The hand calculation system handles the complex logic of Ace values and determines hand status.

### Core Calculation Logic
```typescript
function calculateHand(cards: Card[]): HandResult {
  let total = 0;
  let aces = 0;
  
  // First pass: count all cards, treating Aces as 11
  for (const card of cards) {
    if (card.value === 'A') {
      aces++;
      total += 11;
    } else if (['K', 'Q', 'J'].includes(card.value)) {
      total += 10;
    } else {
      total += parseInt(card.value);
    }
  }
  
  // Second pass: convert Aces from 11 to 1 as needed
  while (total > 21 && aces > 0) {
    total -= 10;  // Convert one Ace from 11 to 1
    aces--;
  }
  
  return {
    total,
    isBlackjack: cards.length === 2 && total === 21,
    isBust: total > 21,
  };
}
```

### Hand Status Determination
- **Blackjack**: Exactly 2 cards totaling 21
- **Bust**: Total exceeds 21
- **Soft Hand**: Contains an Ace counted as 11
- **Hard Hand**: No Aces or all Aces counted as 1

## Game Flow

### Single-Player Game Phases

#### 1. Betting Phase
- Player enters name and places bet
- Bet validation against available balance
- Minimum bet: 1 chip, Maximum bet: current balance

#### 2. Dealing Phase
- Player receives 2 cards (both face up)
- Dealer receives 2 cards (1 face up, 1 face down)
- Immediate blackjack check for player

#### 3. Player Turn Phase
- Player can choose from available actions:
  - **Hit**: Take another card
  - **Stand**: Keep current hand
  - **Double Down**: Double bet, take one card, then stand
  - **Split**: Split matching pairs into two hands

#### 4. Dealer Turn Phase
- Reveal dealer's hidden card
- Dealer hits until reaching 17 or higher
- Dealer must stand on 17 (including soft 17)

#### 5. Result Phase
- Compare hands and determine winner
- Calculate payouts based on result
- Update player balance

### Game State Management
```typescript
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

## Betting System

> **🔗 Related Documentation:**
> - For user interface details, see [User Guide](USER_GUIDE.md#betting-system)
> - For API implementation, see [API Documentation](API.md#data-models)
> - For frontend implementation, see [Development Guide](DEVELOPMENT.md#component-communication)

### Starting Balance
- **Default**: 1000 chips
- **Persistent**: Balance carries between games in same session

### Chip Denominations
Available betting chips: 25, 50, 100, 250, 500, 1000

### Betting Rules
- **Minimum bet**: 1 chip
- **Maximum bet**: Current balance
- **Bet validation**: Prevents betting more than available balance
- **Bet locking**: Bet cannot be changed once game starts

### Balance Management
```typescript
// Bet deduction on game start
player.balance -= bet;

// Payout calculation
const payout = Math.floor(bet * multiplier);
player.balance += payout;
```

## Advanced Features

> **🔗 Related Documentation:**
> - For user interface details, see [User Guide](USER_GUIDE.md#advanced-features)
> - For API implementation, see [API Documentation](API.md#double-down)
> - For multiplayer differences, see [WebSocket Events](WEBSOCKET.md#player-actions)

### Double Down
**Rules**:
- Available only with exactly 2 cards
- Requires sufficient balance to double the bet
- Player receives exactly one additional card
- Automatically stands after receiving the card

**Implementation**:
```typescript
// Double the bet
player.balance -= player.bet;
player.bet *= 2;

// Take one card and stand
const card = drawCard(deck);
currentHand.cards.push(card);
// Automatically proceed to dealer turn
```

### Splitting Pairs
**Rules**:
- Available only with exactly 2 cards of same value
- 10, J, Q, K are all considered equivalent for splitting
- Requires sufficient balance for additional bet
- Each split hand is played separately
- No re-splitting allowed

**Implementation**:
```typescript
// Create two separate hands
const hand1 = { cards: [card1, newCard1], ...calculateHand([card1, newCard1]) };
const hand2 = { cards: [card2, newCard2], ...calculateHand([card2, newCard2]) };

player.hands = [hand1, hand2];
player.splitActive = true;
player.activeHand = 0;
```

### Split Hand Management
- **Active Hand Tracking**: `player.activeHand` indicates current hand
- **Sequential Play**: Complete first hand before moving to second
- **Independent Results**: Each hand resolved separately against dealer
- **Combined Payout**: Total payout is sum of both hands

## Single-Player vs Multiplayer

> **🔗 Related Documentation:**
> - For API implementation details, see [API Documentation](API.md#rest-api-endpoints)
> - For WebSocket implementation, see [WebSocket Events](WEBSOCKET.md#game-events)
> - For user instructions, see [User Guide](USER_GUIDE.md#game-modes)
> - For technical architecture, see [Architecture Overview](ARCHITECTURE.md#data-flow)

### Single-Player Mode

#### Session Management
- **Session-based**: Each player gets unique session ID
- **Session timeout**: 30 minutes of inactivity
- **State persistence**: Game state maintained per session
- **Independent games**: Each player has separate game instance
- **API Details**: For complete API documentation, see [API Documentation](API.md)

#### Game Flow
1. Create session with player name
2. Place bet and start game
3. Player actions (hit, stand, double, split)
4. Dealer resolution
5. Result calculation and payout

### Multiplayer Mode

#### Room System
- **Room codes**: 6-character alphanumeric codes
- **Room creator**: First player becomes room creator
- **Player limit**: No explicit limit (scalable)
- **Room persistence**: Rooms deleted when empty
- **WebSocket Details**: For complete WebSocket documentation, see [WebSocket Events](WEBSOCKET.md)
- **User Instructions**: For multiplayer gameplay guide, see [User Guide](USER_GUIDE.md#multiplayer-mode)

#### Turn-Based Gameplay
```typescript
// Turn management
let nextTurn = currentTurn;
do {
  nextTurn = (nextTurn + 1) % players.length;
} while (players[nextTurn].isStand && nextTurn !== currentTurn);
```

#### Synchronized State
- **Global dealer**: Single dealer shared by all players
- **Turn order**: Players take turns in joining order
- **Real-time updates**: Socket.IO broadcasts state changes
- **Simultaneous resolution**: All hands resolved against same dealer

#### Key Differences from Single-Player

| Aspect | Single-Player | Multiplayer |
|--------|---------------|-------------|
| **Dealer** | Individual per game | Shared across all players |
| **Timing** | Player-controlled pace | Turn-based with waiting |
| **State** | Session-based | Room-based |
| **Actions** | Immediate execution | Turn validation required |
| **Results** | Individual calculation | Batch resolution |

### Multiplayer Game Phases

#### 1. Room Setup
- Create or join room with 6-digit code
- Wait for other players
- Creator initiates game start

#### 2. Synchronized Dealing
- All players receive cards simultaneously
- Shared dealer receives cards
- Turn order established

#### 3. Turn-Based Player Actions
- Players take turns in order
- Actions: hit, stand (double/split not implemented in multiplayer)
- Turn advances automatically after bust or stand

#### 4. Dealer Resolution
- Dealer plays once all players finished
- Same dealer hand used for all player comparisons

#### 5. Batch Results
- All players' results calculated simultaneously
- Individual payouts based on comparison with dealer

## Payout System

### Payout Multipliers
```typescript
const BLACKJACK_MULTIPLIER = 2.5; // 3:2 payout (bet × 2.5)
const WIN_MULTIPLIER = 2;         // 1:1 payout (bet × 2)
const PUSH_MULTIPLIER = 1;        // Bet returned (bet × 1)
const LOSE_MULTIPLIER = 0;        // No payout (bet × 0)
```

> **🔗 Related Documentation:**
> - For user-friendly explanation of payouts, see [User Guide](USER_GUIDE.md#payout-system)
> - For API implementation details, see [API Documentation](API.md)

### Result Determination Logic
```typescript
function determineResult(playerHand, dealerHand, playerBlackjack, dealerBlackjack) {
  if (playerHand.isBust) return { status: 'bust', multiplier: LOSE_MULTIPLIER };
  if (playerBlackjack && !dealerBlackjack) return { status: 'win', multiplier: BLACKJACK_MULTIPLIER };
  if (!playerBlackjack && dealerBlackjack) return { status: 'lose', multiplier: LOSE_MULTIPLIER };
  if (playerBlackjack && dealerBlackjack) return { status: 'draw', multiplier: PUSH_MULTIPLIER };
  if (dealerHand.isBust) return { status: 'win', multiplier: WIN_MULTIPLIER };
  if (playerHand.total > dealerHand.total) return { status: 'win', multiplier: WIN_MULTIPLIER };
  if (playerHand.total < dealerHand.total) return { status: 'lose', multiplier: LOSE_MULTIPLIER };
  return { status: 'draw', multiplier: PUSH_MULTIPLIER };
}
```

### Payout Examples
- **Bet 100, Blackjack**: Payout 250 (100 × 2.5)
- **Bet 100, Regular Win**: Payout 200 (100 × 2)
- **Bet 100, Push**: Payout 100 (100 × 1)
- **Bet 100, Loss**: Payout 0 (100 × 0)

## Error Handling

> **🔗 Related Documentation:**
> - For detailed error handling implementation, see [Architecture Overview](ARCHITECTURE.md#error-handling)
> - For troubleshooting common errors, see [Troubleshooting Guide](TROUBLESHOOTING.md)
> - For API error responses, see [API Documentation](API.md#error-responses)

### Input Validation
- **Bet validation**: Positive amounts within balance limits
- **Session validation**: Valid session IDs and active games
- **Action validation**: Legal moves based on game state

### Game State Errors
- **Empty deck**: Graceful handling when deck runs out
- **Invalid actions**: Prevent illegal moves (e.g., hit after stand)
- **Session timeout**: Clean up expired sessions

### Network Errors (Multiplayer)
- **Disconnection handling**: Remove players from rooms
- **Room cleanup**: Delete empty rooms
- **Turn validation**: Ensure only current player can act

### Error Response Format
```typescript
// API Error Response
{
  "error": "Descriptive error message"
}

// Socket.IO Error Event
socket.emit('roomError', 'Error message');
```

## Implementation Notes

### Performance Considerations
- **Session cleanup**: Automatic removal of expired sessions
- **Memory management**: Efficient deck and hand storage
- **State synchronization**: Minimal data transfer in multiplayer
- **Technical Details**: For more information on performance optimization, see [Architecture Overview](ARCHITECTURE.md#performance-optimizations)

### Security Features
- **Session isolation**: Players cannot access other sessions
- **Input sanitization**: Validation of all user inputs
- **Turn validation**: Multiplayer turn enforcement
- **Security Details**: For more information on security considerations, see [Architecture Overview](ARCHITECTURE.md#security-considerations)

### Extensibility
- **Modular design**: Separate services for game logic
- **Type safety**: TypeScript interfaces for all game objects
- **Configurable rules**: Easy modification of game parameters

This implementation provides a robust, scalable blackjack game with both single-player and multiplayer capabilities, following standard casino rules while maintaining code quality and user experience.