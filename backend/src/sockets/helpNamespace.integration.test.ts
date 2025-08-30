// Load environment variables for tests
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Set required environment variables for tests if not present
if (!process.env.HOST) {
  process.env.HOST = 'localhost';
}

import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { HelpNamespace } from './helpNamespace';

// Simple integration test to verify the help namespace can be created
describe('HelpNamespace Basic Integration', () => {
  let httpServer: any;
  let io: SocketIOServer;
  let helpNamespace: HelpNamespace;

  beforeAll(() => {
    httpServer = createServer();
    io = new SocketIOServer(httpServer);
  });

  afterAll(() => {
    io.close();
    httpServer.close();
  });

  it('should create help namespace without errors', () => {
    // Mock help assistant service
    const mockHelpAssistant = {
      processQuestion: jest.fn().mockResolvedValue({
        response: {
          content: 'Test response',
          category: 'rules',
          confidence: 0.9,
          isBlackjackRelated: true,
          containsAdvice: false
        },
        fromCache: false,
        responseTime: 100
      }),
      validateQuestion: jest.fn(),
      getFallbackResponse: jest.fn()
    } as any;

    // Should not throw an error
    expect(() => {
      helpNamespace = new HelpNamespace(io, mockHelpAssistant);
    }).not.toThrow();

    // Should have created the namespace
    expect(helpNamespace).toBeDefined();
    expect(helpNamespace.getActiveSessionsCount()).toBe(0);
  });

  it('should have public methods available', () => {
    expect(typeof helpNamespace.getActiveSessionsCount).toBe('function');
    expect(typeof helpNamespace.broadcastSystemMessage).toBe('function');
  });
});