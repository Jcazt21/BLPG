import { helpLogger } from '../../utils/helpLogger';

export interface UsageRecord {
  timestamp: Date;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  responseTime: number;
  sessionId?: string;
  userId?: string;
}

export interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  averageTokensPerRequest: number;
  costPerToken: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface CostConfig {
  gemini: {
    inputCostPer1kTokens: number;
    outputCostPer1kTokens: number;
  };
}

export class UsageTracker {
  private records: UsageRecord[] = [];
  private costConfig: CostConfig;
  private maxRecords: number;

  constructor(
    costConfig: CostConfig = {
      gemini: {
        inputCostPer1kTokens: 0.00015, // $0.00015 per 1k input tokens for Gemini 2.5 Flash
        outputCostPer1kTokens: 0.0006  // $0.0006 per 1k output tokens for Gemini 2.5 Flash
      }
    },
    maxRecords: number = 10000
  ) {
    this.costConfig = costConfig;
    this.maxRecords = maxRecords;
    
    // Clean up old records every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  recordUsage(
    provider: string,
    model: string,
    promptTokens: number,
    completionTokens: number,
    responseTime: number,
    sessionId?: string,
    userId?: string
  ): UsageRecord {
    const totalTokens = promptTokens + completionTokens;
    const cost = this.calculateCost(provider, promptTokens, completionTokens);
    
    const record: UsageRecord = {
      timestamp: new Date(),
      provider,
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      cost,
      responseTime,
      sessionId,
      userId
    };

    this.records.push(record);
    
    // Maintain max records limit
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }

    helpLogger.debug('Usage recorded', {
      provider,
      model,
      totalTokens,
      cost: cost,
      responseTime,
      sessionId
    });

    return record;
  }

  private calculateCost(provider: string, promptTokens: number, completionTokens: number): number {
    if (provider === 'gemini') {
      const inputCost = (promptTokens / 1000) * this.costConfig.gemini.inputCostPer1kTokens;
      const outputCost = (completionTokens / 1000) * this.costConfig.gemini.outputCostPer1kTokens;
      return inputCost + outputCost;
    }
    
    // Default fallback cost calculation
    return ((promptTokens + completionTokens) / 1000) * 0.002;
  }

  getUsageStats(timeRange?: { start: Date; end: Date }): UsageStats {
    let filteredRecords = this.records;
    
    if (timeRange) {
      filteredRecords = this.records.filter(
        record => record.timestamp >= timeRange.start && record.timestamp <= timeRange.end
      );
    }

    if (filteredRecords.length === 0) {
      const now = new Date();
      return {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        averageResponseTime: 0,
        averageTokensPerRequest: 0,
        costPerToken: 0,
        timeRange: timeRange || { start: now, end: now }
      };
    }

    const totalRequests = filteredRecords.length;
    const totalTokens = filteredRecords.reduce((sum, record) => sum + record.totalTokens, 0);
    const totalCost = filteredRecords.reduce((sum, record) => sum + record.cost, 0);
    const totalResponseTime = filteredRecords.reduce((sum, record) => sum + record.responseTime, 0);

    const actualTimeRange = timeRange || {
      start: filteredRecords[0].timestamp,
      end: filteredRecords[filteredRecords.length - 1].timestamp
    };

    return {
      totalRequests,
      totalTokens,
      totalCost,
      averageResponseTime: totalResponseTime / totalRequests,
      averageTokensPerRequest: totalTokens / totalRequests,
      costPerToken: totalTokens > 0 ? totalCost / totalTokens : 0,
      timeRange: actualTimeRange
    };
  }

  getDailyStats(): UsageStats {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    return this.getUsageStats({ start: startOfDay, end: endOfDay });
  }

  getHourlyStats(): UsageStats {
    const now = new Date();
    const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const endOfHour = new Date(startOfHour.getTime() + 60 * 60 * 1000);
    
    return this.getUsageStats({ start: startOfHour, end: endOfHour });
  }

  getTopUsers(limit: number = 10, timeRange?: { start: Date; end: Date }): Array<{
    userId: string;
    requests: number;
    tokens: number;
    cost: number;
  }> {
    let filteredRecords = this.records;
    
    if (timeRange) {
      filteredRecords = this.records.filter(
        record => record.timestamp >= timeRange.start && record.timestamp <= timeRange.end
      );
    }

    const userStats = new Map<string, { requests: number; tokens: number; cost: number }>();
    
    for (const record of filteredRecords) {
      if (!record.userId) continue;
      
      const existing = userStats.get(record.userId) || { requests: 0, tokens: 0, cost: 0 };
      existing.requests++;
      existing.tokens += record.totalTokens;
      existing.cost += record.cost;
      userStats.set(record.userId, existing);
    }

    return Array.from(userStats.entries())
      .map(([userId, stats]) => ({ userId, ...stats }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit);
  }

  getCostAlert(dailyLimit: number, hourlyLimit: number): {
    dailyAlert: boolean;
    hourlyAlert: boolean;
    dailyCost: number;
    hourlyCost: number;
  } {
    const dailyStats = this.getDailyStats();
    const hourlyStats = this.getHourlyStats();
    
    return {
      dailyAlert: dailyStats.totalCost >= dailyLimit,
      hourlyAlert: hourlyStats.totalCost >= hourlyLimit,
      dailyCost: dailyStats.totalCost,
      hourlyCost: hourlyStats.totalCost
    };
  }

  exportRecords(timeRange?: { start: Date; end: Date }): UsageRecord[] {
    let filteredRecords = this.records;
    
    if (timeRange) {
      filteredRecords = this.records.filter(
        record => record.timestamp >= timeRange.start && record.timestamp <= timeRange.end
      );
    }

    return [...filteredRecords]; // Return copy
  }

  private cleanup(): void {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const originalLength = this.records.length;
    
    this.records = this.records.filter(record => record.timestamp > sevenDaysAgo);
    
    const cleaned = originalLength - this.records.length;
    if (cleaned > 0) {
      helpLogger.debug('Usage tracker cleanup completed', {
        recordsCleaned: cleaned,
        remainingRecords: this.records.length
      });
    }
  }

  clear(): void {
    const clearedCount = this.records.length;
    this.records = [];
    
    helpLogger.info('Usage tracker cleared', { clearedRecords: clearedCount });
  }
}