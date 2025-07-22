import { Card } from '../types/gameTypes';

/**
 * Game model representing a blackjack game state
 */
export interface GameModel {
  id: string;
  deck: Card[];
  playerHands: Card[][];
  dealerHand: Card[];
  currentTurn: number;
  gamePhase: 'betting' | 'dealing' | 'playing' | 'dealer' | 'result';
  createdAt: Date;
  updatedAt: Date;
}