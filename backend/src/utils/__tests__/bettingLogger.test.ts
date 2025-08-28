import BettingLogger, { BettingLogLevel, BettingEventType, bettingLogger } from '../bettingLogger';

describe('BettingLogger', () => {
  let logger: BettingLogger;

  beforeEach(() => {
    logger = new BettingLogger({
      maxLogEntries: 100,
      logLevel: BettingLogLevel.DEBUG,
      enableConsoleOutput: false,
      enableFileOutput: false
    });
  });

  afterEach(() => {
    logger.clearLogs();
  });

  describe('Basic Logging', () => {
    it('should log bet placement correctly', () => {
      logger.logBetPlaced('ROOM123', 'player1', 'Alice', 50, 950, 'round1');
      
      const logs = logger.getLogsByRoom('ROOM123');
      expect(logs).toHaveLength(1);
      expect(logs[0].eventType).toBe(BettingEventType.BET_PLACED);
      expect(logs[0].playerId).toBe('player1');
      expect(logs[0].playerName).toBe('Alice');
      expect(logs[0].data.betAmount).toBe(50);
      expect(logs[0].data.newBalance).toBe(950);
    });

    it('should log betting phase events', () => {
      logger.logBettingPhaseStart('ROOM123', 30, 4, 'round1');
      logger.logBettingPhaseEnd('ROOM123', 4, 200, 'round1');
      
      const logs = logger.getLogsByRoom('ROOM123');
      expect(logs).toHaveLength(2);
      expect(logs[0].eventType).toBe(BettingEventType.BETTING_PHASE_START);
      expect(logs[1].eventType).toBe(BettingEventType.BETTING_PHASE_END);
    });

    it('should log validation errors', () => {
      logger.logValidationError('ROOM123', 'player1', 'Alice', 'Insufficient balance', 100);
      
      const logs = logger.getLogsByRoom('ROOM123');
      expect(logs).toHaveLength(1);
      expect(logs[0].eventType).toBe(BettingEventType.VALIDATION_ERROR);
      expect(logs[0].level).toBe(BettingLogLevel.WARN);
      expect(logs[0].data.validationError).toBe('Insufficient balance');
    });

    it('should log all-in bets', () => {
      logger.logAllIn('ROOM123', 'player1', 'Alice', 1000, 'round1');
      
      const logs = logger.getLogsByRoom('ROOM123');
      expect(logs).toHaveLength(1);
      expect(logs[0].eventType).toBe(BettingEventType.ALL_IN);
      expect(logs[0].data.allInAmount).toBe(1000);
    });
  });

  describe('Log Level Filtering', () => {
    it('should respect log level settings', () => {
      const warnLogger = new BettingLogger({
        logLevel: BettingLogLevel.WARN,
        enableConsoleOutput: false
      });

      // This should be logged (WARN level)
      warnLogger.logValidationError('ROOM123', 'player1', 'Alice', 'Error');
      
      // This should not be logged (INFO level)
      warnLogger.logBetPlaced('ROOM123', 'player1', 'Alice', 50, 950);
      
      const logs = warnLogger.getLogsByRoom('ROOM123');
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(BettingLogLevel.WARN);
    });

    it('should log critical errors regardless of level', () => {
      const errorLogger = new BettingLogger({
        logLevel: BettingLogLevel.ERROR,
        enableConsoleOutput: false
      });

      const criticalError = new Error('Critical system failure');
      errorLogger.logError('ROOM123', BettingEventType.SYNC_ERROR, criticalError);
      
      const logs = errorLogger.getLogsByRoom('ROOM123');
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(BettingLogLevel.ERROR);
    });
  });

  describe('Log Querying', () => {
    beforeEach(() => {
      // Setup test data
      logger.logBetPlaced('ROOM123', 'player1', 'Alice', 50, 950, 'round1');
      logger.logBetPlaced('ROOM123', 'player2', 'Bob', 25, 975, 'round1');
      logger.logBetPlaced('ROOM456', 'player1', 'Alice', 100, 900, 'round2');
      logger.logValidationError('ROOM123', 'player3', 'Charlie', 'Insufficient balance');
    });

    it('should filter logs by room', () => {
      const room123Logs = logger.getLogsByRoom('ROOM123');
      const room456Logs = logger.getLogsByRoom('ROOM456');
      
      expect(room123Logs).toHaveLength(3);
      expect(room456Logs).toHaveLength(1);
      expect(room123Logs.every(log => log.roomCode === 'ROOM123')).toBe(true);
    });

    it('should filter logs by player', () => {
      const aliceLogs = logger.getLogsByPlayer('player1');
      const bobLogs = logger.getLogsByPlayer('player2');
      
      expect(aliceLogs).toHaveLength(2);
      expect(bobLogs).toHaveLength(1);
      expect(aliceLogs.every(log => log.playerId === 'player1')).toBe(true);
    });

    it('should filter logs by event type', () => {
      const betLogs = logger.getLogsByEventType(BettingEventType.BET_PLACED);
      const errorLogs = logger.getLogsByEventType(BettingEventType.VALIDATION_ERROR);
      
      expect(betLogs).toHaveLength(3);
      expect(errorLogs).toHaveLength(1);
    });

    it('should get error logs only', () => {
      const errorLogs = logger.getErrorLogs();
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].level).toBe(BettingLogLevel.WARN);
    });

    it('should limit results when specified', () => {
      const limitedLogs = logger.getLogsByRoom('ROOM123', 2);
      expect(limitedLogs).toHaveLength(2);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      logger.logBetPlaced('ROOM123', 'player1', 'Alice', 50, 950);
      logger.logBetPlaced('ROOM123', 'player2', 'Bob', 25, 975);
      logger.logValidationError('ROOM123', 'player3', 'Charlie', 'Error');
      logger.logError('ROOM123', BettingEventType.SYNC_ERROR, new Error('Sync failed'));
    });

    it('should calculate log statistics correctly', () => {
      const stats = logger.getLogStatistics();
      
      expect(stats.totalLogs).toBe(4);
      expect(stats.logsByLevel[BettingLogLevel.INFO]).toBe(2);
      expect(stats.logsByLevel[BettingLogLevel.WARN]).toBe(1);
      expect(stats.logsByLevel[BettingLogLevel.ERROR]).toBe(1);
      expect(stats.logsByEventType[BettingEventType.BET_PLACED]).toBe(2);
      expect(stats.errorRate).toBe(50); // 2 errors out of 4 logs = 50%
    });

    it('should calculate average response time when duration is available', () => {
      logger.logPerformanceMetric('ROOM123', 'test_operation', 100);
      logger.logPerformanceMetric('ROOM123', 'test_operation', 200);
      
      const stats = logger.getLogStatistics();
      expect(stats.averageResponseTime).toBe(150);
    });
  });

  describe('Log Export', () => {
    beforeEach(() => {
      logger.logBetPlaced('ROOM123', 'player1', 'Alice', 50, 950);
      logger.logValidationError('ROOM123', 'player2', 'Bob', 'Error message');
    });

    it('should export logs as JSON', () => {
      const jsonExport = logger.exportLogs('json');
      const parsed = JSON.parse(jsonExport);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toHaveProperty('timestamp');
      expect(parsed[0]).toHaveProperty('eventType');
      expect(parsed[0]).toHaveProperty('roomCode');
    });

    it('should export logs as CSV', () => {
      const csvExport = logger.exportLogs('csv');
      const lines = csvExport.split('\n');
      
      expect(lines[0]).toContain('timestamp,level,eventType,roomCode');
      expect(lines).toHaveLength(3); // Header + 2 data rows
      expect(lines[1]).toContain('ROOM123');
      expect(lines[2]).toContain('ROOM123');
    });
  });

  describe('Memory Management', () => {
    it('should maintain maximum log entries', () => {
      const smallLogger = new BettingLogger({
        maxLogEntries: 3,
        enableConsoleOutput: false
      });

      // Add more logs than the limit
      for (let i = 0; i < 5; i++) {
        smallLogger.logBetPlaced('ROOM123', `player${i}`, `Player${i}`, 50, 950);
      }

      const logs = smallLogger.getLogsByRoom('ROOM123');
      expect(logs).toHaveLength(3); // Should only keep the last 3
      
      // Should keep the most recent logs
      expect(logs[0].playerId).toBe('player2');
      expect(logs[2].playerId).toBe('player4');
    });

    it('should clear all logs when requested', () => {
      logger.logBetPlaced('ROOM123', 'player1', 'Alice', 50, 950);
      logger.logBetPlaced('ROOM456', 'player2', 'Bob', 25, 975);
      
      expect(logger.getLogsByRoom('ROOM123')).toHaveLength(1);
      expect(logger.getLogsByRoom('ROOM456')).toHaveLength(1);
      
      logger.clearLogs();
      
      expect(logger.getLogsByRoom('ROOM123')).toHaveLength(0);
      expect(logger.getLogsByRoom('ROOM456')).toHaveLength(0);
    });
  });

  describe('Singleton Instance', () => {
    it('should provide a singleton instance', () => {
      expect(bettingLogger).toBeInstanceOf(BettingLogger);
      
      // Test that it works
      bettingLogger.logBetPlaced('TEST', 'player1', 'Test Player', 50, 950);
      const logs = bettingLogger.getLogsByRoom('TEST');
      expect(logs).toHaveLength(1);
      
      // Clean up
      bettingLogger.clearLogs();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed log data gracefully', () => {
      expect(() => {
        logger.logBetPlaced('', '', '', NaN, NaN);
      }).not.toThrow();
      
      const logs = logger.getLogsByRoom('');
      expect(logs).toHaveLength(1);
      expect(logs[0].data.betAmount).toBeNaN();
    });

    it('should handle null/undefined values', () => {
      expect(() => {
        logger.logBetPlaced('ROOM123', null as any, undefined as any, 50, 950);
      }).not.toThrow();
      
      const logs = logger.getLogsByRoom('ROOM123');
      expect(logs).toHaveLength(1);
      expect(logs[0].playerId).toBeNull();
      expect(logs[0].playerName).toBeUndefined();
    });
  });

  describe('Performance Metrics', () => {
    it('should log performance metrics with duration', () => {
      logger.logPerformanceMetric('ROOM123', 'place_bet', 150, { playerId: 'player1' });
      
      const logs = logger.getLogsByRoom('ROOM123');
      expect(logs).toHaveLength(1);
      expect(logs[0].eventType).toBe(BettingEventType.PERFORMANCE_METRIC);
      expect(logs[0].duration).toBe(150);
      expect(logs[0].data.operation).toBe('place_bet');
    });

    it('should include metadata in performance logs', () => {
      const metadata = { playerId: 'player1', betAmount: 50, operation: 'validate_bet' };
      logger.logPerformanceMetric('ROOM123', 'validate_bet', 25, metadata);
      
      const logs = logger.getLogsByRoom('ROOM123');
      expect(logs[0].data).toMatchObject(metadata);
    });
  });
});