import { DEALER_DOMINICANO } from '../config/dealerPersonaConfig';
import { BlackjackDealerPersona, DealerResponse, DealerPromptContext, TonoDealer } from '../types/dealerPersonaTypes';
import { helpLogger } from '../utils/helpLogger';

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
    _mensaje?: string
  ): Promise<DealerResponse> {
    helpLogger.debug('Generando respuesta del dealer (modo deshabilitado)', {
      contexto: contexto.situacion,
      jugador: contexto.jugador_nombre,
      tono: this.dealerPersona.tono
    });

    // Get a default response based on the situation
    const defaultResponse = this.generarRespuestaFallback(contexto);
    
    helpLogger.info('Respuesta predeterminada del dealer', {
      situacion: contexto.situacion,
      tono: defaultResponse.tono_usado,
      tiempo: Date.now()
    });

    return defaultResponse;
  }

  /**
   * Genera respuesta de fallback cuando la IA está deshabilitada
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
    
    return {
      mensaje,
      tono_usado: this.dealerPersona.tono,
      contexto_situacion: contexto.situacion,
      frase_caracteristica: undefined
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