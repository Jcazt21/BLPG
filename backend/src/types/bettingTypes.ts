import { Card } from './gameTypes';

// Enhanced betting-related types for the multiplayer blackjack system

export interface BetRecord {
  roundId: string;
  amount: number;
  result: 'win' | 'lose' | 'draw' | 'bust' | 'blackjack';
  payout: number;
  timestamp: number;
}

export interface BettingSession {
  roomCode: string;
  roundId: string;
  startTime: number;
  endTime?: number;
  duration: number;
  bets: Map<string, PlayerBet>;
  status: 'active' | 'completed' | 'cancelled';
  totalPot: number;
}

export interface PlayerBet {
  playerId: string;
  amount: number;
  placedAt: number;
  isAllIn: boolean;
  balanceAfterBet: number;
}

export interface PayoutCalculation {
  playerId: string;
  betAmount: number;
  gameResult: 'win' | 'lose' | 'draw' | 'bust' | 'blackjack';
  payoutMultiplier: number;
  payoutAmount: number;
  finalBalance: number;
  isValid: boolean;
  errors?: string[];
}

export interface BalanceTransaction {
  id: string;
  playerId: string;
  roomCode: string;
  type: 'bet' | 'payout' | 'refund' | 'initial';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  timestamp: number;
  roundId: string;
  metadata?: {
    betAmount?: number;
    gameResult?: string;
    payoutMultiplier?: number;
  };
}

// Enhanced MultiplayerPlayer type with betting fields
export interface MultiplayerPlayer {
  // Existing fields
  id: string;
  name: string;
  position: number;
  hand: Card[];
  total: number;
  isBust: boolean;
  isStand: boolean;
  isBlackjack: boolean;
  status: 'playing' | 'stand' | 'bust' | 'blackjack';
  victories: number;
  gamesWon: number;
  gamesBlackjack: number;
  gamesLost: number;
  gamesDraw: number;
  gamesBust: number;
  
  // New betting fields
  balance: number;
  currentBet: number;
  hasPlacedBet: boolean;
  betHistory: BetRecord[];
  totalWinnings: number;
  totalLosses: number;
}

export interface MultiplayerDealer {
  hand: Card[];
  hiddenCard?: Card;
  total: number;
  isBust: boolean;
  isBlackjack: boolean;
}

// Enhanced GameState type with betting phase and timing
export interface MultiplayerGameState {
  started: boolean;
  players: MultiplayerPlayer[];
  dealer: MultiplayerDealer;
  deck: Card[];
  turn: number;
  phase: 'betting' | 'dealing' | 'playing' | 'dealer' | 'result';
  results?: { [playerId: string]: GameResult };
  
  // New betting fields
  bettingTimeLeft: number;
  minBet: number;
  maxBet: number;
  roundId: string;
  totalPot: number;
}

export interface GameResult {
  status: 'win' | 'lose' | 'draw' | 'bust' | 'blackjack';
  payout: number;
  finalBalance: number;
}

export interface Room {
  sockets: Set<string>;
  players: Map<string, MultiplayerPlayer>;
  creator: string;
  gameState: MultiplayerGameState | null;
  playersReady: Set<string>;
}

// Betting validation and error types
export enum BettingErrorType {
  INSUFFICIENT_BALANCE = 'insufficient_balance',
  INVALID_AMOUNT = 'invalid_amount',
  BETTING_CLOSED = 'betting_closed',
  DUPLICATE_BET = 'duplicate_bet',
  PLAYER_NOT_FOUND = 'player_not_found',
  ROOM_NOT_FOUND = 'room_not_found'
}

export interface BettingError {
  type: BettingErrorType;
  message: string;
  playerId: string;
  roomCode: string;
  timestamp: number;
  recoverable: boolean;
  suggestedAction?: string;
}

export interface BetValidationResult {
  isValid: boolean;
  error?: BettingError;
}

export interface BetResult {
  success: boolean;
  newBalance: number;
  betAmount: number;
  error?: BettingError;
}

export interface PayoutResults {
  [playerId: string]: PayoutCalculation;
}

// Game result status type for consistency
export type GameResultStatus = 'win' | 'lose' | 'draw' | 'bust' | 'blackjack';

// Betting constants
export const BETTING_CONSTANTS = {
  INITIAL_BALANCE: 2000, // Updated to 2000 chips as per requirement 1.1
  MIN_BET: 25,
  BETTING_TIME_SECONDS: 15, // Updated from 30s to 15s for faster gameplay
  PAYOUT_MULTIPLIERS: {
    WIN: 2,
    BLACKJACK: 2.5,
    DRAW: 1,
    LOSE: 0,
    BUST: 0
  }
} as const;