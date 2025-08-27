import { Card } from '../../types/gameTypes';
import { createShuffledDeck } from '../../utils/cardUtils';

/**
 * Service for dealing cards in blackjack
 */
export class DealingService {
  private deck: Card[];
  
  constructor() {
    this.deck = createShuffledDeck();
  }
  
  /**
   * Reshuffles the deck
   */
  reshuffle(): void {
    this.deck = createShuffledDeck();
  }
  
  /**
   * Deals initial cards to players and dealer
   */
  dealInitialCards(playerCount: number): {
    playerHands: Card[][],
    dealerHand: Card[],
    hiddenCard: Card
  } {
    // Create player hands array
    const playerHands: Card[][] = Array(playerCount).fill([]).map(() => []);
    
    // Deal first card to each player
    for (let i = 0; i < playerCount; i++) {
      playerHands[i].push(this.drawCard());
    }
    
    // Deal first card to dealer (face up)
    const dealerHand: Card[] = [this.drawCard()];
    
    // Deal second card to each player
    for (let i = 0; i < playerCount; i++) {
      playerHands[i].push(this.drawCard());
    }
    
    // Deal second card to dealer (face down)
    const hiddenCard = this.drawCard();
    
    return { playerHands, dealerHand, hiddenCard };
  }
  
  /**
   * Draws a card from the deck
   */
  drawCard(): Card {
    // Reshuffle if deck is empty
    if (this.deck.length === 0) {
      this.reshuffle();
    }
    
    return this.deck.pop()!;
  }
  
  /**
   * Gets the current number of cards left in the deck
   */
  get cardsRemaining(): number {
    return this.deck.length;
  }
}