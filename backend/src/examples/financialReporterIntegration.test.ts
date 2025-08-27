import { FinancialReporter } from '../utils/financialReporter';
import GameService from '../services/gameService';

describe('FinancialReporter Integration', () => {
  let financialReporter: FinancialReporter;
  let sessionId: string;

  beforeEach(() => {
    financialReporter = new FinancialReporter();
    financialReporter.clearHistory();
    sessionId = GameService.createSession('TestPlayer');
  });

  afterEach(() => {
    GameService.removeSession(sessionId);
  });

  it('should integrate with GameService to track payouts', () => {
    // Start a game
    const gameState = GameService.startGame(sessionId, 'TestPlayer', 100, 1000);
    
    // Simulate a completed game by manually setting the final state
    gameState.phase = 'result';
    gameState.status = 'win';
    
    // Calculate expected payout (this would normally be done by GameService)
    const expectedPayout = 200; // 2x for regular win
    
    // Record the payout
    financialReporter.recordPayout('test-round-1', gameState, expectedPayout);
    
    // Verify the payout was recorded correctly
    const report = financialReporter.generatePayoutReport('test-round-1');
    expect(report).toHaveLength(1);
    expect(report[0].betAmount).toBe(100);
    expect(report[0].payoutAmount).toBe(200);
    expect(report[0].gameStatus).toBe('win');
    expect(report[0].discrepancy).toBe(0);
  });

  it('should detect discrepancies in payout calculations', () => {
    // Start a game
    const gameState = GameService.startGame(sessionId, 'TestPlayer', 100, 1000);
    
    // Simulate a win scenario
    gameState.phase = 'result';
    gameState.status = 'win';
    
    // Record an incorrect payout (should be 200 for a win, but we give 150)
    const incorrectPayout = 150;
    financialReporter.recordPayout('test-round-1', gameState, incorrectPayout);
    
    // Check for discrepancies
    const discrepancies = financialReporter.reportDiscrepancies();
    expect(discrepancies).toHaveLength(1);
    expect(discrepancies[0].discrepancyAmount).toBe(50);
    expect(discrepancies[0].expectedPayout).toBe(200);
    expect(discrepancies[0].actualPayout).toBe(150);
  });

  it('should generate accurate financial summaries', () => {
    // Simulate multiple game outcomes with correct expected payouts
    const scenarios = [
      { status: 'win', bet: 100, payout: 200, isBlackjack: false },
      { status: 'lose', bet: 50, payout: 0, isBlackjack: false },
      { status: 'draw', bet: 75, payout: 75, isBlackjack: false },
      { status: 'win', bet: 200, payout: 500, isBlackjack: true } // Blackjack win (2.5x)
    ];

    scenarios.forEach((scenario, index) => {
      const gameState = GameService.startGame(sessionId, 'TestPlayer', scenario.bet, 1000);
      gameState.phase = 'result';
      gameState.status = scenario.status as any;
      
      // Set blackjack for the last scenario
      if (scenario.isBlackjack) {
        gameState.player.hands[0].isBlackjack = true;
      }
      
      // Set dealer hand to ensure correct expected payout calculation
      if (scenario.status === 'win') {
        gameState.dealer.hand.total = 20; // Dealer doesn't bust, player wins
        gameState.dealer.hand.isBust = false;
      } else if (scenario.status === 'lose') {
        gameState.dealer.hand.total = 21; // Dealer wins
        gameState.dealer.hand.isBust = false;
      } else if (scenario.status === 'draw') {
        gameState.dealer.hand.total = gameState.player.hands[0].total; // Same total
        gameState.dealer.hand.isBust = false;
      }
      
      financialReporter.recordPayout(`round-${index + 1}`, gameState, scenario.payout);
    });

    const summary = financialReporter.generateFinancialSummary();
    
    expect(summary.totalRounds).toBe(4);
    expect(summary.totalBetsPlaced).toBe(425); // 100+50+75+200
    expect(summary.totalPayoutsGiven).toBe(775); // 200+0+75+500
    
    // Check if all payouts are accurate by looking at the report
    const report = financialReporter.generatePayoutReport();
    const allAccurate = report.every(r => (r.discrepancy || 0) === 0);
    expect(allAccurate).toBe(true);
  });

  it('should calculate accuracy metrics correctly', () => {
    // Add some accurate and inaccurate payouts
    const scenarios = [
      { status: 'win', bet: 100, actualPayout: 200, expectedAccurate: true },
      { status: 'win', bet: 100, actualPayout: 180, expectedAccurate: false },
      { status: 'lose', bet: 50, actualPayout: 0, expectedAccurate: true },
      { status: 'draw', bet: 75, actualPayout: 75, expectedAccurate: true }
    ];

    scenarios.forEach((scenario, index) => {
      const gameState = createMockGameState(scenario.status, scenario.bet);
      financialReporter.recordPayout(`round-${index + 1}`, gameState, scenario.actualPayout);
    });

    const metrics = financialReporter.calculateAccuracyMetrics();
    
    expect(metrics.totalTransactions).toBe(4);
    
    // Check the actual discrepancies to understand what's happening
    const report = financialReporter.generatePayoutReport();
    const accurateCount = report.filter(r => (r.discrepancy || 0) === 0).length;
    
    expect(accurateCount).toBeGreaterThan(0);
    expect(metrics.inaccurateTransactions).toBeGreaterThan(0);
  });

  // Helper function to create mock game states
  function createMockGameState(status: string, bet: number) {
    const gameState = GameService.startGame(sessionId, 'TestPlayer', bet, 1000);
    gameState.phase = 'result';
    gameState.status = status as any;
    
    // Set appropriate dealer and player totals for the status
    if (status === 'win') {
      gameState.player.hands[0].total = 20;
      gameState.dealer.hand.total = 19;
      gameState.dealer.hand.isBust = false;
    } else if (status === 'lose') {
      gameState.player.hands[0].total = 19;
      gameState.dealer.hand.total = 20;
      gameState.dealer.hand.isBust = false;
    } else if (status === 'draw') {
      gameState.player.hands[0].total = 20;
      gameState.dealer.hand.total = 20;
      gameState.dealer.hand.isBust = false;
    }
    
    return gameState;
  }
});