import { HelpSessionManager, HelpSession } from './helpSessionManager';

describe('HelpSessionManager', () => {
  let sessionManager: HelpSessionManager;

  beforeEach(() => {
    sessionManager = new HelpSessionManager();
  });

  describe('createSession', () => {
    it('should create a new session with correct properties', () => {
      const socketId = 'socket-123';
      const roomCode = 'ROOM1';

      const session = sessionManager.createSession(socketId, roomCode);

      expect(session.id).toMatch(/^help-[a-z0-9]+-[a-z0-9]+$/);
      expect(session.socketId).toBe(socketId);
      expect(session.roomCode).toBe(roomCode);
      expect(session.messageCount).toBe(0);
      expect(session.isActive).toBe(true);
      expect(session.startTime).toBeInstanceOf(Date);
      expect(session.lastActivity).toBeInstanceOf(Date);
    });

    it('should create session without room code', () => {
      const socketId = 'socket-123';

      const session = sessionManager.createSession(socketId);

      expect(session.socketId).toBe(socketId);
      expect(session.roomCode).toBeUndefined();
    });

    it('should limit sessions per socket', () => {
      const socketId = 'socket-123';

      // Create maximum allowed sessions
      const sessions: HelpSession[] = [];
      for (let i = 0; i < 4; i++) { // One more than the limit
        sessions.push(sessionManager.createSession(socketId));
      }

      // Should only have 3 active sessions (the limit)
      const activeSessions = sessionManager.getSessionsBySocket(socketId);
      expect(activeSessions).toHaveLength(3);

      // The first session should have been ended
      expect(sessionManager.getSession(sessions[0].id)).toBeUndefined();
    });
  });

  describe('getSession', () => {
    it('should return session by ID', () => {
      const socketId = 'socket-123';
      const session = sessionManager.createSession(socketId);

      const retrieved = sessionManager.getSession(session.id);

      expect(retrieved).toEqual(session);
    });

    it('should return undefined for non-existent session', () => {
      const retrieved = sessionManager.getSession('non-existent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getSessionsBySocket', () => {
    it('should return all sessions for a socket', () => {
      const socketId = 'socket-123';
      const session1 = sessionManager.createSession(socketId);
      const session2 = sessionManager.createSession(socketId);

      const sessions = sessionManager.getSessionsBySocket(socketId);

      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.id)).toContain(session1.id);
      expect(sessions.map(s => s.id)).toContain(session2.id);
    });

    it('should return empty array for socket with no sessions', () => {
      const sessions = sessionManager.getSessionsBySocket('non-existent');

      expect(sessions).toEqual([]);
    });

    it('should not return inactive sessions', () => {
      const socketId = 'socket-123';
      const session = sessionManager.createSession(socketId);

      // End the session
      sessionManager.endSession(session.id);

      const sessions = sessionManager.getSessionsBySocket(socketId);
      expect(sessions).toEqual([]);
    });
  });

  describe('updateActivity', () => {
    it('should update last activity timestamp', () => {
      const socketId = 'socket-123';
      const session = sessionManager.createSession(socketId);
      const originalActivity = session.lastActivity;

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        const updated = sessionManager.updateActivity(session.id);

        expect(updated).toBe(true);
        expect(session.lastActivity.getTime()).toBeGreaterThan(originalActivity.getTime());
      }, 10);
    });

    it('should return false for non-existent session', () => {
      const updated = sessionManager.updateActivity('non-existent');

      expect(updated).toBe(false);
    });

    it('should return false for inactive session', () => {
      const socketId = 'socket-123';
      const session = sessionManager.createSession(socketId);
      sessionManager.endSession(session.id);

      const updated = sessionManager.updateActivity(session.id);

      expect(updated).toBe(false);
    });
  });

  describe('incrementMessageCount', () => {
    it('should increment message count and update activity', () => {
      const socketId = 'socket-123';
      const session = sessionManager.createSession(socketId);
      const originalActivity = session.lastActivity;

      setTimeout(() => {
        const incremented = sessionManager.incrementMessageCount(session.id);

        expect(incremented).toBe(true);
        expect(session.messageCount).toBe(1);
        expect(session.lastActivity.getTime()).toBeGreaterThan(originalActivity.getTime());
      }, 10);
    });

    it('should return false for non-existent session', () => {
      const incremented = sessionManager.incrementMessageCount('non-existent');

      expect(incremented).toBe(false);
    });
  });

  describe('endSession', () => {
    it('should end an active session', () => {
      const socketId = 'socket-123';
      const session = sessionManager.createSession(socketId);

      const ended = sessionManager.endSession(session.id);

      expect(ended).toBe(true);
      expect(sessionManager.getSession(session.id)).toBeUndefined();
      expect(sessionManager.getSessionsBySocket(socketId)).toEqual([]);
    });

    it('should return false for non-existent session', () => {
      const ended = sessionManager.endSession('non-existent');

      expect(ended).toBe(false);
    });
  });

  describe('cleanupInactiveSessions', () => {
    it('should clean up sessions that have timed out', () => {
      const socketId = 'socket-123';
      const session = sessionManager.createSession(socketId);

      // Manually set last activity to old timestamp (11 minutes ago)
      session.lastActivity = new Date(Date.now() - 11 * 60 * 1000);

      const cleaned = sessionManager.cleanupInactiveSessions();

      expect(cleaned).toHaveLength(1);
      expect(cleaned[0].id).toBe(session.id);
      expect(sessionManager.getSession(session.id)).toBeUndefined();
    });

    it('should not clean up active sessions', () => {
      const socketId = 'socket-123';
      const session = sessionManager.createSession(socketId);

      const cleaned = sessionManager.cleanupInactiveSessions();

      expect(cleaned).toEqual([]);
      expect(sessionManager.getSession(session.id)).toBeDefined();
    });
  });

  describe('getActiveSessionsCount', () => {
    it('should return correct count of active sessions', () => {
      expect(sessionManager.getActiveSessionsCount()).toBe(0);

      const session1 = sessionManager.createSession('socket-1');
      const session2 = sessionManager.createSession('socket-2');

      expect(sessionManager.getActiveSessionsCount()).toBe(2);

      sessionManager.endSession(session1.id);

      expect(sessionManager.getActiveSessionsCount()).toBe(1);
    });
  });

  describe('getSessionStats', () => {
    it('should return correct session statistics', () => {
      const session1 = sessionManager.createSession('socket-1');
      const session2 = sessionManager.createSession('socket-2');

      // Add some messages
      sessionManager.incrementMessageCount(session1.id);
      sessionManager.incrementMessageCount(session1.id);
      sessionManager.incrementMessageCount(session2.id);

      const stats = sessionManager.getSessionStats();

      expect(stats.totalSessions).toBe(2);
      expect(stats.activeSessions).toBe(2);
      expect(stats.totalSockets).toBe(2);
      expect(stats.averageMessagesPerSession).toBe(1.5);
      expect(stats.oldestSessionAge).toBeGreaterThan(0);
    });
  });

  describe('validateSessionOwnership', () => {
    it('should validate correct ownership', () => {
      const socketId = 'socket-123';
      const session = sessionManager.createSession(socketId);

      const isValid = sessionManager.validateSessionOwnership(session.id, socketId);

      expect(isValid).toBe(true);
    });

    it('should reject wrong socket ID', () => {
      const session = sessionManager.createSession('socket-123');

      const isValid = sessionManager.validateSessionOwnership(session.id, 'wrong-socket');

      expect(isValid).toBe(false);
    });

    it('should reject non-existent session', () => {
      const isValid = sessionManager.validateSessionOwnership('non-existent', 'socket-123');

      expect(isValid).toBe(false);
    });

    it('should reject inactive session', () => {
      const socketId = 'socket-123';
      const session = sessionManager.createSession(socketId);
      sessionManager.endSession(session.id);

      const isValid = sessionManager.validateSessionOwnership(session.id, socketId);

      expect(isValid).toBe(false);
    });
  });

  describe('getSessionsByRoom', () => {
    it('should return sessions for specific room', () => {
      const room1Sessions = [
        sessionManager.createSession('socket-1', 'ROOM1'),
        sessionManager.createSession('socket-2', 'ROOM1')
      ];
      const room2Session = sessionManager.createSession('socket-3', 'ROOM2');
      const noRoomSession = sessionManager.createSession('socket-4');

      const room1Results = sessionManager.getSessionsByRoom('ROOM1');

      expect(room1Results).toHaveLength(2);
      expect(room1Results.map(s => s.id)).toContain(room1Sessions[0].id);
      expect(room1Results.map(s => s.id)).toContain(room1Sessions[1].id);
      expect(room1Results.map(s => s.id)).not.toContain(room2Session.id);
      expect(room1Results.map(s => s.id)).not.toContain(noRoomSession.id);
    });
  });

  describe('getSessionDuration', () => {
    it('should return correct session duration', () => {
      const session = sessionManager.createSession('socket-123');

      setTimeout(() => {
        const duration = sessionManager.getSessionDuration(session.id);
        expect(duration).toBeGreaterThan(0);
        expect(duration).toBeLessThan(1000); // Should be less than 1 second for this test
      }, 10);
    });

    it('should return 0 for non-existent session', () => {
      const duration = sessionManager.getSessionDuration('non-existent');
      expect(duration).toBe(0);
    });
  });

  describe('isSessionNearTimeout', () => {
    it('should detect sessions near timeout', () => {
      const session = sessionManager.createSession('socket-123');

      // Set last activity to 9 minutes ago (near 10 minute timeout)
      session.lastActivity = new Date(Date.now() - 9 * 60 * 1000);

      const isNear = sessionManager.isSessionNearTimeout(session.id);
      expect(isNear).toBe(true);
    });

    it('should not flag recent sessions as near timeout', () => {
      const session = sessionManager.createSession('socket-123');

      const isNear = sessionManager.isSessionNearTimeout(session.id);
      expect(isNear).toBe(false);
    });
  });
});