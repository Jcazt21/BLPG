// Load environment variables for tests
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Set required environment variables for tests if not present
if (!process.env.HOST) {
  process.env.HOST = 'localhost';
}

import { RateLimiter } from './rateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      perMinute: 5,
      perHour: 50,
      perDay: 500
    });
  });

  describe('checkLimit', () => {
    it('should allow requests within limits', async () => {
      const status = await rateLimiter.checkLimit('user1');
      
      expect(status.allowed).toBe(true);
      expect(status.remaining.perMinute).toBe(5);
      expect(status.remaining.perHour).toBe(50);
      expect(status.remaining.perDay).toBe(500);
    });

    it('should track requests per user', async () => {
      // Record some requests for user1
      await rateLimiter.recordRequest('user1');
      await rateLimiter.recordRequest('user1');
      
      const status = await rateLimiter.checkLimit('user1');
      expect(status.remaining.perMinute).toBe(3);
      expect(status.remaining.perHour).toBe(48);
      expect(status.remaining.perDay).toBe(498);
    });

    it('should deny requests when minute limit exceeded', async () => {
      // Record 5 requests (at the limit)
      for (let i = 0; i < 5; i++) {
        await rateLimiter.recordRequest('user1');
      }
      
      const status = await rateLimiter.checkLimit('user1');
      expect(status.allowed).toBe(false);
      expect(status.remaining.perMinute).toBe(0);
    });

    it('should handle different users independently', async () => {
      // Max out user1
      for (let i = 0; i < 5; i++) {
        await rateLimiter.recordRequest('user1');
      }
      
      // user2 should still be allowed
      const user1Status = await rateLimiter.checkLimit('user1');
      const user2Status = await rateLimiter.checkLimit('user2');
      
      expect(user1Status.allowed).toBe(false);
      expect(user2Status.allowed).toBe(true);
    });
  });

  describe('recordRequest', () => {
    it('should record requests with timestamps', async () => {
      await rateLimiter.recordRequest('user1');
      
      const status = await rateLimiter.checkLimit('user1');
      expect(status.remaining.perMinute).toBe(4);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      await rateLimiter.recordRequest('user1');
      await rateLimiter.recordRequest('user2');
      await rateLimiter.recordRequest('user1');
      
      const stats = rateLimiter.getStats();
      expect(stats.totalUsers).toBe(2);
      expect(stats.totalRequests).toBe(3);
    });
  });
});