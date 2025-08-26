import GameService from '../services/gameService';
import { FinancialReporter } from '../utils/financialReporter';

/**
 * Example demonstrating how to integrate FinancialReporter with GameService
 * This shows how to track payouts and generate financial reports
 */

// Create instances
const gameService = GameService;
const financialReporter = new FinancialReporter();

/**
 * Enhanced game session that tracks financial data
 */
class EnhancedGameSession {
  private sessionId: string;
  private roundCounter: number = 0;

  constructor(playerName: string) {
    this.sessionId = gameService.createSession(playerName);
  }

  /**
   * Start a game and track the financial outcome
   */
  async playRound(playerName: string, betAmount: number, balance: number): Promise<void> {
    try {
      this.roundCounter++;
      const roundId = `${this.sessionId}-round-${this.roundCounter}`;
      
      // Start the game
      let gameState = gameService.startGame(this.sessionId, playerName, betAmount, balance);
      
      // Simulate player actions (this would be based on actual player input)
      while (gameState.phase === 'player-turn') {
        // Simple strategy: hit if under 17, stand otherwise
        const playerTotal = gameState.player.hands[0]?.total || 0;
        if (playerTotal < 17) {
          gameState = gameService.hit(this.sessionId);
        } else {
          gameState = gameService.stand(this.sessionId);
        }
      }
      
      // Calculate actual payout based on final game state
      const actualPayout = this.calculateActualPayout(gameState);
      
      // Record the payout for financial analysis
      financialReporter.recordPayout(roundId, gameState, actualPayout);
      
      console.log(`Round ${this.roundCounter} completed:`);
      console.log(`  Status: ${gameState.status}`);
      console.log(`  Bet: $${betAmount}`);
      console.log(`  Payout: $${actualPayout}`);
      console.log(`  Player Balance: $${gameState.player.balance}`);
      
    } catch (error) {
      console.error(`Error in round ${this.roundCounter}:`, error);
    }
  }

  /**
   * Calculate actual payout based on game state
   * This mimics what the game service would do
   */
  private calculateActualPayout(gameState: any): number {
    const player = gameState.player;
    const dealer = gameState.dealer;
    const playerHand = player.hands[0];
    
    if (!playerHand) return 0;

    const playerBlackjack = playerHand.isBlackjack;
    const dealerBlackjack = dealer.hand.cards.length === 2 && dealer.hand.total === 21;
    
    let multiplier = 0;
    
    if (playerHand.isBust) {
      multiplier = 0; // Lose
    } else if (playerBlackjack && !dealerBlackjack) {
      multiplier = 2.5; // Blackjack payout
    } else if (!playerBlackjack && dealerBlackjack) {
      multiplier = 0; // Lose to dealer blackjack
    } else if (playerBlackjack && dealerBlackjack) {
      multiplier = 1; // Push
    } else if (dealer.hand.isBust) {
      multiplier = 2; // Win
    } else if (playerHand.total > dealer.hand.total) {
      multiplier = 2; // Win
    } else if (playerHand.total < dealer.hand.total) {
      multiplier = 0; // Lose
    } else {
      multiplier = 1; // Push
    }
    
    return Math.floor(player.bet * multiplier);
  }

  /**
   * Generate and display financial reports
   */
  generateReports(): void {
    console.log('\n=== FINANCIAL REPORTS ===\n');
    
    // 1. Payout Report
    const payoutReport = financialReporter.generatePayoutReport();
    console.log('1. PAYOUT REPORT:');
    console.log(`   Total rounds played: ${payoutReport.length}`);
    payoutReport.forEach((analysis, index) => {
      console.log(`   Round ${index + 1}: ${analysis.gameStatus} - Bet: $${analysis.betAmount}, Payout: $${analysis.payoutAmount}`);
    });
    
    // 2. Financial Summary
    const summary = financialReporter.generateFinancialSummary();
    console.log('\n2. FINANCIAL SUMMARY:');
    console.log(`   Total Rounds: ${summary.totalRounds}`);
    console.log(`   Total Bets Placed: $${summary.totalBetsPlaced}`);
    console.log(`   Total Payouts Given: $${summary.totalPayoutsGiven}`);
    console.log(`   House Edge: ${summary.houseEdgeActual.toFixed(2)}%`);
    console.log(`   Accuracy: ${summary.accuracyPercentage.toFixed(2)}%`);
    console.log(`   Average Bet Size: $${summary.averageBetSize.toFixed(2)}`);
    
    // 3. Discrepancy Report
    const discrepancies = financialReporter.reportDiscrepancies();
    console.log('\n3. DISCREPANCY REPORT:');
    if (discrepancies.length === 0) {
      console.log('   No discrepancies found - all payouts are accurate!');
    } else {
      console.log(`   Found ${discrepancies.length} discrepancies:`);
      discrepancies.forEach((discrepancy, index) => {
        console.log(`   ${index + 1}. Round ${discrepancy.roundId}: Expected $${discrepancy.expectedPayout}, Got $${discrepancy.actualPayout} (${discrepancy.severity} severity)`);
      });
    }
    
    // 4. Accuracy Metrics
    const metrics = financialReporter.calculateAccuracyMetrics();
    console.log('\n4. ACCURACY METRICS:');
    console.log(`   Total Transactions: ${metrics.totalTransactions}`);
    console.log(`   Accurate Transactions: ${metrics.accurateTransactions}`);
    console.log(`   Accuracy Rate: ${metrics.accuracyRate.toFixed(2)}%`);
    console.log(`   Average Discrepancy: $${metrics.averageDiscrepancy.toFixed(2)}`);
    console.log(`   Max Discrepancy: $${metrics.maxDiscrepancy.toFixed(2)}`);
    console.log(`   Critical Errors: ${metrics.criticalErrors}`);
    console.log(`   High Severity Errors: ${metrics.highSeverityErrors}`);
    console.log(`   Medium Severity Errors: ${metrics.mediumSeverityErrors}`);
    console.log(`   Low Severity Errors: ${metrics.lowSeverityErrors}`);
  }
}

/**
 * Demo function showing the FinancialReporter in action
 */
export async function runFinancialReporterDemo(): Promise<void> {
  console.log('=== FINANCIAL REPORTER DEMO ===\n');
  
  const session = new EnhancedGameSession('DemoPlayer');
  
  // Play several rounds with different bet amounts
  const scenarios = [
    { bet: 100, balance: 1000 },
    { bet: 50, balance: 900 },
    { bet: 200, balance: 850 },
    { bet: 75, balance: 650 },
    { bet: 150, balance: 575 }
  ];
  
  for (const scenario of scenarios) {
    await session.playRound('DemoPlayer', scenario.bet, scenario.balance);
    // Small delay to make the demo more readable
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Generate comprehensive reports
  session.generateReports();
  
  console.log('\n=== DEMO COMPLETED ===');
}

// Export for use in other modules
export { EnhancedGameSession };

// Uncomment to run the demo
// runFinancialReporterDemo().catch(console.error);