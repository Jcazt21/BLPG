// Card suits and values
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Value = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  value: Value;
}

export type Deck = Card[];

export interface Hand {
  cards: Card[];
  total: number;
  isBlackjack: boolean;
  isBust: boolean;
}

export interface Player {
  name: string;
  hands: Hand[];
  balance: number;
  bet: number;
  splitActive?: boolean;
  activeHand?: number;
}

export interface Dealer {
  hand: Hand;
  hiddenCard?: Card; // Dealer's face-down card
}

export type GameStatus = 'playing' | 'bust' | 'blackjack' | 'win' | 'lose' | 'draw';

export type GamePhase = 'betting' | 'dealing' | 'player-turn' | 'dealer-turn' | 'result';

export interface GameState {
  player: Player;
  dealer: Dealer;
  deck: Deck;
  status: GameStatus;
  phase: GamePhase;
  canDoubleDown?: boolean;
  splitHands?: Hand[];
  canSplit?: boolean;
}

// Crazy 8 Game Types
export interface Crazy8Player {
  id: string;
  name: string;
  hand: Card[];
  cardCount: number; // For other players (to hide actual cards)
  isCurrentTurn: boolean;
  hasWon: boolean;
  score: number;
  isConnected: boolean;
}

export type Crazy8GamePhase = 'waiting' | 'playing' | 'suit-selection' | 'finished';

export interface Crazy8GameState {
  players: Crazy8Player[];
  currentPlayerIndex: number;
  direction: 1 | -1; // For future expansion (reverse direction)
  discardPile: Card[];
  topCard: Card;
  activeSuit: Suit;
  deckCount: number;
  phase: Crazy8GamePhase;
  winner?: string;
  scores?: ScoreResult[];
  gameType: 'crazy8';
  maxPlayers: number;
  minPlayers: number;
}

export interface ScoreResult {
  playerId: string;
  playerName: string;
  remainingCards: number;
  points: number;
}

export type GameType = 'blackjack' | 'crazy8'; 