import { ConfigManager } from './environment';

export interface HelpAssistantConfig {
  enabled: boolean;
  provider: 'openai' | 'anthropic' | 'gemini' | 'mock';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  apiKey: string;
  rateLimit: {
    perMinute: number;
    perHour: number;
    perDay: number;
  };
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  metricsEnabled: boolean;
  costLimits: {
    dailyLimit: number;
    hourlyLimit: number;
  };
}

export interface LLMProviderConfig {
  name: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export class HelpAssistantConfigManager {
  private static instance: HelpAssistantConfigManager;
  private config!: HelpAssistantConfig;

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): HelpAssistantConfigManager {
    if (!HelpAssistantConfigManager.instance) {
      HelpAssistantConfigManager.instance = new HelpAssistantConfigManager();
    }
    return HelpAssistantConfigManager.instance;
  }

  private loadConfig(): void {
    const envConfig = ConfigManager.get();

    this.config = {
      enabled: envConfig.HELP_ASSISTANT.ENABLED,
      provider: envConfig.HELP_ASSISTANT.PROVIDER,
      logLevel: envConfig.HELP_ASSISTANT.LOG_LEVEL,
      model: envConfig.HELP_ASSISTANT.MODEL,
      maxTokens: envConfig.HELP_ASSISTANT.MAX_TOKENS,
      temperature: envConfig.HELP_ASSISTANT.TEMPERATURE,
      timeout: envConfig.HELP_ASSISTANT.TIMEOUT,
      apiKey: envConfig.HELP_ASSISTANT.API_KEYS.GEMINI || '',
      rateLimit: {
        perMinute: envConfig.HELP_ASSISTANT.RATE_LIMIT.PER_MINUTE,
        perHour: envConfig.HELP_ASSISTANT.RATE_LIMIT.PER_HOUR,
        perDay: envConfig.HELP_ASSISTANT.RATE_LIMIT.PER_DAY
      },
      cache: {
        enabled: envConfig.HELP_ASSISTANT.CACHE.ENABLED,
        ttl: envConfig.HELP_ASSISTANT.CACHE.TTL,
        maxSize: envConfig.HELP_ASSISTANT.CACHE.MAX_SIZE
      },
      metricsEnabled: envConfig.HELP_ASSISTANT.METRICS_ENABLED,
      costLimits: {
        dailyLimit: 1.0,
        hourlyLimit: 0.1
      }
    };
  }

  getConfig(): HelpAssistantConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getProvider(): 'openai' | 'anthropic' | 'gemini' | 'mock' {
    return this.config.provider;
  }

  getLLMProviderConfig(): LLMProviderConfig | null {
    if (!this.config.enabled) {
      return null;
    }

    const provider = this.config.provider;

    if (provider === 'mock') {
      return {
        name: 'mock',
        apiKey: 'mock-key',
        model: this.config.model,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        timeout: this.config.timeout
      };
    }

    if (!this.config.apiKey) {
      throw new Error(`API key not configured for provider: ${provider}`);
    }

    return {
      name: provider,
      apiKey: this.config.apiKey,
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      timeout: this.config.timeout
    };
  }

  validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.enabled) {
      return { isValid: true, errors: [] }; // Valid to be disabled
    }

    // Validate provider
    if (!['gemini', 'mock'].includes(this.config.provider)) {
      errors.push(`Invalid provider: ${this.config.provider}. Must be 'gemini' or 'mock'`);
    }

    // Validate API key for non-mock providers
    if (this.config.provider !== 'mock') {
      if (!this.config.apiKey || this.config.apiKey.trim().length === 0) {
        errors.push(`API key required for provider: ${this.config.provider}`);
      }
    }

    // Validate numeric values
    if (this.config.maxTokens <= 0 || this.config.maxTokens > 4000) {
      errors.push(`Invalid maxTokens: ${this.config.maxTokens}. Must be between 1 and 4000`);
    }

    if (this.config.temperature < 0 || this.config.temperature > 2) {
      errors.push(`Invalid temperature: ${this.config.temperature}. Must be between 0 and 2`);
    }

    if (this.config.timeout <= 0 || this.config.timeout > 30000) {
      errors.push(`Invalid timeout: ${this.config.timeout}. Must be between 1 and 30000 milliseconds`);
    }

    // Validate rate limits
    if (this.config.rateLimit.perMinute <= 0) {
      errors.push(`Invalid rate limit per minute: ${this.config.rateLimit.perMinute}. Must be positive`);
    }

    if (this.config.rateLimit.perHour <= 0) {
      errors.push(`Invalid rate limit per hour: ${this.config.rateLimit.perHour}. Must be positive`);
    }

    if (this.config.rateLimit.perDay <= 0) {
      errors.push(`Invalid rate limit per day: ${this.config.rateLimit.perDay}. Must be positive`);
    }

    // Validate cache settings
    if (this.config.cache.enabled) {
      if (this.config.cache.ttl <= 0) {
        errors.push(`Invalid cache TTL: ${this.config.cache.ttl}. Must be positive`);
      }

      if (this.config.cache.maxSize <= 0) {
        errors.push(`Invalid cache max size: ${this.config.cache.maxSize}. Must be positive`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  reload(): void {
    this.loadConfig();
  }
}

export const helpAssistantConfig = HelpAssistantConfigManager.getInstance();