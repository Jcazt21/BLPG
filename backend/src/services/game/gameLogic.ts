import { Card } from '../../types/gameTypes';
import { calculateHand, createShuffledDeck } from '../../utils/cardUtils';

/**
 * Core game logic for blackjack
 */
export class GameLogic {
  /**
   * Determines if a player has blackjack
   */
  static hasBlackjack(hand: Card[]): boolean {
    return hand.length === 2 && calculateHand(hand).total === 21;
  }
  
  /**
   * Determines if a player has busted
   */
  static isBust(hand: Card[]): boolean {
    return calculateHand(hand).total > 21;
  }
  
  /**
   * Determines the winner between player and dealer
   */
  static determineWinner(playerHand: Card[], dealerHand: Card[]): 'player' | 'dealer' | 'push' {
    const playerResult = calculateHand(playerHand);
    const dealerResult = calculateHand(dealerHand);
    
    if (playerResult.isBust) return 'dealer';
    if (dealerResult.isBust) return 'player';
    
    if (playerResult.isBlackjack && !dealerResult.isBlackjack) return 'player';
    if (!playerResult.isBlackjack && dealerResult.isBlackjack) return 'dealer';
    
    if (playerResult.total > dealerResult.total) return 'player';
    if (playerResult.total < dealerResult.total) return 'dealer';
    
    return 'push';
  }
  
  /**
   * Calculates payout based on bet amount and result
   */
  static calculatePayout(bet: number, result: 'player' | 'dealer' | 'push', isBlackjack: boolean): number {
    if (result === 'dealer') return 0;
    if (result === 'push') return bet;
    if (isBlackjack) return Math.floor(bet * 2.5); // 3:2 payout for blackjack
    return bet * 2; // 1:1 payout for regular win
  }
}