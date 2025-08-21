import { Room, Crazy8Room, BlackjackRoom } from '../models/roomModel';
import { GameState, Crazy8GameState, GameType } from '../types/gameTypes';

/**
 * Type guard to check if a room is a Crazy 8 room
 */
export function isCrazy8Room(room: Room): room is Crazy8Room {
  return room.gameType === 'crazy8';
}

/**
 * Type guard to check if a room is a Blackjack room
 */
export function isBlackjackRoom(room: Room): room is BlackjackRoom {
  return room.gameType === 'blackjack';
}

/**
 * Type guard to check if a game state is a Crazy 8 game state
 */
export function isCrazy8GameState(gameState: GameState | Crazy8GameState | null): gameState is Crazy8GameState {
  return gameState !== null && 'gameType' in gameState && gameState.gameType === 'crazy8';
}

/**
 * Type guard to check if a game state is a Blackjack game state
 */
export function isBlackjackGameState(gameState: GameState | Crazy8GameState | null): gameState is GameState {
  return gameState !== null && !('gameType' in gameState);
}

/**
 * Utility function to get room type-specific max players
 */
export function getMaxPlayersForGameType(gameType: GameType): number {
  switch (gameType) {
    case 'crazy8':
      return 6;
    case 'blackjack':
      return 4;
    default:
      return 4;
  }
}

/**
 * Utility function to get room type-specific min players
 */
export function getMinPlayersForGameType(gameType: GameType): number {
  switch (gameType) {
    case 'crazy8':
      return 2;
    case 'blackjack':
      return 1;
    default:
      return 1;
  }
}