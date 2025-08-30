import { ConfigManager } from './environment';

export interface HelpAssistantConfig {
  enabled: boolean;
  provider: 'gemini' | 'mock';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
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

class HelpAssistantConfigManager {
  private config: HelpAssistantConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): HelpAssistantConfig {
    const envConfig = ConfigManager.get();
    
    return {
      // Core settings - optimized for reduced token usage
      enabled: true,
      provider: 'gemini' as const,
      logLevel: 'info' as const,
      model: 'gemini-2.5-flash',
      maxTokens: 150, // Reduced from 300 to save tokens
      temperature: 0.3, // Reduced for more consistent, shorter responses
      timeout: 8000, // Increased slightly for reliability
      
      // Rate limiting - reduced to prevent excessive API usage
      rateLimit: {
        perMinute: 3, // Reduced from 5
        perHour: 20,  // Reduced from 50
        perDay: 100   // Reduced from 200
      },
      
      // Caching - increased to reduce API calls
      cache: {
        enabled: true,
        ttl: 7200,    // Increased from 3600 (2 hours)
        maxSize: 500  // Reduced from 1000 to save memory
      },
      
      // Monitoring
      metricsEnabled: true,
      
      // Cost limits - conservative limits
      costLimits: {
        dailyLimit: 0.50,  // $0.50 per day max
        hourlyLimit: 0.05  // $0.05 per hour max
      }
    };
  }

  getConfig(): HelpAssistantConfig {
    return { ...this.config };
  }

  getLLMProviderConfig(): LLMProviderConfig {
    const envConfig = ConfigManager.get();
    
    // Only support Gemini now
    return {
      name: 'gemini',
      apiKey: envConfig.GEMINI_API_KEY || '',
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      timeout: this.config.timeout
    };
  }

  updateConfig(updates: Partial<HelpAssistantConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // Method to temporarily reduce limits for testing
  setTestingMode(enabled: boolean): void {
    if (enabled) {
      this.config.rateLimit = {
        perMinute: 1,  // Very limited for testing
        perHour: 5,
        perDay: 10
      };
      this.config.maxTokens = 100; // Even shorter responses for testing
      this.config.costLimits = {
        dailyLimit: 0.10,
        hourlyLimit: 0.02
      };
    } else {
      // Reset to normal config
      this.config = this.loadConfig();
    }
  }

  isTestingMode(): boolean {
    return this.config.rateLimit.perMinute === 1;
  }
}

export const helpAssistantConfig = new HelpAssistantConfigManager();