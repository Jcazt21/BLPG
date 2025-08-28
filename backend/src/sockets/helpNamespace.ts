import { Server as SocketIOServer, Socket, Namespace } from 'socket.io';
import { HelpAssistantService } from '../services/helpAssistant/helpAssistantService';
import { HelpSession, HelpSessionManager } from './helpSessionManager';
import { HelpRateLimiter } from './helpRateLimiter';
import { helpLogger } from '../utils/helpLogger';

export interface HelpNamespaceEvents {
  // Client to Server events
  'help:startSession': (data: { roomCode?: string }) => void;
  'help:askQuestion': (data: { question: string; sessionId: string }) => void;
  'help:endSession': (data: { sessionId: string }) => void;
  'help:userTyping': (data: { sessionId: string; isTyping: boolean }) => void;
  
  // Server to Client events
  'help:sessionStarted': (data: { sessionId: string; welcomeMessage: string }) => void;
  'help:response': (data: { sessionId: string; message: ChatMessage; isTyping: false }) => void;
  'help:typing': (data: { sessionId: string; isTyping: boolean }) => void;
  'help:error': (data: { sessionId: string; error: string; canRetry: boolean; errorCode?: string }) => void;
  'help:sessionEnded': (data: { sessionId: string; reason?: string }) => void;
  'help:rateLimitExceeded': (data: { sessionId: string; retryAfter: number; message: string }) => void;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    category?: string;
    confidence?: number;
    responseTime?: number;
  };
}

export class HelpNamespace {
  private namespace: Namespace;
  private helpAssistant: HelpAssistantService;
  private sessionManager: HelpSessionManager;
  private rateLimiter: HelpRateLimiter;

  constructor(
    io: SocketIOServer,
    helpAssistant: HelpAssistantService
  ) {
    this.namespace = io.of('/help');
    this.helpAssistant = helpAssistant;
    this.sessionManager = new HelpSessionManager();
    this.rateLimiter = new HelpRateLimiter();

    this.setupEventHandlers();
    this.setupCleanupInterval();

    helpLogger.info('Help namespace initialized');
  }

  private setupEventHandlers(): void {
    this.namespace.on('connection', (socket: Socket) => {
      helpLogger.info(`Help client connected: ${socket.id}`);

      // Handle session start
      socket.on('help:startSession', async (data: { roomCode?: string }) => {
        try {
          // Check rate limit
          const rateLimitResult = await this.rateLimiter.checkLimit(socket.id, 'startSession');
          if (!rateLimitResult.allowed) {
            socket.emit('help:rateLimitExceeded', {
              sessionId: '',
              retryAfter: rateLimitResult.retryAfter,
              message: 'Too many session requests. Please wait before starting a new session.'
            });
            return;
          }

          // Create new session
          const session = this.sessionManager.createSession(socket.id, data.roomCode);
          
          // Join socket to session room for potential future features
          socket.join(`help-session-${session.id}`);

          // Send welcome message
          const welcomeMessage = this.getWelcomeMessage();
          
          socket.emit('help:sessionStarted', {
            sessionId: session.id,
            welcomeMessage
          });

          // Send welcome message as system message
          const systemMessage: ChatMessage = {
            id: `msg-${Date.now()}-welcome`,
            type: 'system',
            content: welcomeMessage,
            timestamp: new Date()
          };

          socket.emit('help:response', {
            sessionId: session.id,
            message: systemMessage,
            isTyping: false
          });

          helpLogger.info(`Help session started: ${session.id} for socket ${socket.id}`);

        } catch (error) {
          helpLogger.error('Error starting help session:', { error: error as Error });
          socket.emit('help:error', {
            sessionId: '',
            error: 'Failed to start help session',
            canRetry: true,
            errorCode: 'SESSION_START_ERROR'
          });
        }
      });

      // Handle question asking
      socket.on('help:askQuestion', async (data: { question: string; sessionId: string }) => {
        try {
          // Validate session
          const session = this.sessionManager.getSession(data.sessionId);
          if (!session || session.socketId !== socket.id) {
            socket.emit('help:error', {
              sessionId: data.sessionId,
              error: 'Invalid session',
              canRetry: false,
              errorCode: 'INVALID_SESSION'
            });
            return;
          }

          // Check rate limit for questions
          const rateLimitResult = await this.rateLimiter.checkLimit(socket.id, 'askQuestion');
          if (!rateLimitResult.allowed) {
            socket.emit('help:rateLimitExceeded', {
              sessionId: data.sessionId,
              retryAfter: rateLimitResult.retryAfter,
              message: 'Too many questions. Please wait before asking another question.'
            });
            return;
          }

          // Validate question
          if (!data.question || data.question.trim().length === 0) {
            socket.emit('help:error', {
              sessionId: data.sessionId,
              error: 'Question cannot be empty',
              canRetry: true,
              errorCode: 'EMPTY_QUESTION'
            });
            return;
          }

          if (data.question.length > 500) {
            socket.emit('help:error', {
              sessionId: data.sessionId,
              error: 'Question is too long (maximum 500 characters)',
              canRetry: true,
              errorCode: 'QUESTION_TOO_LONG'
            });
            return;
          }

          // Update session activity
          this.sessionManager.updateActivity(data.sessionId);

          // Show typing indicator
          socket.emit('help:typing', {
            sessionId: data.sessionId,
            isTyping: true
          });

          // Process question with help assistant
          const startTime = Date.now();
          const response = await this.helpAssistant.processQuestion(data.question);
          const responseTime = Date.now() - startTime;

          // Create response message
          const responseMessage: ChatMessage = {
            id: `msg-${Date.now()}-response`,
            type: 'assistant',
            content: response.response.content,
            timestamp: new Date(),
            metadata: {
              category: response.response.category,
              confidence: response.response.confidence,
              responseTime
            }
          };

          // Send response
          socket.emit('help:response', {
            sessionId: data.sessionId,
            message: responseMessage,
            isTyping: false
          });

          // Update session statistics
          this.sessionManager.incrementMessageCount(data.sessionId);

          helpLogger.info(`Question processed for session ${data.sessionId}: ${responseTime}ms`);

        } catch (error) {
          helpLogger.error('Error processing question:', { error: error as Error });
          
          // Stop typing indicator
          socket.emit('help:typing', {
            sessionId: data.sessionId,
            isTyping: false
          });

          // Send error response
          socket.emit('help:error', {
            sessionId: data.sessionId,
            error: 'Failed to process question. Please try again.',
            canRetry: true,
            errorCode: 'PROCESSING_ERROR'
          });
        }
      });

      // Handle typing indicators
      socket.on('help:userTyping', (data: { sessionId: string; isTyping: boolean }) => {
        try {
          const session = this.sessionManager.getSession(data.sessionId);
          if (!session || session.socketId !== socket.id) {
            return;
          }

          // Broadcast typing indicator to session room (for future multi-user features)
          socket.to(`help-session-${data.sessionId}`).emit('help:typing', {
            sessionId: data.sessionId,
            isTyping: data.isTyping
          });

        } catch (error) {
          helpLogger.error('Error handling typing indicator:', { error: error as Error });
        }
      });

      // Handle session end
      socket.on('help:endSession', (data: { sessionId: string }) => {
        try {
          const session = this.sessionManager.getSession(data.sessionId);
          if (!session || session.socketId !== socket.id) {
            socket.emit('help:error', {
              sessionId: data.sessionId,
              error: 'Invalid session',
              canRetry: false,
              errorCode: 'INVALID_SESSION'
            });
            return;
          }

          // End session
          this.sessionManager.endSession(data.sessionId);
          
          // Leave session room
          socket.leave(`help-session-${data.sessionId}`);

          // Confirm session ended
          socket.emit('help:sessionEnded', {
            sessionId: data.sessionId,
            reason: 'user_requested'
          });

          helpLogger.info(`Help session ended: ${data.sessionId}`);

        } catch (error) {
          helpLogger.error('Error ending help session:', { error: error as Error });
          socket.emit('help:error', {
            sessionId: data.sessionId,
            error: 'Failed to end session',
            canRetry: true,
            errorCode: 'SESSION_END_ERROR'
          });
        }
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        try {
          // Clean up all sessions for this socket
          const sessions = this.sessionManager.getSessionsBySocket(socket.id);
          sessions.forEach(session => {
            this.sessionManager.endSession(session.id);
            socket.leave(`help-session-${session.id}`);
          });

          helpLogger.info(`Help client disconnected: ${socket.id}, reason: ${reason}`);

        } catch (error) {
          helpLogger.error('Error handling help client disconnect:', { error: error as Error });
        }
      });
    });
  }

  private setupCleanupInterval(): void {
    // Clean up inactive sessions every 5 minutes
    setInterval(() => {
      try {
        const cleanedSessions = this.sessionManager.cleanupInactiveSessions();
        if (cleanedSessions.length > 0) {
          helpLogger.info(`Cleaned up ${cleanedSessions.length} inactive help sessions`);
          
          // Notify clients about session cleanup
          cleanedSessions.forEach(session => {
            this.namespace.to(session.socketId).emit('help:sessionEnded', {
              sessionId: session.id,
              reason: 'timeout'
            });
          });
        }
      } catch (error) {
        helpLogger.error('Error during help session cleanup:', { error: error as Error });
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Clean up rate limiter every hour
    setInterval(() => {
      try {
        this.rateLimiter.cleanup();
      } catch (error) {
        helpLogger.error('Error during rate limiter cleanup:', { error: error as Error });
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  private getWelcomeMessage(): string {
    return "¡Hola! Soy tu asistente de blackjack. Puedo ayudarte con las reglas del juego, estrategias básicas y mecánicas. ¿En qué puedo ayudarte?";
  }

  // Public methods for external access
  public getActiveSessionsCount(): number {
    return this.sessionManager.getActiveSessionsCount();
  }

  public getSessionsBySocket(socketId: string): HelpSession[] {
    return this.sessionManager.getSessionsBySocket(socketId);
  }

  public endAllSessionsForSocket(socketId: string): void {
    const sessions = this.sessionManager.getSessionsBySocket(socketId);
    sessions.forEach(session => {
      this.sessionManager.endSession(session.id);
      this.namespace.to(session.socketId).emit('help:sessionEnded', {
        sessionId: session.id,
        reason: 'forced_cleanup'
      });
    });
  }

  public broadcastSystemMessage(message: string): void {
    const systemMessage: ChatMessage = {
      id: `msg-${Date.now()}-system`,
      type: 'system',
      content: message,
      timestamp: new Date()
    };

    this.namespace.emit('help:response', {
      sessionId: 'broadcast',
      message: systemMessage,
      isTyping: false
    });
  }
}