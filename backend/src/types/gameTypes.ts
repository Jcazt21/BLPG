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
} 