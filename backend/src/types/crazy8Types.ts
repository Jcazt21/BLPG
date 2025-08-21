import { Card, Suit } from './gameTypes';

/**
 * Crazy 8 specific action types for socket communication
 */
export type Crazy8Action = 
  | 'play-card'
  | 'draw-card' 
  | 'choose-suit'
  | 'pass-turn';

/**
 * Crazy 8 game action payload
 */
export interface Crazy8GameAction {
  type: Crazy8Action;
  playerId: string;
  roomCode: string;
  card?: Card;
  suit?: Suit;
}

/**
 * Crazy 8 socket events
 */
export interface Crazy8SocketEvents {
  // Client to Server events
  'crazy8:join-room': (data: { roomCode: string; playerId: string; playerName: string }) => void;
  'crazy8:create-room': (data: { playerId: string; playerName: string }) => void;
  'crazy8:start-game': (data: { roomCode: string; playerId: string }) => void;
  'crazy8:play-card': (data: { roomCode: string; playerId: string; card: Card }) => void;
  'crazy8:draw-card': (data: { roomCode: string; playerId: string }) => void;
  'crazy8:choose-suit': (data: { roomCode: string; playerId: string; suit: Suit }) => void;
  'crazy8:leave-room': (data: { roomCode: string; playerId: string }) => void;
  
  // Server to Client events
  'crazy8:room-created': (data: { roomCode: string }) => void;
  'crazy8:room-joined': (data: { roomCode: string; players: string[] }) => void;
  'crazy8:game-started': (data: { gameState: any }) => void;
  'crazy8:game-state-update': (data: { gameState: any }) => void;
  'crazy8:suit-selection-required': (data: { playerId: string }) => void;
  'crazy8:game-ended': (data: { winner: string; scores: any[] }) => void;
  'crazy8:player-joined': (data: { playerId: string; playerName: string }) => void;
  'crazy8:player-left': (data: { playerId: string }) => void;
  'crazy8:error': (data: { message: string; code?: string }) => void;
}

/**
 * Crazy 8 error codes
 */
export enum Crazy8ErrorCode {
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  ROOM_FULL = 'ROOM_FULL',
  GAME_ALREADY_STARTED = 'GAME_ALREADY_STARTED',
  NOT_PLAYER_TURN = 'NOT_PLAYER_TURN',
  INVALID_CARD = 'INVALID_CARD',
  CARD_NOT_IN_HAND = 'CARD_NOT_IN_HAND',
  GAME_NOT_STARTED = 'GAME_NOT_STARTED',
  INSUFFICIENT_PLAYERS = 'INSUFFICIENT_PLAYERS',
  NOT_ROOM_CREATOR = 'NOT_ROOM_CREATOR',
  PLAYER_NOT_IN_ROOM = 'PLAYER_NOT_IN_ROOM'
}

/**
 * Crazy 8 game validation result
 */
export interface Crazy8ValidationResult {
  isValid: boolean;
  errorCode?: Crazy8ErrorCode;
  errorMessage?: string;
}