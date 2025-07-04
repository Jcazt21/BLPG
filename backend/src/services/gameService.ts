import { Card, Deck, Player, Dealer, GameState, GameStatus, Suit, Value, Hand } from '../types/gameTypes';

const START_BALANCE = 1000;

// Payout multipliers
const BLACKJACK_MULTIPLIER = 2.5; // 3:2 payout
const WIN_MULTIPLIER = 2;         // 1:1 payout
const PUSH_MULTIPLIER = 1;        // Bet returned
const LOSE_MULTIPLIER = 0;        // No payout

// Enhanced types for better type safety
interface HandResult {
  total: number;
  isBlackjack: boolean;
  isBust: boolean;
}

interface GameResult {
  status: GameStatus;
  payout: number;
  multiplier: number;
}

// Session data structure
interface UserSession {
  gameState: GameState | null;
  lastActivity: number;
  playerId: string;
}

// Helper to create a new shuffled deck
function createShuffledDeck(): Deck {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values: Value[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: Deck = [];
  
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value });
    }
  }
  
  // Fisher-Yates shuffle algorithm
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  return deck;
}

// Helper to calculate hand total and status
function calculateHand(cards: Card[]): HandResult {
  if (cards.length === 0) {
    return { total: 0, isBlackjack: false, isBust: false };
  }

  let total = 0;
  let aces = 0;
  
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
  
  // Adjust for aces (convert from 11 to 1 when needed)
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  
  return {
    total,
    isBlackjack: cards.length === 2 && total === 21,
    isBust: total > 21,
  };
}

// Helper to safely draw card from deck
function drawCard(deck: Deck): Card {
  const card = deck.pop();
  if (!card) {
    throw new Error('Deck is empty - cannot draw card');
  }
  return card;
}

// Helper to determine game result
function determineResult(playerHand: HandResult, dealerHand: HandResult, playerBlackjack: boolean, dealerBlackjack: boolean): GameResult {
  let status: GameStatus = 'draw';
  let multiplier = LOSE_MULTIPLIER;
  
  if (playerHand.isBust) {
    status = 'bust';
    multiplier = LOSE_MULTIPLIER;
  } else if (playerBlackjack && !dealerBlackjack) {
    status = 'win';
    multiplier = BLACKJACK_MULTIPLIER;
  } else if (!playerBlackjack && dealerBlackjack) {
    status = 'lose';
    multiplier = LOSE_MULTIPLIER;
  } else if (playerBlackjack && dealerBlackjack) {
    status = 'draw';
    multiplier = PUSH_MULTIPLIER;
  } else if (dealerHand.isBust) {
    status = 'win';
    multiplier = WIN_MULTIPLIER;
  } else if (playerHand.total > dealerHand.total) {
    status = 'win';
    multiplier = WIN_MULTIPLIER;
  } else if (playerHand.total < dealerHand.total) {
    status = 'lose';
    multiplier = LOSE_MULTIPLIER;
  } else {
    status = 'draw';
    multiplier = PUSH_MULTIPLIER;
  }
  
  return { status, payout: 0, multiplier };
}

// Enhanced GameService with session management
class GameService {
  private sessions: Map<string, UserSession> = new Map();
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes

  // Generate unique session ID
  private generateSessionId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // Clean up expired sessions
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.sessionTimeout) {
        this.sessions.delete(sessionId);
      }
    }
  }

  // Get or create session
  private getSession(sessionId: string): UserSession {
    this.cleanupExpiredSessions();
    if (!this.sessions.has(sessionId)) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    const session = this.sessions.get(sessionId)!;
    session.lastActivity = Date.now();
    return session;
  }

  // Create new session for player
  createSession(playerName: string): string {
    const sessionId = this.generateSessionId();
    this.sessions.set(sessionId, {
      gameState: null,
      lastActivity: Date.now(),
      playerId: playerName,
    });
    return sessionId;
  }

  // Start a new game (after bet)
  startGame(sessionId: string, playerName: string, bet: number, balance: number): GameState {
    if (bet <= 0) throw new Error('Bet must be positive');
    if (bet > balance) throw new Error('Bet cannot exceed balance');
    
    const session = this.getSession(sessionId);
    const deck = createShuffledDeck();
    
    try {
      const playerCards = [drawCard(deck), drawCard(deck)];
      const dealerCards = [drawCard(deck), drawCard(deck)];
      
      const playerHand = { cards: playerCards, ...calculateHand(playerCards) };
      const dealerHand = { cards: [dealerCards[0]], ...calculateHand([dealerCards[0]]) };
      const dealer: Dealer = { hand: dealerHand, hiddenCard: dealerCards[1] };
      
      const player: Player = { 
        name: playerName, 
        hands: [playerHand], 
        balance: balance - bet, 
        bet,
        splitActive: false,
        activeHand: 0
      };
      
      let phase: 'player-turn' | 'dealer-turn' | 'result' = 'player-turn';
      let status: GameStatus = 'playing';
      
      // Only check for instant player blackjack - dealer blackjack is revealed during dealer turn
      const playerBlackjack = playerHand.isBlackjack;
      
      if (playerBlackjack) {
        // Player has blackjack, but we still need to see if dealer also has blackjack
        // This will be resolved in the dealer turn
        phase = 'dealer-turn';
        session.gameState = {
          player,
          dealer,
          deck,
          status: 'playing',
          phase,
          canDoubleDown: false, // No double down after blackjack
          canSplit: false,
        };
        
        // Immediately resolve dealer turn since player has blackjack
        this.resolveDealerTurn(sessionId);
        return this.getGameState(sessionId);
      }
      
      session.gameState = {
        player,
        dealer,
        deck,
        status,
        phase,
        canDoubleDown: this.canDoubleDown(player, player.balance),
        canSplit: this.canSplit(player),
      };
      
      return this.getGameState(sessionId);
    } catch (error) {
      throw new Error(`Failed to start game: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper: can the player double down?
  private canDoubleDown(player: Player, balance: number): boolean {
    if (player.splitActive) {
      const idx = typeof player.activeHand === 'number' ? player.activeHand : 0;
      return player.hands[idx].cards.length === 2 && balance >= player.bet;
    }
    return player.hands[0].cards.length === 2 && balance >= player.bet;
  }

  // Helper: can the player split?
  private canSplit(player: Player): boolean {
    if (player.splitActive || player.hands.length > 1) return false;
    const hand = player.hands[0];
    if (hand.cards.length !== 2) return false;
    if (player.balance < player.bet) return false;
    
    // Check if cards have same value (10, J, Q, K are all considered 10)
    const getValue = (card: Card) => ['J', 'Q', 'K'].includes(card.value) ? '10' : card.value;
    return getValue(hand.cards[0]) === getValue(hand.cards[1]);
  }

  // Get current active hand
  private getCurrentHand(sessionId: string) {
    const session = this.getSession(sessionId);
    if (!session.gameState) throw new Error('No game in progress');
    const idx = typeof session.gameState.player.activeHand === 'number' ? session.gameState.player.activeHand : 0;
    return session.gameState.player.hands[idx];
  }

  // Player hits
  hit(sessionId: string): GameState {
    const session = this.getSession(sessionId);
    if (!session.gameState || session.gameState.phase !== 'player-turn') {
      return this.getGameState(sessionId);
    }
    
    try {
      const card = drawCard(session.gameState.deck);
      const currentHand = this.getCurrentHand(sessionId);
      currentHand.cards.push(card);
      
      const handStatus = calculateHand(currentHand.cards);
      Object.assign(currentHand, handStatus);
      
      if (handStatus.isBust) {
        this.handleHandComplete(sessionId);
      }
      
      session.gameState.canDoubleDown = false;
      session.gameState.canSplit = false;
      
      return this.getGameState(sessionId);
    } catch (error) {
      throw new Error(`Failed to hit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Handle completion of a hand (bust or stand)
  private handleHandComplete(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (!session.gameState) return;
    
    const player = session.gameState.player;
    
    if (player.splitActive && typeof player.activeHand === 'number' && player.activeHand < player.hands.length - 1) {
      // Move to next hand
      player.activeHand!++;
      session.gameState.canDoubleDown = this.canDoubleDown(player, player.balance);
      session.gameState.canSplit = false; // No splitting after first hand
    } else {
      // All hands complete, move to dealer turn
      session.gameState.phase = 'dealer-turn';
      this.resolveDealerTurn(sessionId);
    }
  }

  // Player stands
  stand(sessionId: string): GameState {
    const session = this.getSession(sessionId);
    if (!session.gameState || session.gameState.phase !== 'player-turn') {
      return this.getGameState(sessionId);
    }
    
    this.handleHandComplete(sessionId);
    return this.getGameState(sessionId);
  }

  // Resolve dealer's turn
  private resolveDealerTurn(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (!session.gameState) return;
    
    // Reveal dealer's hidden card
    const dealerCards = [
      session.gameState.dealer.hand.cards[0],
      session.gameState.dealer.hiddenCard!,
    ];
    
    let dealerHand = { cards: dealerCards, ...calculateHand(dealerCards) };
    
    // Check if dealer has blackjack (21 with exactly 2 cards)
    const dealerBlackjack = dealerHand.isBlackjack;
    
    // If dealer doesn't have blackjack, dealer hits until 17 or more
    if (!dealerBlackjack) {
      while (dealerHand.total < 17) {
        try {
          const card = drawCard(session.gameState.deck);
          dealerHand.cards.push(card);
          dealerHand = { ...dealerHand, ...calculateHand(dealerHand.cards) };
        } catch (error) {
          // If deck is empty, dealer must stand
          break;
        }
      }
    }
    
    session.gameState.dealer.hand = dealerHand;
    
    // Resolve all hands
    this.resolveAllHands(sessionId, dealerHand);
    
    session.gameState.phase = 'result';
    session.gameState.canDoubleDown = false;
    session.gameState.canSplit = false;
  }

  // Resolve all player hands against dealer
  private resolveAllHands(sessionId: string, dealerHand: Hand): void {
    const session = this.getSession(sessionId);
    if (!session.gameState) return;
    
    const player = session.gameState.player;
    let totalPayout = 0;
    let overallStatus: GameStatus = 'lose';
    
    for (const hand of player.hands) {
      const playerBlackjack = hand.isBlackjack;
      const dealerBlackjack = dealerHand.cards.length === 2 && dealerHand.total === 21;
      
      const result = determineResult(hand, dealerHand, playerBlackjack, dealerBlackjack);
      const payout = Math.floor(player.bet * result.multiplier);
      totalPayout += payout;
      
      // Set overall status based on best result
      if (result.status === 'win' && overallStatus !== 'win') {
        overallStatus = 'win';
      } else if (result.status === 'draw' && overallStatus === 'lose') {
        overallStatus = 'draw';
      }
    }
    
    player.balance += totalPayout;
    player.bet = 0;
    session.gameState.status = overallStatus;
  }

  // Double down: double the bet, take one card, then stand
  doubleDown(sessionId: string): GameState {
    const session = this.getSession(sessionId);
    if (!session.gameState || !session.gameState.canDoubleDown) {
      return this.getGameState(sessionId);
    }
    
    const player = session.gameState.player;
    if (player.balance < player.bet) {
      return this.getGameState(sessionId);
    }
    
    try {
      // Deduct additional bet
      player.balance -= player.bet;
      player.bet *= 2;
      
      // Take one card
      const card = drawCard(session.gameState.deck);
      const currentHand = this.getCurrentHand(sessionId);
      currentHand.cards.push(card);
      
      const handStatus = calculateHand(currentHand.cards);
      Object.assign(currentHand, handStatus);
      
      session.gameState.canDoubleDown = false;
      session.gameState.canSplit = false;
      
      // After double down, automatically stand
      this.handleHandComplete(sessionId);
      
      return this.getGameState(sessionId);
    } catch (error) {
      throw new Error(`Failed to double down: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Split pairs
  split(sessionId: string): GameState {
    const session = this.getSession(sessionId);
    if (!session.gameState || !session.gameState.canSplit) {
      return this.getGameState(sessionId);
    }
    
    const player = session.gameState.player;
    const hand = player.hands[0];
    
    if (player.balance < player.bet) {
      return this.getGameState(sessionId);
    }
    
    try {
      // Deduct additional bet for second hand
      player.balance -= player.bet;
      
      // Split the cards
      const card1 = hand.cards[0];
      const card2 = hand.cards[1];
      
      const newCard1 = drawCard(session.gameState.deck);
      const newCard2 = drawCard(session.gameState.deck);
      
      const hand1 = { cards: [card1, newCard1], ...calculateHand([card1, newCard1]) };
      const hand2 = { cards: [card2, newCard2], ...calculateHand([card2, newCard2]) };
      
      player.hands = [hand1, hand2];
      player.splitActive = true;
      player.activeHand = 0;
      
      session.gameState.canDoubleDown = this.canDoubleDown(player, player.balance);
      session.gameState.canSplit = false;
      
      return this.getGameState(sessionId);
    } catch (error) {
      throw new Error(`Failed to split: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Restart game with same player, new bet
  restartGame(sessionId: string, bet: number): GameState {
    const session = this.getSession(sessionId);
    if (!session.gameState) throw new Error('No game in progress');
    
    const playerName = session.gameState.player.name;
    const balance = session.gameState.player.balance;
    
    return this.startGame(sessionId, playerName, bet, balance);
  }

  // Get current game state
  getGameState(sessionId: string): GameState {
    const session = this.getSession(sessionId);
    if (!session.gameState) throw new Error('No game in progress');
    
    // Create a deep copy to avoid mutations
    const state = JSON.parse(JSON.stringify(session.gameState));
    
    // Hide dealer's hidden card if game is still in progress
    if (state.phase === 'player-turn') {
      return {
        ...state,
        dealer: {
          hand: state.dealer.hand,
          // hiddenCard is not included in the returned state
        },
      };
    }
    
    // Reveal all cards if game is over
    return state;
  }

  // Reset specific session
  resetSession(sessionId: string): void {
    const session = this.getSession(sessionId);
    session.gameState = null;
  }

  // Get player balance
  getBalance(sessionId: string): number {
    try {
      const session = this.getSession(sessionId);
      return session.gameState?.player.balance ?? START_BALANCE;
    } catch {
      return START_BALANCE;
    }
  }

  // Check if game is in progress
  isGameActive(sessionId: string): boolean {
    try {
      const session = this.getSession(sessionId);
      return session.gameState !== null && session.gameState.phase !== 'result';
    } catch {
      return false;
    }
  }

  // Get session info
  getSessionInfo(sessionId: string): { playerId: string; lastActivity: number } {
    const session = this.getSession(sessionId);
    return {
      playerId: session.playerId,
      lastActivity: session.lastActivity,
    };
  }

  // Get all active sessions (for admin/debug)
  getActiveSessions(): { sessionId: string; playerId: string; lastActivity: number }[] {
    this.cleanupExpiredSessions();
    return Array.from(this.sessions.entries()).map(([sessionId, session]) => ({
      sessionId,
      playerId: session.playerId,
      lastActivity: session.lastActivity,
    }));
  }

  // Remove specific session
  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

// Export singleton instance
export default new GameService(); 