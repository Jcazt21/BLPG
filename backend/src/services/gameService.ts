import { Card, Deck, Player, Dealer, GameState, GameStatus, Suit, Value } from '../types/gameTypes';

const START_BALANCE = 1000;

// Payout multipliers
const BLACKJACK_MULTIPLIER = 2.5; // 3:2 payout
const WIN_MULTIPLIER = 2;         // 1:1 payout
const PUSH_MULTIPLIER = 1;        // Bet returned
const LOSE_MULTIPLIER = 0;        // No payout

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
  // Shuffle deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Helper to calculate hand total and status
function calculateHand(cards: Card[]): { total: number; isBlackjack: boolean; isBust: boolean } {
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
  // Adjust for aces
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

// Singleton GameService for in-memory session
class GameService {
  private gameState: GameState | null = null;

  // Start a new game (after bet)
  startGame(playerName: string, bet: number, balance: number): GameState {
    if (bet > balance) throw new Error('Bet cannot exceed balance');
    const deck = createShuffledDeck();
    const playerCards = [deck.pop()!, deck.pop()!];
    const dealerCards = [deck.pop()!, deck.pop()!];
    const playerHand = { cards: playerCards, ...calculateHand(playerCards) };
    const dealerHand = { cards: [dealerCards[0]], ...calculateHand([dealerCards[0]]) };
    const dealer: Dealer = { hand: dealerHand, hiddenCard: dealerCards[1] };
    const player: Player = { name: playerName, hands: [playerHand], balance: balance - bet, bet };
    let phase: 'player-turn' | 'result' = 'player-turn';
    let status: GameStatus = 'playing';
    // Check for instant Blackjack
    const playerBlackjack = playerHand.isBlackjack;
    const dealerBlackjack = calculateHand([dealerCards[0], dealerCards[1]]).isBlackjack;
    if (playerBlackjack || dealerBlackjack) {
      phase = 'result';
      status = playerBlackjack && !dealerBlackjack ? 'win'
        : !playerBlackjack && dealerBlackjack ? 'lose'
        : 'draw';
      // Payout handled in stand()
    }
    this.gameState = {
      player,
      dealer,
      deck,
      status,
      phase,
      canDoubleDown: this.canDoubleDown(player, balance - bet),
    };
    return this.getGameState();
  }

  // Helper: can the player double down?
  private canDoubleDown(player: Player, balance: number): boolean {
    return player.hands[0].cards.length === 2 && balance >= player.bet;
  }

  // Player hits
  hit(): GameState {
    if (!this.gameState || this.gameState.phase !== 'player-turn') return this.getGameState();
    const card = this.gameState.deck.pop();
    if (card) {
      this.gameState.player.hands[0].cards.push(card);
      const handStatus = calculateHand(this.gameState.player.hands[0].cards);
      this.gameState.player.hands[0] = { ...this.gameState.player.hands[0], ...handStatus };
      if (handStatus.isBust) {
        this.gameState.status = 'bust';
        this.gameState.phase = 'result';
      } else if (handStatus.isBlackjack) {
        this.gameState.status = 'blackjack';
        this.gameState.phase = 'result';
      }
    }
    this.gameState.canDoubleDown = false;
    return this.getGameState();
  }

  // Player stands, dealer plays
  stand(): GameState {
    if (!this.gameState || (this.gameState.phase !== 'player-turn' && this.gameState.phase !== 'dealer-turn')) return this.getGameState();
    this.gameState.phase = 'dealer-turn';
    // Reveal dealer's hidden card
    const dealerCards = [
      this.gameState.dealer.hand.cards[0],
      this.gameState.dealer.hiddenCard!,
    ];
    let dealerHand = { cards: dealerCards, ...calculateHand(dealerCards) };
    // Dealer hits until 17 or more
    while (dealerHand.total < 17) {
      const card = this.gameState.deck.pop();
      if (card) dealerHand.cards.push(card);
      dealerHand = { ...dealerHand, ...calculateHand(dealerHand.cards) };
    }
    this.gameState.dealer.hand = dealerHand;
    // Compare hands
    const playerTotal = this.gameState.player.hands[0].total;
    const dealerTotal = dealerHand.total;
    const playerBlackjack = this.gameState.player.hands[0].isBlackjack;
    const dealerBlackjack = dealerHand.cards.length === 2 && dealerHand.total === 21;
    let result: GameStatus = 'draw';
    let payout = 0;
    let multiplier = LOSE_MULTIPLIER;
    if (playerBlackjack && !dealerBlackjack) {
      result = 'win';
      multiplier = BLACKJACK_MULTIPLIER;
    } else if (!playerBlackjack && dealerBlackjack) {
      result = 'lose';
      multiplier = LOSE_MULTIPLIER;
    } else if (playerBlackjack && dealerBlackjack) {
      result = 'draw';
      multiplier = PUSH_MULTIPLIER;
    } else if (dealerHand.isBust) {
      result = 'win';
      multiplier = WIN_MULTIPLIER;
    } else if (playerTotal > dealerTotal) {
      result = 'win';
      multiplier = WIN_MULTIPLIER;
    } else if (playerTotal < dealerTotal) {
      result = 'lose';
      multiplier = LOSE_MULTIPLIER;
    } else {
      result = 'draw';
      multiplier = PUSH_MULTIPLIER;
    }
    payout = Math.floor(this.gameState.player.bet * multiplier);
    this.gameState.player.balance += payout;
    this.gameState.status = result;
    this.gameState.phase = 'result';
    this.gameState.canDoubleDown = false;
    // Reset bet to 0 after round
    this.gameState.player.bet = 0;
    return this.getGameState();
  }

  // Double down: double the bet, take one card, then stand
  doubleDown(): GameState {
    if (!this.gameState || !this.gameState.canDoubleDown) return this.getGameState();
    // Deduct additional bet
    if (this.gameState.player.balance < this.gameState.player.bet) return this.getGameState();
    this.gameState.player.balance -= this.gameState.player.bet;
    this.gameState.player.bet *= 2;
    // Take one card
    const card = this.gameState.deck.pop();
    if (card) {
      this.gameState.player.hands[0].cards.push(card);
      const handStatus = calculateHand(this.gameState.player.hands[0].cards);
      this.gameState.player.hands[0] = { ...this.gameState.player.hands[0], ...handStatus };
      if (handStatus.isBust) {
        this.gameState.status = 'bust';
        this.gameState.phase = 'betting';
        this.gameState.canDoubleDown = false;
        // Reset bet to 0 after round
        this.gameState.player.bet = 0;
        return this.getGameState();
      }
    }
    // After double down, auto-stand
    return this.stand();
  }

  // Restart game with same player, new bet
  restartGame(bet: number): GameState {
    if (!this.gameState) throw new Error('No game in progress');
    const playerName = this.gameState.player.name;
    const balance = this.gameState.player.balance;
    return this.startGame(playerName, bet, balance);
  }

  // Get current game state (for debugging or refresh)
  getGameState(): GameState {
    if (!this.gameState) throw new Error('No game in progress');
    // Hide dealer's hidden card if game is still playing
    if (this.gameState.phase === 'player-turn') {
      return {
        ...this.gameState,
        dealer: {
          hand: this.gameState.dealer.hand,
        },
      };
    }
    // Reveal all cards if game is over
    return this.gameState;
  }

  // Add split logic: if player has two cards of same value and enough balance, allow split
  // On split, create two hands, duplicate bet, set splitActive, and allow actions on each hand in turn
  // After both hands finish, resolve dealer and show results for both
  // Reset bet to 0 after round
  // Update GameState and Player to support hands: Hand[]
}

export default new GameService();

export function split(payload: any) {
  // Get game state from payload
  const gameState = payload.gameState;
  const player = gameState.player;
  const deck = gameState.deck;
  if (!player || !player.hands || player.hands.length !== 1) throw new Error('Invalid player state for split');
  const hand = player.hands[0];
  if (hand.cards.length !== 2 || hand.cards[0].value !== hand.cards[1].value) throw new Error('Cannot split: cards must be same value');
  if (player.balance < player.bet) throw new Error('Not enough balance to split');
  // Create two hands
  const card1 = hand.cards[0];
  const card2 = hand.cards[1];
  const newCard1 = deck.pop();
  const newCard2 = deck.pop();
  const hand1 = { cards: [card1, newCard1], ...calculateHand([card1, newCard1]) };
  const hand2 = { cards: [card2, newCard2], ...calculateHand([card2, newCard2]) };
  player.hands = [hand1, hand2];
  player.balance -= player.bet;
  player.splitActive = true;
  player.activeHand = 0;
  gameState.status = 'player-turn';
  return gameState;
} 