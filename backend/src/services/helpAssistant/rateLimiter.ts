import { helpLogger } from '../../utils/helpLogger';

export interface RateLimitConfig {
  perMinute: number;
  perHour: number;
  perDay: number;
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: {
    perMinute: number;
    perHour: number;
    perDay: number;
  };
  resetTimes: {
    perMinute: Date;
    perHour: Date;
    perDay: Date;
  };
}

interface RequestRecord {
  timestamp: Date;
  userId?: string;
}

export class RateLimiter {
  private requests: Map<string, RequestRecord[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Clean up old records every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  async checkLimit(userId: string = 'global'): Promise<RateLimitStatus> {
    const now = new Date();
    const userRequests = this.getUserRequests(userId);
    
    // Count requests in different time windows
    const minuteAgo = new Date(now.getTime() - 60 * 1000);
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const requestsLastMinute = userRequests.filter(r => r.timestamp > minuteAgo).length;
    const requestsLastHour = userRequests.filter(r => r.timestamp > hourAgo).length;
    const requestsLastDay = userRequests.filter(r => r.timestamp > dayAgo).length;
    
    const allowed = 
      requestsLastMinute < this.config.perMinute &&
      requestsLastHour < this.config.perHour &&
      requestsLastDay < this.config.perDay;
    
    return {
      allowed,
      remaining: {
        perMinute: Math.max(0, this.config.perMinute - requestsLastMinute),
        perHour: Math.max(0, this.config.perHour - requestsLastHour),
        perDay: Math.max(0, this.config.perDay - requestsLastDay)
      },
      resetTimes: {
        perMinute: new Date(now.getTime() + 60 * 1000),
        perHour: new Date(now.getTime() + 60 * 60 * 1000),
        perDay: new Date(now.getTime() + 24 * 60 * 60 * 1000)
      }
    };
  }

  async recordRequest(userId: string = 'global'): Promise<void> {
    const userRequests = this.getUserRequests(userId);
    userRequests.push({
      timestamp: new Date(),
      userId
    });
    
    helpLogger.debug('Rate limit request recorded', {
      userId,
      totalRequests: userRequests.length
    });
  }

  private getUserRequests(userId: string): RequestRecord[] {
    if (!this.requests.has(userId)) {
      this.requests.set(userId, []);
    }
    return this.requests.get(userId)!;
  }

  private cleanup(): void {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let totalCleaned = 0;
    
    for (const [userId, requests] of this.requests.entries()) {
      const validRequests = requests.filter(r => r.timestamp > dayAgo);
      this.requests.set(userId, validRequests);
      totalCleaned += requests.length - validRequests.length;
      
      // Remove empty user records
      if (validRequests.length === 0) {
        this.requests.delete(userId);
      }
    }
    
    if (totalCleaned > 0) {
      helpLogger.debug('Rate limiter cleanup completed', {
        recordsCleaned: totalCleaned,
        activeUsers: this.requests.size
      });
    }
  }

  getStats(): { totalUsers: number; totalRequests: number } {
    let totalRequests = 0;
    for (const requests of this.requests.values()) {
      totalRequests += requests.length;
    }
    
    return {
      totalUsers: this.requests.size,
      totalRequests
    };
  }
}