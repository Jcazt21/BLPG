import { bettingLogger, BettingEventType, BettingLogLevel } from './bettingLogger';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  VALIDATION = 'validation',
  NETWORK = 'network',
  DATABASE = 'database',
  BUSINESS_LOGIC = 'business_logic',
  AUTHENTICATION = 'authentication',
  SYNCHRONIZATION = 'synchronization',
  PERFORMANCE = 'performance',
  SYSTEM = 'system'
}

export interface BettingError {
  id: string;
  timestamp: number;
  severity: ErrorSeverity;
  category: ErrorCategory;
  roomCode: string;
  playerId?: string;
  playerName?: string;
  roundId?: string;
  errorCode: string;
  message: string;
  stackTrace?: string;
  context: {
    operation: string;
    userAgent?: string;
    ipAddress?: string;
    sessionId?: string;
    requestId?: string;
    additionalData?: any;
  };
  resolution?: {
    status: 'pending' | 'resolved' | 'ignored';
    resolvedAt?: number;
    resolvedBy?: string;
    resolution?: string;
    preventionMeasures?: string[];
  };
  occurrenceCount: number;
  firstOccurrence: number;
  lastOccurrence: number;
  affectedUsers: Set<string>;
}

export interface ErrorPattern {
  pattern: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  threshold: number;
  timeWindow: number; // in milliseconds
  alertEnabled: boolean;
}

class BettingErrorMonitor {
  private errors: Map<string, BettingError> = new Map();
  private errorPatterns: ErrorPattern[] = [];
  private alertThresholds: Map<ErrorCategory, number> = new Map();
  private errorCounter = 0;
  private maxErrors = 10000;

  constructor() {
    this.initializeDefaultPatterns();
    this.initializeAlertThresholds();
  }

  private initializeDefaultPatterns(): void {
    this.errorPatterns = [
      {
        pattern: 'insufficient.*balance',
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        threshold: 10,
        timeWindow: 60000, // 1 minute
        alertEnabled: false
      },
      {
        pattern: 'connection.*timeout',
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        threshold: 5,
        timeWindow: 300000, // 5 minutes
        alertEnabled: true
      },
      {
        pattern: 'database.*error',
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        threshold: 3,
        timeWindow: 60000,
        alertEnabled: true
      },
      {
        pattern: 'sync.*failed',
        category: ErrorCategory.SYNCHRONIZATION,
        severity: ErrorSeverity.HIGH,
        threshold: 2,
        timeWindow: 120000, // 2 minutes
        alertEnabled: true
      },
      {
        pattern: 'authentication.*failed',
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        threshold: 5,
        timeWindow: 300000,
        alertEnabled: true
      }
    ];
  }

  private initializeAlertThresholds(): void {
    this.alertThresholds.set(ErrorCategory.SYSTEM, 1);
    this.alertThresholds.set(ErrorCategory.DATABASE, 3);
    this.alertThresholds.set(ErrorCategory.NETWORK, 5);
    this.alertThresholds.set(ErrorCategory.SYNCHRONIZATION, 2);
    this.alertThresholds.set(ErrorCategory.VALIDATION, 10);
    this.alertThresholds.set(ErrorCategory.BUSINESS_LOGIC, 5);
    this.alertThresholds.set(ErrorCategory.AUTHENTICATION, 5);
    this.alertThresholds.set(ErrorCategory.PERFORMANCE, 8);
    this.alertThresholds.set(ErrorCategory.SYSTEM, 3);
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${++this.errorCounter}`;
  }

  private categorizeError(error: Error, operation: string): { category: ErrorCategory; severity: ErrorSeverity } {
    const message = error.message.toLowerCase();
    
    // Check against patterns
    for (const pattern of this.errorPatterns) {
      if (new RegExp(pattern.pattern, 'i').test(message)) {
        return { category: pattern.category, severity: pattern.severity };
      }
    }

    // Default categorization based on error type and message
    if (message.includes('timeout') || message.includes('network')) {
      return { category: ErrorCategory.NETWORK, severity: ErrorSeverity.MEDIUM };
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW };
    }
    
    if (message.includes('database') || message.includes('sql')) {
      return { category: ErrorCategory.DATABASE, severity: ErrorSeverity.HIGH };
    }
    
    if (message.includes('auth') || message.includes('permission')) {
      return { category: ErrorCategory.AUTHENTICATION, severity: ErrorSeverity.MEDIUM };
    }
    
    if (message.includes('sync') || message.includes('concurrent')) {
      return { category: ErrorCategory.SYNCHRONIZATION, severity: ErrorSeverity.HIGH };
    }

    // Default to business logic error
    return { category: ErrorCategory.BUSINESS_LOGIC, severity: ErrorSeverity.MEDIUM };
  }

  private getErrorKey(error: Error, roomCode: string, operation: string): string {
    // Create a key based on error message and context to group similar errors
    const normalizedMessage = error.message.replace(/\d+/g, 'N').replace(/['"]/g, '');
    return `${roomCode}_${operation}_${normalizedMessage}`;
  }

  logError(
    error: Error,
    roomCode: string,
    operation: string,
    context: {
      playerId?: string;
      playerName?: string;
      roundId?: string;
      userAgent?: string;
      ipAddress?: string;
      sessionId?: string;
      requestId?: string;
      additionalData?: any;
    } = {}
  ): BettingError {
    const timestamp = Date.now();
    const errorKey = this.getErrorKey(error, roomCode, operation);
    const { category, severity } = this.categorizeError(error, operation);

    let bettingError = this.errors.get(errorKey);

    if (bettingError) {
      // Update existing error
      bettingError.occurrenceCount++;
      bettingError.lastOccurrence = timestamp;
      if (context.playerId) {
        bettingError.affectedUsers.add(context.playerId);
      }
    } else {
      // Create new error
      bettingError = {
        id: this.generateErrorId(),
        timestamp,
        severity,
        category,
        roomCode,
        playerId: context.playerId,
        playerName: context.playerName,
        roundId: context.roundId,
        errorCode: `${category.toUpperCase()}_${severity.toUpperCase()}`,
        message: error.message,
        stackTrace: error.stack,
        context: {
          operation,
          ...context
        },
        occurrenceCount: 1,
        firstOccurrence: timestamp,
        lastOccurrence: timestamp,
        affectedUsers: new Set(context.playerId ? [context.playerId] : [])
      };

      this.errors.set(errorKey, bettingError);

      // Maintain max errors
      if (this.errors.size > this.maxErrors) {
        const oldestKey = Array.from(this.errors.keys())[0];
        this.errors.delete(oldestKey);
      }
    }

    // Log to betting logger
    bettingLogger.logError(
      roomCode,
      BettingEventType.SYNC_ERROR,
      error,
      context.playerId,
      context.playerName
    );

    // Check for alert conditions
    this.checkAlertConditions(bettingError);

    return bettingError;
  }

  private checkAlertConditions(error: BettingError): void {
    const threshold = this.alertThresholds.get(error.category) || 5;
    
    if (error.occurrenceCount >= threshold) {
      this.triggerAlert(error, `Error threshold exceeded: ${error.occurrenceCount} occurrences`);
    }

    // Check for rapid error patterns
    const recentErrors = this.getRecentErrorsByCategory(error.category, 300000); // 5 minutes
    if (recentErrors.length >= threshold) {
      this.triggerAlert(error, `Rapid error pattern detected: ${recentErrors.length} errors in 5 minutes`);
    }

    // Critical severity always triggers alert
    if (error.severity === ErrorSeverity.CRITICAL) {
      this.triggerAlert(error, 'Critical error detected');
    }
  }

  private triggerAlert(error: BettingError, reason: string): void {
    // In a real implementation, this would send alerts via email, Slack, etc.
    console.error(`🚨 BETTING SYSTEM ALERT: ${reason}`);
    console.error(`Error: ${error.message}`);
    console.error(`Category: ${error.category}, Severity: ${error.severity}`);
    console.error(`Room: ${error.roomCode}, Occurrences: ${error.occurrenceCount}`);
    console.error(`Affected Users: ${error.affectedUsers.size}`);
    
    // Log alert to betting logger
    bettingLogger.writeLog({
      timestamp: Date.now(),
      level: BettingLogLevel.CRITICAL,
      eventType: BettingEventType.SYNC_ERROR,
      roomCode: error.roomCode,
      playerId: error.playerId,
      playerName: error.playerName,
      message: `ALERT: ${reason} - ${error.message}`,
      data: {
        errorId: error.id,
        category: error.category,
        severity: error.severity,
        occurrenceCount: error.occurrenceCount,
        affectedUsers: error.affectedUsers.size
      }
    });
  }

  // Query methods
  getErrorById(errorId: string): BettingError | undefined {
    return Array.from(this.errors.values()).find(error => error.id === errorId);
  }

  getErrorsByRoom(roomCode: string, limit?: number): BettingError[] {
    const roomErrors = Array.from(this.errors.values())
      .filter(error => error.roomCode === roomCode)
      .sort((a, b) => b.lastOccurrence - a.lastOccurrence);
    
    return limit ? roomErrors.slice(0, limit) : roomErrors;
  }

  getErrorsByCategory(category: ErrorCategory, limit?: number): BettingError[] {
    const categoryErrors = Array.from(this.errors.values())
      .filter(error => error.category === category)
      .sort((a, b) => b.lastOccurrence - a.lastOccurrence);
    
    return limit ? categoryErrors.slice(0, limit) : categoryErrors;
  }

  getErrorsBySeverity(severity: ErrorSeverity, limit?: number): BettingError[] {
    const severityErrors = Array.from(this.errors.values())
      .filter(error => error.severity === severity)
      .sort((a, b) => b.lastOccurrence - a.lastOccurrence);
    
    return limit ? severityErrors.slice(0, limit) : severityErrors;
  }

  getRecentErrors(timeWindow: number = 3600000, limit?: number): BettingError[] {
    const cutoff = Date.now() - timeWindow;
    const recentErrors = Array.from(this.errors.values())
      .filter(error => error.lastOccurrence >= cutoff)
      .sort((a, b) => b.lastOccurrence - a.lastOccurrence);
    
    return limit ? recentErrors.slice(0, limit) : recentErrors;
  }

  getRecentErrorsByCategory(category: ErrorCategory, timeWindow: number = 3600000): BettingError[] {
    const cutoff = Date.now() - timeWindow;
    return Array.from(this.errors.values())
      .filter(error => error.category === category && error.lastOccurrence >= cutoff)
      .sort((a, b) => b.lastOccurrence - a.lastOccurrence);
  }

  getUnresolvedErrors(): BettingError[] {
    return Array.from(this.errors.values())
      .filter(error => !error.resolution || error.resolution.status === 'pending')
      .sort((a, b) => b.lastOccurrence - a.lastOccurrence);
  }

  // Resolution methods
  resolveError(errorId: string, resolvedBy: string, resolution: string, preventionMeasures?: string[]): boolean {
    const error = this.getErrorById(errorId);
    if (!error) return false;

    error.resolution = {
      status: 'resolved',
      resolvedAt: Date.now(),
      resolvedBy,
      resolution,
      preventionMeasures
    };

    return true;
  }

  ignoreError(errorId: string, ignoredBy: string, reason: string): boolean {
    const error = this.getErrorById(errorId);
    if (!error) return false;

    error.resolution = {
      status: 'ignored',
      resolvedAt: Date.now(),
      resolvedBy: ignoredBy,
      resolution: reason
    };

    return true;
  }

  // Statistics and reporting
  getErrorStatistics(timeWindow: number = 86400000): {
    totalErrors: number;
    uniqueErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    topErrors: Array<{ error: BettingError; occurrences: number }>;
    errorRate: number;
    affectedUsers: number;
    resolvedErrors: number;
    unresolvedErrors: number;
  } {
    const cutoff = Date.now() - timeWindow;
    const recentErrors = Array.from(this.errors.values())
      .filter(error => error.lastOccurrence >= cutoff);

    const errorsByCategory = {} as Record<ErrorCategory, number>;
    const errorsBySeverity = {} as Record<ErrorSeverity, number>;
    let totalOccurrences = 0;
    const allAffectedUsers = new Set<string>();
    let resolvedCount = 0;

    recentErrors.forEach(error => {
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + error.occurrenceCount;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + error.occurrenceCount;
      totalOccurrences += error.occurrenceCount;
      
      error.affectedUsers.forEach(userId => allAffectedUsers.add(userId));
      
      if (error.resolution && error.resolution.status === 'resolved') {
        resolvedCount++;
      }
    });

    const topErrors = recentErrors
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
      .slice(0, 10)
      .map(error => ({ error, occurrences: error.occurrenceCount }));

    return {
      totalErrors: totalOccurrences,
      uniqueErrors: recentErrors.length,
      errorsByCategory,
      errorsBySeverity,
      topErrors,
      errorRate: timeWindow > 0 ? (totalOccurrences / (timeWindow / 3600000)) : 0, // errors per hour
      affectedUsers: allAffectedUsers.size,
      resolvedErrors: resolvedCount,
      unresolvedErrors: recentErrors.length - resolvedCount
    };
  }

  generateErrorReport(timeWindow: number = 86400000): string {
    const stats = this.getErrorStatistics(timeWindow);
    const hours = timeWindow / 3600000;

    let report = `# Betting System Error Report\n`;
    report += `## Time Period: Last ${hours} hours\n\n`;
    report += `### Summary\n`;
    report += `- Total Errors: ${stats.totalErrors}\n`;
    report += `- Unique Error Types: ${stats.uniqueErrors}\n`;
    report += `- Error Rate: ${stats.errorRate.toFixed(2)} errors/hour\n`;
    report += `- Affected Users: ${stats.affectedUsers}\n`;
    report += `- Resolved: ${stats.resolvedErrors}\n`;
    report += `- Unresolved: ${stats.unresolvedErrors}\n\n`;

    report += `### Errors by Category\n`;
    Object.entries(stats.errorsByCategory).forEach(([category, count]) => {
      report += `- ${category}: ${count}\n`;
    });

    report += `\n### Errors by Severity\n`;
    Object.entries(stats.errorsBySeverity).forEach(([severity, count]) => {
      report += `- ${severity}: ${count}\n`;
    });

    report += `\n### Top Errors\n`;
    stats.topErrors.forEach((item, index) => {
      report += `${index + 1}. ${item.error.message} (${item.occurrences} occurrences)\n`;
      report += `   - Category: ${item.error.category}\n`;
      report += `   - Severity: ${item.error.severity}\n`;
      report += `   - Room: ${item.error.roomCode}\n\n`;
    });

    return report;
  }

  // Configuration
  addErrorPattern(pattern: ErrorPattern): void {
    this.errorPatterns.push(pattern);
  }

  updateAlertThreshold(category: ErrorCategory, threshold: number): void {
    this.alertThresholds.set(category, threshold);
  }

  // Cleanup
  clearResolvedErrors(): void {
    for (const [key, error] of this.errors.entries()) {
      if (error.resolution && error.resolution.status === 'resolved') {
        this.errors.delete(key);
      }
    }
  }

  clearOldErrors(maxAge: number = 604800000): void { // 7 days default
    const cutoff = Date.now() - maxAge;
    for (const [key, error] of this.errors.entries()) {
      if (error.lastOccurrence < cutoff) {
        this.errors.delete(key);
      }
    }
  }

  clearAllErrors(): void {
    this.errors.clear();
  }
}

// Singleton instance
export const bettingErrorMonitor = new BettingErrorMonitor();

export default BettingErrorMonitor;