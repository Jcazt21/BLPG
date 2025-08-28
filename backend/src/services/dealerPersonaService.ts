import { GeminiProvider } from './helpAssistant/llmProvider';
import { DEALER_DOMINICANO, DEALER_SYSTEM_PROMPTS, DEALER_MODEL_CONFIG } from '../config/dealerPersonaConfig';
import { BlackjackDealerPersona, DealerResponse, DealerPromptContext, TonoDealer } from '../types/dealerPersonaTypes';
import { aiConfigManager } from '../config/aiConfig';
import { helpLogger } from '../utils/helpLogger';

/**
 * Servicio para manejar la personalidad del dealer dominicano
 */
export class DealerPersonaService {
  private llmProvider: GeminiProvider;
  private dealerPersona: BlackjackDealerPersona;

  constructor(apiKey: string) {
    this.dealerPersona = DEALER_DOMINICANO;
    
    // Usar configuración del aiConfigManager
    const config = aiConfigManager.getDealerPersonaConfig();
    
    this.llmProvider = new GeminiProvider(
      apiKey,
      'gemini-1.5-flash',
      {
        maxTokens: config.model.maxTokens,
        temperature: config.model.temperature
      }
    );
  }

  /**
   * Genera una respuesta del dealer según el contexto
   */
  async generarRespuestaDealer(
    contexto: DealerPromptContext,
    mensaje?: string
  ): Promise<DealerResponse> {
    try {
      const prompt = this.construirPrompt(contexto, mensaje);
      
      helpLogger.debug('Generando respuesta del dealer', {
        contexto: contexto.situacion,
        jugador: contexto.jugador_nombre,
        tono: this.dealerPersona.tono
      });

      const response = await this.llmProvider.generateResponse(prompt, {
        maxTokens: DEALER_MODEL_CONFIG.maxTokens,
        temperature: DEALER_MODEL_CONFIG.temperature
      });

      const dealerResponse: DealerResponse = {
        mensaje: response.content.trim(),
        tono_usado: this.dealerPersona.tono,
        contexto_situacion: contexto.situacion,
        frase_caracteristica: this.extraerFraseCaracteristica(response.content)
      };

      helpLogger.info('Respuesta del dealer generada', {
        situacion: contexto.situacion,
        tono: dealerResponse.tono_usado,
        tokens: response.usage.totalTokens,
        tiempo: Date.now()
      });

      return dealerResponse;

    } catch (error) {
      helpLogger.error('Error generando respuesta del dealer', { error });
      
      // Fallback a respuesta predeterminada
      return this.generarRespuestaFallback(contexto);
    }
  }

  /**
   * Construye el prompt completo para el dealer
   */
  private construirPrompt(contexto: DealerPromptContext, mensaje?: string): string {
    let prompt = DEALER_SYSTEM_PROMPTS.base;
    
    // Agregar contexto específico de la situación
    switch (contexto.situacion) {
      case 'inicio_juego':
        prompt += `\n\n${DEALER_SYSTEM_PROMPTS.inicio_juego}`;
        break;
      case 'repartiendo_cartas':
        prompt += `\n\n${DEALER_SYSTEM_PROMPTS.repartiendo_cartas}`;
        break;
      case 'jugador_gana':
        prompt += `\n\n${DEALER_SYSTEM_PROMPTS.jugador_gana}`;
        break;
      case 'jugador_pierde':
        prompt += `\n\n${DEALER_SYSTEM_PROMPTS.jugador_pierde}`;
        break;
      case 'blackjack':
        prompt += `\n\n${DEALER_SYSTEM_PROMPTS.blackjack}`;
        break;
      case 'bust':
        prompt += `\n\n${DEALER_SYSTEM_PROMPTS.bust}`;
        break;
      case 'empate':
        prompt += `\n\n${DEALER_SYSTEM_PROMPTS.empate}`;
        break;
      default:
        prompt += `\n\n${DEALER_SYSTEM_PROMPTS.general}`;
    }

    // Agregar información específica del contexto
    if (contexto.jugador_nombre) {
      prompt += `\n\nEl jugador se llama: ${contexto.jugador_nombre}`;
    }
    
    if (contexto.resultado_mano) {
      prompt += `\nResultado de la mano: ${contexto.resultado_mano}`;
    }
    
    if (contexto.apuesta_cantidad) {
      prompt += `\nCantidad apostada: $${contexto.apuesta_cantidad}`;
    }
    
    if (contexto.momento_juego) {
      prompt += `\nMomento del juego: ${contexto.momento_juego}`;
    }

    // Agregar mensaje del usuario si existe
    if (mensaje) {
      prompt += `\n\nEl jugador dice: "${mensaje}"`;
    }

    prompt += `\n\nResponde como ${this.dealerPersona.nombre} en máximo 2-3 oraciones, usando tu personalidad dominicana natural:`;

    return prompt;
  }

  /**
   * Extrae una frase característica de la respuesta
   */
  private extraerFraseCaracteristica(respuesta: string): string | undefined {
    const frasesCaracteristicas = this.dealerPersona.ejemplo_frases;
    
    for (const frase of frasesCaracteristicas) {
      // Buscar palabras clave de las frases características
      const palabrasClave = frase.toLowerCase().split(' ').filter(p => p.length > 3);
      const respuestaLower = respuesta.toLowerCase();
      
      if (palabrasClave.some(palabra => respuestaLower.includes(palabra))) {
        return frase;
      }
    }
    
    return undefined;
  }

  /**
   * Genera respuesta de fallback cuando falla la IA
   */
  private generarRespuestaFallback(contexto: DealerPromptContext): DealerResponse {
    const frasesFallback = {
      inicio_juego: "¡Eyyy, que tal mi pana! ¿Listos para jugar?",
      repartiendo_cartas: "Ahí van las cartas, a ver qué tal la suerte",
      jugador_gana: "¡Eso sí está bueno! Te felicito",
      jugador_pierde: "No te preocupes, que en la próxima te va mejor",
      blackjack: "¡Blackjack! ¡Tú sí que tienes mano bendita!",
      bust: "Ay no, mi hermano, te pasaste... pero así es esto",
      empate: "Empate, ni tú ni yo. ¡Vamos otra vez!",
      general: "¡Dale que vamos a ver qué sale!"
    };

    return {
      mensaje: frasesFallback[contexto.situacion] || frasesFallback.general,
      tono_usado: this.dealerPersona.tono,
      contexto_situacion: contexto.situacion
    };
  }

  /**
   * Obtiene información del dealer
   */
  public getDealerInfo(): BlackjackDealerPersona {
    return this.dealerPersona;
  }

  /**
   * Cambia el tono del dealer temporalmente
   */
  public cambiarTono(nuevoTono: TonoDealer): void {
    this.dealerPersona.tono = nuevoTono;
    helpLogger.info('Tono del dealer cambiado', { nuevoTono });
  }
}