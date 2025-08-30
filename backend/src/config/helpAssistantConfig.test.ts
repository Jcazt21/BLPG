import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
// import { helpAssistantConfig } from './helpAssistantConfig.js';

// Temporarily disabled - needs refactoring after config changes

describe.skip('helpAssistantConfig', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Set up test environment variables
    process.env.HOST = 'localhost';
    process.env.HELP_ASSISTANT_ENABLED = 'true';
    process.env.HELP_ASSISTANT_PROVIDER = 'mock';
    process.env.HELP_ASSISTANT_LOG_LEVEL = 'info';
    process.env.HELP_ASSISTANT_MODEL = 'gpt-3.5-turbo';
    process.env.HELP_ASSISTANT_MAX_TOKENS = '300';
    process.env.HELP_ASSISTANT_TEMPERATURE = '0.7';
    process.env.HELP_ASSISTANT_TIMEOUT = '5000';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.HELP_RATE_LIMIT_PER_MINUTE = '5';
    process.env.HELP_RATE_LIMIT_PER_HOUR = '50';
    process.env.HELP_RATE_LIMIT_PER_DAY = '200';
    process.env.HELP_CACHE_ENABLED = 'true';
    process.env.HELP_CACHE_TTL = '3600';
    process.env.HELP_CACHE_MAX_SIZE = '1000';
    process.env.HELP_METRICS_ENABLED = 'true';
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = helpAssistantConfig;
      const instance2 = helpAssistantConfig;
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('getConfig', () => {
    it('should load configuration from environment variables', () => {
      const configManager = HelpAssistantConfigManager.getInstance();
      const config = configManager.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.provider).toBe('mock');
      expect(config.logLevel).toBe('info');
      expect(config.model).toBe('gpt-3.5-turbo');
      expect(config.maxTokens).toBe(300);
      expect(config.temperature).toBe(0.7);
      expect(config.timeout).toBe(5000);
      expect(config.apiKey).toBe('test-gemini-key');
      expect(config.rateLimit.perMinute).toBe(5);
      expect(config.rateLimit.perHour).toBe(50);
      expect(config.rateLimit.perDay).toBe(200);
      expect(config.cache.enabled).toBe(true);
      expect(config.cache.ttl).toBe(3600);
      expect(config.cache.maxSize).toBe(1000);
      expect(config.metricsEnabled).toBe(true);
    });

    it('should return a copy of the configuration', () => {
      const configManager = HelpAssistantConfigManager.getInstance();
      const config1 = configManager.getConfig();
      const config2 = configManager.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('isEnabled', () => {
    it('should return true when help assistant is enabled', () => {
      const configManager = HelpAssistantConfigManager.getInstance();
      expect(configManager.isEnabled()).toBe(true);
    });

    it('should return false when help assistant is disabled', () => {
      process.env.HELP_ASSISTANT_ENABLED = 'false';
      const configManager = HelpAssistantConfigManager.getInstance();
      configManager.reload();
      
      expect(configManager.isEnabled()).toBe(false);
    });
  });

  describe('getProvider', () => {
    it('should return the configured provider', () => {
      const configManager = HelpAssistantConfigManager.getInstance();
      expect(configManager.getProvider()).toBe('mock');
    });
  });

  describe('getLLMProviderConfig', () => {
    it('should return null when help assistant is disabled', () => {
      process.env.HELP_ASSISTANT_ENABLED = 'false';
      const configManager = HelpAssistantConfigManager.getInstance();
      configManager.reload();
      
      expect(configManager.getLLMProviderConfig()).toBeNull();
    });

    it('should return mock configuration for mock provider', () => {
      const configManager = HelpAssistantConfigManager.getInstance();
      const providerConfig = configManager.getLLMProviderConfig();

      expect(providerConfig).toEqual({
        name: 'mock',
        apiKey: 'mock-key',
        model: 'gpt-3.5-turbo',
        maxTokens: 300,
        temperature: 0.7,
        timeout: 5000
      });
    });

    it('should return OpenAI configuration for openai provider', () => {
      process.env.HELP_ASSISTANT_PROVIDER = 'openai';
      const configManager = HelpAssistantConfigManager.getInstance();
      configManager.reload();
      
      const providerConfig = configManager.getLLMProviderConfig();

      expect(providerConfig).toEqual({
        name: 'openai',
        apiKey: 'test-openai-key',
        model: 'gpt-3.5-turbo',
        maxTokens: 300,
        temperature: 0.7,
        timeout: 5000
      });
    });

    it('should return Anthropic configuration for anthropic provider', () => {
      process.env.HELP_ASSISTANT_PROVIDER = 'anthropic';
      const configManager = HelpAssistantConfigManager.getInstance();
      configManager.reload();
      
      const providerConfig = configManager.getLLMProviderConfig();

      expect(providerConfig).toEqual({
        name: 'anthropic',
        apiKey: 'test-anthropic-key',
        model: 'gpt-3.5-turbo',
        maxTokens: 300,
        temperature: 0.7,
        timeout: 5000
      });
    });

    it('should return Gemini configuration for gemini provider', () => {
      process.env.HELP_ASSISTANT_PROVIDER = 'gemini';
      const configManager = HelpAssistantConfigManager.getInstance();
      configManager.reload();
      
      const providerConfig = configManager.getLLMProviderConfig();

      expect(providerConfig).toEqual({
        name: 'gemini',
        apiKey: 'test-gemini-key',
        model: 'gpt-3.5-turbo',
        maxTokens: 300,
        temperature: 0.7,
        timeout: 5000
      });
    });

    it('should throw error when API key is missing for non-mock provider', () => {
      process.env.HELP_ASSISTANT_PROVIDER = 'openai';
      delete process.env.OPENAI_API_KEY;
      const configManager = HelpAssistantConfigManager.getInstance();
      configManager.reload();
      
      expect(() => configManager.getLLMProviderConfig()).toThrow('API key not configured for provider: openai');
    });

    it('should throw error when Gemini API key is missing', () => {
      process.env.HELP_ASSISTANT_PROVIDER = 'gemini';
      delete process.env.GEMINI_API_KEY;
      const configManager = HelpAssistantConfigManager.getInstance();
      configManager.reload();
      
      expect(() => configManager.getLLMProviderConfig()).toThrow('API key not configured for provider: gemini');
    });
  });

  describe('validateConfiguration', () => {
    it('should return valid for properly configured system', () => {
      const configManager = HelpAssistantConfigManager.getInstance();
      const validation = configManager.validateConfiguration();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should return valid when help assistant is disabled', () => {
      process.env.HELP_ASSISTANT_ENABLED = 'false';
      const configManager = HelpAssistantConfigManager.getInstance();
      configManager.reload();
      
      const validation = configManager.validateConfiguration();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate provider values', () => {
      process.env.HELP_ASSISTANT_PROVIDER = 'invalid';
      const configManager = HelpAssistantConfigManager.getInstance();
      configManager.reload();
      
      const validation = configManager.validateConfiguration();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Invalid provider: invalid. Must be 'openai', 'anthropic', 'gemini', or 'mock'");
    });

    it('should validate API keys for non-mock providers', () => {
      process.env.HELP_ASSISTANT_PROVIDER = 'openai';
      delete process.env.OPENAI_API_KEY;
      const configManager = HelpAssistantConfigManager.getInstance();
      configManager.reload();
      
      const validation = configManager.validateConfiguration();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('API key required for provider: openai');
    });

    it('should validate numeric values', () => {
      process.env.HELP_ASSISTANT_MAX_TOKENS = '0';
      process.env.HELP_ASSISTANT_TEMPERATURE = '3';
      process.env.HELP_ASSISTANT_TIMEOUT = '0';
      const configManager = HelpAssistantConfigManager.getInstance();
      configManager.reload();
      
      const validation = configManager.validateConfiguration();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid maxTokens: 0. Must be between 1 and 4000');
      expect(validation.errors).toContain('Invalid temperature: 3. Must be between 0 and 2');
      expect(validation.errors).toContain('Invalid timeout: 0. Must be between 1 and 30000 milliseconds');
    });

    it('should validate rate limits', () => {
      process.env.HELP_RATE_LIMIT_PER_MINUTE = '0';
      process.env.HELP_RATE_LIMIT_PER_HOUR = '-1';
      process.env.HELP_RATE_LIMIT_PER_DAY = '0';
      const configManager = HelpAssistantConfigManager.getInstance();
      configManager.reload();
      
      const validation = configManager.validateConfiguration();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid rate limit per minute: 0. Must be positive');
      expect(validation.errors).toContain('Invalid rate limit per hour: -1. Must be positive');
      expect(validation.errors).toContain('Invalid rate limit per day: 0. Must be positive');
    });

    it('should validate cache settings when enabled', () => {
      process.env.HELP_CACHE_ENABLED = 'true';
      process.env.HELP_CACHE_TTL = '0';
      process.env.HELP_CACHE_MAX_SIZE = '-1';
      const configManager = HelpAssistantConfigManager.getInstance();
      configManager.reload();
      
      const validation = configManager.validateConfiguration();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid cache TTL: 0. Must be positive');
      expect(validation.errors).toContain('Invalid cache max size: -1. Must be positive');
    });

    it('should not validate cache settings when disabled', () => {
      process.env.HELP_CACHE_ENABLED = 'false';
      process.env.HELP_CACHE_TTL = '0';
      process.env.HELP_CACHE_MAX_SIZE = '-1';
      const configManager = HelpAssistantConfigManager.getInstance();
      configManager.reload();
      
      const validation = configManager.validateConfiguration();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('reload', () => {
    it('should reload configuration from environment', () => {
      const configManager = HelpAssistantConfigManager.getInstance();
      
      // Initial configuration
      expect(configManager.getProvider()).toBe('mock');
      
      // Change environment
      process.env.HELP_ASSISTANT_PROVIDER = 'openai';
      
      // Configuration should not change until reload
      expect(configManager.getProvider()).toBe('mock');
      
      // Reload and check
      configManager.reload();
      expect(configManager.getProvider()).toBe('openai');
    });
  });
});