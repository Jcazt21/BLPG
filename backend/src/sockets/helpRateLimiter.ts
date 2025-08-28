import { helpLogger } from '../utils/helpLogger';

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number; // seconds until next request allowed
  remaining: number;  // requests remaining in current window
  resetTime: Date;    // when the rate limit window resets
}

interface RateLimitEntry {
  count: number;
  windowStart: Date;
  lastRequest: Date;
}

interface RateLimitConfig {
  windowMs: number;    // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  blockDurationMs: number; // How long to block after exceeding limit
}

export class HelpRateLimiter {
  private limits: Map<string, Map<string, RateLimitEntry>> = new Map(); // socketId -> action -> entry
  private blockedSockets: Map<string, Date> = new Map(); // socketId -> unblock time

  private readonly configs: Record<string, RateLimitConfig> = {
    startSession: {
      windowMs: 60 * 1000,      // 1 minute window
      maxRequests: 3,           // 3 sessions per minute
      blockDurationMs: 2 * 60 * 1000 // Block for 2 minutes
    },
    askQuestion: {
      windowMs: 60 * 1000,      // 1 minute window
      maxRequests: 10,          // 10 questions per minute
      blockDurationMs: 30 * 1000 // Block for 30 seconds
    },
    typing: {
      windowMs: 10 * 1000,      // 10 second window
      maxRequests: 20,          // 20 typing events per 10 seconds
      blockDurationMs: 5 * 1000 // Block for 5 seconds
    }
  };

  constructor() {
    helpLogger.info('Help rate limiter initialized');
  }

  /**
   * Check if a request is allowed for a socket and action
   */
  async checkLimit(socketId: string, action: string): Promise<RateLimitResult> {
    const now = new Date();

    // Check if socket is currently blocked
    const blockUntil = this.blockedSockets.get(socketId);
    if (blockUntil && now < blockUntil) {
      const retryAfter = Math.ceil((blockUntil.getTime() - now.getTime()) / 1000);
      return {
        allowed: false,
        retryAfter,
        remaining: 0,
        resetTime: blockUntil
      };
    }

    // Remove expired block
    if (blockUntil && now >= blockUntil) {
      this.blockedSockets.delete(socketId);
    }

    const config = this.configs[action];
    if (!config) {
      // No rate limit configured for this action
      return {
        allowed: true,
        retryAfter: 0,
        remaining: Infinity,
        resetTime: new Date(now.getTime() + 60000)
      };
    }

    // Get or create socket limits
    if (!this.limits.has(socketId)) {
      this.limits.set(socketId, new Map());
    }
    const socketLimits = this.limits.get(socketId)!;

    // Get or create action entry
    let entry = socketLimits.get(action);
    if (!entry) {
      entry = {
        count: 0,
        windowStart: now,
        lastRequest: now
      };
      socketLimits.set(action, entry);
    }

    // Check if we need to reset the window
    const windowAge = now.getTime() - entry.windowStart.getTime();
    if (windowAge >= config.windowMs) {
      entry.count = 0;
      entry.windowStart = now;
    }

    // Check if request is allowed
    if (entry.count >= config.maxRequests) {
      // Rate limit exceeded, block the socket
      const blockUntil = new Date(now.getTime() + config.blockDurationMs);
      this.blockedSockets.set(socketId, blockUntil);

      helpLogger.warn(`Rate limit exceeded for socket ${socketId}, action ${action}. Blocked until ${blockUntil.toISOString()}`);

      const retryAfter = Math.ceil(config.blockDurationMs / 1000);
      return {
        allowed: false,
        retryAfter,
        remaining: 0,
        resetTime: blockUntil
      };
    }

    // Request is allowed, increment counter
    entry.count++;
    entry.lastRequest = now;

    const remaining = config.maxRequests - entry.count;
    const resetTime = new Date(entry.windowStart.getTime() + config.windowMs);

    return {
      allowed: true,
      retryAfter: 0,
      remaining,
      resetTime
    };
  }

  /**
   * Record a successful request (called after checkLimit returns allowed: true)
   */
  recordRequest(socketId: string, action: string): void {
    // Request is already recorded in checkLimit, this is for compatibility
    helpLogger.debug(`Request recorded for socket ${socketId}, action ${action}`);
  }

  /**
   * Get remaining requests for a socket and action
   */
  getRemainingRequests(socketId: string, action: string): number {
    const config = this.configs[action];
    if (!config) {
      return Infinity;
    }

    const socketLimits = this.limits.get(socketId);
    if (!socketLimits) {
      return config.maxRequests;
    }

    const entry = socketLimits.get(action);
    if (!entry) {
      return config.maxRequests;
    }

    const now = new Date();
    const windowAge = now.getTime() - entry.windowStart.getTime();
    
    // If window has expired, return full limit
    if (windowAge >= config.windowMs) {
      return config.maxRequests;
    }

    return Math.max(0, config.maxRequests - entry.count);
  }

  /**
   * Check if a socket is currently blocked
   */
  isBlocked(socketId: string): boolean {
    const blockUntil = this.blockedSockets.get(socketId);
    if (!blockUntil) {
      return false;
    }

    const now = new Date();
    if (now >= blockUntil) {
      this.blockedSockets.delete(socketId);
      return false;
    }

    return true;
  }

  /**
   * Get time until socket is unblocked (in seconds)
   */
  getBlockTimeRemaining(socketId: string): number {
    const blockUntil = this.blockedSockets.get(socketId);
    if (!blockUntil) {
      return 0;
    }

    const now = new Date();
    if (now >= blockUntil) {
      this.blockedSockets.delete(socketId);
      return 0;
    }

    return Math.ceil((blockUntil.getTime() - now.getTime()) / 1000);
  }

  /**
   * Manually block a socket for a specific duration
   */
  blockSocket(socketId: string, durationMs: number, reason?: string): void {
    const blockUntil = new Date(Date.now() + durationMs);
    this.blockedSockets.set(socketId, blockUntil);
    
    helpLogger.warn(`Manually blocked socket ${socketId} until ${blockUntil.toISOString()}${reason ? `, reason: ${reason}` : ''}`);
  }

  /**
   * Unblock a socket manually
   */
  unblockSocket(socketId: string): boolean {
    const wasBlocked = this.blockedSockets.has(socketId);
    this.blockedSockets.delete(socketId);
    
    if (wasBlocked) {
      helpLogger.info(`Manually unblocked socket ${socketId}`);
    }
    
    return wasBlocked;
  }

  /**
   * Clean up old entries and expired blocks
   */
  cleanup(): void {
    const now = new Date();
    let cleanedEntries = 0;
    let cleanedBlocks = 0;

    // Clean up expired blocks
    for (const [socketId, blockUntil] of this.blockedSockets.entries()) {
      if (now >= blockUntil) {
        this.blockedSockets.delete(socketId);
        cleanedBlocks++;
      }
    }

    // Clean up old rate limit entries (older than 1 hour)
    const maxAge = 60 * 60 * 1000; // 1 hour
    for (const [socketId, socketLimits] of this.limits.entries()) {
      for (const [action, entry] of socketLimits.entries()) {
        const age = now.getTime() - entry.lastRequest.getTime();
        if (age > maxAge) {
          socketLimits.delete(action);
          cleanedEntries++;
        }
      }

      // Remove empty socket entries
      if (socketLimits.size === 0) {
        this.limits.delete(socketId);
      }
    }

    if (cleanedEntries > 0 || cleanedBlocks > 0) {
      helpLogger.info(`Rate limiter cleanup: removed ${cleanedEntries} old entries and ${cleanedBlocks} expired blocks`);
    }
  }

  /**
   * Get rate limiter statistics
   */
  getStats(): {
    totalSockets: number;
    blockedSockets: number;
    totalEntries: number;
    entriesByAction: Record<string, number>;
  } {
    const entriesByAction: Record<string, number> = {};
    let totalEntries = 0;

    for (const socketLimits of this.limits.values()) {
      for (const [action] of socketLimits.entries()) {
        entriesByAction[action] = (entriesByAction[action] || 0) + 1;
        totalEntries++;
      }
    }

    return {
      totalSockets: this.limits.size,
      blockedSockets: this.blockedSockets.size,
      totalEntries,
      entriesByAction
    };
  }

  /**
   * Reset all limits for a socket (useful for testing or admin actions)
   */
  resetSocketLimits(socketId: string): void {
    this.limits.delete(socketId);
    this.blockedSockets.delete(socketId);
    helpLogger.info(`Reset all rate limits for socket ${socketId}`);
  }

  /**
   * Get current rate limit status for a socket
   */
  getSocketStatus(socketId: string): {
    isBlocked: boolean;
    blockTimeRemaining: number;
    limits: Record<string, {
      remaining: number;
      resetTime: Date;
      count: number;
    }>;
  } {
    const status = {
      isBlocked: this.isBlocked(socketId),
      blockTimeRemaining: this.getBlockTimeRemaining(socketId),
      limits: {} as Record<string, { remaining: number; resetTime: Date; count: number }>
    };

    const socketLimits = this.limits.get(socketId);
    if (socketLimits) {
      for (const [action, entry] of socketLimits.entries()) {
        const config = this.configs[action];
        if (config) {
          const now = new Date();
          const windowAge = now.getTime() - entry.windowStart.getTime();
          const isExpired = windowAge >= config.windowMs;
          
          status.limits[action] = {
            remaining: isExpired ? config.maxRequests : Math.max(0, config.maxRequests - entry.count),
            resetTime: new Date(entry.windowStart.getTime() + config.windowMs),
            count: isExpired ? 0 : entry.count
          };
        }
      }
    }

    return status;
  }
}