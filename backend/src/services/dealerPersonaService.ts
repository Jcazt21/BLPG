import { DEALER_DOMINICANO } from '../config/dealerPersonaConfig';
import { geminiConfigManager } from '../config/aiConfig';
import { BlackjackDealerPersona, DealerResponse, DealerPromptContext, TonoDealer } from '../types/dealerPersonaTypes';
import { helpLogger } from '../utils/helpLogger';
import { getGeminiService } from './geminiService';

/**
 * Servicio para manejar la personalidad del dealer dominicano
 */
export class DealerPersonaService {
  private dealerPersona: BlackjackDealerPersona;

  constructor() {
    this.dealerPersona = DEALER_DOMINICANO;
  }

  /**
   * Genera una respuesta del dealer según el contexto
   */
  async generarRespuestaDealer(
    contexto: DealerPromptContext,
    mensaje?: string
  ): Promise<DealerResponse> {
    // Si el servicio de dealer está deshabilitado, usar respuestas predeterminadas
    if (!geminiConfigManager.getDealerPersonaConfig().enabled) {
      helpLogger.debug('Gemini deshabilitado, usando respuestas predeterminadas', {
        contexto: contexto.situacion,
        jugador: contexto.jugador_nombre,
        tono: this.dealerPersona.tono
      });
      return this.generarRespuestaFallback(contexto);
    }

    try {
      const geminiService = getGeminiService();
      
      // Construir el prompt para el dealer
      const prompt = this.construirPrompt(contexto, mensaje);
      
      helpLogger.debug('Solicitando respuesta a Gemini', {
        situacion: contexto.situacion,
        jugador: contexto.jugador_nombre,
        tono: this.dealerPersona.tono
      });

      // Obtener respuesta de Gemini
      const respuesta = await geminiService.generateDealerResponse(prompt, contexto.situacion);
      
      helpLogger.info('Respuesta generada por Gemini', {
        situacion: contexto.situacion,
        tokens_usados: respuesta.usage?.totalTokens,
        tiempo_respuesta: respuesta.responseTime
      });

      return {
        contenido: respuesta.content,
        tono_usado: this.determinarTono(respuesta.content),
        contexto_usado: contexto,
        metadata: {
          modelo: geminiConfigManager.getDealerPersonaConfig().model,
          tokens: respuesta.usage?.totalTokens,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      helpLogger.error('Error al generar respuesta con Gemini', { 
        error: errorObj,
        stack: errorObj.stack
      });
      
      // En caso de error, devolver una respuesta predeterminada
      return this.generarRespuestaFallback(contexto);
    }
  }

  /**
   * Genera respuesta de fallback cuando la IA está deshabilitada
   */
  /**
   * Construye el prompt para el dealer basado en el contexto
   */
  private construirPrompt(contexto: DealerPromptContext, mensaje?: string): string {
    const { situacion, jugador_nombre, cartas_jugador, cartas_dealer, apuesta } = contexto;
    
    let prompt = `Eres ${this.dealerPersona.nombre}, ${this.dealerPersona.personalidad}\n`;
    prompt += `Contexto: ${situacion}\n`;
    
    if (jugador_nombre) prompt += `Jugador: ${jugador_nombre}\n`;
    if (apuesta) prompt += `Apuesta: ${apuesta}\n`;
    if (cartas_jugador?.length) prompt += `Cartas del jugador: ${cartas_jugador.join(', ')}\n`;
    if (cartas_dealer?.length) prompt += `Tus cartas: ${cartas_dealer.join(', ')}\n`;
    if (mensaje) prompt += `Mensaje del jugador: "${mensaje}"\n`;
    
    prompt += `\nResponde de manera ${this.dealerPersona.tono} y breve (máx 25 palabras). `;
    prompt += `Usa expresiones dominicanas como: ${this.dealerPersona.ejemplo_frases.slice(0, 3).join(', ')}`;
    
    return prompt;
  }

  /**
   * Determina el tono de la respuesta basado en el contenido
   */
  private determinarTono(contenido: string): TonoDealer {
    const contenidoLower = contenido.toLowerCase();
    const esJocoso = /(jaj|jej|jij|joj|juj|jeje|jiji|jaja|jajaja|jijiji|jejeje)/.test(contenidoLower);
    return esJocoso ? 'jocoso' : 'neutral';
  }

  /**
   * Genera una respuesta de fallback cuando la IA está deshabilitada o falla
   */
  private generarRespuestaFallback(contexto: DealerPromptContext): DealerResponse {
    const frasesFallback: Record<string, string> = {
      inicio_juego: "¡Eyyy, que tal mi pana! ¿Listos para jugar?",
      repartiendo_cartas: "Ahí van las cartas, a ver qué tal la suerte",
      jugador_gana: "¡Eso sí está bueno! Te felicito",
      jugador_pierde: "No te preocupes, que en la próxima te va mejor",
      blackjack: "¡Blackjack! ¡Tú sí que tienes mano bendita!",
      bust: "Ay no, mi hermano, te pasaste... pero así es esto",
      empate: "Empate, ni tú ni yo. ¡Vamos otra vez!",
      general: "¡Dale que vamos a ver qué sale!"
    };

    const mensaje = frasesFallback[contexto.situacion] || frasesFallback.general;
    
    const respuesta = {
      contenido: mensaje,
      tono_usado: this.dealerPersona.tono,
      contexto_usado: contexto,
      metadata: {
        modelo: 'Fallback',
        timestamp: Date.now()
      }
    };
    return respuesta;
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