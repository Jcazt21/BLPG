import { GameType, Crazy8GameState, GameState } from '../types/gameTypes';

/**
 * Room model representing a multiplayer game room
 */
export interface RoomModel {
  code: string;
  creatorId: string;
  playerIds: string[];
  gameId?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

/**
 * Extended room interface for different game types
 */
export interface Room extends RoomModel {
  gameType: GameType;
  gameState: GameState | Crazy8GameState | null;
  maxPlayers: number;
  minPlayers: number;
}

/**
 * Crazy 8 specific room interface
 */
export interface Crazy8Room extends Room {
  gameType: 'crazy8';
  gameState: Crazy8GameState | null;
  maxPlayers: 6; // 2-6 players for Crazy 8
  minPlayers: 2;
}

/**
 * Blackjack specific room interface
 */
export interface BlackjackRoom extends Room {
  gameType: 'blackjack';
  gameState: GameState | null;
  maxPlayers: 4; // Typical blackjack table limit
  minPlayers: 1;
}