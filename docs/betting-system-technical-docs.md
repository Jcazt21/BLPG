# Betting System Technical Documentation

## Overview

This document provides comprehensive technical documentation for the Enhanced Betting System, including architecture, APIs, logging, monitoring, and debugging capabilities.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Logging System](#logging-system)
3. [Error Monitoring](#error-monitoring)
4. [Performance Monitoring](#performance-monitoring)
5. [Debugging Tools](#debugging-tools)
6. [Balance Transaction Logging](#balance-transaction-logging)
7. [API Reference](#api-reference)
8. [Configuration](#configuration)
9. [Troubleshooting](#troubleshooting)

## Architecture Overview

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Monitoring    │
│                 │    │                 │    │                 │
│ • BettingPanel  │◄──►│ • BettingLogger │◄──►│ • ErrorMonitor  │
│ • BetManager    │    │ • TxnLogger     │    │ • PerfMonitor   │
│ • ErrorClient   │    │ • ErrorMonitor  │    │ • Debugger      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **User Action** → Frontend validates → Backend processes
2. **Backend Processing** → Logs generated → Monitoring systems updated
3. **Error Occurs** → Error captured → Alert triggered → Debug session created
4. **Performance Measured** → Metrics collected → Reports generated

## Logging System

### BettingLogger

The main logging system for all betting operations.

#### Usage

```typescript
import { bettingLogger, BettingEventType } from '../utils/bettingLogger';

// Log a bet placement
bettingLogger.logBetPlaced(
  roomCode,
  playerId,
  playerName,
  betAmount,
  newBalance,
  roundId
);

// Log betting phase events
bettingLogger.logBettingPhaseStart(roomCode, duration, playerCount, roundId);
bettingLogger.logBettingPhaseEnd(roomCode, totalBets, totalPot, roundId);

// Log errors
bettingLogger.logError(roomCode, BettingEventType.VALIDATION_ERROR, error, playerId);
```

#### Log Levels

- **DEBUG**: Detailed information for debugging
- **INFO**: General information about operations
- **WARN**: Warning conditions that should be noted
- **ERROR**: Error conditions that need attention
- **CRITICAL**: Critical errors requiring immediate action

#### Event Types

- `BET_PLACED`: Player places a bet
- `BET_UPDATED`: Player modifies existing bet
- `BET_CLEARED`: Player removes bet
- `ALL_IN`: Player bets entire balance
- `BETTING_PHASE_START`: Betting period begins
- `BETTING_PHASE_END`: Betting period ends
- `PAYOUT_CALCULATED`: Payout amounts determined
- `PAYOUT_DISTRIBUTED`: Payouts sent to players
- `VALIDATION_ERROR`: Bet validation fails
- `SYNC_ERROR`: Synchronization issues
- `PERFORMANCE_METRIC`: Performance measurements

#### Configuration

```typescript
const logger = new BettingLogger({
  maxLogEntries: 10000,
  logLevel: BettingLogLevel.INFO,
  enableConsoleOutput: true,
  enableFileOutput: false,
  logFilePath: './logs/betting.log'
});
```

#### Querying Logs

```typescript
// Get logs by room
const roomLogs = bettingLogger.getLogsByRoom('ROOM123', 100);

// Get logs by player
const playerLogs = bettingLogger.getLogsByPlayer('player456', 50);

// Get error logs
const errorLogs = bettingLogger.getErrorLogs(25);

// Get statistics
const stats = bettingLogger.getLogStatistics();
```

## Error Monitoring

### BettingErrorMonitor

Comprehensive error tracking and alerting system.

#### Usage

```typescript
import { bettingErrorMonitor } from '../utils/bettingErrorMonitor';

// Log an error
const bettingError = bettingErrorMonitor.logError(
  error,
  roomCode,
  'place_bet',
  {
    playerId,
    playerName,
    roundId,
    additionalData: { betAmount: 50 }
  }
);

// Query errors
const recentErrors = bettingErrorMonitor.getRecentErrors(3600000); // Last hour
const roomErrors = bettingErrorMonitor.getErrorsByRoom('ROOM123');
const criticalErrors = bettingErrorMonitor.getErrorsBySeverity('critical');
```

#### Error Categories

- **VALIDATION**: Input validation failures
- **NETWORK**: Connection and timeout issues
- **DATABASE**: Data persistence problems
- **BUSINESS_LOGIC**: Game logic errors
- **AUTHENTICATION**: Access control issues
- **SYNCHRONIZATION**: State sync problems
- **PERFORMANCE**: Slow operations
- **SYSTEM**: Infrastructure issues

#### Error Severity Levels

- **LOW**: Minor issues that don't affect functionality
- **MEDIUM**: Issues that may impact user experience
- **HIGH**: Serious issues requiring attention
- **CRITICAL**: System-breaking issues requiring immediate action

#### Alert Configuration

```typescript
// Set alert thresholds
bettingErrorMonitor.updateAlertThreshold('DATABASE', 3);
bettingErrorMonitor.updateAlertThreshold('CRITICAL', 1);

// Add custom error patterns
bettingErrorMonitor.addErrorPattern({
  pattern: 'timeout.*exceeded',
  category: 'NETWORK',
  severity: 'MEDIUM',
  threshold: 5,
  timeWindow: 300000,
  alertEnabled: true
});
```

#### Error Resolution

```typescript
// Resolve an error
bettingErrorMonitor.resolveError(
  errorId,
  'developer@company.com',
  'Fixed by updating timeout configuration',
  ['Increased timeout values', 'Added retry logic']
);

// Generate error report
const report = bettingErrorMonitor.generateErrorReport(86400000); // Last 24 hours
```

## Performance Monitoring

### BettingPerformanceMonitor

Tracks operation performance and identifies bottlenecks.

#### Usage

```typescript
import { bettingPerformanceMonitor } from '../utils/bettingPerformanceMonitor';

// Measure async operations
const result = await bettingPerformanceMonitor.measureBetPlacement(
  roomCode,
  playerId,
  betAmount,
  async () => {
    // Your bet placement logic here
    return await placeBetInDatabase(playerId, betAmount);
  }
);

// Measure sync operations
const validation = bettingPerformanceMonitor.measureSyncOperation(
  'validate_bet_123',
  roomCode,
  'validate_bet',
  () => {
    return validateBetAmount(playerId, betAmount);
  },
  { playerId, betAmount }
);
```

#### Performance Benchmarks

Default benchmarks for common operations:

| Operation | Target | Warning | Critical |
|-----------|--------|---------|----------|
| place_bet | 100ms | 500ms | 1000ms |
| update_bet | 50ms | 200ms | 500ms |
| calculate_payout | 200ms | 1000ms | 2000ms |
| validate_bet | 10ms | 50ms | 100ms |
| sync_player_state | 100ms | 500ms | 1000ms |

#### Custom Benchmarks

```typescript
// Set custom benchmark
bettingPerformanceMonitor.setBenchmark('custom_operation', {
  operation: 'custom_operation',
  targetDuration: 150,
  warningThreshold: 300,
  criticalThreshold: 600
});
```

#### Performance Reports

```typescript
// Generate performance report
const report = bettingPerformanceMonitor.generatePerformanceReport(3600000);

console.log(`Total Operations: ${report.totalOperations}`);
console.log(`Average Duration: ${report.averageDuration}ms`);
console.log(`Success Rate: ${report.successRate}%`);
console.log(`P95 Duration: ${report.p95Duration}ms`);

// Get operation trends
const trends = bettingPerformanceMonitor.getOperationTrends(
  'place_bet',
  86400000, // 24 hours
  3600000   // 1 hour buckets
);
```

## Debugging Tools

### BettingDebugger

Comprehensive debugging and diagnostic tools.

#### Debug Sessions

```typescript
import { bettingDebugger } from '../utils/bettingDebugger';

// Start debug session
const sessionId = bettingDebugger.startDebugSession(
  roomCode,
  playerId,
  'Investigating balance mismatch'
);

// ... perform operations to debug ...

// End session and get analysis
const session = bettingDebugger.endDebugSession(sessionId);
console.log(session.analysis);
```

#### Snapshots

```typescript
// Capture game state snapshot
bettingDebugger.captureSnapshot(
  roomCode,
  gameState,
  players,
  roundId
);

// Get snapshots for analysis
const snapshots = bettingDebugger.getSnapshots(roomCode, 10);
const timeRangeSnapshots = bettingDebugger.getSnapshotsBetween(
  roomCode,
  startTime,
  endTime
);
```

#### Diagnostic Tools

```typescript
// Diagnose player issues
const playerDiagnosis = bettingDebugger.diagnosePlayerIssue(
  playerId,
  roomCode,
  300000 // Last 5 minutes
);

console.log('Balance Validation:', playerDiagnosis.balanceValidation);
console.log('Recent Errors:', playerDiagnosis.recentErrors);
console.log('Recommendations:', playerDiagnosis.recommendations);

// Diagnose room issues
const roomDiagnosis = bettingDebugger.diagnoseRoomIssue(roomCode, 600000);
console.log('Common Issues:', roomDiagnosis.commonIssues);
console.log('Recommendations:', roomDiagnosis.recommendations);
```

#### Export Debug Data

```typescript
// Export debug session
const jsonReport = bettingDebugger.exportDebugSession(sessionId, 'json');
const textReport = bettingDebugger.exportDebugSession(sessionId, 'text');

// Save to file or send to support
fs.writeFileSync(`debug_${sessionId}.json`, jsonReport);
```

## Balance Transaction Logging

### BalanceTransactionLogger

Tracks all balance changes with full audit trail.

#### Usage

```typescript
import { balanceTransactionLogger, TransactionType } from '../utils/balanceTransactionLogger';

// Log initial balance
balanceTransactionLogger.logInitialBalance(
  playerId,
  playerName,
  roomCode,
  1000
);

// Log bet placement
balanceTransactionLogger.logBetPlaced(
  playerId,
  playerName,
  roomCode,
  betAmount,
  balanceBefore,
  balanceAfter,
  roundId
);

// Log payout
balanceTransactionLogger.logPayout(
  playerId,
  playerName,
  roomCode,
  payoutAmount,
  balanceBefore,
  balanceAfter,
  'win',
  originalBetAmount,
  2.0, // multiplier
  roundId
);
```

#### Transaction Types

- `INITIAL_BALANCE`: Starting balance assignment
- `BET_PLACED`: Bet deducted from balance
- `BET_REFUND`: Bet returned to player
- `PAYOUT_WIN`: Winning payout
- `PAYOUT_BLACKJACK`: Blackjack payout (higher multiplier)
- `PAYOUT_PUSH`: Push/draw payout (bet returned)
- `BALANCE_CORRECTION`: System correction
- `ADMIN_ADJUSTMENT`: Manual adjustment

#### Balance Validation

```typescript
// Validate player balance
const validation = balanceTransactionLogger.validatePlayerBalance(playerId);

if (!validation.isValid) {
  console.error('Balance validation failed:');
  console.error(`Expected: ${validation.expectedBalance}`);
  console.error(`Actual: ${validation.actualBalance}`);
  console.error(`Discrepancy: ${validation.discrepancy}`);
  console.error('Invalid transactions:', validation.invalidTransactions);
}
```

#### Balance Reports

```typescript
// Generate balance report
const report = balanceTransactionLogger.generateBalanceReport(playerId);

console.log(`Current Balance: ${report.currentBalance}`);
console.log(`Total Bets: ${report.totalBets}`);
console.log(`Total Payouts: ${report.totalPayouts}`);
console.log(`Net Gain/Loss: ${report.netGainLoss}`);
console.log(`Validation Status: ${report.validationStatus}`);
```

## API Reference

### Core Betting Operations

#### Place Bet

```typescript
async function placeBet(
  roomCode: string,
  playerId: string,
  betAmount: number,
  roundId?: string
): Promise<BetResult> {
  const operationId = `place_bet_${playerId}_${Date.now()}`;
  
  return await bettingPerformanceMonitor.measureOperation(
    operationId,
    roomCode,
    'place_bet',
    async () => {
      // Validate bet
      const validation = validateBet(playerId, betAmount);
      if (!validation.isValid) {
        bettingLogger.logValidationError(
          roomCode,
          playerId,
          playerName,
          validation.error,
          betAmount
        );
        throw new Error(validation.error);
      }

      // Process bet
      const result = await processBet(playerId, betAmount);
      
      // Log transaction
      balanceTransactionLogger.logBetPlaced(
        playerId,
        playerName,
        roomCode,
        betAmount,
        result.balanceBefore,
        result.balanceAfter,
        roundId
      );

      return result;
    },
    { playerId, betAmount }
  );
}
```

#### Calculate Payouts

```typescript
async function calculatePayouts(
  roomCode: string,
  gameResults: GameResult[],
  roundId?: string
): Promise<PayoutResult[]> {
  const operationId = `calculate_payouts_${roomCode}_${Date.now()}`;
  
  return await bettingPerformanceMonitor.measurePayoutCalculation(
    roomCode,
    gameResults.length,
    async () => {
      const payouts: PayoutResult[] = [];

      for (const result of gameResults) {
        const payout = calculatePlayerPayout(result);
        
        // Log payout calculation
        bettingLogger.logPayoutCalculated(
          roomCode,
          result.playerId,
          result.playerName,
          result.betAmount,
          payout.amount,
          result.outcome,
          roundId
        );

        payouts.push(payout);
      }

      return payouts;
    }
  );
}
```

### Monitoring APIs

#### Health Check

```typescript
app.get('/api/betting/health', (req, res) => {
  const systemMetrics = bettingPerformanceMonitor.getSystemMetrics();
  const errorStats = bettingErrorMonitor.getErrorStatistics(3600000);
  const logStats = bettingLogger.getLogStatistics();

  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    system: systemMetrics,
    errors: {
      totalErrors: errorStats.totalErrors,
      errorRate: errorStats.errorRate,
      unresolvedErrors: errorStats.unresolvedErrors
    },
    logs: {
      totalLogs: logStats.totalLogs,
      errorRate: logStats.errorRate
    }
  });
});
```

#### Performance Report

```typescript
app.get('/api/betting/performance', (req, res) => {
  const timeWindow = parseInt(req.query.timeWindow as string) || 3600000;
  const report = bettingPerformanceMonitor.generatePerformanceReport(timeWindow);
  
  res.json(report);
});
```

#### Error Report

```typescript
app.get('/api/betting/errors', (req, res) => {
  const timeWindow = parseInt(req.query.timeWindow as string) || 3600000;
  const report = bettingErrorMonitor.generateErrorReport(timeWindow);
  
  res.json({
    report,
    statistics: bettingErrorMonitor.getErrorStatistics(timeWindow)
  });
});
```

## Configuration

### Environment Variables

```bash
# Logging Configuration
BETTING_LOG_LEVEL=info
BETTING_LOG_FILE_ENABLED=false
BETTING_LOG_FILE_PATH=./logs/betting.log
BETTING_MAX_LOG_ENTRIES=10000

# Performance Monitoring
BETTING_PERF_ENABLED=true
BETTING_PERF_MAX_METRICS=50000

# Error Monitoring
BETTING_ERROR_ALERTS_ENABLED=true
BETTING_ERROR_ALERT_EMAIL=admin@company.com

# Debug Mode
BETTING_DEBUG_ENABLED=false
BETTING_DEBUG_AUTO_CAPTURE=false
```

### Runtime Configuration

```typescript
// Configure logging
bettingLogger.setLogLevel(BettingLogLevel.DEBUG);
bettingLogger.enableFileOutput(true);

// Configure performance monitoring
bettingPerformanceMonitor.setBenchmark('custom_op', {
  operation: 'custom_op',
  targetDuration: 100,
  warningThreshold: 300,
  criticalThreshold: 600
});

// Configure error monitoring
bettingErrorMonitor.updateAlertThreshold('VALIDATION', 15);
bettingErrorMonitor.addErrorPattern({
  pattern: 'custom.*error',
  category: 'BUSINESS_LOGIC',
  severity: 'MEDIUM',
  threshold: 5,
  timeWindow: 300000,
  alertEnabled: true
});
```

## Troubleshooting

### Common Issues

#### High Memory Usage

**Symptoms**: Increasing memory consumption over time
**Causes**: 
- Too many logs/metrics stored in memory
- Memory leaks in monitoring systems

**Solutions**:
```typescript
// Clear old data periodically
setInterval(() => {
  bettingLogger.clearLogs();
  bettingPerformanceMonitor.clearOldMetrics(86400000); // 24 hours
  bettingErrorMonitor.clearOldErrors(604800000); // 7 days
  bettingDebugger.clearOldSessions(86400000); // 24 hours
}, 3600000); // Every hour
```

#### Performance Degradation

**Symptoms**: Slow response times, high CPU usage
**Causes**:
- Excessive logging
- Inefficient queries
- Large data sets

**Solutions**:
```typescript
// Reduce log level in production
bettingLogger.setLogLevel(BettingLogLevel.WARN);

// Limit query results
const recentLogs = bettingLogger.getLogsByRoom(roomCode, 100); // Limit to 100

// Use time-based filtering
const cutoff = Date.now() - 3600000; // Last hour only
```

#### Missing Logs/Metrics

**Symptoms**: Expected data not appearing in logs
**Causes**:
- Log level too high
- Disabled logging
- Errors in logging code

**Solutions**:
```typescript
// Check log level
console.log('Current log level:', bettingLogger.getLogLevel());

// Enable debug logging temporarily
bettingLogger.setLogLevel(BettingLogLevel.DEBUG);

// Verify logging calls
bettingLogger.logBetPlaced(roomCode, playerId, playerName, amount, balance);
```

### Debug Procedures

#### Investigating Balance Issues

1. **Check Transaction History**
```typescript
const transactions = balanceTransactionLogger.getPlayerTransactionHistory(playerId);
const validation = balanceTransactionLogger.validatePlayerBalance(playerId);
```

2. **Start Debug Session**
```typescript
const sessionId = bettingDebugger.startDebugSession(roomCode, playerId, 'Balance investigation');
```

3. **Capture Current State**
```typescript
bettingDebugger.captureSnapshot(roomCode, gameState, players);
```

4. **Analyze Results**
```typescript
const session = bettingDebugger.endDebugSession(sessionId);
console.log(session.analysis);
```

#### Performance Investigation

1. **Check Recent Performance**
```typescript
const report = bettingPerformanceMonitor.generatePerformanceReport(3600000);
const slowOps = bettingPerformanceMonitor.getSlowOperations(1000);
```

2. **Identify Bottlenecks**
```typescript
const trends = bettingPerformanceMonitor.getOperationTrends('place_bet', 86400000);
```

3. **Review Error Correlation**
```typescript
const errors = bettingErrorMonitor.getRecentErrors(3600000);
const perfIssues = errors.filter(e => e.category === 'PERFORMANCE');
```

### Maintenance Tasks

#### Daily Maintenance

```typescript
// Clean up old data
bettingPerformanceMonitor.clearOldMetrics(86400000);
bettingErrorMonitor.clearResolvedErrors();
bettingDebugger.clearOldSessions(86400000);

// Generate daily reports
const perfReport = bettingPerformanceMonitor.generatePerformanceReport(86400000);
const errorReport = bettingErrorMonitor.generateErrorReport(86400000);

// Export for analysis
const perfData = bettingPerformanceMonitor.exportMetrics('csv', 86400000);
const errorData = bettingErrorMonitor.exportLogs('csv');
```

#### Weekly Maintenance

```typescript
// Deep clean old data
balanceTransactionLogger.clearAllTransactions();
bettingLogger.clearLogs();

// Archive important data
const weeklyReport = {
  performance: bettingPerformanceMonitor.generatePerformanceReport(604800000),
  errors: bettingErrorMonitor.getErrorStatistics(604800000),
  transactions: balanceTransactionLogger.getTransactionStatistics()
};

// Save archived data
fs.writeFileSync(`weekly_report_${Date.now()}.json`, JSON.stringify(weeklyReport, null, 2));
```

---

*This technical documentation is maintained alongside the codebase. Update when making changes to the monitoring and logging systems.*