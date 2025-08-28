import { helpAssistantConfig } from '../config/helpAssistantConfig';
import { helpLogger } from './helpLogger';

export interface HelpMetrics {
  // Request metrics
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  
  // Response time metrics
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  
  // API usage metrics
  totalTokensUsed: number;
  totalCost: number;
  apiCallsByProvider: Record<string, number>;
  
  // Cache metrics
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  
  // Session metrics
  activeSessions: number;
  totalSessions: number;
  averageSessionDuration: number;
  
  // Rate limiting metrics
  rateLimitHits: number;
  
  // Error metrics
  errorsByType: Record<string, number>;
  
  // Time window
  windowStart: Date;
  windowEnd: Date;
}

export interface SessionMetrics {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  messageCount: number;
  totalResponseTime: number;
  errors: number;
  userId?: string;
}

class HelpMonitoring {
  private metrics!: HelpMetrics;
  private sessions: Map<string, SessionMetrics> = new Map();
  private responseTimes: number[] = [];
  private maxResponseTimeHistory = 1000; // Keep last 1000 response times
  
  constructor() {
    this.resetMetrics();
  }

  private resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      apiCallsByProvider: {},
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
      activeSessions: 0,
      totalSessions: 0,
      averageSessionDuration: 0,
      rateLimitHits: 0,
      errorsByType: {},
      windowStart: new Date(),
      windowEnd: new Date()
    };
  }

  // Request tracking
  recordRequest(): void {
    if (!helpAssistantConfig.getConfig().metricsEnabled) return;
    
    this.metrics.totalRequests++;
    this.metrics.windowEnd = new Date();
  }

  recordSuccess(responseTime: number): void {
    if (!helpAssistantConfig.getConfig().metricsEnabled) return;
    
    this.metrics.successfulRequests++;
    this.recordResponseTime(responseTime);
  }

  recordFailure(error: Error): void {
    if (!helpAssistantConfig.getConfig().metricsEnabled) return;
    
    this.metrics.failedRequests++;
    
    const errorType = error.constructor.name;
    this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;
  }

  private recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);
    
    // Keep only recent response times
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes = this.responseTimes.slice(-this.maxResponseTimeHistory);
    }
    
    // Update metrics
    this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, responseTime);
    this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, responseTime);
    
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageResponseTime = sum / this.responseTimes.length;
  }

  // API usage tracking
  recordApiCall(provider: string, tokens: number, cost: number): void {
    if (!helpAssistantConfig.getConfig().metricsEnabled) return;
    
    this.metrics.totalTokensUsed += tokens;
    this.metrics.totalCost += cost;
    this.metrics.apiCallsByProvider[provider] = (this.metrics.apiCallsByProvider[provider] || 0) + 1;
  }

  // Cache tracking
  recordCacheHit(): void {
    if (!helpAssistantConfig.getConfig().metricsEnabled) return;
    
    this.metrics.cacheHits++;
    this.updateCacheHitRate();
  }

  recordCacheMiss(): void {
    if (!helpAssistantConfig.getConfig().metricsEnabled) return;
    
    this.metrics.cacheMisses++;
    this.updateCacheHitRate();
  }

  private updateCacheHitRate(): void {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    this.metrics.cacheHitRate = total > 0 ? this.metrics.cacheHits / total : 0;
  }

  // Session tracking
  startSession(sessionId: string, userId?: string): void {
    if (!helpAssistantConfig.getConfig().metricsEnabled) return;
    
    const sessionMetrics: SessionMetrics = {
      sessionId,
      startTime: new Date(),
      messageCount: 0,
      totalResponseTime: 0,
      errors: 0,
      userId
    };
    
    this.sessions.set(sessionId, sessionMetrics);
    this.metrics.activeSessions++;
    this.metrics.totalSessions++;
    
    helpLogger.logSessionStart(sessionId, userId);
  }

  endSession(sessionId: string): void {
    if (!helpAssistantConfig.getConfig().metricsEnabled) return;
    
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.endTime = new Date();
    const duration = session.endTime.getTime() - session.startTime.getTime();
    
    this.metrics.activeSessions--;
    this.updateAverageSessionDuration();
    
    helpLogger.logSessionEnd(sessionId, duration, session.messageCount);
    
    // Keep session data for a while for analysis
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, 60000); // Remove after 1 minute
  }

  recordSessionMessage(sessionId: string, responseTime: number): void {
    if (!helpAssistantConfig.getConfig().metricsEnabled) return;
    
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.messageCount++;
    session.totalResponseTime += responseTime;
  }

  recordSessionError(sessionId: string): void {
    if (!helpAssistantConfig.getConfig().metricsEnabled) return;
    
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.errors++;
  }

  private updateAverageSessionDuration(): void {
    const completedSessions = Array.from(this.sessions.values())
      .filter(session => session.endTime);
    
    if (completedSessions.length === 0) {
      this.metrics.averageSessionDuration = 0;
      return;
    }
    
    const totalDuration = completedSessions.reduce((sum, session) => {
      if (!session.endTime) return sum;
      return sum + (session.endTime.getTime() - session.startTime.getTime());
    }, 0);
    
    this.metrics.averageSessionDuration = totalDuration / completedSessions.length;
  }

  // Rate limiting tracking
  recordRateLimit(): void {
    if (!helpAssistantConfig.getConfig().metricsEnabled) return;
    
    this.metrics.rateLimitHits++;
  }

  // Get current metrics
  getMetrics(): HelpMetrics {
    return { ...this.metrics };
  }

  // Get session metrics
  getSessionMetrics(sessionId: string): SessionMetrics | undefined {
    return this.sessions.get(sessionId);
  }

  // Get all active sessions
  getActiveSessions(): SessionMetrics[] {
    return Array.from(this.sessions.values())
      .filter(session => !session.endTime);
  }

  // Health check
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    metrics: {
      successRate: number;
      averageResponseTime: number;
      activeSessions: number;
      errorRate: number;
    };
  } {
    const successRate = this.metrics.totalRequests > 0 
      ? this.metrics.successfulRequests / this.metrics.totalRequests 
      : 1;
    
    const errorRate = this.metrics.totalRequests > 0 
      ? this.metrics.failedRequests / this.metrics.totalRequests 
      : 0;
    
    const checks = {
      successRateOk: successRate >= 0.95, // 95% success rate
      responseTimeOk: this.metrics.averageResponseTime <= 3000, // 3 second average
      errorRateOk: errorRate <= 0.05, // 5% error rate
      sessionsOk: this.metrics.activeSessions <= 100 // Max 100 concurrent sessions
    };
    
    const healthyChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.values(checks).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyChecks === totalChecks) {
      status = 'healthy';
    } else if (healthyChecks >= totalChecks * 0.75) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }
    
    return {
      status,
      checks,
      metrics: {
        successRate,
        averageResponseTime: this.metrics.averageResponseTime,
        activeSessions: this.metrics.activeSessions,
        errorRate
      }
    };
  }

  // Reset metrics (for testing or periodic reset)
  reset(): void {
    this.resetMetrics();
    this.sessions.clear();
    this.responseTimes = [];
    
    helpLogger.info('Help monitoring metrics reset');
  }

  // Get summary report
  getSummaryReport(): string {
    const metrics = this.getMetrics();
    const health = this.getHealthStatus();
    
    return `
Help Assistant Metrics Summary
=============================
Status: ${health.status.toUpperCase()}

Requests:
- Total: ${metrics.totalRequests}
- Successful: ${metrics.successfulRequests}
- Failed: ${metrics.failedRequests}
- Success Rate: ${(health.metrics.successRate * 100).toFixed(1)}%

Performance:
- Average Response Time: ${metrics.averageResponseTime.toFixed(0)}ms
- Min Response Time: ${metrics.minResponseTime === Infinity ? 'N/A' : metrics.minResponseTime.toFixed(0)}ms
- Max Response Time: ${metrics.maxResponseTime.toFixed(0)}ms

Cache:
- Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%
- Hits: ${metrics.cacheHits}
- Misses: ${metrics.cacheMisses}

Sessions:
- Active: ${metrics.activeSessions}
- Total: ${metrics.totalSessions}
- Average Duration: ${(metrics.averageSessionDuration / 1000).toFixed(1)}s

API Usage:
- Total Tokens: ${metrics.totalTokensUsed}
- Total Cost: $${metrics.totalCost.toFixed(4)}
- Providers: ${Object.keys(metrics.apiCallsByProvider).join(', ')}

Time Window: ${metrics.windowStart.toISOString()} - ${metrics.windowEnd.toISOString()}
    `.trim();
  }
}

export const helpMonitoring = new HelpMonitoring();