import { GameState, Player, GameStatus } from '../types/gameTypes';

/**
 * Interface for payout analysis data
 */
export interface PayoutAnalysis {
  roundId: string;
  playerId: string;
  playerName: string;
  betAmount: number;
  payoutAmount: number;
  expectedPayout: number;
  payoutMultiplier: number;
  gameStatus: GameStatus;
  isBlackjack: boolean;
  playerTotal: number;
  dealerTotal: number;
  timestamp: Date;
  discrepancy?: number;
}

/**
 * Interface for financial summary data
 */
export interface FinancialSummary {
  totalRounds: number;
  totalBetsPlaced: number;
  totalPayoutsGiven: number;
  totalExpectedPayouts: number;
  totalDiscrepancies: number;
  accuracyPercentage: number;
  blackjackPayouts: number;
  regularWinPayouts: number;
  pushPayouts: number;
  lossPayouts: number;
  averageBetSize: number;
  houseEdgeActual: number;
  houseEdgeExpected: number;
  generatedAt: Date;
}

/**
 * Interface for discrepancy reporting
 */
export interface PayoutDiscrepancy {
  roundId: string;
  playerId: string;
  playerName: string;
  expectedPayout: number;
  actualPayout: number;
  discrepancyAmount: number;
  discrepancyPercentage: number;
  gameStatus: GameStatus;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Interface for accuracy metrics
 */
export interface AccuracyMetrics {
  totalTransactions: number;
  accurateTransactions: number;
  inaccurateTransactions: number;
  accuracyRate: number;
  averageDiscrepancy: number;
  maxDiscrepancy: number;
  minDiscrepancy: number;
  discrepancyStandardDeviation: number;
  criticalErrors: number;
  highSeverityErrors: number;
  mediumSeverityErrors: number;
  lowSeverityErrors: number;
}

/**
 * FinancialReporter class for detailed payout reporting and analysis
 */
export class FinancialReporter {
  private payoutHistory: PayoutAnalysis[] = [];
  
  // Payout multipliers (should match gameService.ts)
  private readonly BLACKJACK_MULTIPLIER = 2.5; // 3:2 payout
  private readonly WIN_MULTIPLIER = 2;         // 1:1 payout
  private readonly PUSH_MULTIPLIER = 1;        // Bet returned
  private readonly LOSE_MULTIPLIER = 0;        // No payout

  /**
   * Record a payout transaction for analysis
   */
  recordPayout(
    roundId: string,
    gameState: GameState,
    actualPayout: number
  ): void {
    const player = gameState.player;
    const dealer = gameState.dealer;
    
    // Calculate expected payout based on game rules
    const expectedPayout = this.calculateExpectedPayout(gameState);
    
    const analysis: PayoutAnalysis = {
      roundId,
      playerId: player.name, // Using name as ID for now
      playerName: player.name,
      betAmount: player.bet,
      payoutAmount: actualPayout,
      expectedPayout,
      payoutMultiplier: expectedPayout / player.bet,
      gameStatus: gameState.status,
      isBlackjack: player.hands[0]?.isBlackjack || false,
      playerTotal: player.hands[0]?.total || 0,
      dealerTotal: dealer.hand.total,
      timestamp: new Date(),
      discrepancy: Math.abs(actualPayout - expectedPayout)
    };

    this.payoutHistory.push(analysis);
  }

  /**
   * Calculate expected payout based on game state and rules
   */
  private calculateExpectedPayout(gameState: GameState): number {
    const player = gameState.player;
    const dealer = gameState.dealer;
    const playerHand = player.hands[0]; // For now, handle single hand
    
    if (!playerHand) return 0;

    const playerBlackjack = playerHand.isBlackjack;
    const dealerBlackjack = dealer.hand.cards.length === 2 && dealer.hand.total === 21;
    
    // Determine expected multiplier based on game rules
    let multiplier = this.LOSE_MULTIPLIER;
    
    if (playerHand.isBust) {
      multiplier = this.LOSE_MULTIPLIER;
    } else if (playerBlackjack && !dealerBlackjack) {
      multiplier = this.BLACKJACK_MULTIPLIER;
    } else if (!playerBlackjack && dealerBlackjack) {
      multiplier = this.LOSE_MULTIPLIER;
    } else if (playerBlackjack && dealerBlackjack) {
      multiplier = this.PUSH_MULTIPLIER;
    } else if (dealer.hand.isBust) {
      multiplier = this.WIN_MULTIPLIER;
    } else if (playerHand.total > dealer.hand.total) {
      multiplier = this.WIN_MULTIPLIER;
    } else if (playerHand.total < dealer.hand.total) {
      multiplier = this.LOSE_MULTIPLIER;
    } else {
      multiplier = this.PUSH_MULTIPLIER;
    }
    
    return Math.floor(player.bet * multiplier);
  }

  /**
   * Generate detailed payout report per round
   */
  generatePayoutReport(roundId?: string): PayoutAnalysis[] {
    if (roundId) {
      return this.payoutHistory.filter(analysis => analysis.roundId === roundId);
    }
    return [...this.payoutHistory];
  }

  /**
   * Generate overall financial integrity report
   */
  generateFinancialSummary(): FinancialSummary {
    if (this.payoutHistory.length === 0) {
      return {
        totalRounds: 0,
        totalBetsPlaced: 0,
        totalPayoutsGiven: 0,
        totalExpectedPayouts: 0,
        totalDiscrepancies: 0,
        accuracyPercentage: 100,
        blackjackPayouts: 0,
        regularWinPayouts: 0,
        pushPayouts: 0,
        lossPayouts: 0,
        averageBetSize: 0,
        houseEdgeActual: 0,
        houseEdgeExpected: 0,
        generatedAt: new Date()
      };
    }

    const totalBetsPlaced = this.payoutHistory.reduce((sum, analysis) => sum + analysis.betAmount, 0);
    const totalPayoutsGiven = this.payoutHistory.reduce((sum, analysis) => sum + analysis.payoutAmount, 0);
    const totalExpectedPayouts = this.payoutHistory.reduce((sum, analysis) => sum + analysis.expectedPayout, 0);
    const totalDiscrepancies = this.payoutHistory.reduce((sum, analysis) => sum + (analysis.discrepancy || 0), 0);
    
    const blackjackPayouts = this.payoutHistory
      .filter(analysis => analysis.isBlackjack && analysis.gameStatus === 'win')
      .reduce((sum, analysis) => sum + analysis.payoutAmount, 0);
    
    const regularWinPayouts = this.payoutHistory
      .filter(analysis => !analysis.isBlackjack && analysis.gameStatus === 'win')
      .reduce((sum, analysis) => sum + analysis.payoutAmount, 0);
    
    const pushPayouts = this.payoutHistory
      .filter(analysis => analysis.gameStatus === 'draw')
      .reduce((sum, analysis) => sum + analysis.payoutAmount, 0);
    
    const lossPayouts = this.payoutHistory
      .filter(analysis => analysis.gameStatus === 'lose' || analysis.gameStatus === 'bust')
      .reduce((sum, analysis) => sum + analysis.payoutAmount, 0);

    const accurateTransactions = this.payoutHistory.filter(analysis => (analysis.discrepancy || 0) === 0).length;
    const accuracyPercentage = (accurateTransactions / this.payoutHistory.length) * 100;
    
    const houseEdgeActual = ((totalBetsPlaced - totalPayoutsGiven) / totalBetsPlaced) * 100;
    const houseEdgeExpected = ((totalBetsPlaced - totalExpectedPayouts) / totalBetsPlaced) * 100;

    return {
      totalRounds: this.payoutHistory.length,
      totalBetsPlaced,
      totalPayoutsGiven,
      totalExpectedPayouts,
      totalDiscrepancies,
      accuracyPercentage,
      blackjackPayouts,
      regularWinPayouts,
      pushPayouts,
      lossPayouts,
      averageBetSize: totalBetsPlaced / this.payoutHistory.length,
      houseEdgeActual,
      houseEdgeExpected,
      generatedAt: new Date()
    };
  }

  /**
   * Report and format payout errors/discrepancies
   */
  reportDiscrepancies(threshold: number = 0): PayoutDiscrepancy[] {
    return this.payoutHistory
      .filter(analysis => (analysis.discrepancy || 0) > threshold)
      .map(analysis => {
        const discrepancyAmount = analysis.discrepancy || 0;
        const discrepancyPercentage = (discrepancyAmount / analysis.expectedPayout) * 100;
        
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
        if (discrepancyPercentage > 50) {
          severity = 'critical';
        } else if (discrepancyPercentage > 25) {
          severity = 'high';
        } else if (discrepancyPercentage > 10) {
          severity = 'medium';
        }

        return {
          roundId: analysis.roundId,
          playerId: analysis.playerId,
          playerName: analysis.playerName,
          expectedPayout: analysis.expectedPayout,
          actualPayout: analysis.payoutAmount,
          discrepancyAmount,
          discrepancyPercentage,
          gameStatus: analysis.gameStatus,
          timestamp: analysis.timestamp,
          severity
        };
      })
      .sort((a, b) => b.discrepancyAmount - a.discrepancyAmount);
  }

  /**
   * Generate payout accuracy statistics
   */
  calculateAccuracyMetrics(): AccuracyMetrics {
    if (this.payoutHistory.length === 0) {
      return {
        totalTransactions: 0,
        accurateTransactions: 0,
        inaccurateTransactions: 0,
        accuracyRate: 100,
        averageDiscrepancy: 0,
        maxDiscrepancy: 0,
        minDiscrepancy: 0,
        discrepancyStandardDeviation: 0,
        criticalErrors: 0,
        highSeverityErrors: 0,
        mediumSeverityErrors: 0,
        lowSeverityErrors: 0
      };
    }

    const discrepancies = this.payoutHistory.map(analysis => analysis.discrepancy || 0);
    const accurateTransactions = discrepancies.filter(d => d === 0).length;
    const inaccurateTransactions = this.payoutHistory.length - accurateTransactions;
    
    const averageDiscrepancy = discrepancies.reduce((sum, d) => sum + d, 0) / discrepancies.length;
    const maxDiscrepancy = Math.max(...discrepancies);
    const minDiscrepancy = Math.min(...discrepancies);
    
    // Calculate standard deviation
    const variance = discrepancies.reduce((sum, d) => sum + Math.pow(d - averageDiscrepancy, 2), 0) / discrepancies.length;
    const discrepancyStandardDeviation = Math.sqrt(variance);
    
    // Count errors by severity
    const discrepancyReports = this.reportDiscrepancies(0);
    const criticalErrors = discrepancyReports.filter(d => d.severity === 'critical').length;
    const highSeverityErrors = discrepancyReports.filter(d => d.severity === 'high').length;
    const mediumSeverityErrors = discrepancyReports.filter(d => d.severity === 'medium').length;
    const lowSeverityErrors = discrepancyReports.filter(d => d.severity === 'low').length;

    return {
      totalTransactions: this.payoutHistory.length,
      accurateTransactions,
      inaccurateTransactions,
      accuracyRate: (accurateTransactions / this.payoutHistory.length) * 100,
      averageDiscrepancy,
      maxDiscrepancy,
      minDiscrepancy,
      discrepancyStandardDeviation,
      criticalErrors,
      highSeverityErrors,
      mediumSeverityErrors,
      lowSeverityErrors
    };
  }

  /**
   * Clear payout history (for testing or reset)
   */
  clearHistory(): void {
    this.payoutHistory = [];
  }

  /**
   * Get payout history count
   */
  getHistoryCount(): number {
    return this.payoutHistory.length;
  }

  /**
   * Export payout data for external analysis
   */
  exportPayoutData(): PayoutAnalysis[] {
    return JSON.parse(JSON.stringify(this.payoutHistory));
  }
}

// Export singleton instance
export default new FinancialReporter();