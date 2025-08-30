// Load environment variables for tests
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Set required environment variables for tests if not present
if (!process.env.HOST) {
  process.env.HOST = 'localhost';
}

import { UsageTracker } from './usageTracker';

describe('UsageTracker', () => {
  let usageTracker: UsageTracker;

  beforeEach(() => {
    usageTracker = new UsageTracker();
  });

  describe('recordUsage', () => {
    it('should record usage with correct cost calculation', () => {
      const record = usageTracker.recordUsage(
        'gemini',
        'gemini-2.5-flash',
        100, // prompt tokens
        50,  // completion tokens
        1500, // response time
        'session1',
        'user1'
      );

      expect(record.provider).toBe('gemini');
      expect(record.model).toBe('gemini-2.5-flash');
      expect(record.promptTokens).toBe(100);
      expect(record.completionTokens).toBe(50);
      expect(record.totalTokens).toBe(150);
      expect(record.responseTime).toBe(1500);
      expect(record.sessionId).toBe('session1');
      expect(record.userId).toBe('user1');
      expect(record.cost).toBeGreaterThan(0);
    });

    it('should calculate Gemini costs correctly', () => {
      const record = usageTracker.recordUsage('gemini', 'gemini-2.5-flash', 1000, 1000, 1000);
      
      // Expected cost: (1000/1000 * 0.00015) + (1000/1000 * 0.0006) = 0.00075
      expect(record.cost).toBeCloseTo(0.00075, 6);
    });
  });

  describe('getUsageStats', () => {
    beforeEach(() => {
      // Add some test data
      usageTracker.recordUsage('gemini', 'gemini-2.5-flash', 100, 50, 1000, 'session1');
      usageTracker.recordUsage('gemini', 'gemini-2.5-flash', 200, 100, 1500, 'session2');
      usageTracker.recordUsage('gemini', 'gemini-2.5-flash', 150, 75, 1200, 'session3');
    });

    it('should return correct overall statistics', () => {
      const stats = usageTracker.getUsageStats();
      
      expect(stats.totalRequests).toBe(3);
      expect(stats.totalTokens).toBe(675); // (100+50) + (200+100) + (150+75)
      expect(stats.averageTokensPerRequest).toBe(225);
      expect(stats.averageResponseTime).toBeCloseTo(1233.33, 2); // (1000+1500+1200)/3
      expect(stats.totalCost).toBeGreaterThan(0);
    });

    it('should filter by time range', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const stats = usageTracker.getUsageStats({
        start: oneHourAgo,
        end: now
      });
      
      expect(stats.totalRequests).toBe(3); // All records should be within the last hour
    });
  });

  describe('getDailyStats', () => {
    it('should return stats for current day', () => {
      usageTracker.recordUsage('gemini', 'gemini-2.5-flash', 100, 50, 1000);
      
      const stats = usageTracker.getDailyStats();
      expect(stats.totalRequests).toBe(1);
    });
  });

  describe('getHourlyStats', () => {
    it('should return stats for current hour', () => {
      usageTracker.recordUsage('gemini', 'gemini-2.5-flash', 100, 50, 1000);
      
      const stats = usageTracker.getHourlyStats();
      expect(stats.totalRequests).toBe(1);
    });
  });

  describe('getCostAlert', () => {
    it('should detect when daily limit is exceeded', () => {
      // Record expensive usage
      for (let i = 0; i < 10; i++) {
        usageTracker.recordUsage('gemini', 'gemini-2.5-flash', 10000, 10000, 1000);
      }
      
      const alert = usageTracker.getCostAlert(0.01, 0.001); // Very low limits
      
      expect(alert.dailyAlert).toBe(true);
      expect(alert.hourlyAlert).toBe(true);
      expect(alert.dailyCost).toBeGreaterThan(0.01);
      expect(alert.hourlyCost).toBeGreaterThan(0.001);
    });
  });

  describe('getTopUsers', () => {
    beforeEach(() => {
      usageTracker.recordUsage('gemini', 'gemini-2.5-flash', 1000, 500, 1000, 'session1', 'user1');
      usageTracker.recordUsage('gemini', 'gemini-2.5-flash', 2000, 1000, 1000, 'session2', 'user2');
      usageTracker.recordUsage('gemini', 'gemini-2.5-flash', 500, 250, 1000, 'session3', 'user1');
    });

    it('should return top users by cost', () => {
      const topUsers = usageTracker.getTopUsers(2);
      
      expect(topUsers).toHaveLength(2);
      expect(topUsers[0].userId).toBe('user2'); // Higher cost
      expect(topUsers[1].userId).toBe('user1');
      expect(topUsers[0].requests).toBe(1);
      expect(topUsers[1].requests).toBe(2);
    });
  });

  describe('exportRecords', () => {
    it('should export all records', () => {
      usageTracker.recordUsage('gemini', 'gemini-2.5-flash', 100, 50, 1000);
      usageTracker.recordUsage('gemini', 'gemini-2.5-flash', 200, 100, 1500);
      
      const records = usageTracker.exportRecords();
      expect(records).toHaveLength(2);
      expect(records[0].totalTokens).toBe(150);
      expect(records[1].totalTokens).toBe(300);
    });
  });

  describe('clear', () => {
    it('should clear all records', () => {
      usageTracker.recordUsage('gemini', 'gemini-2.5-flash', 100, 50, 1000);
      
      usageTracker.clear();
      
      const stats = usageTracker.getUsageStats();
      expect(stats.totalRequests).toBe(0);
    });
  });
});