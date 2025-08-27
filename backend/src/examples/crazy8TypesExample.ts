/**
 * Example demonstrating the Crazy 8 types and interfaces
 * This file serves as documentation and verification that the types work correctly
 */

import { Crazy8Player, Crazy8GameState, Card, Suit } from '../types/gameTypes';
import { Crazy8Room, Room } from '../models/roomModel';
import { isCrazy8Room, getMaxPlayersForGameType } from '../utils/typeGuards';
import { Crazy8GameAction, Crazy8ErrorCode } from '../types/crazy8Types';

// Example: Creating a Crazy 8 player
const examplePlayer: Crazy8Player = {
  id: 'player_123',
  name: 'Alice',
  hand: [
    { suit: 'hearts', value: '7' },
    { suit: 'diamonds', value: 'K' },
    { suit: 'clubs', value: '8' }
  ],
  cardCount: 3,
  isCurrentTurn: true,
  hasWon: false,
  score: 0,
  isConnected: true
};

// Example: Creating a Crazy 8 game state
const exampleGameState: Crazy8GameState = {
  players: [examplePlayer],
  currentPlayerIndex: 0,
  direction: 1,
  discardPile: [
    { suit: 'spades', value: '9' },
    { suit: 'hearts', value: 'Q' }
  ],
  topCard: { suit: 'hearts', value: 'Q' },
  activeSuit: 'hearts',
  deckCount: 42,
  phase: 'playing',
  gameType: 'crazy8',
  maxPlayers: 6,
  minPlayers: 2
};

// Example: Creating a Crazy 8 room
const exampleRoom: Crazy8Room = {
  code: 'ABC123',
  creatorId: 'player_123',
  playerIds: ['player_123'],
  gameId: 'game_456',
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
  gameType: 'crazy8',
  gameState: exampleGameState,
  maxPlayers: 6,
  minPlayers: 2
};

// Example: Using type guards
function handleRoom(room: Room) {
  if (isCrazy8Room(room)) {
    // TypeScript now knows this is a Crazy8Room
    console.log(`Crazy 8 room with max ${room.maxPlayers} players`);
    
    if (room.gameState) {
      // TypeScript knows this is Crazy8GameState
      console.log(`Current phase: ${room.gameState.phase}`);
      console.log(`Active suit: ${room.gameState.activeSuit}`);
    }
  }
}

// Example: Creating game actions
const playCardAction: Crazy8GameAction = {
  type: 'play-card',
  playerId: 'player_123',
  roomCode: 'ABC123',
  card: { suit: 'hearts', value: '8' }
};

const chooseSuitAction: Crazy8GameAction = {
  type: 'choose-suit',
  playerId: 'player_123',
  roomCode: 'ABC123',
  suit: 'spades'
};

// Example: Using utility functions
const maxPlayers = getMaxPlayersForGameType('crazy8'); // Returns 6
const minPlayers = getMaxPlayersForGameType('blackjack'); // Returns 4

// Example: Error handling
function handleGameError(errorCode: Crazy8ErrorCode): string {
  switch (errorCode) {
    case Crazy8ErrorCode.ROOM_NOT_FOUND:
      return 'The game room could not be found';
    case Crazy8ErrorCode.NOT_PLAYER_TURN:
      return 'It is not your turn to play';
    case Crazy8ErrorCode.INVALID_CARD:
      return 'The card you played is not valid';
    default:
      return 'An unknown error occurred';
  }
}

// Export examples for potential use in tests or documentation
export {
  examplePlayer,
  exampleGameState,
  exampleRoom,
  playCardAction,
  chooseSuitAction,
  handleRoom,
  handleGameError
};