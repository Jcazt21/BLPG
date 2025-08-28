import { HelpRateLimiter } from './helpRateLimiter';

describe('HelpRateLimiter', () => {
  let rateLimiter: HelpRateLimiter;

  beforeEach(() => {
    rateLimiter = new HelpRateLimiter();
  });

  describe('checkLimit', () => {
    it('should allow requests within limit', async () => {
      const socketId = 'socket-123';
      const action = 'askQuestion';

      const result = await rateLimiter.checkLimit(socketId, action);

      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBe(0);
      expect(result.remaining).toBe(9); // 10 - 1 = 9 remaining
      expect(result.resetTime).toBeInstanceOf(Date);
    });

    it('should block requests after exceeding limit', async () => {
      const socketId = 'socket-123';
      const action = 'askQuestion';

      // Make 10 requests (the limit)
      for (let i = 0; i < 10; i++) {
        const result = await rateLimiter.checkLimit(socketId, action);
        expect(result.allowed).toBe(true);
      }

      // 11th request should be blocked
      const result = await rateLimiter.checkLimit(socketId, action);

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.remaining).toBe(0);
    });

    it('should handle different actions independently', async () => {
      const socketId = 'socket-123';

      // Exhaust askQuestion limit
      for (let i = 0; i < 10; i++) {
        await rateLimiter.checkLimit(socketId, 'askQuestion');
      }

      // startSession should still be allowed
      const result = await rateLimiter.checkLimit(socketId, 'startSession');
      expect(result.allowed).toBe(true);
    });

    it('should handle different sockets independently', async () => {
      const socket1 = 'socket-1';
      const socket2 = 'socket-2';
      const action = 'askQuestion';

      // Exhaust limit for socket1
      for (let i = 0; i < 10; i++) {
        await rateLimiter.checkLimit(socket1, action);
      }

      // socket2 should still be allowed
      const result = await rateLimiter.checkLimit(socket2, action);
      expect(result.allowed).toBe(true);
    });

    it('should allow requests for unknown actions', async () => {
      const result = await rateLimiter.checkLimit('socket-123', 'unknownAction');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });

    it('should respect block duration', async () => {
      const socketId = 'socket-123';
      const action = 'askQuestion';

      // Exhaust limit to trigger block
      for (let i = 0; i < 11; i++) {
        await rateLimiter.checkLimit(socketId, action);
      }

      // Should be blocked
      expect(rateLimiter.isBlocked(socketId)).toBe(true);

      // Should still be blocked immediately after
      const result = await rateLimiter.checkLimit(socketId, action);
      expect(result.allowed).toBe(false);
    });
  });

  describe('getRemainingRequests', () => {
    it('should return correct remaining count', async () => {
      const socketId = 'socket-123';
      const action = 'askQuestion';

      expect(rateLimiter.getRemainingRequests(socketId, action)).toBe(10);

      await rateLimiter.checkLimit(socketId, action);
      expect(rateLimiter.getRemainingRequests(socketId, action)).toBe(9);

      await rateLimiter.checkLimit(socketId, action);
      expect(rateLimiter.getRemainingRequests(socketId, action)).toBe(8);
    });

    it('should return full limit for new socket', () => {
      const remaining = rateLimiter.getRemainingRequests('new-socket', 'askQuestion');
      expect(remaining).toBe(10);
    });

    it('should return infinity for unknown action', () => {
      const remaining = rateLimiter.getRemainingRequests('socket-123', 'unknownAction');
      expect(remaining).toBe(Infinity);
    });
  });

  describe('isBlocked', () => {
    it('should return false for non-blocked socket', () => {
      expect(rateLimiter.isBlocked('socket-123')).toBe(false);
    });

    it('should return true for blocked socket', async () => {
      const socketId = 'socket-123';
      const action = 'askQuestion';

      // Trigger block
      for (let i = 0; i < 11; i++) {
        await rateLimiter.checkLimit(socketId, action);
      }

      expect(rateLimiter.isBlocked(socketId)).toBe(true);
    });
  });

  describe('getBlockTimeRemaining', () => {
    it('should return 0 for non-blocked socket', () => {
      expect(rateLimiter.getBlockTimeRemaining('socket-123')).toBe(0);
    });

    it('should return positive value for blocked socket', async () => {
      const socketId = 'socket-123';
      const action = 'askQuestion';

      // Trigger block
      for (let i = 0; i < 11; i++) {
        await rateLimiter.checkLimit(socketId, action);
      }

      const remaining = rateLimiter.getBlockTimeRemaining(socketId);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(30); // Block duration for askQuestion is 30 seconds
    });
  });

  describe('blockSocket', () => {
    it('should manually block a socket', () => {
      const socketId = 'socket-123';
      const durationMs = 5000; // 5 seconds

      rateLimiter.blockSocket(socketId, durationMs, 'test block');

      expect(rateLimiter.isBlocked(socketId)).toBe(true);
      expect(rateLimiter.getBlockTimeRemaining(socketId)).toBeGreaterThan(0);
    });
  });

  describe('unblockSocket', () => {
    it('should manually unblock a socket', async () => {
      const socketId = 'socket-123';

      // First block the socket
      rateLimiter.blockSocket(socketId, 60000); // 1 minute
      expect(rateLimiter.isBlocked(socketId)).toBe(true);

      // Then unblock it
      const wasBlocked = rateLimiter.unblockSocket(socketId);

      expect(wasBlocked).toBe(true);
      expect(rateLimiter.isBlocked(socketId)).toBe(false);
    });

    it('should return false when unblocking non-blocked socket', () => {
      const wasBlocked = rateLimiter.unblockSocket('socket-123');
      expect(wasBlocked).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should clean up old entries', async () => {
      const socketId = 'socket-123';
      
      // Create some entries
      await rateLimiter.checkLimit(socketId, 'askQuestion');
      
      const statsBefore = rateLimiter.getStats();
      expect(statsBefore.totalEntries).toBeGreaterThan(0);

      // Cleanup shouldn't remove recent entries
      rateLimiter.cleanup();
      
      const statsAfter = rateLimiter.getStats();
      expect(statsAfter.totalEntries).toBe(statsBefore.totalEntries);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const socket1 = 'socket-1';
      const socket2 = 'socket-2';

      await rateLimiter.checkLimit(socket1, 'askQuestion');
      await rateLimiter.checkLimit(socket1, 'startSession');
      await rateLimiter.checkLimit(socket2, 'askQuestion');

      const stats = rateLimiter.getStats();

      expect(stats.totalSockets).toBe(2);
      expect(stats.totalEntries).toBe(3);
      expect(stats.entriesByAction.askQuestion).toBe(2);
      expect(stats.entriesByAction.startSession).toBe(1);
      expect(stats.blockedSockets).toBe(0);
    });
  });

  describe('resetSocketLimits', () => {
    it('should reset all limits for a socket', async () => {
      const socketId = 'socket-123';

      // Create some limits
      await rateLimiter.checkLimit(socketId, 'askQuestion');
      await rateLimiter.checkLimit(socketId, 'startSession');

      expect(rateLimiter.getRemainingRequests(socketId, 'askQuestion')).toBe(9);

      // Reset limits
      rateLimiter.resetSocketLimits(socketId);

      expect(rateLimiter.getRemainingRequests(socketId, 'askQuestion')).toBe(10);
      expect(rateLimiter.isBlocked(socketId)).toBe(false);
    });
  });

  describe('getSocketStatus', () => {
    it('should return complete socket status', async () => {
      const socketId = 'socket-123';

      await rateLimiter.checkLimit(socketId, 'askQuestion');
      await rateLimiter.checkLimit(socketId, 'startSession');

      const status = rateLimiter.getSocketStatus(socketId);

      expect(status.isBlocked).toBe(false);
      expect(status.blockTimeRemaining).toBe(0);
      expect(status.limits.askQuestion.remaining).toBe(9);
      expect(status.limits.askQuestion.count).toBe(1);
      expect(status.limits.startSession.remaining).toBe(2);
      expect(status.limits.startSession.count).toBe(1);
    });

    it('should show blocked status', async () => {
      const socketId = 'socket-123';

      // Trigger block
      for (let i = 0; i < 11; i++) {
        await rateLimiter.checkLimit(socketId, 'askQuestion');
      }

      const status = rateLimiter.getSocketStatus(socketId);

      expect(status.isBlocked).toBe(true);
      expect(status.blockTimeRemaining).toBeGreaterThan(0);
    });
  });

  describe('rate limit configurations', () => {
    it('should have different limits for different actions', async () => {
      const socketId = 'socket-123';

      // startSession has limit of 3
      for (let i = 0; i < 3; i++) {
        const result = await rateLimiter.checkLimit(socketId, 'startSession');
        expect(result.allowed).toBe(true);
      }

      const result = await rateLimiter.checkLimit(socketId, 'startSession');
      expect(result.allowed).toBe(false);
    });

    it('should have different block durations for different actions', async () => {
      const socket1 = 'socket-1';
      const socket2 = 'socket-2';

      // Trigger block for startSession (2 minute block)
      for (let i = 0; i < 4; i++) {
        await rateLimiter.checkLimit(socket1, 'startSession');
      }

      // Trigger block for askQuestion (30 second block)
      for (let i = 0; i < 11; i++) {
        await rateLimiter.checkLimit(socket2, 'askQuestion');
      }

      const startSessionBlock = rateLimiter.getBlockTimeRemaining(socket1);
      const askQuestionBlock = rateLimiter.getBlockTimeRemaining(socket2);

      expect(startSessionBlock).toBeGreaterThan(askQuestionBlock);
      expect(startSessionBlock).toBeGreaterThan(100); // Should be close to 120 seconds
      expect(askQuestionBlock).toBeLessThanOrEqual(30); // Should be 30 seconds or less
    });
  });
});