import { AssistantResponseSchema, ValidationResult } from '../../types/assistantTypes';
import { LLMProvider, LLMProviderFactory, LLMOptions } from './llmProvider';
import { ResponseValidator } from './responseValidator';
import { PromptGuardrails } from './promptGuardrails';
import { ContentGuardrails } from './contentGuardrails';
import { helpAssistantConfig } from '../../config/helpAssistantConfig';
import { helpLogger } from '../../utils/helpLogger';
import { helpMonitoring } from '../../utils/helpMonitoring';

export interface HelpSession {
  id: string;
  socketId: string;
  roomCode?: string;
  startTime: Date;
  lastActivity: Date;
  messageCount: number;
  isActive: boolean;
  context: ConversationContext;
}

export interface ConversationContext {
  previousQuestions: string[];
  questionCategories: string[];
  userPreferences?: {
    language: 'es' | 'en';
    verbosity: 'brief' | 'detailed';
  };
}

export interface ProcessQuestionOptions {
  sessionId?: string;
  useCache?: boolean;
  priority?: number;
}

export interface ProcessQuestionResult {
  response: AssistantResponseSchema;
  fromCache: boolean;
  responseTime: number;
  sessionId?: string;
}

/**
 * HelpAssistantService is the main service that orchestrates question processing,
 * response generation, validation, and session management for the blackjack help system.
 */
export class HelpAssistantService {
  private llmProvider!: LLMProvider;
  private responseValidator: ResponseValidator;
  private promptGuardrails: PromptGuardrails;
  private contentGuardrails: ContentGuardrails;
  private sessions: Map<string, HelpSession>;
  private responseCache: Map<string, { response: AssistantResponseSchema; timestamp: Date }>;
  private isInitialized: boolean = false;

  constructor() {
    this.sessions = new Map();
    this.responseCache = new Map();
    this.contentGuardrails = new ContentGuardrails();
    this.promptGuardrails = new PromptGuardrails();
    this.responseValidator = new ResponseValidator(this.contentGuardrails);
    
    // Initialize LLM provider based on configuration
    this.initializeLLMProvider();
  }

  /**
   * Initializes the LLM provider based on configuration
   */
  private initializeLLMProvider(): void {
    try {
      const config = helpAssistantConfig.getConfig();
      
      if (!config.enabled) {
        helpLogger.info('Help Assistant is disabled in configuration');
        this.llmProvider = LLMProviderFactory.create('mock', '', 'mock-model');
        return;
      }

      const providerConfig = helpAssistantConfig.getLLMProviderConfig();
      if (!providerConfig) {
        throw new Error('No valid LLM provider configuration found');
      }

      const llmOptions: LLMOptions = {
        maxTokens: providerConfig.maxTokens,
        temperature: providerConfig.temperature,
        timeout: providerConfig.timeout
      };

      const rateLimitConfig = {
        perMinute: config.rateLimit.perMinute,
        perHour: config.rateLimit.perHour,
        perDay: config.rateLimit.perDay
      };

      this.llmProvider = LLMProviderFactory.create(
        config.provider,
        providerConfig.apiKey,
        providerConfig.model,
        llmOptions,
        rateLimitConfig
      );

      this.isInitialized = true;
      helpLogger.info('Help Assistant Service initialized', {
        provider: config.provider,
        model: providerConfig.model
      });

    } catch (error) {
      helpLogger.error('Failed to initialize LLM provider', { error: error as Error });
      // Fallback to mock provider
      this.llmProvider = LLMProviderFactory.create('mock', '', 'mock-model');
      helpLogger.warn('Falling back to mock LLM provider');
    }
  }

  /**
   * Main method to process a user question and generate a response
   */
  async processQuestion(
    question: string, 
    options: ProcessQuestionOptions = {}
  ): Promise<ProcessQuestionResult> {
    const startTime = Date.now();
    const { sessionId, useCache = true, priority = 0 } = options;

    helpLogger.debug('Processing question', {
      questionLength: question.length,
      sessionId,
      useCache,
      priority
    });

    try {
      // Validate and sanitize the question
      const sanitizedQuestion = this.sanitizeQuestion(question);
      if (!this.validateQuestion(sanitizedQuestion)) {
        const redirectResponse = this.responseValidator.createRedirectResponse(question);
        return {
          response: redirectResponse,
          fromCache: false,
          responseTime: Date.now() - startTime,
          sessionId
        };
      }

      // Check cache first if enabled
      if (useCache) {
        const cachedResponse = this.getCachedResponse(sanitizedQuestion);
        if (cachedResponse) {
          helpLogger.debug('Returning cached response', { sessionId });
          
          // Update session context if session exists
          if (sessionId) {
            this.updateSessionContext(sessionId, sanitizedQuestion, cachedResponse.category);
          }
          
          return {
            response: cachedResponse,
            fromCache: true,
            responseTime: Date.now() - startTime,
            sessionId
          };
        }
      }

      // Try to find a fallback response first (faster than LLM)
      const fallbackResponse = this.promptGuardrails.findFallbackResponse(sanitizedQuestion);
      if (fallbackResponse) {
        helpLogger.debug('Using fallback response', { sessionId });
        
        // Cache the fallback response
        if (useCache) {
          this.cacheResponse(sanitizedQuestion, fallbackResponse);
        }

        // Update session context if session exists
        if (sessionId) {
          this.updateSessionContext(sessionId, sanitizedQuestion, fallbackResponse.category);
        }

        return {
          response: fallbackResponse,
          fromCache: false,
          responseTime: Date.now() - startTime,
          sessionId
        };
      }

      // Generate response using LLM
      const llmResponse = await this.generateLLMResponse(sanitizedQuestion, sessionId);
      
      // Cache the response if valid
      if (useCache && llmResponse) {
        this.cacheResponse(sanitizedQuestion, llmResponse);
      }

      // Update session context if session exists
      if (sessionId) {
        this.updateSessionContext(sessionId, sanitizedQuestion, llmResponse.category);
      }

      const responseTime = Date.now() - startTime;
      helpLogger.debug('Question processed successfully', {
        sessionId,
        responseTime,
        category: llmResponse.category,
        fromLLM: true
      });

      return {
        response: llmResponse,
        fromCache: false,
        responseTime,
        sessionId
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      helpLogger.error('Error processing question', {
        error: error as Error,
        sessionId,
        responseTime,
        questionLength: question.length
      });

      // Return error response
      const errorResponse = this.responseValidator.createErrorResponse([
        error instanceof Error ? error.message : 'Unknown error'
      ]);

      return {
        response: errorResponse,
        fromCache: false,
        responseTime,
        sessionId
      };
    }
  }

  /**
   * Generates a response using the LLM provider
   */
  private async generateLLMResponse(question: string, sessionId?: string): Promise<AssistantResponseSchema> {
    try {
      // Build the prompt with guardrails
      const prompt = this.promptGuardrails.buildPrompt(question);
      
      // Generate response from LLM
      const llmResponse = await this.llmProvider.generateResponse(prompt, undefined);
      
      // Parse and validate the JSON response
      let parsedResponse: any;
      try {
        parsedResponse = JSON.parse(llmResponse.content);
      } catch (parseError) {
        helpLogger.warn('Failed to parse LLM JSON response, using fallback', {
          sessionId,
          parseError,
          rawContent: llmResponse.content.substring(0, 200)
        });
        
        // Return a generic fallback if JSON parsing fails
        return this.promptGuardrails.getGenericFallback();
      }

      // Validate the parsed response
      const validationResult = this.responseValidator.validateResponse(parsedResponse);
      
      if (!validationResult.isValid) {
        helpLogger.warn('LLM response failed validation, using fallback', {
          sessionId,
          errors: validationResult.errors
        });
        
        // Try to find a fallback response
        const fallback = this.promptGuardrails.findFallbackResponse(question);
        return fallback || this.promptGuardrails.getGenericFallback();
      }

      return validationResult.sanitizedResponse!;

    } catch (error) {
      helpLogger.error('LLM generation failed', { error: error as Error, sessionId });
      
      // Try fallback response
      const fallback = this.promptGuardrails.findFallbackResponse(question);
      if (fallback) {
        return fallback;
      }
      
      // Last resort: generic fallback
      return this.promptGuardrails.getGenericFallback();
    }
  }

  /**
   * Validates that a question is appropriate for the help system
   */
  validateQuestion(question: string): boolean {
    return this.responseValidator.isQuestionValid(question);
  }

  /**
   * Sanitizes user input to prevent injection attacks
   */
  private sanitizeQuestion(question: string): string {
    return this.promptGuardrails.sanitizeUserInput(question);
  }

  /**
   * Gets a cached response if available and not expired
   */
  private getCachedResponse(question: string): AssistantResponseSchema | null {
    const config = helpAssistantConfig.getConfig();
    if (!config.cache.enabled) {
      return null;
    }

    const questionHash = this.hashQuestion(question);
    const cached = this.responseCache.get(questionHash);
    
    if (!cached) {
      return null;
    }

    // Check if cache entry is expired
    const now = new Date();
    const ageMs = now.getTime() - cached.timestamp.getTime();
    const ttlMs = config.cache.ttl * 1000; // Convert seconds to milliseconds
    
    if (ageMs > ttlMs) {
      this.responseCache.delete(questionHash);
      return null;
    }

    return cached.response;
  }

  /**
   * Caches a response for future use
   */
  private cacheResponse(question: string, response: AssistantResponseSchema): void {
    const config = helpAssistantConfig.getConfig();
    if (!config.cache.enabled) {
      return;
    }

    const questionHash = this.hashQuestion(question);
    
    // Implement LRU eviction if cache is full
    if (this.responseCache.size >= config.cache.maxSize) {
      const oldestKey = this.responseCache.keys().next().value;
      if (oldestKey) {
        this.responseCache.delete(oldestKey);
      }
    }

    this.responseCache.set(questionHash, {
      response,
      timestamp: new Date()
    });
  }

  /**
   * Creates a simple hash of the question for caching
   */
  private hashQuestion(question: string): string {
    // Simple hash function - in production, consider using a proper hash library
    let hash = 0;
    const normalized = question.toLowerCase().trim();
    
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }

  /**
   * Creates a new help session
   */
  createSession(socketId: string, roomCode?: string): HelpSession {
    const sessionId = this.generateSessionId();
    const session: HelpSession = {
      id: sessionId,
      socketId,
      roomCode,
      startTime: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      isActive: true,
      context: {
        previousQuestions: [],
        questionCategories: []
      }
    };

    this.sessions.set(sessionId, session);
    
    helpLogger.info('Help session created', {
      sessionId,
      socketId,
      roomCode
    });

    return session;
  }

  /**
   * Gets an existing session
   */
  getSession(sessionId: string): HelpSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Updates session context with new question and response
   */
  private updateSessionContext(sessionId: string, question: string, category: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    // Ensure lastActivity is always after startTime by adding a small delay if needed
    const now = new Date();
    const minTime = session.startTime.getTime() + 1; // At least 1ms after start
    session.lastActivity = new Date(Math.max(now.getTime(), minTime));
    
    session.messageCount++;
    session.context.previousQuestions.push(question);
    session.context.questionCategories.push(category);

    // Keep only last 10 questions to prevent memory bloat
    if (session.context.previousQuestions.length > 10) {
      session.context.previousQuestions = session.context.previousQuestions.slice(-10);
      session.context.questionCategories = session.context.questionCategories.slice(-10);
    }
  }

  /**
   * Ends a help session
   */
  endSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.isActive = false;
    this.sessions.delete(sessionId);

    helpLogger.info('Help session ended', {
      sessionId,
      duration: Date.now() - session.startTime.getTime(),
      messageCount: session.messageCount
    });

    return true;
  }

  /**
   * Cleans up inactive sessions
   */
  cleanupInactiveSessions(maxAgeMinutes: number = 10): number {
    const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActivity < cutoffTime) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      helpLogger.info('Cleaned up inactive sessions', {
        cleanedCount,
        maxAgeMinutes,
        remainingSessions: this.sessions.size
      });
    }

    return cleanedCount;
  }

  /**
   * Gets fallback response when LLM is unavailable
   */
  getFallbackResponse(question: string): AssistantResponseSchema {
    const fallback = this.promptGuardrails.findFallbackResponse(question);
    return fallback || this.promptGuardrails.getGenericFallback();
  }

  /**
   * Checks if the service is available and ready
   */
  async isAvailable(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      return await this.llmProvider.isAvailable();
    } catch (error) {
      helpLogger.warn('LLM provider availability check failed', { error: error as Error });
      return false;
    }
  }

  /**
   * Gets service health status
   */
  async getHealthStatus(): Promise<{
    isHealthy: boolean;
    llmAvailable: boolean;
    activeSessions: number;
    cacheSize: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let llmAvailable = false;

    try {
      llmAvailable = await this.llmProvider.isAvailable();
    } catch (error) {
      errors.push(`LLM provider error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const config = helpAssistantConfig.getConfig();
    if (!config.enabled) {
      errors.push('Help Assistant is disabled in configuration');
    }

    return {
      isHealthy: errors.length === 0 && llmAvailable,
      llmAvailable,
      activeSessions: this.sessions.size,
      cacheSize: this.responseCache.size,
      errors
    };
  }

  /**
   * Clears the response cache
   */
  clearCache(): void {
    this.responseCache.clear();
    helpLogger.info('Response cache cleared');
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    enabled: boolean;
    ttl: number;
  } {
    const config = helpAssistantConfig.getConfig();
    return {
      size: this.responseCache.size,
      maxSize: config.cache.maxSize,
      enabled: config.cache.enabled,
      ttl: config.cache.ttl
    };
  }

  /**
   * Gets session statistics
   */
  getSessionStats(): {
    activeSessions: number;
    totalSessions: number;
    averageMessageCount: number;
  } {
    const activeSessions = Array.from(this.sessions.values()).filter(s => s.isActive);
    const totalMessages = activeSessions.reduce((sum, s) => sum + s.messageCount, 0);
    
    return {
      activeSessions: activeSessions.length,
      totalSessions: this.sessions.size,
      averageMessageCount: activeSessions.length > 0 ? totalMessages / activeSessions.length : 0
    };
  }

  /**
   * Generates a unique session ID
   */
  private generateSessionId(): string {
    return `help_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gracefully shuts down the service
   */
  async shutdown(): Promise<void> {
    helpLogger.info('Shutting down Help Assistant Service');
    
    // End all active sessions
    for (const sessionId of this.sessions.keys()) {
      this.endSession(sessionId);
    }

    // Clear cache
    this.clearCache();

    // If LLM provider has cleanup methods, call them
    if ('shutdown' in this.llmProvider && typeof this.llmProvider.shutdown === 'function') {
      await (this.llmProvider as any).shutdown();
    }

    this.isInitialized = false;
    helpLogger.info('Help Assistant Service shutdown complete');
  }
}

// Export singleton instance
export const helpAssistantService = new HelpAssistantService();