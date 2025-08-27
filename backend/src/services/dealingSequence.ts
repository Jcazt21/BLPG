import { Card, Deck } from '../types/gameTypes';

export interface MultiplayerPlayer {
  id: string;
  name: string;
  position: number;
  hand: Card[];
  total: number;
  bet: number;
  balance: number;
  status: 'playing' | 'stand' | 'bust' | 'blackjack';
  hasPlacedBet: boolean;
}

export interface MultiplayerDealer {
  visibleCards: Card[];
  holeCard?: Card;
  total: number;
  isBust: boolean;
  isBlackjack: boolean;
}

export interface DealingStep {
  type: 'player' | 'dealer';
  playerId?: string;
  card: Card;
  isHoleCard?: boolean;
  round: number;
  stepNumber: number;
}

/**
 * DealingSequence class implements authentic casino card dealing sequence
 * Following proper casino protocol:
 * 1. First round: one card face-up to each player in position order, then dealer
 * 2. Second round: second card face-up to each player in position order
 * 3. Dealer receives hole card (face-down) last
 */
export class DealingSequence {
  private deck: Deck;
  private dealingSteps: DealingStep[] = [];
  private currentStep: number = 0;

  constructor(deck: Deck) {
    this.deck = [...deck]; // Create a copy to avoid mutating original
  }

  /**
   * Calculate hand total with proper Ace handling
   */
  private calculateHand(cards: Card[]): { total: number; isBlackjack: boolean; isBust: boolean } {
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

  /**
   * Draw a card from the deck safely
   */
  private drawCard(): Card {
    const card = this.deck.pop();
    if (!card) {
      throw new Error('Deck is empty - cannot draw card');
    }
    return card;
  }

  /**
   * Generate the complete dealing sequence following casino protocol
   */
  generateDealingSequence(players: MultiplayerPlayer[]): DealingStep[] {
    this.dealingSteps = [];
    let stepNumber = 1;

    // Sort players by position to ensure proper dealing order
    const sortedPlayers = [...players].sort((a, b) => a.position - b.position);

    // Round 1: One card face-up to each player in position order
    for (const player of sortedPlayers) {
      const card = this.drawCard();
      this.dealingSteps.push({
        type: 'player',
        playerId: player.id,
        card,
        isHoleCard: false,
        round: 1,
        stepNumber: stepNumber++
      });
    }

    // Dealer gets first card (face-up)
    const dealerCard1 = this.drawCard();
    this.dealingSteps.push({
      type: 'dealer',
      card: dealerCard1,
      isHoleCard: false,
      round: 1,
      stepNumber: stepNumber++
    });

    // Round 2: Second card face-up to each player in position order
    for (const player of sortedPlayers) {
      const card = this.drawCard();
      this.dealingSteps.push({
        type: 'player',
        playerId: player.id,
        card,
        isHoleCard: false,
        round: 2,
        stepNumber: stepNumber++
      });
    }

    // Dealer gets hole card (face-down) - this is the authentic casino sequence
    const dealerHoleCard = this.drawCard();
    this.dealingSteps.push({
      type: 'dealer',
      card: dealerHoleCard,
      isHoleCard: true,
      round: 2,
      stepNumber: stepNumber++
    });

    return this.dealingSteps;
  }

  /**
   * Deal initial cards to all players and dealer following casino sequence
   */
  dealInitialCards(players: MultiplayerPlayer[], dealer: MultiplayerDealer): {
    players: MultiplayerPlayer[];
    dealer: MultiplayerDealer;
    dealingSteps: DealingStep[];
  } {
    // Generate the dealing sequence
    const steps = this.generateDealingSequence(players);
    
    // Apply the dealing sequence to update player and dealer hands
    const updatedPlayers = players.map(player => ({
      ...player,
      hand: [] as Card[],
      total: 0,
      status: 'playing' as MultiplayerPlayer['status']
    }));

    const updatedDealer: MultiplayerDealer = {
      visibleCards: [],
      holeCard: undefined,
      total: 0,
      isBust: false,
      isBlackjack: false
    };

    // Process each dealing step
    for (const step of steps) {
      if (step.type === 'player' && step.playerId) {
        const player = updatedPlayers.find(p => p.id === step.playerId);
        if (player) {
          player.hand.push(step.card);
          const handStatus = this.calculateHand(player.hand);
          player.total = handStatus.total;
          if (handStatus.isBlackjack) {
            player.status = 'blackjack';
          }
        }
      } else if (step.type === 'dealer') {
        if (step.isHoleCard) {
          updatedDealer.holeCard = step.card;
        } else {
          updatedDealer.visibleCards.push(step.card);
        }
      }
    }

    // Calculate dealer's visible total (only from visible cards)
    const dealerVisibleStatus = this.calculateHand(updatedDealer.visibleCards);
    updatedDealer.total = dealerVisibleStatus.total;

    return {
      players: updatedPlayers,
      dealer: updatedDealer,
      dealingSteps: steps
    };
  }

  /**
   * Reveal dealer's hole card (used when dealer's turn begins)
   */
  revealDealerHoleCard(dealer: MultiplayerDealer): MultiplayerDealer {
    if (!dealer.holeCard) {
      throw new Error('No hole card to reveal');
    }

    const updatedDealer: MultiplayerDealer = {
      ...dealer,
      visibleCards: [...dealer.visibleCards, dealer.holeCard]
    };

    // Recalculate dealer's total with all cards
    const allCards = [...updatedDealer.visibleCards];
    const handStatus = this.calculateHand(allCards);
    
    updatedDealer.total = handStatus.total;
    updatedDealer.isBust = handStatus.isBust;
    updatedDealer.isBlackjack = handStatus.isBlackjack;

    return updatedDealer;
  }

  /**
   * Get the next dealing step for animation purposes
   */
  getNextDealingStep(): DealingStep | null {
    if (this.currentStep >= this.dealingSteps.length) {
      return null;
    }
    return this.dealingSteps[this.currentStep++];
  }

  /**
   * Reset the dealing sequence for a new round
   */
  reset(newDeck: Deck): void {
    this.deck = [...newDeck];
    this.dealingSteps = [];
    this.currentStep = 0;
  }

  /**
   * Get all dealing steps (for debugging or replay)
   */
  getAllSteps(): DealingStep[] {
    return [...this.dealingSteps];
  }

  /**
   * Check if dealing sequence is complete
   */
  isComplete(): boolean {
    return this.currentStep >= this.dealingSteps.length;
  }

  /**
   * Get remaining deck after dealing
   */
  getRemainingDeck(): Deck {
    return [...this.deck];
  }

  /**
   * Validate that dealing sequence follows casino rules
   */
  validateSequence(steps: DealingStep[]): boolean {
    if (steps.length === 0) return false;

    let round1PlayerCards = 0;
    let round1DealerCards = 0;
    let round2PlayerCards = 0;
    let round2DealerCards = 0;
    let holeCardCount = 0;

    for (const step of steps) {
      if (step.round === 1) {
        if (step.type === 'player') {
          round1PlayerCards++;
        } else if (step.type === 'dealer' && !step.isHoleCard) {
          round1DealerCards++;
        }
      } else if (step.round === 2) {
        if (step.type === 'player') {
          round2PlayerCards++;
        } else if (step.type === 'dealer') {
          if (step.isHoleCard) {
            holeCardCount++;
          } else {
            round2DealerCards++;
          }
        }
      }
    }

    // Validate casino dealing rules:
    // - Each player gets exactly 2 cards (1 in each round)
    // - Dealer gets 1 visible card in round 1, 1 hole card in round 2
    // - Hole card must be the last card dealt
    return round1PlayerCards === round2PlayerCards && // Same number of players in both rounds
      round1DealerCards === 1 && // Dealer gets 1 visible card in round 1
      round2DealerCards === 0 && // Dealer gets no visible cards in round 2
      holeCardCount === 1 && // Exactly 1 hole card
      steps[steps.length - 1].isHoleCard === true; // Last card is the hole card
  }
}