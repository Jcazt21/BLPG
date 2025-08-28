import { helpLogger } from '../utils/helpLogger';

export interface HelpSession {
  id: string;
  socketId: string;
  roomCode?: string;
  startTime: Date;
  lastActivity: Date;
  messageCount: number;
  isActive: boolean;
}

export class HelpSessionManager {
  private sessions: Map<string, HelpSession> = new Map();
  private socketSessions: Map<string, Set<string>> = new Map(); // socketId -> sessionIds
  private readonly SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_SESSIONS_PER_SOCKET = 3;

  constructor() {
    helpLogger.info('Help session manager initialized');
  }

  /**
   * Create a new help session
   */
  createSession(socketId: string, roomCode?: string): HelpSession {
    // Check if socket already has too many sessions
    const existingSessions = this.getSessionsBySocket(socketId);
    if (existingSessions.length >= this.MAX_SESSIONS_PER_SOCKET) {
      // End the oldest session
      const oldestSession = existingSessions.sort((a, b) => 
        a.startTime.getTime() - b.startTime.getTime()
      )[0];
      this.endSession(oldestSession.id);
      helpLogger.warn(`Ended oldest session ${oldestSession.id} for socket ${socketId} due to session limit`);
    }

    const sessionId = this.generateSessionId();
    const session: HelpSession = {
      id: sessionId,
      socketId,
      roomCode,
      startTime: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      isActive: true
    };

    this.sessions.set(sessionId, session);

    // Track session by socket
    if (!this.socketSessions.has(socketId)) {
      this.socketSessions.set(socketId, new Set());
    }
    this.socketSessions.get(socketId)!.add(sessionId);

    helpLogger.info(`Created help session ${sessionId} for socket ${socketId}`);
    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): HelpSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions for a socket
   */
  getSessionsBySocket(socketId: string): HelpSession[] {
    const sessionIds = this.socketSessions.get(socketId);
    if (!sessionIds) {
      return [];
    }

    return Array.from(sessionIds)
      .map(id => this.sessions.get(id))
      .filter((session): session is HelpSession => session !== undefined && session.isActive);
  }

  /**
   * Update session activity timestamp
   */
  updateActivity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      return false;
    }

    session.lastActivity = new Date();
    return true;
  }

  /**
   * Increment message count for a session
   */
  incrementMessageCount(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      return false;
    }

    session.messageCount++;
    session.lastActivity = new Date();
    return true;
  }

  /**
   * End a session
   */
  endSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.isActive = false;

    // Remove from socket tracking
    const socketSessions = this.socketSessions.get(session.socketId);
    if (socketSessions) {
      socketSessions.delete(sessionId);
      if (socketSessions.size === 0) {
        this.socketSessions.delete(session.socketId);
      }
    }

    // Remove from sessions map
    this.sessions.delete(sessionId);

    helpLogger.info(`Ended help session ${sessionId} for socket ${session.socketId}`);
    return true;
  }

  /**
   * Clean up inactive sessions
   */
  cleanupInactiveSessions(): HelpSession[] {
    const now = new Date();
    const inactiveSessions: HelpSession[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const timeSinceActivity = now.getTime() - session.lastActivity.getTime();
      
      if (timeSinceActivity > this.SESSION_TIMEOUT) {
        inactiveSessions.push({ ...session });
        this.endSession(sessionId);
      }
    }

    if (inactiveSessions.length > 0) {
      helpLogger.info(`Cleaned up ${inactiveSessions.length} inactive help sessions`);
    }

    return inactiveSessions;
  }

  /**
   * Get total number of active sessions
   */
  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    totalSockets: number;
    averageMessagesPerSession: number;
    oldestSessionAge: number;
  } {
    const activeSessions = Array.from(this.sessions.values());
    const now = new Date();

    const totalMessages = activeSessions.reduce((sum, session) => sum + session.messageCount, 0);
    const averageMessages = activeSessions.length > 0 ? totalMessages / activeSessions.length : 0;

    const oldestSession = activeSessions.reduce((oldest, session) => {
      return !oldest || session.startTime < oldest.startTime ? session : oldest;
    }, null as HelpSession | null);

    const oldestAge = oldestSession ? now.getTime() - oldestSession.startTime.getTime() : 0;

    return {
      totalSessions: this.sessions.size,
      activeSessions: activeSessions.length,
      totalSockets: this.socketSessions.size,
      averageMessagesPerSession: averageMessages,
      oldestSessionAge: oldestAge
    };
  }

  /**
   * Force cleanup all sessions for a socket (used on disconnect)
   */
  cleanupSocketSessions(socketId: string): HelpSession[] {
    const sessions = this.getSessionsBySocket(socketId);
    sessions.forEach(session => this.endSession(session.id));
    return sessions;
  }

  /**
   * Get sessions by room code (for future features)
   */
  getSessionsByRoom(roomCode: string): HelpSession[] {
    return Array.from(this.sessions.values())
      .filter(session => session.isActive && session.roomCode === roomCode);
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `help-${timestamp}-${random}`;
  }

  /**
   * Validate session ownership
   */
  validateSessionOwnership(sessionId: string, socketId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session !== undefined && session.socketId === socketId && session.isActive;
  }

  /**
   * Get session duration in milliseconds
   */
  getSessionDuration(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return 0;
    }

    return Date.now() - session.startTime.getTime();
  }

  /**
   * Get time since last activity in milliseconds
   */
  getTimeSinceLastActivity(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return 0;
    }

    return Date.now() - session.lastActivity.getTime();
  }

  /**
   * Check if session is close to timeout
   */
  isSessionNearTimeout(sessionId: string, warningThreshold: number = 2 * 60 * 1000): boolean {
    const timeSinceActivity = this.getTimeSinceLastActivity(sessionId);
    return timeSinceActivity > (this.SESSION_TIMEOUT - warningThreshold);
  }
}