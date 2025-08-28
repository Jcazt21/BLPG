import { helpLogger } from '../../utils/helpLogger';
import { helpMonitoring } from '../../utils/helpMonitoring';
import { GoogleGenAI } from '@google/genai';
import { RateLimiter, RateLimitConfig, RateLimitStatus } from './rateLimiter';
import { RequestQueue } from './requestQueue';
import { UsageTracker, UsageRecord } from './usageTracker';

export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: 'stop' | 'length' | 'timeout' | 'error';
}

export interface RateLimitInfo {
  requestsRemaining: number;
  resetTime: Date;
  dailyLimit: number;
}

export abstract class LLMProvider {
  protected name: string;
  protected apiKey: string;
  protected model: string;
  protected defaultOptions: LLMOptions;

  constructor(name: string, apiKey: string, model: string, defaultOptions: LLMOptions = {}) {
    this.name = name;
    this.apiKey = apiKey;
    this.model = model;
    this.defaultOptions = {
      maxTokens: 300,
      temperature: 0.7,
      timeout: 5000,
      ...defaultOptions
    };
  }

  abstract generateResponse(prompt: string, options?: LLMOptions): Promise<LLMResponse>;
  abstract isAvailable(): Promise<boolean>;
  abstract getRateLimit(): Promise<RateLimitInfo>;

  getName(): string {
    return this.name;
  }

  getModel(): string {
    return this.model;
  }

  protected mergeOptions(options?: LLMOptions): LLMOptions {
    return { ...this.defaultOptions, ...options };
  }

  protected calculateCost(tokens: number): number {
    // Rough cost calculation (varies by provider and model)
    const costPer1kTokens = 0.002; // $0.002 per 1k tokens (approximate)
    return (tokens / 1000) * costPer1kTokens;
  }

  protected logApiCall(tokens: number, responseTime: number, sessionId?: string): void {
    const cost = this.calculateCost(tokens);
    helpLogger.logApiCall(this.name, this.model, tokens, cost, responseTime, sessionId);
    helpMonitoring.recordApiCall(this.name, tokens, cost);
  }
}

export class MockLLMProvider extends LLMProvider {
  private responses: string[];
  private currentIndex: number = 0;
  private simulateDelay: number = 1000; // 1 second delay
  private simulateErrors: boolean = false;
  private errorRate: number = 0.1; // 10% error rate when enabled

  constructor(model: string = 'mock-model', options: LLMOptions = {}) {
    super('mock', 'mock-api-key', model, options);
    
    this.responses = [
      'El blackjack es un juego de cartas donde el objetivo es llegar lo más cerca posible a 21 puntos sin pasarse.',
      'Las cartas del 2 al 10 valen su número, las figuras (J, Q, K) valen 10 puntos, y el As vale 1 u 11 según convenga.',
      'Puedes pedir carta (hit), plantarte (stand), doblar la apuesta (double down) o dividir pares (split).',
      'La estrategia básica sugiere pedir carta con 11 o menos, y plantarse con 17 o más.',
      'El dealer debe pedir carta con 16 o menos y plantarse con 17 o más.',
      'Un blackjack natural (As + carta de 10) paga 3:2 en la mayoría de casinos.',
      'No puedo darte consejos específicos sobre tu mano actual, pero puedo explicarte las reglas generales.',
      'El conteo de cartas no es ilegal pero los casinos pueden prohibirte la entrada si te descubren.',
      'La ventaja de la casa en blackjack es aproximadamente 0.5% con estrategia básica perfecta.',
      'Dividir ases es generalmente una buena jugada, pero solo recibes una carta adicional por cada as.'
    ];
  }

  async generateResponse(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    const startTime = Date.now();
    const mergedOptions = this.mergeOptions(options);

    helpLogger.debug('Mock LLM generating response', {
      provider: this.name,
      model: this.model,
      promptLength: prompt.length,
      options: mergedOptions
    });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, this.simulateDelay));

    // Simulate errors if enabled
    if (this.simulateErrors && Math.random() < this.errorRate) {
      const error = new Error('Mock API error: Simulated failure');
      helpLogger.error('Mock LLM error', { error, provider: this.name });
      throw error;
    }

    // Simulate timeout
    if (mergedOptions.timeout && (Date.now() - startTime) > mergedOptions.timeout!) {
      const error = new Error('Mock API timeout');
      helpLogger.error('Mock LLM timeout', { error, provider: this.name });
      throw error;
    }

    // Get next response (cycle through responses)
    const content = this.responses[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.responses.length;

    // Simulate token usage
    const promptTokens = Math.ceil(prompt.length / 4); // Rough estimate: 4 chars per token
    const completionTokens = Math.ceil(content.length / 4);
    const totalTokens = promptTokens + completionTokens;

    const responseTime = Date.now() - startTime;
    this.logApiCall(totalTokens, responseTime);

    const response: LLMResponse = {
      content,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens
      },
      model: this.model,
      finishReason: 'stop'
    };

    helpLogger.debug('Mock LLM response generated', {
      provider: this.name,
      responseTime,
      tokens: totalTokens,
      contentLength: content.length
    });

    return response;
  }

  async isAvailable(): Promise<boolean> {
    // Mock provider is always available unless we're simulating total failure
    return !this.simulateErrors || Math.random() > 0.9; // 90% availability when errors enabled
  }

  async getRateLimit(): Promise<RateLimitInfo> {
    // Mock rate limit info
    return {
      requestsRemaining: 1000,
      resetTime: new Date(Date.now() + 3600000), // 1 hour from now
      dailyLimit: 10000
    };
  }

  // Mock-specific methods for testing
  setResponses(responses: string[]): void {
    this.responses = responses;
    this.currentIndex = 0;
  }

  addResponse(response: string): void {
    this.responses.push(response);
  }

  setDelay(ms: number): void {
    this.simulateDelay = ms;
  }

  enableErrors(errorRate: number = 0.1): void {
    this.simulateErrors = true;
    this.errorRate = Math.max(0, Math.min(1, errorRate));
  }

  disableErrors(): void {
    this.simulateErrors = false;
  }

  reset(): void {
    this.currentIndex = 0;
    this.simulateDelay = 1000;
    this.simulateErrors = false;
    this.errorRate = 0.1;
  }

  getCallHistory(): Array<{ timestamp: Date; prompt: string; response: string }> {
    // In a real implementation, this would track actual calls
    // For now, return empty array as this is just a mock
    return [];
  }
}

// OpenAI and Anthropic providers removed - using only Gemini as requested

export class GeminiProvider extends LLMProvider {
  private client: GoogleGenAI;
  private rateLimiter: RateLimiter;
  private requestQueue: RequestQueue<{ prompt: string; options: LLMOptions; sessionId?: string }>;
  private usageTracker: UsageTracker;

  constructor(
    apiKey: string, 
    model: string = 'gemini-2.5-flash', 
    options: LLMOptions = {},
    rateLimitConfig: RateLimitConfig = {
      perMinute: 15,
      perHour: 1000,
      perDay: 1500
    }
  ) {
    super('gemini', apiKey, model, options);
    this.client = new GoogleGenAI({
      apiKey: this.apiKey
    });
    
    this.rateLimiter = new RateLimiter(rateLimitConfig);
    this.usageTracker = new UsageTracker();
    
    // Initialize request queue with retry logic
    this.requestQueue = new RequestQueue(
      async (payload) => this.executeRequest(payload.prompt, payload.options, payload.sessionId),
      {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        jitter: true
      }
    );
  }

  async generateResponse(prompt: string, options?: LLMOptions, sessionId?: string): Promise<LLMResponse> {
    const mergedOptions = this.mergeOptions(options);

    helpLogger.debug('Gemini request queued', {
      provider: this.name,
      model: this.model,
      promptLength: prompt.length,
      sessionId
    });

    // Check rate limits first
    const rateLimitStatus = await this.rateLimiter.checkLimit(sessionId || 'global');
    if (!rateLimitStatus.allowed) {
      const error = new Error('Rate limit exceeded');
      helpLogger.warn('Rate limit exceeded', {
        provider: this.name,
        sessionId,
        remaining: rateLimitStatus.remaining
      });
      throw error;
    }

    // Record the request for rate limiting
    await this.rateLimiter.recordRequest(sessionId || 'global');

    // Queue the request with retry logic
    return this.requestQueue.enqueue(
      { prompt, options: mergedOptions, sessionId },
      0 // Default priority
    );
  }

  private async executeRequest(prompt: string, options: LLMOptions, sessionId?: string): Promise<LLMResponse> {
    const startTime = Date.now();

    helpLogger.debug('Gemini API call executing', {
      provider: this.name,
      model: this.model,
      promptLength: prompt.length,
      sessionId
    });

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
      });

      const responseTime = Date.now() - startTime;
      
      // Check if response was successful
      if (!response.text) {
        throw new Error('Empty response from Gemini API');
      }

      // Estimate token usage (Gemini doesn't provide exact counts in all cases)
      const promptTokens = Math.ceil(prompt.length / 4); // Rough estimate: 4 chars per token
      const completionTokens = Math.ceil(response.text.length / 4);
      const totalTokens = promptTokens + completionTokens;

      // Record usage for tracking and cost monitoring
      const usageRecord = this.usageTracker.recordUsage(
        this.name,
        this.model,
        promptTokens,
        completionTokens,
        responseTime,
        sessionId
      );

      this.logApiCall(totalTokens, responseTime, sessionId);

      const llmResponse: LLMResponse = {
        content: response.text,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens
        },
        model: this.model,
        finishReason: 'stop'
      };

      helpLogger.debug('Gemini response generated', {
        provider: this.name,
        responseTime,
        tokens: totalTokens,
        cost: usageRecord.cost,
        sessionId
      });

      return llmResponse;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      helpLogger.error('Gemini API error', {
        error: error as Error,
        provider: this.name,
        responseTime,
        model: this.model,
        sessionId
      });
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Test with a simple prompt to check if the API is available
      const testResponse = await this.client.models.generateContent({
        model: this.model,
        contents: 'Test'
      });
      return !!testResponse.text;
    } catch (error) {
      helpLogger.warn('Gemini availability check failed', {
        error: error as Error,
        provider: this.name
      });
      return false;
    }
  }

  async getRateLimit(): Promise<RateLimitInfo> {
    const status = await this.rateLimiter.checkLimit('global');
    
    return {
      requestsRemaining: Math.min(
        status.remaining.perMinute,
        status.remaining.perHour,
        status.remaining.perDay
      ),
      resetTime: status.resetTimes.perMinute, // Next reset time
      dailyLimit: status.remaining.perDay + (await this.usageTracker.getDailyStats()).totalRequests
    };
  }

  // Additional methods for monitoring and management
  async getRateLimitStatus(sessionId?: string): Promise<RateLimitStatus> {
    return this.rateLimiter.checkLimit(sessionId || 'global');
  }

  getUsageStats(timeRange?: { start: Date; end: Date }) {
    return this.usageTracker.getUsageStats(timeRange);
  }

  getDailyUsage() {
    return this.usageTracker.getDailyStats();
  }

  getHourlyUsage() {
    return this.usageTracker.getHourlyStats();
  }

  getCostAlert(dailyLimit: number = 1.0, hourlyLimit: number = 0.1) {
    return this.usageTracker.getCostAlert(dailyLimit, hourlyLimit);
  }

  getQueueStats() {
    return this.requestQueue.getQueueStats();
  }

  clearQueue() {
    this.requestQueue.clear();
  }

  exportUsageRecords(timeRange?: { start: Date; end: Date }): UsageRecord[] {
    return this.usageTracker.exportRecords(timeRange);
  }
}

// Provider factory - simplified for Gemini only
export class LLMProviderFactory {
  static create(
    provider: 'openai' | 'anthropic' | 'gemini' | 'mock',
    apiKey: string,
    model: string,
    options: LLMOptions = {},
    rateLimitConfig?: RateLimitConfig
  ): LLMProvider {
    switch (provider) {
      case 'gemini':
        return new GeminiProvider(apiKey, model, options, rateLimitConfig);
      case 'mock':
        return new MockLLMProvider(model, options);
      case 'openai':
      case 'anthropic':
        // For now, fall back to mock for unsupported providers
        console.warn(`Provider ${provider} not yet implemented, using mock provider`);
        return new MockLLMProvider(model, options);
      default:
        throw new Error(`Unknown LLM provider: ${provider}. Supported providers: 'openai', 'anthropic', 'gemini', 'mock'`);
    }
  }
}