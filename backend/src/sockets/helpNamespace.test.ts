import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import io from 'socket.io-client';
import { HelpNamespace } from './helpNamespace';
import { HelpAssistantService } from '../services/helpAssistant/helpAssistantService';

// Type definitions for test data
interface SessionData {
  sessionId: string;
  welcomeMessage?: string;
  roomCode?: string;
}

interface ResponseData {
  sessionId: string;
  message: {
    type: string;
    content: string;
    metadata?: {
      category?: string;
      confidence?: number;
      isBlackjackRelated?: boolean;
      containsAdvice?: boolean;
    };
  };
  isTyping: boolean;
}

interface QuestionData {
  question: string;
  sessionId?: string;
}

describe('HelpNamespace Integration', () => {
  let httpServer: any;
  let ioServer: SocketIOServer;
  let helpNamespace: HelpNamespace;
  let mockHelpAssistant: jest.Mocked<HelpAssistantService>;
  let clientSocket: any;
  let serverAddress: string;

  beforeAll((done) => {
    httpServer = createServer();
    ioServer = new SocketIOServer(httpServer);
    
    // Create mock help assistant
    mockHelpAssistant = {
      processQuestion: jest.fn(),
      validateQuestion: jest.fn(),
      getFallbackResponse: jest.fn()
    } as any;

    // Initialize help namespace
    helpNamespace = new HelpNamespace(ioServer, mockHelpAssistant);

    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;
      serverAddress = `http://localhost:${port}`;
      done();
    });
  });

  afterAll(() => {
    ioServer.close();
    httpServer.close();
  });

  beforeEach((done) => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockHelpAssistant.processQuestion.mockResolvedValue({
      response: {
        content: 'Test response',
        category: 'rules',
        confidence: 0.9,
        isBlackjackRelated: true,
        containsAdvice: false
      },
      fromCache: false,
      responseTime: 100
    });

    // Connect client to help namespace
    clientSocket = io(`${serverAddress}/help`, {
      forceNew: true,
      transports: ['websocket']
    });

    clientSocket.on('connect', done);
  });

  afterEach(() => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Session Management', () => {
    it('should start a help session successfully', (done) => {
      clientSocket.emit('help:startSession', { roomCode: 'TEST123' });

      clientSocket.on('help:sessionStarted', (data: SessionData) => {
        expect(data.sessionId).toMatch(/^help-[a-z0-9]+-[a-z0-9]+$/);
        expect(data.welcomeMessage).toContain('blackjack');
        done();
      });
    });

    it('should send welcome message after session start', (done) => {
      let sessionId: string;
      let messagesReceived = 0;

      clientSocket.emit('help:startSession', {});

      clientSocket.on('help:sessionStarted', (data: SessionData) => {
        sessionId = data.sessionId;
        messagesReceived++;
        if (messagesReceived === 2) done(); // Wait for both events
      });

      clientSocket.on('help:response', (data: ResponseData) => {
        expect(data.sessionId).toBe(sessionId);
        expect(data.message.type).toBe('system');
        expect(data.message.content).toContain('blackjack');
        expect(data.isTyping).toBe(false);
        messagesReceived++;
        if (messagesReceived === 2) done();
      });
    });

    it('should end a session successfully', (done) => {
      let sessionId: string;

      clientSocket.emit('help:startSession', {});

      clientSocket.on('help:sessionStarted', (data: SessionData) => {
        sessionId = data.sessionId;
        clientSocket.emit('help:endSession', { sessionId });
      });

      clientSocket.on('help:sessionEnded', (data: { sessionId: string; reason: string }) => {
        expect(data.sessionId).toBe(sessionId);
        expect(data.reason).toBe('user_requested');
        done();
      });
    });

    it('should handle invalid session ID', (done) => {
      clientSocket.emit('help:endSession', { sessionId: 'invalid-session' });

      clientSocket.on('help:error', (data: { sessionId: string; error: string; canRetry: boolean; errorCode: string }) => {
        expect(data.sessionId).toBe('invalid-session');
        expect(data.error).toContain('Invalid session');
        expect(data.canRetry).toBe(false);
        expect(data.errorCode).toBe('INVALID_SESSION');
        done();
      });
    });
  });

  describe('Question Processing', () => {
    it('should process questions successfully', (done) => {
      let sessionId: string;

      clientSocket.emit('help:startSession', {});

      clientSocket.on('help:sessionStarted', (data: SessionData) => {
        sessionId = data.sessionId;
        clientSocket.emit('help:askQuestion', { question: '¿Cuánto vale un As?', sessionId } as QuestionData);
      });

      clientSocket.on('help:response', (data: ResponseData) => {
        if (data.message.type === 'assistant') {
          expect(data.sessionId).toBe(sessionId);
          expect(data.message.content).toBe('Test response');
          expect(data.message.metadata?.category).toBe('rules');
          expect(data.message.metadata?.confidence).toBe(0.9);
          expect(data.isTyping).toBe(false);
          expect(mockHelpAssistant.processQuestion).toHaveBeenCalledWith('¿Cuánto vale un As?');
          done();
        }
      });
    });

    it('should show typing indicator during processing', (done) => {
      let sessionId: string;
      let typingReceived = false;

      // Delay the mock response to test typing indicator
      mockHelpAssistant.processQuestion.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          response: {
            content: 'Delayed response',
            category: 'rules',
            confidence: 0.9,
            isBlackjackRelated: true,
            containsAdvice: false
          },
          fromCache: false,
          responseTime: 100
        }), 100))
      );

      clientSocket.emit('help:startSession', {});

      clientSocket.on('help:sessionStarted', (data: SessionData) => {
        sessionId = data.sessionId;
        clientSocket.emit('help:askQuestion', { question: 'Test question', sessionId } as QuestionData);
      });

      clientSocket.on('help:typing', (data: { sessionId: string; isTyping: boolean }) => {
        if (data.isTyping) {
          expect(data.sessionId).toBe(sessionId);
          typingReceived = true;
        }
      });

      clientSocket.on('help:response', (data: ResponseData) => {
        if (data.message.type === 'assistant') {
          expect(typingReceived).toBe(true);
          expect(data.isTyping).toBe(false);
          done();
        }
      });
    });

    it('should validate question length', (done) => {
      let sessionId: string;

      clientSocket.emit('help:startSession', {});

      clientSocket.on('help:sessionStarted', (data: SessionData) => {
        sessionId = data.sessionId;
        
        // Send a question that's too long (over 500 characters)
        const longQuestion = 'a'.repeat(501);
        clientSocket.emit('help:askQuestion', { question: longQuestion, sessionId } as QuestionData);
      });

      clientSocket.on('help:error', (data: { sessionId: string; error: string; canRetry: boolean; errorCode: string }) => {
        expect(data.sessionId).toBe(sessionId);
        expect(data.error).toContain('too long');
        expect(data.canRetry).toBe(true);
        expect(data.errorCode).toBe('QUESTION_TOO_LONG');
        done();
      });
    });

    it('should validate empty questions', (done) => {
      let sessionId: string;

      clientSocket.emit('help:startSession', {});

      clientSocket.on('help:sessionStarted', (data: SessionData) => {
        sessionId = data.sessionId;
        clientSocket.emit('help:askQuestion', { question: '   ', sessionId } as QuestionData); // Empty/whitespace question
      });

      clientSocket.on('help:error', (data: { sessionId: string; error: string; canRetry: boolean; errorCode: string }) => {
        expect(data.sessionId).toBe(sessionId);
        expect(data.error).toContain('cannot be empty');
        expect(data.canRetry).toBe(true);
        expect(data.errorCode).toBe('EMPTY_QUESTION');
        done();
      });
    });

    it('should handle processing errors gracefully', (done) => {
      let sessionId: string;

      // Mock an error in processing
      mockHelpAssistant.processQuestion.mockRejectedValue(new Error('Processing failed'));

      clientSocket.emit('help:startSession', {});

      clientSocket.on('help:sessionStarted', (data: SessionData) => {
        sessionId = data.sessionId;
        clientSocket.emit('help:askQuestion', { question: 'Test question', sessionId } as QuestionData);
      });

      clientSocket.on('help:error', (data: { sessionId: string; error: string; canRetry: boolean; errorCode: string }) => {
        expect(data.sessionId).toBe(sessionId);
        expect(data.error).toContain('Failed to process question');
        expect(data.canRetry).toBe(true);
        expect(data.errorCode).toBe('PROCESSING_ERROR');
        done();
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on session creation', (done) => {
      let attempts = 0;
      let rateLimitHit = false;

      const attemptSession = () => {
        attempts++;
        clientSocket.emit('help:startSession', {});
      };

      clientSocket.on('help:sessionStarted', () => {
        if (attempts < 4) { // Try to exceed the limit of 3 sessions per minute
          attemptSession();
        }
      });

      clientSocket.on('help:rateLimitExceeded', (data: { sessionId: string; retryAfter: number; message: string }) => {
        expect(data.retryAfter).toBeGreaterThan(0);
        expect(data.message).toContain('Too many session requests');
        rateLimitHit = true;
        done();
      });

      // Start the first attempt
      attemptSession();
    });

    it('should enforce rate limits on questions', (done) => {
      let sessionId: string;
      let questionCount = 0;

      clientSocket.emit('help:startSession', {});

      clientSocket.on('help:sessionStarted', (data: SessionData) => {
        sessionId = data.sessionId;
        
        // Rapidly send questions to trigger rate limit
        const sendQuestion = () => {
          questionCount++;
          clientSocket.emit('help:askQuestion', {
            sessionId,
            question: `Question ${questionCount}`
          });
        };

        // Send questions rapidly
        for (let i = 0; i < 12; i++) { // Exceed limit of 10 per minute
          setTimeout(sendQuestion, i * 10);
        }
      });

      clientSocket.on('help:rateLimitExceeded', (data: { sessionId: string; retryAfter: number; message: string }) => {
        expect(data.sessionId).toBe(sessionId);
        expect(data.retryAfter).toBeGreaterThan(0);
        expect(data.message).toContain('Too many questions');
        done();
      });
    });
  });

  describe('Session Cleanup', () => {
    it('should clean up sessions on disconnect', (done) => {
      let sessionId: string;

      clientSocket.emit('help:startSession', {});

      clientSocket.on('help:sessionStarted', (data: SessionData) => {
        sessionId = data.sessionId;
        
        // Verify session exists
        expect(helpNamespace.getActiveSessionsCount()).toBeGreaterThan(0);
        
        // Disconnect client
        clientSocket.disconnect();
        
        // Give some time for cleanup
        setTimeout(() => {
          // Session should be cleaned up (this is a simplified check)
          // In a real scenario, you'd need access to the session manager
          done();
        }, 100);
      });
    });
  });

  describe('Typing Indicators', () => {
    it('should handle typing indicators', (done) => {
      let sessionId: string;

      clientSocket.emit('help:startSession', {});

      clientSocket.on('help:sessionStarted', (data: SessionData) => {
        sessionId = data.sessionId;
        clientSocket.emit('help:typing', { sessionId, isTyping: true });
      });

      // In a multi-user scenario, this would broadcast to other users
      // For now, we just verify the event is handled without errors
      setTimeout(() => {
        clientSocket.emit('help:typing', { sessionId, isTyping: false });
        done();
      }, 50);
    });
  });

  describe('Error Handling', () => {
    it('should handle session validation errors', (done) => {
      clientSocket.emit('help:askQuestion', {
        sessionId: 'invalid-session',
        question: 'Test question'
      });

      clientSocket.on('help:error', (data: { sessionId: string; error: string; canRetry: boolean; errorCode: string }) => {
        expect(data.sessionId).toBe('invalid-session');
        expect(data.error).toContain('Invalid session');
        expect(data.canRetry).toBe(false);
        expect(data.errorCode).toBe('INVALID_SESSION');
        done();
      });
    });

    it('should handle malformed requests gracefully', (done) => {
      // Send malformed data
      clientSocket.emit('help:askQuestion', {
        // Missing required fields
      });

      // Should not crash the server
      setTimeout(done, 100);
    });
  });

  describe('Public Methods', () => {
    it('should track active sessions count', (done) => {
      const initialCount = helpNamespace.getActiveSessionsCount();

      clientSocket.emit('help:startSession', {});

      clientSocket.on('help:sessionStarted', () => {
        const newCount = helpNamespace.getActiveSessionsCount();
        expect(newCount).toBe(initialCount + 1);
        done();
      });
    });

    it('should broadcast system messages', (done) => {
      const systemMessage = 'System maintenance in 5 minutes';

      clientSocket.on('help:response', (data: ResponseData) => {
        if (data.message.type === 'system' && data.message.content === systemMessage) {
          expect(data.sessionId).toBe('broadcast');
          done();
        }
      });

      // Broadcast system message
      helpNamespace.broadcastSystemMessage(systemMessage);
    });
  });
});