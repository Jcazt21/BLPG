import { helpAssistantConfig } from '../config/helpAssistantConfig';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: any;
  sessionId?: string;
  userId?: string;
}

export interface HelpAssistantLogContext {
  sessionId?: string;
  userId?: string;
  provider?: string;
  model?: string;
  tokens?: number;
  cost?: number;
  responseTime?: number;
  error?: Error;
  [key: string]: any;
}

class HelpLogger {
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 log entries in memory

  constructor() {
    this.logLevel = helpAssistantConfig.getConfig().logLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, context?: HelpAssistantLogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [HELP-${level.toUpperCase()}]`;
    
    let formattedMessage = `${prefix} ${message}`;
    
    if (context?.sessionId) {
      formattedMessage += ` [Session: ${context.sessionId}]`;
    }
    
    if (context?.userId) {
      formattedMessage += ` [User: ${context.userId}]`;
    }

    return formattedMessage;
  }

  private addToMemory(level: LogLevel, message: string, context?: HelpAssistantLogContext): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      sessionId: context?.sessionId,
      userId: context?.userId
    };

    this.logs.push(entry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  debug(message: string, context?: HelpAssistantLogContext): void {
    if (!this.shouldLog('debug')) return;
    
    const formatted = this.formatMessage('debug', message, context);
    console.debug(formatted);
    this.addToMemory('debug', message, context);
  }

  info(message: string, context?: HelpAssistantLogContext): void {
    if (!this.shouldLog('info')) return;
    
    const formatted = this.formatMessage('info', message, context);
    console.info(formatted);
    this.addToMemory('info', message, context);
  }

  warn(message: string, context?: HelpAssistantLogContext): void {
    if (!this.shouldLog('warn')) return;
    
    const formatted = this.formatMessage('warn', message, context);
    console.warn(formatted);
    this.addToMemory('warn', message, context);
  }

  error(message: string, context?: HelpAssistantLogContext): void {
    if (!this.shouldLog('error')) return;
    
    const formatted = this.formatMessage('error', message, context);
    console.error(formatted);
    
    if (context?.error) {
      console.error('Stack trace:', context.error.stack);
    }
    
    this.addToMemory('error', message, context);
  }

  // Specialized logging methods for help assistant events
  logQuestion(sessionId: string, question: string, userId?: string): void {
    this.info('Question received', {
      sessionId,
      userId,
      question: question.substring(0, 100) + (question.length > 100 ? '...' : '')
    });
  }

  logResponse(sessionId: string, response: string, responseTime: number, provider?: string, tokens?: number): void {
    this.info('Response generated', {
      sessionId,
      provider,
      tokens,
      responseTime,
      responseLength: response.length
    });
  }

  logApiCall(provider: string, model: string, tokens: number, cost: number, responseTime: number, sessionId?: string): void {
    this.info('LLM API call completed', {
      sessionId,
      provider,
      model,
      tokens,
      cost,
      responseTime
    });
  }

  logError(sessionId: string, error: Error, context?: any): void {
    this.error('Help assistant error', {
      sessionId,
      error,
      context
    });
  }

  logSessionStart(sessionId: string, userId?: string): void {
    this.info('Help session started', {
      sessionId,
      userId
    });
  }

  logSessionEnd(sessionId: string, duration: number, messageCount: number): void {
    this.info('Help session ended', {
      sessionId,
      duration,
      messageCount
    });
  }

  logRateLimit(userId: string, action: string, limit: string): void {
    this.warn('Rate limit exceeded', {
      userId,
      action,
      limit
    });
  }

  logCacheHit(questionHash: string, sessionId?: string): void {
    this.debug('Cache hit', {
      sessionId,
      questionHash
    });
  }

  logCacheMiss(questionHash: string, sessionId?: string): void {
    this.debug('Cache miss', {
      sessionId,
      questionHash
    });
  }

  // Get recent logs for debugging
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Get logs by session
  getSessionLogs(sessionId: string): LogEntry[] {
    return this.logs.filter(log => log.sessionId === sessionId);
  }

  // Get error logs
  getErrorLogs(count: number = 20): LogEntry[] {
    return this.logs
      .filter(log => log.level === 'error')
      .slice(-count);
  }

  // Clear logs (for testing)
  clearLogs(): void {
    this.logs = [];
  }

  // Update log level dynamically
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info(`Log level changed to: ${level}`);
  }
}

export const helpLogger = new HelpLogger();