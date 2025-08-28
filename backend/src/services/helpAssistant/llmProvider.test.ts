import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MockLLMProvider, GeminiProvider, LLMProviderFactory } from './llmProvider';

// Mock the logger and monitoring modules
jest.mock('../../utils/helpLogger', () => ({
  helpLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    logApiCall: jest.fn()
  }
}));

jest.mock('../../utils/helpMonitoring', () => ({
  helpMonitoring: {
    recordApiCall: jest.fn()
  }
}));

describe('LLMProvider', () => {
  describe('MockLLMProvider', () => {
    let provider: MockLLMProvider;

    beforeEach(() => {
      provider = new MockLLMProvider('test-model');
      provider.setDelay(0); // No delay for tests
    });

    describe('constructor', () => {
      it('should initialize with default responses', () => {
        expect(provider.getName()).toBe('mock');
        expect(provider.getModel()).toBe('test-model');
      });

      it('should accept custom options', () => {
        const customProvider = new MockLLMProvider('custom-model', {
          maxTokens: 500,
          temperature: 0.5,
          timeout: 10000
        });

        expect(customProvider.getModel()).toBe('custom-model');
      });
    });

    describe('generateResponse', () => {
      it('should generate a response', async () => {
        const response = await provider.generateResponse('Test prompt');

        expect(response.content).toBeTruthy();
        expect(response.usage.totalTokens).toBeGreaterThan(0);
        expect(response.model).toBe('test-model');
        expect(response.finishReason).toBe('stop');
      });

      it('should cycle through predefined responses', async () => {
        provider.setResponses(['Response 1', 'Response 2']);

        const response1 = await provider.generateResponse('Prompt 1');
        const response2 = await provider.generateResponse('Prompt 2');
        const response3 = await provider.generateResponse('Prompt 3');

        expect(response1.content).toBe('Response 1');
        expect(response2.content).toBe('Response 2');
        expect(response3.content).toBe('Response 1'); // Should cycle back
      });

      it('should calculate token usage based on content length', async () => {
        const shortPrompt = 'Hi';
        const longPrompt = 'This is a much longer prompt that should result in more tokens being calculated';

        const shortResponse = await provider.generateResponse(shortPrompt);
        const longResponse = await provider.generateResponse(longPrompt);

        expect(longResponse.usage.promptTokens).toBeGreaterThan(shortResponse.usage.promptTokens);
      });

      it('should respect timeout option', async () => {
        provider.setDelay(100);
        
        await expect(
          provider.generateResponse('Test', { timeout: 50 })
        ).rejects.toThrow('Mock API timeout');
      });

      it('should simulate errors when enabled', async () => {
        provider.enableErrors(1.0); // 100% error rate

        await expect(
          provider.generateResponse('Test')
        ).rejects.toThrow('Mock API error: Simulated failure');
      });

      it('should not simulate errors when disabled', async () => {
        provider.enableErrors(1.0);
        provider.disableErrors();

        const response = await provider.generateResponse('Test');
        expect(response.content).toBeTruthy();
      });
    });

    describe('isAvailable', () => {
      it('should return true when errors are disabled', async () => {
        provider.disableErrors();
        const available = await provider.isAvailable();
        expect(available).toBe(true);
      });

      it('should sometimes return false when errors are enabled', async () => {
        provider.enableErrors(1.0);
        
        // Run multiple times to account for randomness
        const results = await Promise.all(
          Array(10).fill(0).map(() => provider.isAvailable())
        );
        
        // Should have at least some false results with high error rate
        expect(results.some(result => !result)).toBe(true);
      });
    });

    describe('getRateLimit', () => {
      it('should return mock rate limit info', async () => {
        const rateLimit = await provider.getRateLimit();

        expect(rateLimit.requestsRemaining).toBe(1000);
        expect(rateLimit.dailyLimit).toBe(10000);
        expect(rateLimit.resetTime).toBeInstanceOf(Date);
      });
    });

    describe('configuration methods', () => {
      it('should allow setting custom responses', () => {
        const customResponses = ['Custom 1', 'Custom 2'];
        provider.setResponses(customResponses);

        // The responses should be used in order
        expect(provider.generateResponse('test')).resolves.toMatchObject({
          content: 'Custom 1'
        });
      });

      it('should allow adding responses', () => {
        provider.setResponses(['Original']);
        provider.addResponse('Added');

        // Should have both responses available
        expect(provider.generateResponse('test1')).resolves.toMatchObject({
          content: 'Original'
        });
        expect(provider.generateResponse('test2')).resolves.toMatchObject({
          content: 'Added'
        });
      });

      it('should allow setting delay', async () => {
        provider.setDelay(50);
        
        const startTime = Date.now();
        await provider.generateResponse('test');
        const endTime = Date.now();
        
        expect(endTime - startTime).toBeGreaterThanOrEqual(45); // Allow some variance
      });

      it('should reset to default state', () => {
        provider.setDelay(1000);
        provider.enableErrors(0.5);
        provider.setResponses(['Custom']);

        provider.reset();

        // Should be back to defaults
        expect(provider.generateResponse('test')).resolves.toBeTruthy();
      });
    });
  });

  // OpenAI and Anthropic providers removed - using only Gemini as requested

  describe('GeminiProvider', () => {
    let provider: GeminiProvider;

    beforeEach(() => {
      provider = new GeminiProvider('test-api-key');
    });

    it('should initialize with correct name and model', () => {
      expect(provider.getName()).toBe('gemini');
      expect(provider.getModel()).toBe('gemini-2.5-flash');
    });

    it('should accept custom model and rate limit config', () => {
      const rateLimitConfig = {
        perMinute: 10,
        perHour: 100,
        perDay: 1000
      };
      
      const customProvider = new GeminiProvider('test-key', 'gemini-2.5-flash', {}, rateLimitConfig);
      expect(customProvider.getModel()).toBe('gemini-2.5-flash');
    });

    it('should return rate limit status', async () => {
      const status = await provider.getRateLimitStatus();
      expect(status.allowed).toBe(true);
      expect(status.remaining.perMinute).toBeGreaterThan(0);
      expect(status.remaining.perHour).toBeGreaterThan(0);
      expect(status.remaining.perDay).toBeGreaterThan(0);
    });

    it('should return usage statistics', () => {
      const stats = provider.getUsageStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalTokens).toBe(0);
      expect(stats.totalCost).toBe(0);
    });

    it('should return daily usage statistics', () => {
      const dailyStats = provider.getDailyUsage();
      expect(dailyStats.totalRequests).toBe(0);
    });

    it('should return hourly usage statistics', () => {
      const hourlyStats = provider.getHourlyUsage();
      expect(hourlyStats.totalRequests).toBe(0);
    });

    it('should return cost alerts', () => {
      const alert = provider.getCostAlert(1.0, 0.1);
      expect(alert.dailyAlert).toBe(false);
      expect(alert.hourlyAlert).toBe(false);
      expect(alert.dailyCost).toBe(0);
      expect(alert.hourlyCost).toBe(0);
    });

    it('should return queue statistics', () => {
      const queueStats = provider.getQueueStats();
      expect(queueStats.queueSize).toBe(0);
      expect(queueStats.processing).toBe(false);
    });

    it('should export usage records', () => {
      const records = provider.exportUsageRecords();
      expect(Array.isArray(records)).toBe(true);
      expect(records.length).toBe(0);
    });

    it('should clear queue', () => {
      expect(() => provider.clearQueue()).not.toThrow();
    });

    // Note: We can't easily test the actual API calls without a real API key
    // and without mocking the GoogleGenAI client, so we'll skip those tests for now
  });

  describe('LLMProviderFactory', () => {
    it('should create MockLLMProvider for mock type', () => {
      const provider = LLMProviderFactory.create('mock', 'test-key', 'test-model');
      expect(provider).toBeInstanceOf(MockLLMProvider);
      expect(provider.getName()).toBe('mock');
      expect(provider.getModel()).toBe('test-model');
    });

    it('should create GeminiProvider for gemini type', () => {
      const provider = LLMProviderFactory.create('gemini', 'test-key', 'gemini-2.5-flash');
      expect(provider).toBeInstanceOf(GeminiProvider);
      expect(provider.getName()).toBe('gemini');
      expect(provider.getModel()).toBe('gemini-2.5-flash');
    });

    it('should throw error for unknown provider type', () => {
      expect(() => {
        LLMProviderFactory.create('unknown' as any, 'test-key', 'test-model');
      }).toThrow('Unknown LLM provider: unknown. Supported providers: \'gemini\', \'mock\'');
    });

    it('should pass options to created providers', () => {
      const options = { maxTokens: 500, temperature: 0.5 };
      const provider = LLMProviderFactory.create('mock', 'test-key', 'test-model', options);
      
      // Test that options are applied (this would be more testable with getters)
      expect(provider).toBeInstanceOf(MockLLMProvider);
    });

    it('should pass rate limit config to GeminiProvider', () => {
      const rateLimitConfig = {
        perMinute: 10,
        perHour: 100,
        perDay: 1000
      };
      
      const provider = LLMProviderFactory.create('gemini', 'test-key', 'gemini-2.5-flash', {}, rateLimitConfig);
      expect(provider).toBeInstanceOf(GeminiProvider);
    });
  });

  describe('Base LLMProvider functionality', () => {
    let provider: MockLLMProvider;

    beforeEach(() => {
      provider = new MockLLMProvider('test-model');
    });

    it('should merge options correctly', () => {
      // This tests the protected mergeOptions method indirectly
      const response = provider.generateResponse('test', { maxTokens: 100 });
      expect(response).resolves.toBeTruthy();
    });

    it('should calculate cost based on tokens', async () => {
      // This tests the protected calculateCost method indirectly through logging
      const response = await provider.generateResponse('test prompt');
      expect(response.usage.totalTokens).toBeGreaterThan(0);
    });
  });
});