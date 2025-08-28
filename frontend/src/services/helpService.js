import { ConfigManager } from '../config/environment';

class HelpService {
  constructor() {
    this.config = ConfigManager.getConfig();
    this.baseUrl = `${this.config.API_URL}/help`;
  }

  /**
   * Get help system status
   */
  async getStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting help status:', error);
      throw error;
    }
  }

  /**
   * Send a question to the help assistant (fallback for when WebSocket fails)
   */
  async askQuestion(question, sessionId) {
    try {
      const response = await fetch(`${this.baseUrl}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
          sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error asking question:', error);
      throw error;
    }
  }

  /**
   * Get predefined help topics (for fallback scenarios)
   */
  async getHelpTopics() {
    try {
      const response = await fetch(`${this.baseUrl}/topics`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting help topics:', error);
      // Return fallback topics
      return {
        topics: [
          {
            id: 'rules',
            title: 'Reglas del Blackjack',
            description: 'Aprende las reglas básicas del blackjack'
          },
          {
            id: 'strategy',
            title: 'Estrategia Básica',
            description: 'Conceptos fundamentales de estrategia'
          },
          {
            id: 'betting',
            title: 'Sistema de Apuestas',
            description: 'Cómo funcionan las apuestas en el juego'
          },
          {
            id: 'actions',
            title: 'Acciones del Juego',
            description: 'Hit, Stand, Double Down, Split'
          }
        ]
      };
    }
  }

  /**
   * Validate if a question is appropriate for the help system
   */
  validateQuestion(question) {
    const trimmed = question.trim();
    
    if (trimmed.length < 1) {
      return { valid: false, error: 'La pregunta no puede estar vacía' };
    }
    
    if (trimmed.length > 500) {
      return { valid: false, error: 'La pregunta es demasiado larga (máximo 500 caracteres)' };
    }
    
    // Basic content validation (could be enhanced)
    const inappropriatePatterns = [
      /\b(hack|cheat|trampa|truco)\b/i,
      /\b(dinero real|apostar dinero|casino online)\b/i,
      /\b(personal|privado|contacto)\b/i
    ];
    
    for (const pattern of inappropriatePatterns) {
      if (pattern.test(trimmed)) {
        return { 
          valid: false, 
          error: 'Esta pregunta no está relacionada con las reglas del blackjack' 
        };
      }
    }
    
    return { valid: true };
  }

  /**
   * Get fallback response for common questions
   */
  getFallbackResponse(question) {
    const lowerQuestion = question.toLowerCase();
    
    const fallbacks = [
      {
        keywords: ['hola', 'hello', 'hi', 'ayuda', 'help'],
        response: '¡Hola! Soy tu asistente de blackjack. Puedo ayudarte con reglas, estrategias básicas y mecánicas del juego. ¿Qué te gustaría saber?'
      },
      {
        keywords: ['reglas', 'rules', 'cómo se juega', 'como jugar', 'como funciona'],
        response: 'El blackjack busca llegar a 21 puntos sin pasarse. Las cartas 2-10 valen su número, las figuras (J, Q, K) valen 10, y el As vale 1 u 11. Ganas si tienes más puntos que el dealer sin pasarte de 21.'
      },
      {
        keywords: ['estrategia', 'strategy', 'qué hacer', 'que hacer', 'cuando', 'cuándo'],
        response: 'Estrategia básica: Pide carta con 11 o menos (nunca te pasarás). Plántate con 17 o más. Con 12-16, depende de la carta visible del dealer: si tiene 2-6, plántate; si tiene 7 o más, pide carta.'
      },
      {
        keywords: ['hit', 'pedir', 'carta', 'más cartas'],
        response: 'Hit significa pedir una carta adicional. Puedes pedir tantas cartas como quieras mientras tu total sea menor a 21. Si te pasas de 21, pierdes automáticamente.'
      },
      {
        keywords: ['stand', 'plantarse', 'quedarse', 'parar'],
        response: 'Stand significa plantarse con tus cartas actuales y no pedir más. Es recomendable plantarse con 17 o más puntos, o cuando creas que tienes una buena mano.'
      },
      {
        keywords: ['double', 'doblar', 'double down'],
        response: 'Double Down te permite doblar tu apuesta inicial y recibir exactamente una carta más. Solo está disponible con tus primeras dos cartas y es una buena opción con 10 u 11 puntos.'
      },
      {
        keywords: ['split', 'dividir', 'separar', 'par'],
        response: 'Split te permite dividir un par (dos cartas iguales) en dos manos separadas. Cada mano se juega independientemente y requiere una apuesta adicional igual a la original.'
      },
      {
        keywords: ['as', 'ace', 'valor', 'ases'],
        response: 'El As es especial: vale 1 u 11 puntos, lo que sea mejor para tu mano. Si tienes As + 10, es blackjack (21 natural). El As se cuenta como 11 hasta que te pasarías de 21.'
      },
      {
        keywords: ['dealer', 'crupier', 'casa'],
        response: 'El dealer debe pedir carta con 16 o menos y plantarse con 17 o más. El dealer juega después que todos los jugadores. Si el dealer se pasa de 21, todos los jugadores que no se hayan pasado ganan.'
      },
      {
        keywords: ['blackjack', '21', 'natural'],
        response: 'Blackjack es cuando tus primeras dos cartas suman exactamente 21 (As + carta de 10 puntos). Es la mejor mano posible y normalmente paga 3:2 en lugar de 1:1.'
      },
      {
        keywords: ['bust', 'pasarse', 'más de 21'],
        response: 'Bust significa pasarse de 21 puntos. Si te pasas, pierdes automáticamente sin importar qué tenga el dealer. Por eso es importante ser cuidadoso al pedir cartas.'
      },
      {
        keywords: ['ganar', 'win', 'victoria'],
        response: 'Ganas en blackjack si: 1) Tienes blackjack y el dealer no, 2) Tu total es mayor al del dealer sin pasarte de 21, o 3) El dealer se pasa de 21 y tú no.'
      },
      {
        keywords: ['empate', 'tie', 'push'],
        response: 'Empate (Push) ocurre cuando tú y el dealer tienen el mismo total. En este caso, recuperas tu apuesta original sin ganar ni perder dinero adicional.'
      }
    ];
    
    // Find matching response
    for (const fallback of fallbacks) {
      if (fallback.keywords.some(keyword => lowerQuestion.includes(keyword))) {
        return fallback.response;
      }
    }
    
    // Default response with helpful suggestions
    return 'No estoy seguro de cómo responder a esa pregunta específica. Puedo ayudarte con:\n\n• Reglas básicas del blackjack\n• Estrategias de juego\n• Acciones como Hit, Stand, Double, Split\n• Valores de las cartas\n• Cómo ganar o perder\n\n¿Sobre qué te gustaría saber más?';
  }
}

// Export singleton instance
export default new HelpService();