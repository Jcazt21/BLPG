import { FinancialReporter, PayoutAnalysis, FinancialSummary, PayoutDiscrepancy, AccuracyMetrics } from './financialReporter';
import { GameState, GameStatus, Player, Dealer, Hand } from '../types/gameTypes';

describe('FinancialReporter', () => {
  let reporter: FinancialReporter;

  beforeEach(() => {
    reporter = new FinancialReporter();
    reporter.clearHistory();
  });

  // Helper function to create a mock game state
  const createMockGameState = (
    playerTotal: number,
    dealerTotal: number,
    betAmount: number,
    status: GameStatus,
    isBlackjack: boolean = false,
    isBust: boolean = false
  ): GameState => {
    const playerHand: Hand = {
      cards: [], // Cards not needed for calculation
      total: playerTotal,
      isBlackjack,
      isBust
    };

    const dealerHand: Hand = {
      cards: [], // Cards not needed for calculation
      total: dealerTotal,
      isBlackjack: dealerTotal === 21,
      isBust: dealerTotal > 21
    };

    const player: Player = {
      name: 'TestPlayer',
      hands: [playerHand],
      balance: 1000,
      bet: betAmount
    };

    const dealer: Dealer = {
      hand: dealerHand
    };

    return {
      player,
      dealer,
      deck: [],
      status,
      phase: 'result'
    };
  };

  describe('recordPayout', () => {
    it('should record a payout transaction correctly', () => {
      const gameState = createMockGameState(21, 20, 100, 'win');
      reporter.recordPayout('round1', gameState, 200);

      const report = reporter.generatePayoutReport('round1');
      expect(report).toHaveLength(1);
      expect(report[0].roundId).toBe('round1');
      expect(report[0].betAmount).toBe(100);
      expect(report[0].payoutAmount).toBe(200);
      expect(report[0].expectedPayout).toBe(200); // 2x multiplier for win
      expect(report[0].discrepancy).toBe(0);
    });

    it('should calculate discrepancy when actual payout differs from expected', () => {
      const gameState = createMockGameState(21, 20, 100, 'win');
      reporter.recordPayout('round1', gameState, 150); // Should be 200

      const report = reporter.generatePayoutReport('round1');
      expect(report[0].discrepancy).toBe(50);
    });

    it('should handle blackjack payouts correctly', () => {
      const gameState = createMockGameState(21, 20, 100, 'win', true);
      reporter.recordPayout('round1', gameState, 250);

      const report = reporter.generatePayoutReport('round1');
      expect(report[0].expectedPayout).toBe(250); // 2.5x multiplier for blackjack
      expect(report[0].isBlackjack).toBe(true);
      expect(report[0].discrepancy).toBe(0);
    });

    it('should handle bust scenarios correctly', () => {
      const gameState = createMockGameState(25, 20, 100, 'bust', false, true);
      reporter.recordPayout('round1', gameState, 0);

      const report = reporter.generatePayoutReport('round1');
      expect(report[0].expectedPayout).toBe(0); // No payout for bust
      expect(report[0].discrepancy).toBe(0);
    });

    it('should handle push scenarios correctly', () => {
      const gameState = createMockGameState(20, 20, 100, 'draw');
      reporter.recordPayout('round1', gameState, 100);

      const report = reporter.generatePayoutReport('round1');
      expect(report[0].expectedPayout).toBe(100); // 1x multiplier for push
      expect(report[0].discrepancy).toBe(0);
    });
  });

  describe('generatePayoutReport', () => {
    it('should return all payouts when no roundId specified', () => {
      const gameState1 = createMockGameState(21, 20, 100, 'win');
      const gameState2 = createMockGameState(20, 21, 50, 'lose');
      
      reporter.recordPayout('round1', gameState1, 200);
      reporter.recordPayout('round2', gameState2, 0);

      const report = reporter.generatePayoutReport();
      expect(report).toHaveLength(2);
    });

    it('should filter by roundId when specified', () => {
      const gameState1 = createMockGameState(21, 20, 100, 'win');
      const gameState2 = createMockGameState(20, 21, 50, 'lose');
      
      reporter.recordPayout('round1', gameState1, 200);
      reporter.recordPayout('round2', gameState2, 0);

      const report = reporter.generatePayoutReport('round1');
      expect(report).toHaveLength(1);
      expect(report[0].roundId).toBe('round1');
    });

    it('should return empty array for non-existent roundId', () => {
      const report = reporter.generatePayoutReport('nonexistent');
      expect(report).toHaveLength(0);
    });
  });

  describe('generateFinancialSummary', () => {
    it('should return default summary when no history exists', () => {
      const summary = reporter.generateFinancialSummary();
      
      expect(summary.totalRounds).toBe(0);
      expect(summary.totalBetsPlaced).toBe(0);
      expect(summary.accuracyPercentage).toBe(100);
    });

    it('should calculate summary correctly with multiple transactions', () => {
      // Add various game scenarios
      const scenarios = [
        { gameState: createMockGameState(21, 20, 100, 'win', true), payout: 250 }, // Blackjack
        { gameState: createMockGameState(20, 19, 50, 'win'), payout: 100 },        // Regular win
        { gameState: createMockGameState(20, 20, 75, 'draw'), payout: 75 },        // Push
        { gameState: createMockGameState(25, 20, 25, 'bust', false, true), payout: 0 }, // Bust
        { gameState: createMockGameState(19, 20, 60, 'lose'), payout: 0 }          // Lose
      ];

      scenarios.forEach((scenario, index) => {
        reporter.recordPayout(`round${index + 1}`, scenario.gameState, scenario.payout);
      });

      const summary = reporter.generateFinancialSummary();
      
      expect(summary.totalRounds).toBe(5);
      expect(summary.totalBetsPlaced).toBe(310); // 100+50+75+25+60
      expect(summary.totalPayoutsGiven).toBe(425); // 250+100+75+0+0
      expect(summary.blackjackPayouts).toBe(250);
      expect(summary.regularWinPayouts).toBe(100);
      expect(summary.pushPayouts).toBe(75);
      expect(summary.lossPayouts).toBe(0);
      expect(summary.accuracyPercentage).toBe(100); // All payouts are correct
    });

    it('should calculate house edge correctly', () => {
      const gameState1 = createMockGameState(19, 20, 100, 'lose');
      const gameState2 = createMockGameState(20, 19, 100, 'win');
      
      reporter.recordPayout('round1', gameState1, 0);   // House wins 100
      reporter.recordPayout('round2', gameState2, 200); // House loses 100 (pays 200, gets 100)

      const summary = reporter.generateFinancialSummary();
      
      expect(summary.totalBetsPlaced).toBe(200);
      expect(summary.totalPayoutsGiven).toBe(200);
      expect(summary.houseEdgeActual).toBe(0); // Break even
    });
  });

  describe('reportDiscrepancies', () => {
    it('should return empty array when no discrepancies exist', () => {
      const gameState = createMockGameState(21, 20, 100, 'win');
      reporter.recordPayout('round1', gameState, 200); // Correct payout

      const discrepancies = reporter.reportDiscrepancies();
      expect(discrepancies).toHaveLength(0);
    });

    it('should identify and categorize discrepancies by severity', () => {
      const scenarios = [
        { gameState: createMockGameState(21, 20, 100, 'win'), actualPayout: 190, expectedSeverity: 'low' },    // 5% off
        { gameState: createMockGameState(21, 20, 100, 'win'), actualPayout: 170, expectedSeverity: 'medium' }, // 15% off
        { gameState: createMockGameState(21, 20, 100, 'win'), actualPayout: 140, expectedSeverity: 'high' },   // 30% off
        { gameState: createMockGameState(21, 20, 100, 'win'), actualPayout: 50, expectedSeverity: 'critical' }  // 75% off
      ];

      scenarios.forEach((scenario, index) => {
        reporter.recordPayout(`round${index + 1}`, scenario.gameState, scenario.actualPayout);
      });

      const discrepancies = reporter.reportDiscrepancies();
      expect(discrepancies).toHaveLength(4);
      
      // Should be sorted by discrepancy amount (descending)
      expect(discrepancies[0].discrepancyAmount).toBe(150); // Critical
      expect(discrepancies[0].severity).toBe('critical');
      expect(discrepancies[3].discrepancyAmount).toBe(10);  // Low
      expect(discrepancies[3].severity).toBe('low');
    });

    it('should filter by threshold', () => {
      const gameState1 = createMockGameState(21, 20, 100, 'win');
      const gameState2 = createMockGameState(21, 20, 100, 'win');
      
      reporter.recordPayout('round1', gameState1, 190); // 10 discrepancy
      reporter.recordPayout('round2', gameState2, 150); // 50 discrepancy

      const discrepancies = reporter.reportDiscrepancies(25);
      expect(discrepancies).toHaveLength(1);
      expect(discrepancies[0].discrepancyAmount).toBe(50);
    });
  });

  describe('calculateAccuracyMetrics', () => {
    it('should return default metrics when no history exists', () => {
      const metrics = reporter.calculateAccuracyMetrics();
      
      expect(metrics.totalTransactions).toBe(0);
      expect(metrics.accuracyRate).toBe(100);
      expect(metrics.averageDiscrepancy).toBe(0);
    });

    it('should calculate accuracy metrics correctly', () => {
      const scenarios = [
        { gameState: createMockGameState(21, 20, 100, 'win'), payout: 200 }, // Accurate
        { gameState: createMockGameState(21, 20, 100, 'win'), payout: 190 }, // 10 discrepancy
        { gameState: createMockGameState(21, 20, 100, 'win'), payout: 150 }, // 50 discrepancy
        { gameState: createMockGameState(21, 20, 100, 'win'), payout: 200 }  // Accurate
      ];

      scenarios.forEach((scenario, index) => {
        reporter.recordPayout(`round${index + 1}`, scenario.gameState, scenario.payout);
      });

      const metrics = reporter.calculateAccuracyMetrics();
      
      expect(metrics.totalTransactions).toBe(4);
      expect(metrics.accurateTransactions).toBe(2);
      expect(metrics.inaccurateTransactions).toBe(2);
      expect(metrics.accuracyRate).toBe(50);
      expect(metrics.averageDiscrepancy).toBe(15); // (0+10+50+0)/4
      expect(metrics.maxDiscrepancy).toBe(50);
      expect(metrics.minDiscrepancy).toBe(0);
    });

    it('should count errors by severity correctly', () => {
      const scenarios = [
        { gameState: createMockGameState(21, 20, 100, 'win'), payout: 190 }, // Low
        { gameState: createMockGameState(21, 20, 100, 'win'), payout: 170 }, // Medium
        { gameState: createMockGameState(21, 20, 100, 'win'), payout: 140 }, // High
        { gameState: createMockGameState(21, 20, 100, 'win'), payout: 50 }   // Critical
      ];

      scenarios.forEach((scenario, index) => {
        reporter.recordPayout(`round${index + 1}`, scenario.gameState, scenario.payout);
      });

      const metrics = reporter.calculateAccuracyMetrics();
      
      expect(metrics.lowSeverityErrors).toBe(1);
      expect(metrics.mediumSeverityErrors).toBe(1);
      expect(metrics.highSeverityErrors).toBe(1);
      expect(metrics.criticalErrors).toBe(1);
    });
  });

  describe('utility methods', () => {
    it('should clear history correctly', () => {
      const gameState = createMockGameState(21, 20, 100, 'win');
      reporter.recordPayout('round1', gameState, 200);
      
      expect(reporter.getHistoryCount()).toBe(1);
      
      reporter.clearHistory();
      expect(reporter.getHistoryCount()).toBe(0);
    });

    it('should export payout data correctly', () => {
      const gameState = createMockGameState(21, 20, 100, 'win');
      reporter.recordPayout('round1', gameState, 200);
      
      const exportedData = reporter.exportPayoutData();
      expect(exportedData).toHaveLength(1);
      expect(exportedData[0].roundId).toBe('round1');
      
      // Should be a deep copy
      exportedData[0].roundId = 'modified';
      const originalData = reporter.generatePayoutReport();
      expect(originalData[0].roundId).toBe('round1');
    });
  });
});