import { ConfigManager } from './environment';

/**
 * Configuración de IA optimizada exclusivamente para Gemini
 * Configuración simplificada y optimizada para el mejor rendimiento con Gemini
 */

export interface GeminiModelConfig {
  temperature: number;
  maxTokens: number;
  timeout: number;
  topP?: number;
  topK?: number;
  safetySettings?: GeminiSafetySettings[];
}

export interface GeminiSafetySettings {
  category: string;
  threshold: string;
}

export interface RateLimitConfig {
  perMinute: number;
  perHour: number;
  perDay: number;
  burstLimit: number;
}

export interface GeminiConfiguration {
  helpAssistant: {
    enabled: boolean;
    model: string; // 'gemini-1.5-flash' | 'gemini-1.5-pro'
    config: GeminiModelConfig;
    rateLimit: RateLimitConfig;
  };
  dealerPersona: {
    enabled: boolean;
    model: string; // 'gemini-1.5-flash' | 'gemini-1.5-pro'
    config: GeminiModelConfig;
    rateLimit: RateLimitConfig;
  };
  general: {
    apiKey: string;
    baseUrl?: string;
    retryAttempts: number;
    retryDelay: number;
  };
}

/**
 * Configuración por defecto optimizada para Gemini
 */
const DEFAULT_GEMINI_CONFIG: GeminiConfiguration = {
  helpAssistant: {
    enabled: true,
    model: 'gemini-1.5-flash',
    config: {
      temperature: 0.7,
      maxTokens: 300,
      timeout: 5000,
      topP: 0.95,
      topK: 40
    },
    rateLimit: {
      perMinute: 60,
      perHour: 1000,
      perDay: 10000,
      burstLimit: 30
    }
  },
  dealerPersona: {
    enabled: true,
    model: 'gemini-1.5-pro',
    config: {
      temperature: 0.8,
      maxTokens: 400,
      timeout: 8000,
      topP: 0.9,
      topK: 32,
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    },
    rateLimit: {
      perMinute: 30,
      perHour: 200,
      perDay: 1000,
      burstLimit: 10
    }
  },
  general: {
    apiKey: '',  // Empty API key to prevent accidental usage
    retryAttempts: 0,  // Disable retries
    retryDelay: 0
  }
};

/**
 * Carga configuración desde variables de entorno optimizada para Gemini
 */
function loadGeminiConfigFromEnv(): Partial<GeminiConfiguration> {
  return {
    helpAssistant: {
      enabled: process.env.HELP_ASSISTANT_ENABLED !== 'false',
      model: process.env.HELP_ASSISTANT_MODEL || 'gemini-1.5-flash',
      config: {
        temperature: parseFloat(process.env.HELP_ASSISTANT_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.HELP_ASSISTANT_MAX_TOKENS || '500'),
        timeout: parseInt(process.env.HELP_ASSISTANT_TIMEOUT || '8000'),
        topP: parseFloat(process.env.HELP_ASSISTANT_TOP_P || '0.9'),
        topK: parseInt(process.env.HELP_ASSISTANT_TOP_K || '40')
      },
      rateLimit: {
        perMinute: parseInt(process.env.HELP_RATE_LIMIT_PER_MINUTE || '15'),
        perHour: parseInt(process.env.HELP_RATE_LIMIT_PER_HOUR || '100'),
        perDay: parseInt(process.env.HELP_RATE_LIMIT_PER_DAY || '500'),
        burstLimit: parseInt(process.env.HELP_RATE_LIMIT_BURST || '5')
      }
    },
    dealerPersona: {
      enabled: process.env.DEALER_PERSONA_ENABLED !== 'false',
      model: process.env.DEALER_PERSONA_MODEL || 'gemini-1.5-flash',
      config: {
        temperature: parseFloat(process.env.DEALER_TEMPERATURE || '0.9'),
        maxTokens: parseInt(process.env.DEALER_MAX_TOKENS || '200'),
        timeout: parseInt(process.env.DEALER_TIMEOUT || '5000'),
        topP: parseFloat(process.env.DEALER_TOP_P || '0.95'),
        topK: parseInt(process.env.DEALER_TOP_K || '30')
      },
      rateLimit: {
        perMinute: parseInt(process.env.DEALER_RATE_LIMIT_PER_MINUTE || '30'),
        perHour: parseInt(process.env.DEALER_RATE_LIMIT_PER_HOUR || '200'),
        perDay: parseInt(process.env.DEALER_RATE_LIMIT_PER_DAY || '1000'),
        burstLimit: parseInt(process.env.DEALER_RATE_LIMIT_BURST || '10')
      }
    },
    general: {
      apiKey: process.env.GEMINI_API_KEY || '',
      retryAttempts: parseInt(process.env.GEMINI_RETRY_ATTEMPTS || '0'),
      retryDelay: parseInt(process.env.GEMINI_RETRY_DELAY || '0')
    }
  };
}

/**
 * Gestor de configuración optimizado exclusivamente para Gemini
 */
class GeminiConfigManager {
  private static instance: GeminiConfigManager;
  private config: GeminiConfiguration;

  private constructor() {
    this.config = DEFAULT_GEMINI_CONFIG;
  }

  public static getInstance(): GeminiConfigManager {
    if (!GeminiConfigManager.instance) {
      GeminiConfigManager.instance = new GeminiConfigManager();
    }
    return GeminiConfigManager.instance;
  }

  public initialize(): void {
    // 1. Start with default configuration with Gemini disabled
    let finalConfig = { 
      ...DEFAULT_GEMINI_CONFIG,
      helpAssistant: {
        ...DEFAULT_GEMINI_CONFIG.helpAssistant,
        enabled: false  // Force disable
      },
      dealerPersona: {
        ...DEFAULT_GEMINI_CONFIG.dealerPersona,
        enabled: false  // Force disable
      }
    };

    // 2. Sobrescribir con variables de entorno
    const envConfig = loadGeminiConfigFromEnv();
    finalConfig = this.mergeConfigs(finalConfig, envConfig);

    // 3. Validar API key
    if (!finalConfig.general.apiKey) {
      console.warn('⚠️  GEMINI_API_KEY not found in environment variables');
      console.log('   Add GEMINI_API_KEY to your .env file to enable AI features');
    } else {
      console.log('✅ Gemini configuration loaded successfully');
      console.log(`   Help Assistant: ${finalConfig.helpAssistant.enabled ? 'enabled' : 'disabled'}`);
      console.log(`   Dealer Persona: ${finalConfig.dealerPersona.enabled ? 'enabled' : 'disabled'}`);
      console.log(`   Model: ${finalConfig.helpAssistant.model}`);
    }

    this.config = finalConfig;
  }

  private mergeConfigs(base: GeminiConfiguration, override: Partial<GeminiConfiguration>): GeminiConfiguration {
    return {
      helpAssistant: {
        ...base.helpAssistant,
        ...override.helpAssistant,
        config: {
          ...base.helpAssistant.config,
          ...override.helpAssistant?.config
        },
        rateLimit: {
          ...base.helpAssistant.rateLimit,
          ...override.helpAssistant?.rateLimit
        }
      },
      dealerPersona: {
        ...base.dealerPersona,
        ...override.dealerPersona,
        config: {
          ...base.dealerPersona.config,
          ...override.dealerPersona?.config
        },
        rateLimit: {
          ...base.dealerPersona.rateLimit,
          ...override.dealerPersona?.rateLimit
        }
      },
      general: {
        ...base.general,
        ...override.general
      }
    };
  }

  public getConfig(): GeminiConfiguration {
    return this.config;
  }

  public getHelpAssistantConfig(): GeminiConfiguration['helpAssistant'] {
    return this.config.helpAssistant;
  }

  public getDealerPersonaConfig(): GeminiConfiguration['dealerPersona'] {
    return this.config.dealerPersona;
  }

  public getGeneralConfig(): GeminiConfiguration['general'] {
    return this.config.general;
  }

  public updateConfig(newConfig: Partial<GeminiConfiguration>): void {
    this.config = this.mergeConfigs(this.config, newConfig);
  }

  public isConfigured(): boolean {
    return !!this.config.general.apiKey;
  }
}

export const geminiConfigManager = GeminiConfigManager.getInstance();