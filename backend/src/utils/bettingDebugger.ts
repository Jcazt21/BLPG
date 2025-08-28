import { MultiplayerPlayer } from '../types/bettingTypes';
import { bettingLogger, BettingLogEntry } from './bettingLogger';
import { balanceTransactionLogger, BalanceTransaction } from './balanceTransactionLogger';
import { bettingErrorMonitor, BettingError } from './bettingErrorMonitor';

export interface DebugSession {
  id: string;
  roomCode: string;
  playerId?: string;
  startTime: number;
  endTime?: number;
  description: string;
  capturedData: {
    logs: BettingLogEntry[];
    transactions: BalanceTransaction[];
    errors: BettingError[];
    gameState?: any;
    playerStates?: MultiplayerPlayer[];
  };
  analysis?: {
    issues: DebugIssue[];
    recommendations: string[];
    summary: string;
  };
}

export interface DebugIssue {
  type: 'balance_mismatch' | 'sync_error' | 'validation_failure' | 'performance_issue' | 'logic_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedPlayers: string[];
  evidence: any[];
  suggestedFix?: string;
}

export interface BettingSnapshot {
  timestamp: number;
  roomCode: string;
  roundId?: string;
  gamePhase: string;
  players: Array<{
    id: string;
    name: string;
    balance: number;
    currentBet: number;
    isAllIn: boolean;
    isConnected: boolean;
  }>;
  totalPot: number;
  bettingTimeRemaining?: number;
  recentActions: Array<{
    playerId: string;
    action: string;
    amount?: number;
    timestamp: number;
  }>;
}

class BettingDebugger {
  private debugSessions: Map<string, DebugSession> = new Map();
  private snapshots: Map<string, BettingSnapshot[]> = new Map();
  private sessionCounter = 0;
  private maxSessions = 100;
  private maxSnapshotsPerRoom = 50;

  private generateSessionId(): string {
    return `debug_${Date.now()}_${++this.sessionCounter}`;
  }

  // Debug session management
  startDebugSession(roomCode: string, playerId?: string, description: string = 'Debug session'): string {
    const sessionId = this.generateSessionId();
    const session: DebugSession = {
      id: sessionId,
      roomCode,
      playerId,
      startTime: Date.now(),
      description,
      capturedData: {
        logs: [],
        transactions: [],
        errors: []
      }
    };

    this.debugSessions.set(sessionId, session);

    // Maintain max sessions
    if (this.debugSessions.size > this.maxSessions) {
      const oldestSessionId = Array.from(this.debugSessions.keys())[0];
      this.debugSessions.delete(oldestSessionId);
    }

    console.log(`🔍 Debug session started: ${sessionId} for room ${roomCode}`);
    return sessionId;
  }

  endDebugSession(sessionId: string): DebugSession | null {
    const session = this.debugSessions.get(sessionId);
    if (!session) return null;

    session.endTime = Date.now();
    
    // Capture final data
    this.captureSessionData(session);
    
    // Perform analysis
    session.analysis = this.analyzeSession(session);

    console.log(`🔍 Debug session ended: ${sessionId}`);
    return session;
  }

  private captureSessionData(session: DebugSession): void {
    const timeWindow = session.endTime! - session.startTime;
    
    // Capture logs
    session.capturedData.logs = bettingLogger.getLogsByRoom(session.roomCode)
      .filter(log => log.timestamp >= session.startTime && log.timestamp <= session.endTime!);

    // Capture transactions
    session.capturedData.transactions = balanceTransactionLogger.getTransactionsByRoom(session.roomCode)
      .filter(tx => tx.timestamp >= session.startTime && tx.timestamp <= session.endTime!);

    // Capture errors
    session.capturedData.errors = bettingErrorMonitor.getErrorsByRoom(session.roomCode)
      .filter(error => error.lastOccurrence >= session.startTime && error.lastOccurrence <= session.endTime!);

    if (session.playerId) {
      // Filter by specific player if specified
      session.capturedData.logs = session.capturedData.logs.filter(log => log.playerId === session.playerId);
      session.capturedData.transactions = session.capturedData.transactions.filter(tx => tx.playerId === session.playerId);
    }
  }

  private analyzeSession(session: DebugSession): {
    issues: DebugIssue[];
    recommendations: string[];
    summary: string;
  } {
    const issues: DebugIssue[] = [];
    const recommendations: string[] = [];

    // Analyze balance consistency
    const balanceIssues = this.analyzeBalanceConsistency(session);
    issues.push(...balanceIssues);

    // Analyze sync errors
    const syncIssues = this.analyzeSyncErrors(session);
    issues.push(...syncIssues);

    // Analyze performance
    const performanceIssues = this.analyzePerformance(session);
    issues.push(...performanceIssues);

    // Generate recommendations
    if (balanceIssues.length > 0) {
      recommendations.push('Review balance calculation logic and transaction logging');
    }
    if (syncIssues.length > 0) {
      recommendations.push('Check network connectivity and implement retry mechanisms');
    }
    if (performanceIssues.length > 0) {
      recommendations.push('Optimize betting operations and consider caching strategies');
    }

    const summary = this.generateSessionSummary(session, issues);

    return { issues, recommendations, summary };
  }

  private analyzeBalanceConsistency(session: DebugSession): DebugIssue[] {
    const issues: DebugIssue[] = [];
    const playerBalances = new Map<string, number>();

    // Track balance changes through transactions
    session.capturedData.transactions.forEach(tx => {
      const currentBalance = playerBalances.get(tx.playerId) || 0;
      const expectedBalance = tx.balanceBefore + tx.amount;
      
      if (Math.abs(expectedBalance - tx.balanceAfter) > 0.01) {
        issues.push({
          type: 'balance_mismatch',
          severity: 'high',
          description: `Balance mismatch for player ${tx.playerName}: expected ${expectedBalance}, got ${tx.balanceAfter}`,
          affectedPlayers: [tx.playerId],
          evidence: [tx],
          suggestedFix: 'Verify balance calculation logic and transaction processing'
        });
      }

      playerBalances.set(tx.playerId, tx.balanceAfter);
    });

    return issues;
  }

  private analyzeSyncErrors(session: DebugSession): DebugIssue[] {
    const issues: DebugIssue[] = [];
    
    const syncErrors = session.capturedData.errors.filter(error => 
      error.category === 'synchronization' || error.message.toLowerCase().includes('sync')
    );

    if (syncErrors.length > 0) {
      const affectedPlayers = Array.from(new Set(
        syncErrors.flatMap(error => Array.from(error.affectedUsers))
      ));

      issues.push({
        type: 'sync_error',
        severity: syncErrors.length > 3 ? 'high' : 'medium',
        description: `${syncErrors.length} synchronization errors detected`,
        affectedPlayers,
        evidence: syncErrors,
        suggestedFix: 'Implement exponential backoff retry and improve error handling'
      });
    }

    return issues;
  }

  private analyzePerformance(session: DebugSession): DebugIssue[] {
    const issues: DebugIssue[] = [];
    
    const performanceLogs = session.capturedData.logs.filter(log => 
      log.eventType === 'performance_metric' && log.duration
    );

    if (performanceLogs.length > 0) {
      const slowOperations = performanceLogs.filter(log => log.duration! > 1000); // > 1 second
      
      if (slowOperations.length > 0) {
        issues.push({
          type: 'performance_issue',
          severity: 'medium',
          description: `${slowOperations.length} slow operations detected (>1s)`,
          affectedPlayers: slowOperations.map(log => log.playerId).filter(Boolean) as string[],
          evidence: slowOperations,
          suggestedFix: 'Optimize database queries and implement caching'
        });
      }
    }

    return issues;
  }

  private generateSessionSummary(session: DebugSession, issues: DebugIssue[]): string {
    const duration = (session.endTime! - session.startTime) / 1000;
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;
    const mediumIssues = issues.filter(i => i.severity === 'medium').length;

    let summary = `Debug session for room ${session.roomCode} (${duration.toFixed(1)}s)\n`;
    summary += `Captured: ${session.capturedData.logs.length} logs, ${session.capturedData.transactions.length} transactions, ${session.capturedData.errors.length} errors\n`;
    summary += `Issues found: ${criticalIssues} critical, ${highIssues} high, ${mediumIssues} medium`;

    return summary;
  }

  // Snapshot management
  captureSnapshot(roomCode: string, gameState: any, players: MultiplayerPlayer[], roundId?: string): void {
    const snapshot: BettingSnapshot = {
      timestamp: Date.now(),
      roomCode,
      roundId,
      gamePhase: gameState.phase || 'unknown',
      players: players.map(player => ({
        id: player.id,
        name: player.name,
        balance: player.balance || 0,
        currentBet: player.currentBet || 0,
        isAllIn: (player as any).isAllIn || false,
        isConnected: (player as any).isConnected !== false
      })),
      totalPot: players.reduce((sum, p) => sum + (p.currentBet || 0), 0),
      bettingTimeRemaining: gameState.bettingTimeRemaining,
      recentActions: this.getRecentActions(roomCode, 30000) // Last 30 seconds
    };

    if (!this.snapshots.has(roomCode)) {
      this.snapshots.set(roomCode, []);
    }

    const roomSnapshots = this.snapshots.get(roomCode)!;
    roomSnapshots.push(snapshot);

    // Maintain max snapshots per room
    if (roomSnapshots.length > this.maxSnapshotsPerRoom) {
      roomSnapshots.shift();
    }

    console.log(`📸 Snapshot captured for room ${roomCode}`);
  }

  private getRecentActions(roomCode: string, timeWindow: number): Array<{
    playerId: string;
    action: string;
    amount?: number;
    timestamp: number;
  }> {
    const cutoff = Date.now() - timeWindow;
    const recentLogs = bettingLogger.getLogsByRoom(roomCode)
      .filter(log => log.timestamp >= cutoff)
      .filter(log => ['bet_placed', 'bet_updated', 'all_in'].includes(log.eventType));

    return recentLogs.map(log => ({
      playerId: log.playerId || 'unknown',
      action: log.eventType,
      amount: log.data?.betAmount || log.data?.newAmount,
      timestamp: log.timestamp
    }));
  }

  // Query methods
  getDebugSession(sessionId: string): DebugSession | undefined {
    return this.debugSessions.get(sessionId);
  }

  getDebugSessionsByRoom(roomCode: string): DebugSession[] {
    return Array.from(this.debugSessions.values())
      .filter(session => session.roomCode === roomCode)
      .sort((a, b) => b.startTime - a.startTime);
  }

  getSnapshots(roomCode: string, limit?: number): BettingSnapshot[] {
    const snapshots = this.snapshots.get(roomCode) || [];
    return limit ? snapshots.slice(-limit) : [...snapshots];
  }

  getSnapshotsBetween(roomCode: string, startTime: number, endTime: number): BettingSnapshot[] {
    const snapshots = this.snapshots.get(roomCode) || [];
    return snapshots.filter(snapshot => 
      snapshot.timestamp >= startTime && snapshot.timestamp <= endTime
    );
  }

  // Diagnostic tools
  diagnosePlayerIssue(playerId: string, roomCode: string, timeWindow: number = 300000): {
    playerInfo: any;
    recentTransactions: BalanceTransaction[];
    recentLogs: BettingLogEntry[];
    recentErrors: BettingError[];
    balanceValidation: any;
    recommendations: string[];
  } {
    const cutoff = Date.now() - timeWindow;

    const recentTransactions = balanceTransactionLogger.getPlayerTransactionHistory(playerId)
      .filter(tx => tx.timestamp >= cutoff && tx.roomCode === roomCode);

    const recentLogs = bettingLogger.getLogsByPlayer(playerId)
      .filter(log => log.timestamp >= cutoff && log.roomCode === roomCode);

    const recentErrors = bettingErrorMonitor.getErrorsByRoom(roomCode)
      .filter(error => error.affectedUsers.has(playerId) && error.lastOccurrence >= cutoff);

    const balanceValidation = balanceTransactionLogger.validatePlayerBalance(playerId);

    const recommendations: string[] = [];
    if (!balanceValidation.isValid) {
      recommendations.push('Balance validation failed - check transaction history');
    }
    if (recentErrors.length > 0) {
      recommendations.push('Recent errors detected - check error logs');
    }
    if (recentTransactions.some(tx => !tx.isValid)) {
      recommendations.push('Invalid transactions found - verify transaction processing');
    }

    return {
      playerInfo: {
        playerId,
        transactionCount: recentTransactions.length,
        errorCount: recentErrors.length,
        logCount: recentLogs.length
      },
      recentTransactions,
      recentLogs,
      recentErrors,
      balanceValidation,
      recommendations
    };
  }

  diagnoseRoomIssue(roomCode: string, timeWindow: number = 600000): {
    roomInfo: any;
    playerCount: number;
    totalTransactions: number;
    totalErrors: number;
    commonIssues: Array<{ issue: string; count: number; severity: string }>;
    recommendations: string[];
  } {
    const cutoff = Date.now() - timeWindow;

    const transactions = balanceTransactionLogger.getTransactionsByRoom(roomCode)
      .filter(tx => tx.timestamp >= cutoff);

    const errors = bettingErrorMonitor.getErrorsByRoom(roomCode)
      .filter(error => error.lastOccurrence >= cutoff);

    const logs = bettingLogger.getLogsByRoom(roomCode)
      .filter(log => log.timestamp >= cutoff);

    const players = new Set(transactions.map(tx => tx.playerId));

    // Analyze common issues
    const issueMap = new Map<string, { count: number; severity: string }>();
    
    errors.forEach(error => {
      const key = `${error.category}: ${error.message.substring(0, 50)}...`;
      const existing = issueMap.get(key) || { count: 0, severity: error.severity };
      existing.count += error.occurrenceCount;
      issueMap.set(key, existing);
    });

    const commonIssues = Array.from(issueMap.entries())
      .map(([issue, data]) => ({ issue, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const recommendations: string[] = [];
    if (errors.length > 10) {
      recommendations.push('High error rate detected - investigate system stability');
    }
    if (transactions.some(tx => !tx.isValid)) {
      recommendations.push('Invalid transactions detected - verify balance calculations');
    }
    if (commonIssues.some(issue => issue.severity === 'critical')) {
      recommendations.push('Critical issues found - immediate attention required');
    }

    return {
      roomInfo: {
        roomCode,
        timeWindow: timeWindow / 1000,
        analysisTimestamp: Date.now()
      },
      playerCount: players.size,
      totalTransactions: transactions.length,
      totalErrors: errors.length,
      commonIssues,
      recommendations
    };
  }

  // Export and reporting
  exportDebugSession(sessionId: string, format: 'json' | 'text' = 'json'): string {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session ${sessionId} not found`);
    }

    if (format === 'json') {
      return JSON.stringify(session, null, 2);
    } else {
      let report = `# Debug Session Report\n\n`;
      report += `**Session ID:** ${session.id}\n`;
      report += `**Room Code:** ${session.roomCode}\n`;
      report += `**Description:** ${session.description}\n`;
      report += `**Duration:** ${((session.endTime || Date.now()) - session.startTime) / 1000}s\n\n`;

      if (session.analysis) {
        report += `## Analysis Summary\n${session.analysis.summary}\n\n`;
        
        if (session.analysis.issues.length > 0) {
          report += `## Issues Found\n`;
          session.analysis.issues.forEach((issue, index) => {
            report += `${index + 1}. **${issue.type}** (${issue.severity})\n`;
            report += `   ${issue.description}\n`;
            report += `   Affected players: ${issue.affectedPlayers.join(', ')}\n\n`;
          });
        }

        if (session.analysis.recommendations.length > 0) {
          report += `## Recommendations\n`;
          session.analysis.recommendations.forEach((rec, index) => {
            report += `${index + 1}. ${rec}\n`;
          });
        }
      }

      return report;
    }
  }

  // Cleanup
  clearOldSessions(maxAge: number = 86400000): void { // 24 hours default
    const cutoff = Date.now() - maxAge;
    for (const [sessionId, session] of this.debugSessions.entries()) {
      if (session.startTime < cutoff) {
        this.debugSessions.delete(sessionId);
      }
    }
  }

  clearOldSnapshots(maxAge: number = 3600000): void { // 1 hour default
    const cutoff = Date.now() - maxAge;
    for (const [roomCode, snapshots] of this.snapshots.entries()) {
      const filteredSnapshots = snapshots.filter(snapshot => snapshot.timestamp >= cutoff);
      if (filteredSnapshots.length === 0) {
        this.snapshots.delete(roomCode);
      } else {
        this.snapshots.set(roomCode, filteredSnapshots);
      }
    }
  }
}

// Singleton instance
export const bettingDebugger = new BettingDebugger();

export default BettingDebugger;