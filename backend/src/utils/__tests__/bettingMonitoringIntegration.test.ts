import { bettingLogger } from '../bettingLogger';
import { balanceTransactionLogger } from '../balanceTransactionLogger';
import { bettingErrorMonitor } from '../bettingErrorMonitor';
import { bettingPerformanceMonitor } from '../bettingPerformanceMonitor';
import { bettingDebugger } from '../bettingDebugger';

describe('Betting Monitoring Integration', () => {
  const roomCode = 'TEST_ROOM';
  const playerId = 'test_player';
  const playerName = 'Test Player';

  beforeEach(() => {
    // Clear all monitoring data
    bettingLogger.clearLogs();
    balanceTransactionLogger.clearAllTransactions();
    bettingErrorMonitor.clearAllErrors();
    bettingPerformanceMonitor.clearAllMetrics();
    bettingDebugger.clearOldSessions(0);
  });

  describe('Complete Betting Flow Monitoring', () => {
    it('should track a complete betting round with all monitoring systems', async () => {
      // Start debug session
      const debugSessionId = bettingDebugger.startDebugSession(
        roomCode,
        playerId,
        'Complete betting flow test'
      );

      // 1. Initial balance assignment
      const initialBalance = balanceTransactionLogger.logInitialBalance(
        playerId,
        playerName,
        roomCode,
        1000
      );

      expect(initialBalance.balanceAfter).toBe(1000);
      expect(initialBalance.type).toBe('initial_balance');

      // 2. Start betting phase with performance monitoring
      const bettingPhaseResult = await bettingPerformanceMonitor.measureBettingPhase(
        roomCode,
        'start',
        4,
        async () => {
          bettingLogger.logBettingPhaseStart(roomCode, 30, 4, 'round1');
          return { success: true };
        }
      );

      expect(bettingPhaseResult.success).toBe(true);

      // 3. Place bet with performance monitoring
      const betResult = await bettingPerformanceMonitor.measureBetPlacement(
        roomCode,
        playerId,
        100,
        async () => {
          // Simulate bet placement logic
          const balanceBefore = 1000;
          const betAmount = 100;
          const balanceAfter = balanceBefore - betAmount;

          // Log the bet transaction
          balanceTransactionLogger.logBetPlaced(
            playerId,
            playerName,
            roomCode,
            betAmount,
            balanceBefore,
            balanceAfter,
            'round1'
          );

          return { success: true, balanceAfter };
        }
      );

      expect(betResult.success).toBe(true);
      expect(betResult.balanceAfter).toBe(900);

      // 4. Simulate a validation error
      try {
        throw new Error('Insufficient balance for additional bet');
      } catch (error) {
        bettingErrorMonitor.logError(
          error as Error,
          roomCode,
          'place_bet',
          { playerId, playerName, additionalData: { attemptedBet: 1000 } }
        );
      }

      // 5. Calculate and distribute payouts
      const payoutResult = await bettingPerformanceMonitor.measurePayoutCalculation(
        roomCode,
        1,
        async () => {
          const payoutAmount = 200; // 2x multiplier for win
          const balanceBefore = 900;
          const balanceAfter = balanceBefore + payoutAmount;

          balanceTransactionLogger.logPayout(
            playerId,
            playerName,
            roomCode,
            payoutAmount,
            balanceBefore,
            balanceAfter,
            'win',
            100,
            2.0,
            'round1'
          );

          return { success: true, totalPayout: payoutAmount };
        }
      );

      expect(payoutResult.success).toBe(true);
      expect(payoutResult.totalPayout).toBe(200);

      // 6. End betting phase
      bettingLogger.logBettingPhaseEnd(roomCode, 1, 100, 'round1');

      // 7. Capture final snapshot
      const mockGameState = { phase: 'results', round: 1 };
      const mockPlayers = [{
        id: playerId,
        name: playerName,
        position: 0,
        hand: [],
        total: 0,
        isBust: false,
        isStand: false,
        isBlackjack: false,
        status: 'playing' as const,
        victories: 0,
        gamesWon: 0,
        gamesBlackjack: 0,
        gamesLost: 0,
        gamesDraw: 0,
        gamesBust: 0,
        balance: 1100,
        currentBet: 0,
        hasPlacedBet: false,
        betHistory: [],
        totalWinnings: 0,
        totalLosses: 0,
        isAllIn: false,
        isConnected: true
      }] as any[];

      bettingDebugger.captureSnapshot(roomCode, mockGameState, mockPlayers, 'round1');

      // End debug session and analyze
      const debugSession = bettingDebugger.endDebugSession(debugSessionId);

      // Verify all monitoring systems captured data
      expect(debugSession).toBeTruthy();
      expect(debugSession!.capturedData.logs.length).toBeGreaterThan(0);
      expect(debugSession!.capturedData.transactions.length).toBe(3); // Initial, bet, payout
      expect(debugSession!.capturedData.errors.length).toBe(1);

      // Verify logs
      const logs = bettingLogger.getLogsByRoom(roomCode);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some(log => log.eventType === 'betting_phase_start')).toBe(true);
      expect(logs.some(log => log.eventType === 'betting_phase_end')).toBe(true);

      // Verify transactions
      const transactions = balanceTransactionLogger.getPlayerTransactionHistory(playerId);
      expect(transactions).toHaveLength(3);
      expect(transactions[0].type).toBe('initial_balance');
      expect(transactions[1].type).toBe('bet_placed');
      expect(transactions[2].type).toBe('payout_win');

      // Verify balance validation
      const balanceValidation = balanceTransactionLogger.validatePlayerBalance(playerId);
      expect(balanceValidation.isValid).toBe(true);
      expect(balanceValidation.actualBalance).toBe(1100);

      // Verify error monitoring
      const errors = bettingErrorMonitor.getErrorsByRoom(roomCode);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Insufficient balance');

      // Verify performance metrics
      const performanceReport = bettingPerformanceMonitor.generatePerformanceReport(60000);
      expect(performanceReport.totalOperations).toBeGreaterThan(0);
      expect(performanceReport.operationBreakdown).toHaveProperty('place_bet');
      expect(performanceReport.operationBreakdown).toHaveProperty('calculate_payout');

      // Verify snapshots
      const snapshots = bettingDebugger.getSnapshots(roomCode);
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].players[0].balance).toBe(1100);
    });
  });

  describe('Error Correlation Across Systems', () => {
    it('should correlate errors across all monitoring systems', async () => {
      const debugSessionId = bettingDebugger.startDebugSession(
        roomCode,
        playerId,
        'Error correlation test'
      );

      // Simulate a series of related errors
      const errors = [
        new Error('Database connection timeout'),
        new Error('Sync failed due to network issue'),
        new Error('Balance validation failed')
      ];

      for (let i = 0; i < errors.length; i++) {
        const error = errors[i];
        
        // Log error in error monitor
        bettingErrorMonitor.logError(
          error,
          roomCode,
          'place_bet',
          { playerId, playerName, requestId: `req_${i}` }
        );

        // Log performance impact
        bettingPerformanceMonitor.measureSyncOperation(
          `error_op_${i}`,
          roomCode,
          'place_bet',
          () => {
            // Simulate slow operation due to error
            const start = Date.now();
            while (Date.now() - start < 100) {} // Busy wait
            throw error;
          }
        );
      }

      // End debug session
      const debugSession = bettingDebugger.endDebugSession(debugSessionId);

      // Analyze correlations
      expect(debugSession!.capturedData.errors).toHaveLength(3);
      expect(debugSession!.analysis!.issues.length).toBeGreaterThan(0);

      // Check if sync errors were detected
      const syncIssues = debugSession!.analysis!.issues.filter(
        issue => issue.type === 'sync_error'
      );
      expect(syncIssues.length).toBeGreaterThan(0);

      // Verify error statistics
      const errorStats = bettingErrorMonitor.getErrorStatistics(60000);
      expect(errorStats.totalErrors).toBe(3);
      expect(errorStats.errorsByCategory).toHaveProperty('network');
      expect(errorStats.errorsByCategory).toHaveProperty('database');

      // Verify performance impact
      const perfReport = bettingPerformanceMonitor.generatePerformanceReport(60000);
      expect(perfReport.performanceIssues.length).toBeGreaterThan(0);
      expect(perfReport.successRate).toBe(0); // All operations failed
    });
  });

  describe('Balance Integrity Monitoring', () => {
    it('should detect and report balance inconsistencies', () => {
      const debugSessionId = bettingDebugger.startDebugSession(
        roomCode,
        playerId,
        'Balance integrity test'
      );

      // Create valid initial balance
      balanceTransactionLogger.logInitialBalance(playerId, playerName, roomCode, 1000);

      // Create a valid bet
      balanceTransactionLogger.logBetPlaced(
        playerId,
        playerName,
        roomCode,
        100,
        1000,
        900,
        'round1'
      );

      // Create an invalid transaction (balance mismatch)
      const invalidTransaction = balanceTransactionLogger.logPayout(
        playerId,
        playerName,
        roomCode,
        200,
        900,
        1050, // Should be 1100, creating a 50 chip discrepancy
        'win',
        100,
        2.0,
        'round1'
      );

      // Mark transaction as invalid
      invalidTransaction.isValid = false;

      // End debug session and analyze
      const debugSession = bettingDebugger.endDebugSession(debugSessionId);

      // Verify balance validation detects the issue
      const balanceValidation = balanceTransactionLogger.validatePlayerBalance(playerId);
      expect(balanceValidation.isValid).toBe(false);
      expect(Math.abs(balanceValidation.discrepancy)).toBe(50);

      // Verify debug analysis detects balance issues
      const balanceIssues = debugSession!.analysis!.issues.filter(
        issue => issue.type === 'balance_mismatch'
      );
      expect(balanceIssues.length).toBeGreaterThan(0);

      // Generate balance report
      const balanceReport = balanceTransactionLogger.generateBalanceReport(playerId);
      expect(balanceReport.validationStatus).toBe('invalid');
      expect(balanceReport.currentBalance).toBe(1050);
      expect(balanceReport.totalBets).toBe(100);
      expect(balanceReport.totalPayouts).toBe(200);
    });
  });

  describe('Performance Trend Analysis', () => {
    it('should track performance trends over time', async () => {
      // Simulate operations with varying performance
      const operations = [
        { duration: 50, success: true },
        { duration: 150, success: true },
        { duration: 300, success: true },
        { duration: 800, success: false }, // Slow and failed
        { duration: 100, success: true }
      ];

      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        
        await bettingPerformanceMonitor.measureOperation(
          `test_op_${i}`,
          roomCode,
          'place_bet',
          async () => {
            // Simulate operation duration
            await new Promise(resolve => setTimeout(resolve, op.duration));
            
            if (!op.success) {
              throw new Error('Operation failed');
            }
            
            return { success: true };
          },
          { operationIndex: i }
        );
      }

      // Analyze performance trends
      const trends = bettingPerformanceMonitor.getOperationTrends(
        'place_bet',
        60000, // Last minute
        10000  // 10 second buckets
      );

      expect(trends.length).toBeGreaterThan(0);

      // Verify performance report
      const report = bettingPerformanceMonitor.generatePerformanceReport(60000);
      expect(report.totalOperations).toBe(5);
      expect(report.successRate).toBe(80); // 4 out of 5 succeeded
      expect(report.averageDuration).toBeGreaterThan(0);

      // Check for performance issues
      expect(report.performanceIssues.length).toBeGreaterThan(0);
      const criticalIssues = report.performanceIssues.filter(
        issue => issue.severity === 'critical'
      );
      expect(criticalIssues.length).toBeGreaterThan(0);
    });
  });

  describe('Comprehensive Diagnostics', () => {
    it('should provide comprehensive player diagnostics', () => {
      // Setup player data
      balanceTransactionLogger.logInitialBalance(playerId, playerName, roomCode, 1000);
      balanceTransactionLogger.logBetPlaced(playerId, playerName, roomCode, 100, 1000, 900);
      
      // Add some errors
      const error = new Error('Test error');
      bettingErrorMonitor.logError(error, roomCode, 'place_bet', { playerId, playerName });
      
      // Add some logs
      bettingLogger.logBetPlaced(roomCode, playerId, playerName, 100, 900);
      bettingLogger.logValidationError(roomCode, playerId, playerName, 'Test validation error');

      // Run diagnostics
      const diagnosis = bettingDebugger.diagnosePlayerIssue(playerId, roomCode, 60000);

      expect(diagnosis.playerInfo.playerId).toBe(playerId);
      expect(diagnosis.recentTransactions.length).toBe(2);
      expect(diagnosis.recentLogs.length).toBe(2);
      expect(diagnosis.recentErrors.length).toBe(1);
      expect(diagnosis.balanceValidation.isValid).toBe(true);
      expect(diagnosis.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide comprehensive room diagnostics', () => {
      // Setup room data with multiple players
      const players = ['player1', 'player2', 'player3'];
      
      players.forEach((pid, index) => {
        balanceTransactionLogger.logInitialBalance(pid, `Player ${index + 1}`, roomCode, 1000);
        balanceTransactionLogger.logBetPlaced(pid, `Player ${index + 1}`, roomCode, 50, 1000, 950);
        
        if (index === 1) {
          // Add error for player2
          const error = new Error('Player specific error');
          bettingErrorMonitor.logError(error, roomCode, 'place_bet', { playerId: pid });
        }
      });

      // Run room diagnostics
      const diagnosis = bettingDebugger.diagnoseRoomIssue(roomCode, 60000);

      expect(diagnosis.roomInfo.roomCode).toBe(roomCode);
      expect(diagnosis.playerCount).toBe(3);
      expect(diagnosis.totalTransactions).toBe(6); // 3 initial + 3 bets
      expect(diagnosis.totalErrors).toBe(1);
      expect(diagnosis.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Data Export and Reporting', () => {
    it('should export comprehensive monitoring data', () => {
      // Setup test data
      bettingLogger.logBetPlaced(roomCode, playerId, playerName, 100, 900);
      balanceTransactionLogger.logBetPlaced(playerId, playerName, roomCode, 100, 1000, 900);
      
      const error = new Error('Test error');
      bettingErrorMonitor.logError(error, roomCode, 'place_bet', { playerId });

      // Export data in different formats
      const logsJson = bettingLogger.exportLogs('json');
      const logsCsv = bettingLogger.exportLogs('csv');
      const transactionsJson = balanceTransactionLogger.exportTransactions(playerId, 'json');
      const transactionsCsv = balanceTransactionLogger.exportTransactions(playerId, 'csv');

      // Verify JSON exports
      expect(() => JSON.parse(logsJson)).not.toThrow();
      expect(() => JSON.parse(transactionsJson)).not.toThrow();

      // Verify CSV exports have headers
      expect(logsCsv.split('\n')[0]).toContain('timestamp,level,eventType');
      expect(transactionsCsv.split('\n')[0]).toContain('id,timestamp,playerId');

      // Verify data integrity
      const parsedLogs = JSON.parse(logsJson);
      const parsedTransactions = JSON.parse(transactionsJson);
      
      expect(parsedLogs.length).toBe(1);
      expect(parsedTransactions.length).toBe(1);
      expect(parsedLogs[0].roomCode).toBe(roomCode);
      expect(parsedTransactions[0].playerId).toBe(playerId);
    });
  });

  describe('System Health Monitoring', () => {
    it('should provide system health metrics', () => {
      // Generate some activity
      bettingLogger.logBetPlaced(roomCode, playerId, playerName, 100, 900);
      balanceTransactionLogger.logBetPlaced(playerId, playerName, roomCode, 100, 1000, 900);
      
      // Get system metrics
      const systemMetrics = bettingPerformanceMonitor.getSystemMetrics();
      const logStats = bettingLogger.getLogStatistics();
      const errorStats = bettingErrorMonitor.getErrorStatistics(60000);
      const transactionStats = balanceTransactionLogger.getTransactionStatistics();

      // Verify system metrics
      expect(systemMetrics).toHaveProperty('memoryUsage');
      expect(systemMetrics).toHaveProperty('uptime');
      expect(systemMetrics).toHaveProperty('activeOperations');
      expect(systemMetrics).toHaveProperty('metricsCount');

      // Verify statistics
      expect(logStats.totalLogs).toBeGreaterThan(0);
      expect(transactionStats.totalTransactions).toBeGreaterThan(0);
      expect(transactionStats.playersWithTransactions).toBe(1);

      // Create health summary
      const healthSummary = {
        timestamp: Date.now(),
        system: systemMetrics,
        logs: {
          total: logStats.totalLogs,
          errorRate: logStats.errorRate
        },
        errors: {
          total: errorStats.totalErrors,
          unresolved: errorStats.unresolvedErrors
        },
        transactions: {
          total: transactionStats.totalTransactions,
          volume: transactionStats.totalVolume,
          invalidCount: transactionStats.invalidTransactionCount
        },
        status: 'healthy'
      };

      expect(healthSummary.status).toBe('healthy');
      expect(healthSummary.logs.total).toBeGreaterThan(0);
      expect(healthSummary.transactions.total).toBeGreaterThan(0);
    });
  });
});