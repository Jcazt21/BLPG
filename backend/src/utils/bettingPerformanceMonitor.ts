import { bettingLogger } from './bettingLogger';

export interface PerformanceMetric {
  id: string;
  timestamp: number;
  roomCode: string;
  operation: string;
  duration: number;
  success: boolean;
  playerCount?: number;
  dataSize?: number;
  metadata?: {
    playerId?: string;
    playerName?: string;
    roundId?: string;
    betAmount?: number;
    errorMessage?: string;
    memoryUsage?: number;
    cpuUsage?: number;
    networkLatency?: number;
  };
}

export interface PerformanceBenchmark {
  operation: string;
  targetDuration: number; // milliseconds
  warningThreshold: number; // milliseconds
  criticalThreshold: number; // milliseconds
}

export interface PerformanceReport {
  timeWindow: number;
  totalOperations: number;
  averageDuration: number;
  medianDuration: number;
  p95Duration: number;
  p99Duration: number;
  successRate: number;
  operationBreakdown: Record<string, {
    count: number;
    averageDuration: number;
    successRate: number;
    slowestOperation: number;
  }>;
  performanceIssues: Array<{
    operation: string;
    issue: string;
    severity: 'warning' | 'critical';
    count: number;
  }>;
  recommendations: string[];
}

class BettingPerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private activeOperations: Map<string, { startTime: number; roomCode: string; operation: string; metadata?: any }> = new Map();
  private benchmarks: Map<string, PerformanceBenchmark> = new Map();
  private metricCounter = 0;
  private maxMetrics = 50000;

  constructor() {
    this.initializeDefaultBenchmarks();
  }

  private initializeDefaultBenchmarks(): void {
    const defaultBenchmarks: PerformanceBenchmark[] = [
      { operation: 'place_bet', targetDuration: 100, warningThreshold: 500, criticalThreshold: 1000 },
      { operation: 'update_bet', targetDuration: 50, warningThreshold: 200, criticalThreshold: 500 },
      { operation: 'clear_bet', targetDuration: 50, warningThreshold: 200, criticalThreshold: 500 },
      { operation: 'calculate_payout', targetDuration: 200, warningThreshold: 1000, criticalThreshold: 2000 },
      { operation: 'distribute_payouts', targetDuration: 500, warningThreshold: 2000, criticalThreshold: 5000 },
      { operation: 'validate_bet', targetDuration: 10, warningThreshold: 50, criticalThreshold: 100 },
      { operation: 'sync_player_state', targetDuration: 100, warningThreshold: 500, criticalThreshold: 1000 },
      { operation: 'betting_phase_start', targetDuration: 200, warningThreshold: 1000, criticalThreshold: 2000 },
      { operation: 'betting_phase_end', targetDuration: 300, warningThreshold: 1500, criticalThreshold: 3000 },
      { operation: 'balance_update', targetDuration: 50, warningThreshold: 200, criticalThreshold: 500 }
    ];

    defaultBenchmarks.forEach(benchmark => {
      this.benchmarks.set(benchmark.operation, benchmark);
    });
  }

  private generateMetricId(): string {
    return `perf_${Date.now()}_${++this.metricCounter}`;
  }

  // Operation tracking
  startOperation(operationId: string, roomCode: string, operation: string, metadata?: any): void {
    this.activeOperations.set(operationId, {
      startTime: performance.now(),
      roomCode,
      operation,
      metadata
    });
  }

  endOperation(operationId: string, success: boolean = true, additionalMetadata?: any): PerformanceMetric | null {
    const activeOp = this.activeOperations.get(operationId);
    if (!activeOp) {
      console.warn(`Performance monitor: Operation ${operationId} not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - activeOp.startTime;

    const metric: PerformanceMetric = {
      id: this.generateMetricId(),
      timestamp: Date.now(),
      roomCode: activeOp.roomCode,
      operation: activeOp.operation,
      duration,
      success,
      metadata: {
        ...activeOp.metadata,
        ...additionalMetadata
      }
    };

    this.metrics.push(metric);
    this.activeOperations.delete(operationId);

    // Maintain max metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Check against benchmarks
    this.checkPerformanceBenchmark(metric);

    // Log performance metric
    bettingLogger.logPerformanceMetric(
      activeOp.roomCode,
      activeOp.operation,
      duration,
      metric.metadata
    );

    return metric;
  }

  // Convenience methods for common operations
  measureBetPlacement<T>(roomCode: string, playerId: string, betAmount: number, operation: () => Promise<T>): Promise<T> {
    return this.measureOperation(
      `bet_${playerId}_${Date.now()}`,
      roomCode,
      'place_bet',
      operation,
      { playerId, betAmount }
    );
  }

  measurePayoutCalculation<T>(roomCode: string, playerCount: number, operation: () => Promise<T>): Promise<T> {
    return this.measureOperation(
      `payout_${roomCode}_${Date.now()}`,
      roomCode,
      'calculate_payout',
      operation,
      { playerCount }
    );
  }

  measureBettingPhase<T>(roomCode: string, phase: 'start' | 'end', playerCount: number, operation: () => Promise<T>): Promise<T> {
    return this.measureOperation(
      `betting_phase_${phase}_${roomCode}_${Date.now()}`,
      roomCode,
      `betting_phase_${phase}`,
      operation,
      { playerCount }
    );
  }

  async measureOperation<T>(
    operationId: string,
    roomCode: string,
    operation: string,
    fn: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    this.startOperation(operationId, roomCode, operation, metadata);
    
    try {
      const result = await fn();
      this.endOperation(operationId, true);
      return result;
    } catch (error) {
      this.endOperation(operationId, false, { errorMessage: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  measureSyncOperation<T>(
    operationId: string,
    roomCode: string,
    operation: string,
    fn: () => T,
    metadata?: any
  ): T {
    this.startOperation(operationId, roomCode, operation, metadata);
    
    try {
      const result = fn();
      this.endOperation(operationId, true);
      return result;
    } catch (error) {
      this.endOperation(operationId, false, { errorMessage: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  private checkPerformanceBenchmark(metric: PerformanceMetric): void {
    const benchmark = this.benchmarks.get(metric.operation);
    if (!benchmark) return;

    if (metric.duration > benchmark.criticalThreshold) {
      console.error(`🚨 CRITICAL: ${metric.operation} took ${metric.duration.toFixed(2)}ms (threshold: ${benchmark.criticalThreshold}ms)`);
      bettingLogger.logError(
        metric.roomCode,
        'performance_metric' as any,
        new Error(`Critical performance threshold exceeded: ${metric.operation}`),
        metric.metadata?.playerId,
        metric.metadata?.playerName
      );
    } else if (metric.duration > benchmark.warningThreshold) {
      console.warn(`⚠️ WARNING: ${metric.operation} took ${metric.duration.toFixed(2)}ms (threshold: ${benchmark.warningThreshold}ms)`);
    }
  }

  // Query methods
  getMetricsByRoom(roomCode: string, limit?: number): PerformanceMetric[] {
    const roomMetrics = this.metrics
      .filter(metric => metric.roomCode === roomCode)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return limit ? roomMetrics.slice(0, limit) : roomMetrics;
  }

  getMetricsByOperation(operation: string, limit?: number): PerformanceMetric[] {
    const operationMetrics = this.metrics
      .filter(metric => metric.operation === operation)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return limit ? operationMetrics.slice(0, limit) : operationMetrics;
  }

  getRecentMetrics(timeWindow: number = 3600000, limit?: number): PerformanceMetric[] {
    const cutoff = Date.now() - timeWindow;
    const recentMetrics = this.metrics
      .filter(metric => metric.timestamp >= cutoff)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return limit ? recentMetrics.slice(0, limit) : recentMetrics;
  }

  getSlowOperations(threshold: number = 1000, timeWindow: number = 3600000): PerformanceMetric[] {
    const cutoff = Date.now() - timeWindow;
    return this.metrics
      .filter(metric => metric.timestamp >= cutoff && metric.duration > threshold)
      .sort((a, b) => b.duration - a.duration);
  }

  getFailedOperations(timeWindow: number = 3600000): PerformanceMetric[] {
    const cutoff = Date.now() - timeWindow;
    return this.metrics
      .filter(metric => metric.timestamp >= cutoff && !metric.success)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // Statistics and analysis
  generatePerformanceReport(timeWindow: number = 3600000): PerformanceReport {
    const cutoff = Date.now() - timeWindow;
    const relevantMetrics = this.metrics.filter(metric => metric.timestamp >= cutoff);

    if (relevantMetrics.length === 0) {
      return {
        timeWindow,
        totalOperations: 0,
        averageDuration: 0,
        medianDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        successRate: 0,
        operationBreakdown: {},
        performanceIssues: [],
        recommendations: ['No operations recorded in the specified time window']
      };
    }

    // Calculate basic statistics
    const durations = relevantMetrics.map(m => m.duration).sort((a, b) => a - b);
    const successfulOps = relevantMetrics.filter(m => m.success).length;
    
    const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const medianDuration = durations[Math.floor(durations.length / 2)];
    const p95Duration = durations[Math.floor(durations.length * 0.95)];
    const p99Duration = durations[Math.floor(durations.length * 0.99)];
    const successRate = (successfulOps / relevantMetrics.length) * 100;

    // Operation breakdown
    const operationBreakdown: Record<string, any> = {};
    const operationGroups = new Map<string, PerformanceMetric[]>();

    relevantMetrics.forEach(metric => {
      if (!operationGroups.has(metric.operation)) {
        operationGroups.set(metric.operation, []);
      }
      operationGroups.get(metric.operation)!.push(metric);
    });

    operationGroups.forEach((metrics, operation) => {
      const opDurations = metrics.map(m => m.duration);
      const opSuccessful = metrics.filter(m => m.success).length;
      
      operationBreakdown[operation] = {
        count: metrics.length,
        averageDuration: opDurations.reduce((sum, d) => sum + d, 0) / opDurations.length,
        successRate: (opSuccessful / metrics.length) * 100,
        slowestOperation: Math.max(...opDurations)
      };
    });

    // Performance issues
    const performanceIssues: Array<{ operation: string; issue: string; severity: 'warning' | 'critical'; count: number }> = [];
    
    operationGroups.forEach((metrics, operation) => {
      const benchmark = this.benchmarks.get(operation);
      if (!benchmark) return;

      const criticalCount = metrics.filter(m => m.duration > benchmark.criticalThreshold).length;
      const warningCount = metrics.filter(m => m.duration > benchmark.warningThreshold && m.duration <= benchmark.criticalThreshold).length;

      if (criticalCount > 0) {
        performanceIssues.push({
          operation,
          issue: `${criticalCount} operations exceeded critical threshold (${benchmark.criticalThreshold}ms)`,
          severity: 'critical',
          count: criticalCount
        });
      }

      if (warningCount > 0) {
        performanceIssues.push({
          operation,
          issue: `${warningCount} operations exceeded warning threshold (${benchmark.warningThreshold}ms)`,
          severity: 'warning',
          count: warningCount
        });
      }
    });

    // Recommendations
    const recommendations: string[] = [];
    
    if (successRate < 95) {
      recommendations.push(`Success rate is low (${successRate.toFixed(1)}%) - investigate error causes`);
    }
    
    if (averageDuration > 500) {
      recommendations.push(`Average operation duration is high (${averageDuration.toFixed(1)}ms) - consider optimization`);
    }
    
    if (performanceIssues.some(issue => issue.severity === 'critical')) {
      recommendations.push('Critical performance issues detected - immediate optimization required');
    }
    
    const slowOperations = Object.entries(operationBreakdown)
      .filter(([_, data]) => data.averageDuration > 1000)
      .map(([op, _]) => op);
    
    if (slowOperations.length > 0) {
      recommendations.push(`Slow operations detected: ${slowOperations.join(', ')} - consider caching or optimization`);
    }

    return {
      timeWindow,
      totalOperations: relevantMetrics.length,
      averageDuration,
      medianDuration,
      p95Duration,
      p99Duration,
      successRate,
      operationBreakdown,
      performanceIssues,
      recommendations
    };
  }

  getOperationTrends(operation: string, timeWindow: number = 86400000, bucketSize: number = 3600000): Array<{
    timestamp: number;
    count: number;
    averageDuration: number;
    successRate: number;
  }> {
    const cutoff = Date.now() - timeWindow;
    const relevantMetrics = this.metrics
      .filter(metric => metric.operation === operation && metric.timestamp >= cutoff)
      .sort((a, b) => a.timestamp - b.timestamp);

    const buckets = new Map<number, PerformanceMetric[]>();
    
    relevantMetrics.forEach(metric => {
      const bucketKey = Math.floor(metric.timestamp / bucketSize) * bucketSize;
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(metric);
    });

    return Array.from(buckets.entries())
      .map(([timestamp, metrics]) => ({
        timestamp,
        count: metrics.length,
        averageDuration: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
        successRate: (metrics.filter(m => m.success).length / metrics.length) * 100
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  // Configuration
  setBenchmark(operation: string, benchmark: PerformanceBenchmark): void {
    this.benchmarks.set(operation, benchmark);
  }

  getBenchmark(operation: string): PerformanceBenchmark | undefined {
    return this.benchmarks.get(operation);
  }

  getAllBenchmarks(): Map<string, PerformanceBenchmark> {
    return new Map(this.benchmarks);
  }

  // Export and cleanup
  exportMetrics(format: 'json' | 'csv' = 'json', timeWindow?: number): string {
    let metricsToExport = this.metrics;
    
    if (timeWindow) {
      const cutoff = Date.now() - timeWindow;
      metricsToExport = this.metrics.filter(metric => metric.timestamp >= cutoff);
    }

    if (format === 'json') {
      return JSON.stringify(metricsToExport, null, 2);
    } else {
      // CSV format
      const headers = ['id', 'timestamp', 'roomCode', 'operation', 'duration', 'success', 'playerCount', 'playerId'];
      const csvRows = [headers.join(',')];
      
      metricsToExport.forEach(metric => {
        const row = [
          metric.id,
          new Date(metric.timestamp).toISOString(),
          metric.roomCode,
          metric.operation,
          metric.duration.toFixed(2),
          metric.success,
          metric.playerCount || '',
          metric.metadata?.playerId || ''
        ];
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    }
  }

  clearOldMetrics(maxAge: number = 86400000): void { // 24 hours default
    const cutoff = Date.now() - maxAge;
    this.metrics = this.metrics.filter(metric => metric.timestamp >= cutoff);
  }

  clearAllMetrics(): void {
    this.metrics = [];
    this.activeOperations.clear();
  }

  // System resource monitoring (simplified)
  getSystemMetrics(): {
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
    activeOperations: number;
    metricsCount: number;
  } {
    return {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      activeOperations: this.activeOperations.size,
      metricsCount: this.metrics.length
    };
  }
}

// Singleton instance
export const bettingPerformanceMonitor = new BettingPerformanceMonitor();

export default BettingPerformanceMonitor;