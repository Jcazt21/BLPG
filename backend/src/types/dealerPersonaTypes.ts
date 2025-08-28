/**
 * Tipos para la personalidad del dealer dominicano
 */

export type TonoDealer = 'informal' | 'jocoso' | 'picante' | 'profesional' | 'neutral';

export interface BlackjackDealerPersona {
  nombre: string;
  personalidad: string;
  tono: TonoDealer;
  ejemplo_frases: string[];
  limites_humor: string;
  contexto: string;
}

export interface DealerResponse {
  contenido: string;
  tono_usado: TonoDealer;
  contexto_usado: DealerPromptContext;
  metadata?: {
    modelo?: string;
    tokens?: number;
    timestamp?: number;
  };
}

export interface DealerPromptContext {
  situacion: 'inicio_juego' | 'repartiendo_cartas' | 'jugador_gana' | 'jugador_pierde' | 'blackjack' | 'bust' | 'empate' | 'general';
  jugador_nombre?: string;
  resultado_mano?: string;
  apuesta_cantidad?: number;
  momento_juego?: string;
  cartas_jugador?: string[];
  cartas_dealer?: string[];
  apuesta?: number;
}