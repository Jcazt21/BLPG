/**
 * Player model representing a player in the game
 */
export interface PlayerModel {
  id: string;
  name: string;
  balance: number;
  currentBet: number;
  isConnected: boolean;
  lastActivity: Date;
}