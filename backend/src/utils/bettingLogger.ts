import { MultiplayerPlayer } from '../types/bettingTypes';

export enum BettingLogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum BettingEventType {
  BET_PLACED = 'bet_placed',
  BET_UPDATED = 'bet_updated',
  BET_CLEARED = 'bet_cleared',
  ALL_IN = 'all_in',
  BETTING_PHASE_START = 'betting_phase_start',
  BETTING_PHASE_END = 'betting_phase_end',
  BETTING_TIMEOUT = 'betting_timeout',
  PAYOUT_CALCULATED = 'payout_calculated',
  PAYOUT_DISTRIBUTED = 'payout_distributed',
  BALANCE_UPDATED = 'balance_updated',
  VALIDATION_ERROR = 'validation_error',
  SYNC_ERROR = 'sync_error',
  PERFORMANCE_METRIC = 'performance_metric'
}

export interface BettingLogEntry {
  timestamp: number;
  level: BettingLogLevel;
  eventType: BettingEventType;
  roomCode: string;
  playerId?: string;
  playerName?: string;
  message: string;
  data?: any;
  duration?: number;
  error?: Error;
  stackTrace?: string;
  sessionId?: string;
  roundId?: string;
}

class BettingLogger {
  private logs: BettingLogEntry[] = [];
  private maxLogEntries = 10000;
  private logLevel: BettingLogLevel = BettingLogLevel.INFO;
  private enableConsoleOutput = true;
  private enableFileOutput = false;
  private logFilePath = './logs/betting.log';

  constructor(options?: {
    maxLogEntries?: number;
    logLevel?: BettingLogLevel;
    enableConsoleOutput?: boolean;
    enableFileOutput?: boolean;
    logFilePath?: string;
  }) {
    if (options) {
      this.maxLogEntries = options.maxLogEntries || this.maxLogEntries;
      this.logLevel = options.logLevel || this.logLevel;
      this.enableConsoleOutput = options.enableConsoleOutput ?? this.enableConsoleOutput;
      this.enableFileOutput = options.enableFileOutput ?? this.enableFileOutput;
      this.logFilePath = options.logFilePath || this.logFilePath;
    }
  }

  private shouldLog(level: BettingLogLevel): boolean {
    const levels = [BettingLogLevel.DEBUG, BettingLogLevel.INFO, BettingLogLevel.WARN, BettingLogLevel.ERROR, BettingLogLevel.CRITICAL];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private createLogEntry(
    level: BettingLogLevel,
    eventType: BettingEventType,
    roomCode: string,
    message: string,
    options?: {
      playerId?: string;
      playerName?: string;
      data?: any;
      duration?: number;
      error?: Error;
      sessionId?: string;
      roundId?: string;
    }
  ): BettingLogEntry {
    return {
      timestamp: Date.now(),
      level,
      eventType,
      roomCode,
      message,
      playerId: options?.playerId,
      playerName: options?.playerName,
      data: options?.data,
      duration: options?.duration,
      error: options?.error,
      stackTrace: options?.error?.stack,
      sessionId: options?.sessionId,
      roundId: options?.roundId
    };
  }

  public writeLog(entry: BettingLogEntry): void {
    // Add to memory store
    this.logs.push(entry);
    
    // Maintain max log entries
    if (this.logs.length > this.maxLogEntries) {
      this.logs.shift();
    }

    // Console output
    if (this.enableConsoleOutput) {
      const logMessage = this.formatLogMessage(entry);
      switch (entry.level) {
        case BettingLogLevel.DEBUG:
          console.debug(logMessage);
          break;
        case BettingLogLevel.INFO:
          console.info(logMessage);
          break;
        case BettingLogLevel.WARN:
          console.warn(logMessage);
          break;
        case BettingLogLevel.ERROR:
        case BettingLogLevel.CRITICAL:
          console.error(logMessage);
          break;
      }
    }

    // File output (simplified - in production would use proper file logging)
    if (this.enableFileOutput) {
      // Would implement file writing here
      console.log(`[FILE LOG] ${this.formatLogMessage(entry)}`);
    }
  }

  private formatLogMessage(entry: BettingLogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const playerInfo = entry.playerId ? ` [Player: ${entry.playerName || entry.playerId}]` : '';
    const durationInfo = entry.duration ? ` [Duration: ${entry.duration}ms]` : '';
    const errorInfo = entry.error ? ` [Error: ${entry.error.message}]` : '';
    
    return `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.eventType}] [Room: ${entry.roomCode}]${playerInfo}${durationInfo} ${entry.message}${errorInfo}`;
  }

  // Public logging methods
  logBetPlaced(roomCode: string, playerId: string, playerName: string, amount: number, newBalance: number, roundId?: string): void {
    if (!this.shouldLog(BettingLogLevel.INFO)) return;
    
    this.writeLog(this.createLogEntry(
      BettingLogLevel.INFO,
      BettingEventType.BET_PLACED,
      roomCode,
      `Player placed bet of ${amount} chips, new balance: ${newBalance}`,
      {
        playerId,
        playerName,
        data: { betAmount: amount, newBalance },
        roundId
      }
    ));
  }

  logBetUpdated(roomCode: string, playerId: string, playerName: string, oldAmount: number, newAmount: number, roundId?: string): void {
    if (!this.shouldLog(BettingLogLevel.INFO)) return;
    
    this.writeLog(this.createLogEntry(
      BettingLogLevel.INFO,
      BettingEventType.BET_UPDATED,
      roomCode,
      `Player updated bet from ${oldAmount} to ${newAmount} chips`,
      {
        playerId,
        playerName,
        data: { oldAmount, newAmount },
        roundId
      }
    ));
  }

  logAllIn(roomCode: string, playerId: string, playerName: string, amount: number, roundId?: string): void {
    if (!this.shouldLog(BettingLogLevel.INFO)) return;
    
    this.writeLog(this.createLogEntry(
      BettingLogLevel.INFO,
      BettingEventType.ALL_IN,
      roomCode,
      `Player went all-in with ${amount} chips`,
      {
        playerId,
        playerName,
        data: { allInAmount: amount },
        roundId
      }
    ));
  }

  logBettingPhaseStart(roomCode: string, duration: number, playerCount: number, roundId?: string): void {
    if (!this.shouldLog(BettingLogLevel.INFO)) return;
    
    this.writeLog(this.createLogEntry(
      BettingLogLevel.INFO,
      BettingEventType.BETTING_PHASE_START,
      roomCode,
      `Betting phase started for ${playerCount} players, duration: ${duration}s`,
      {
        data: { duration, playerCount },
        roundId
      }
    ));
  }

  logBettingPhaseEnd(roomCode: string, totalBets: number, totalPot: number, roundId?: string): void {
    if (!this.shouldLog(BettingLogLevel.INFO)) return;
    
    this.writeLog(this.createLogEntry(
      BettingLogLevel.INFO,
      BettingEventType.BETTING_PHASE_END,
      roomCode,
      `Betting phase ended, ${totalBets} bets placed, total pot: ${totalPot}`,
      {
        data: { totalBets, totalPot },
        roundId
      }
    ));
  }

  logPayoutCalculated(roomCode: string, playerId: string, playerName: string, betAmount: number, payout: number, result: string, roundId?: string): void {
    if (!this.shouldLog(BettingLogLevel.INFO)) return;
    
    this.writeLog(this.createLogEntry(
      BettingLogLevel.INFO,
      BettingEventType.PAYOUT_CALCULATED,
      roomCode,
      `Payout calculated: bet ${betAmount}, payout ${payout}, result: ${result}`,
      {
        playerId,
        playerName,
        data: { betAmount, payout, result },
        roundId
      }
    ));
  }

  logValidationError(roomCode: string, playerId: string, playerName: string, error: string, attemptedAmount?: number): void {
    this.writeLog(this.createLogEntry(
      BettingLogLevel.WARN,
      BettingEventType.VALIDATION_ERROR,
      roomCode,
      `Bet validation failed: ${error}`,
      {
        playerId,
        playerName,
        data: { validationError: error, attemptedAmount }
      }
    ));
  }

  logError(roomCode: string, eventType: BettingEventType, error: Error, playerId?: string, playerName?: string): void {
    this.writeLog(this.createLogEntry(
      BettingLogLevel.ERROR,
      eventType,
      roomCode,
      `Error occurred: ${error.message}`,
      {
        playerId,
        playerName,
        error
      }
    ));
  }

  logPerformanceMetric(roomCode: string, operation: string, duration: number, metadata?: any): void {
    if (!this.shouldLog(BettingLogLevel.DEBUG)) return;
    
    this.writeLog(this.createLogEntry(
      BettingLogLevel.DEBUG,
      BettingEventType.PERFORMANCE_METRIC,
      roomCode,
      `Performance: ${operation} completed in ${duration}ms`,
      {
        duration,
        data: { operation, ...metadata }
      }
    ));
  }

  // Query methods
  getLogsByRoom(roomCode: string, limit?: number): BettingLogEntry[] {
    const roomLogs = this.logs.filter(log => log.roomCode === roomCode);
    return limit ? roomLogs.slice(-limit) : roomLogs;
  }

  getLogsByPlayer(playerId: string, limit?: number): BettingLogEntry[] {
    const playerLogs = this.logs.filter(log => log.playerId === playerId);
    return limit ? playerLogs.slice(-limit) : playerLogs;
  }

  getLogsByEventType(eventType: BettingEventType, limit?: number): BettingLogEntry[] {
    const eventLogs = this.logs.filter(log => log.eventType === eventType);
    return limit ? eventLogs.slice(-limit) : eventLogs;
  }

  getErrorLogs(limit?: number): BettingLogEntry[] {
    const errorLogs = this.logs.filter(log => 
      log.level === BettingLogLevel.ERROR || log.level === BettingLogLevel.CRITICAL
    );
    return limit ? errorLogs.slice(-limit) : errorLogs;
  }

  // Statistics
  getLogStatistics(): {
    totalLogs: number;
    logsByLevel: Record<BettingLogLevel, number>;
    logsByEventType: Record<BettingEventType, number>;
    errorRate: number;
    averageResponseTime: number;
  } {
    const logsByLevel = {} as Record<BettingLogLevel, number>;
    const logsByEventType = {} as Record<BettingEventType, number>;
    let totalDuration = 0;
    let durationCount = 0;

    this.logs.forEach(log => {
      logsByLevel[log.level] = (logsByLevel[log.level] || 0) + 1;
      logsByEventType[log.eventType] = (logsByEventType[log.eventType] || 0) + 1;
      
      if (log.duration) {
        totalDuration += log.duration;
        durationCount++;
      }
    });

    const errorCount = (logsByLevel[BettingLogLevel.ERROR] || 0) + (logsByLevel[BettingLogLevel.CRITICAL] || 0);
    const errorRate = this.logs.length > 0 ? (errorCount / this.logs.length) * 100 : 0;
    const averageResponseTime = durationCount > 0 ? totalDuration / durationCount : 0;

    return {
      totalLogs: this.logs.length,
      logsByLevel,
      logsByEventType,
      errorRate,
      averageResponseTime
    };
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
  }

  // Export logs
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    } else {
      // CSV format
      const headers = ['timestamp', 'level', 'eventType', 'roomCode', 'playerId', 'playerName', 'message', 'duration'];
      const csvRows = [headers.join(',')];
      
      this.logs.forEach(log => {
        const row = [
          new Date(log.timestamp).toISOString(),
          log.level,
          log.eventType,
          log.roomCode,
          log.playerId || '',
          log.playerName || '',
          `"${log.message.replace(/"/g, '""')}"`,
          log.duration || ''
        ];
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    }
  }
}

// Singleton instance
export const bettingLogger = new BettingLogger({
  logLevel: process.env.NODE_ENV === 'development' ? BettingLogLevel.DEBUG : BettingLogLevel.INFO,
  enableConsoleOutput: true,
  enableFileOutput: process.env.NODE_ENV === 'production'
});

export default BettingLogger;