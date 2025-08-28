import { GoogleGenerativeAI, GenerativeModel, GenerationConfig, SafetySetting } from '@google/generative-ai';
import { geminiConfigManager, GeminiConfiguration } from '../config/aiConfig';

export interface GeminiResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
  responseTime: number;
}

export interface GeminiRequestOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  safetySettings?: SafetySetting[];
  timeout?: number;
}

/**
 * Servicio optimizado exclusivamente para Gemini
 * Maneja todas las interacciones con la API de Gemini de forma eficiente
 */
export class GeminiService {
  private client: GoogleGenerativeAI;
  private config: GeminiConfiguration;
  private models: Map<string, GenerativeModel> = new Map();

  constructor() {
    this.config = geminiConfigManager.getConfig();
    
    if (!this.config.general.apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }

    this.client = new GoogleGenerativeAI(this.config.general.apiKey);
    this.initializeModels();
  }

  private initializeModels(): void {
    // Pre-inicializar los modelos más usados
    const helpModel = this.client.getGenerativeModel({ 
      model: this.config.helpAssistant.model 
    });
    const dealerModel = this.client.getGenerativeModel({ 
      model: this.config.dealerPersona.model 
    });

    this.models.set('help', helpModel);
    this.models.set('dealer', dealerModel);

    console.log('✅ Gemini models initialized');
    console.log(`   Help model: ${this.config.helpAssistant.model}`);
    console.log(`   Dealer model: ${this.config.dealerPersona.model}`);
  }

  /**
   * Genera respuesta de ayuda optimizada para preguntas de blackjack
   */
  async generateHelpResponse(prompt: string, options?: GeminiRequestOptions): Promise<GeminiResponse> {
    const model = this.models.get('help')!;
    const config = this.config.helpAssistant.config;

    const generationConfig: GenerationConfig = {
      temperature: options?.temperature ?? config.temperature,
      maxOutputTokens: options?.maxTokens ?? config.maxTokens,
      topP: options?.topP ?? config.topP,
      topK: options?.topK ?? config.topK,
    };

    const safetySettings = options?.safetySettings ?? config.safetySettings?.map(setting => ({
      category: setting.category as any,
      threshold: setting.threshold as any
    }));

    return this.generateResponse(model, prompt, generationConfig, safetySettings, 'help');
  }

  /**
   * Genera respuesta del dealer con personalidad dominicana
   */
  async generateDealerResponse(prompt: string, situacion: string = 'general', options?: GeminiRequestOptions): Promise<GeminiResponse> {
    const model = this.models.get('dealer')!;
    const config = this.config.dealerPersona.config;

    // Importar la configuración del dealer dominicano
    const { DEALER_SYSTEM_PROMPTS } = await import('../config/dealerPersonaConfig');

    // Construir el prompt completo con la personalidad del dealer
    const systemPrompt = DEALER_SYSTEM_PROMPTS.base;
    const situacionPrompt = DEALER_SYSTEM_PROMPTS[situacion as keyof typeof DEALER_SYSTEM_PROMPTS] || DEALER_SYSTEM_PROMPTS.general;
    
    const fullPrompt = `${systemPrompt}

${situacionPrompt}

Situación: ${prompt}

Responde como Miguel 'El Tigre' Santana en máximo 2-3 oraciones, usando tu personalidad dominicana natural:`;

    const generationConfig: GenerationConfig = {
      temperature: options?.temperature ?? config.temperature,
      maxOutputTokens: options?.maxTokens ?? config.maxTokens,
      topP: options?.topP ?? config.topP,
      topK: options?.topK ?? config.topK,
    };

    const safetySettings = options?.safetySettings ?? config.safetySettings?.map(setting => ({
      category: setting.category as any,
      threshold: setting.threshold as any
    }));

    return this.generateResponse(model, fullPrompt, generationConfig, safetySettings, 'dealer');
  }

  /**
   * Método genérico para generar respuestas con reintentos automáticos
   */
  private async generateResponse(
    model: GenerativeModel,
    prompt: string,
    generationConfig: GenerationConfig,
    safetySettings?: SafetySetting[],
    type: 'help' | 'dealer' = 'help'
  ): Promise<GeminiResponse> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.general.retryAttempts; attempt++) {
      try {
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig,
          safetySettings
        });

        const response = result.response;
        const responseText = response.text();
        const responseTime = Date.now() - startTime;

        if (!responseText) {
          throw new Error('Empty response from Gemini API');
        }

        // Estimación de tokens (Gemini no siempre proporciona conteos exactos)
        const promptTokens = Math.ceil(prompt.length / 4);
        const completionTokens = Math.ceil(responseText.length / 4);
        const totalTokens = promptTokens + completionTokens;

        console.log(`✅ Gemini ${type} response generated in ${responseTime}ms (${totalTokens} tokens)`);

        return {
          content: responseText,
          usage: {
            promptTokens,
            completionTokens,
            totalTokens
          },
          model: type === 'help' ? this.config.helpAssistant.model : this.config.dealerPersona.model,
          finishReason: response.candidates?.[0]?.finishReason || 'stop',
          responseTime
        };

      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️  Gemini attempt ${attempt}/${this.config.general.retryAttempts} failed:`, error);

        if (attempt < this.config.general.retryAttempts) {
          const delay = this.config.general.retryDelay * attempt;
          console.log(`   Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Gemini API failed after ${this.config.general.retryAttempts} attempts: ${lastError?.message}`);
  }

  /**
   * Verifica si el servicio está disponible
   */
  async isAvailable(): Promise<boolean> {
    try {
      const model = this.models.get('help')!;
      const result = await model.generateContent('Test');
      return !!result.response.text();
    } catch (error) {
      console.warn('Gemini availability check failed:', error);
      return false;
    }
  }

  /**
   * Obtiene información del modelo
   */
  getModelInfo(): { helpModel: string; dealerModel: string; apiKeyConfigured: boolean } {
    return {
      helpModel: this.config.helpAssistant.model,
      dealerModel: this.config.dealerPersona.model,
      apiKeyConfigured: !!this.config.general.apiKey
    };
  }

  /**
   * Actualiza la configuración en tiempo real
   */
  updateConfig(newConfig: Partial<GeminiConfiguration>): void {
    geminiConfigManager.updateConfig(newConfig);
    this.config = geminiConfigManager.getConfig();
    
    // Re-inicializar modelos si es necesario
    if (newConfig.helpAssistant?.model || newConfig.dealerPersona?.model) {
      this.initializeModels();
    }
  }
}

// Singleton instance
let geminiServiceInstance: GeminiService | null = null;

export function getGeminiService(): GeminiService {
  if (!geminiServiceInstance) {
    try {
      geminiServiceInstance = new GeminiService();
    } catch (error) {
      console.error('Failed to initialize Gemini service:', error);
      throw error;
    }
  }
  return geminiServiceInstance;
}

export function isGeminiConfigured(): boolean {
  return geminiConfigManager.isConfigured();
}