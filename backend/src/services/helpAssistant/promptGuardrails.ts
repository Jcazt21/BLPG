import { PromptGuardrailsConfig, AssistantResponseSchema, GuardedFallback } from '../../types/assistantTypes';
import { DEALER_DOMINICANO, DEALER_SYSTEM_PROMPTS, DEALER_MODEL_CONFIG } from '../../config/dealerPersonaConfig';

/**
 * PromptGuardrails manages system prompts, restrictions, and fallback responses
 * for the Help Assistant system
 */
export class PromptGuardrails {
  private config: PromptGuardrailsConfig;
  private fallbacks: GuardedFallback[];

  constructor(config?: Partial<PromptGuardrailsConfig>) {
    this.config = {
      systemPrompt: DEALER_SYSTEM_PROMPTS.base,
      
      responseFormat: `
Responde ÚNICAMENTE en este formato JSON:
{
  "content": "Tu respuesta aquí (máximo 300 caracteres)",
  "category": "rules|strategy|betting|mechanics|redirect",
  "confidence": 0.95,
  "isBlackjackRelated": true,
  "containsAdvice": false,
  "metadata": {
    "rulesReferenced": ["regla1", "regla2"]
  }
}
`,
      
      restrictions: [
        "No dar consejos específicos de mano",
        "No revelar información oculta",
        "No discutir dinero real",
        "Solo temas de blackjack",
        "Máximo 300 caracteres",
        "Formato JSON obligatorio"
      ],
      
      examples: [
        {
          input: "¿Cuánto vale un As?",
          output: {
            content: "¡Eeeeh, mi hermano! El As vale 1 u 11 punto', lo que te convenga má' sin pasarte de 21.",
            category: "rules",
            confidence: 1.0,
            isBlackjackRelated: true,
            containsAdvice: false,
            metadata: {
              rulesReferenced: ["valor-as", "suma-cartas"]
            }
          }
        },
        {
          input: "¿Qué hago con mi mano?",
          output: {
            content: "¡Tranquilo, tigre! No te doy consejo específico, pero puedo explicarte las opcione': pedir, plantarse, doblar o dividir.",
            category: "redirect",
            confidence: 0.9,
            isBlackjackRelated: true,
            containsAdvice: false,
            metadata: {
              redirectReason: "no-specific-advice"
            }
          }
        }
      ],
      ...config
    };

    this.fallbacks = [
      // SALUDOS Y PRESENTACIÓN
      {
        trigger: /hola|saludos|buenas|que tal/i,
        response: {
          content: "Klk pana, tamo ready pa' echalno un blackjack bacano, qué lo qué?",
          category: "redirect",
          confidence: 1.0,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { redirectReason: "greeting" }
        },
        priority: 1
      },
      {
        trigger: /klk|que lo que|qué lo que/i,
        response: {
          content: "¡Klk, qué lo qué, tiguere! Soy Javi, tu dealer del Malecón. ¿Listo pa' aprender blackjack o qué?",
          category: "redirect",
          confidence: 1.0,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { redirectReason: "greeting" }
        },
        priority: 1
      },
      
      // REGLAS BÁSICAS
      {
        trigger: /objetivo|como ganar|como se gana|meta/i,
        response: {
          content: "Socio, el objetivo e' sacal 21 o acercarte má que la casa sin pasarte, ¡tá fácil!",
          category: "rules",
          confidence: 1.0,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { rulesReferenced: ["objetivo"] }
        },
        priority: 1
      },
      {
        trigger: /reglas|como se juega|juego/i,
        response: {
          content: "Pana, el blackjack e' sacá 21 o menos, ganale a la casa sin pasarte, ¿okey?",
          category: "rules",
          confidence: 1.0,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { rulesReferenced: ["basic_rules"] }
        },
        priority: 1
      },
      {
        trigger: /valores|cuanto vale|valor de carta/i,
        response: {
          content: "La carta del 2 al 10 valen lo mismo, J, Q, K valen 10, y el As 1 u 11, ¡tá claro!",
          category: "rules",
          confidence: 0.9,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { rulesReferenced: ["card_values"] }
        },
        priority: 2
      },
      {
        trigger: /blackjack|21/i,
        response: {
          content: "Diablo, un blackjack e' un As con 10, J, Q o K, ¡te pagamo 3 a 2, tiguere!",
          category: "rules",
          confidence: 1.0,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { rulesReferenced: ["blackjack"] }
        },
        priority: 1
      },
      
      // MECÁNICAS DEL JUEGO
      {
        trigger: /doblar|double/i,
        response: {
          content: "Doblá la apuesta si tá confiado, pero solo te damo una carta má, ¡cuidáo!",
          category: "mechanics",
          confidence: 0.9,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { rulesReferenced: ["double_down"] }
        },
        priority: 2
      },
      {
        trigger: /dividir|split/i,
        response: {
          content: "Si tené do' carta iguale, dividí y jugá do' mano, pero ponle otra apuesta, ¡wao!",
          category: "mechanics",
          confidence: 0.9,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { rulesReferenced: ["split"] }
        },
        priority: 2
      },
      {
        trigger: /plantarse|stand|me planto/i,
        response: {
          content: "Tá bueno, te plantá y la casa juega, a vel si le gana al tiguere, ¡suerte!",
          category: "mechanics",
          confidence: 0.9,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { rulesReferenced: ["stand"] }
        },
        priority: 2
      },
      {
        trigger: /pedir carta|hit|otra carta|pedir/i,
        response: {
          content: "Pana, pedí otra carta, pero ojo, si te pasa de 21, te jodite, ¡jeje!",
          category: "mechanics",
          confidence: 0.9,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { rulesReferenced: ["hit"] }
        },
        priority: 2
      },
      
      // SOBRE EL DEALER
      {
        trigger: /dealer|casa|crupier/i,
        response: {
          content: "La casa juega última y se planta en 17 o má, ¡a vel si me gana, socio!",
          category: "rules",
          confidence: 0.9,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { rulesReferenced: ["dealer_rules"] }
        },
        priority: 2
      },
      
      // APUESTAS
      {
        trigger: /apuesta|apostar|dinero/i,
        response: {
          content: "Echá tu apuesta, tiguere, y jugamo, pa' detalle chequea las regla del casino, ¡klk!",
          category: "betting",
          confidence: 0.8,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { redirectReason: "betting_rules" }
        },
        priority: 3
      },
      
      // ESTRATEGIA
      {
        trigger: /estrategia|como mejorar|consejo/i,
        response: {
          content: "Pana, aprendé las jugada básica, pero no te damo consejito específico, ¡tú sabe!",
          category: "strategy",
          confidence: 0.8,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { strategyConcepts: ["basic_strategy"] }
        },
        priority: 3
      },
      {
        trigger: /ganar|perder|como gano/i,
        response: {
          content: "Pa' ganá, saca má que la casa sin pasarte de 21, si no, te quedaste, ¡diablo!",
          category: "rules",
          confidence: 1.0,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { rulesReferenced: ["win_conditions"] }
        },
        priority: 1
      },
      
      // INTERACCIONES VARIAS
      {
        trigger: /suerte|buena suerte/i,
        response: {
          content: "Wao, gracias socio, pero en eto la suerte e' solo una parte, ¡a jugal bacano!",
          category: "redirect",
          confidence: 0.8,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { redirectReason: "greeting" }
        },
        priority: 3
      },
      {
        trigger: /gracias|thank you/i,
        response: {
          content: "De ná, tiguere, tamo pa' ayudarte a rompela en el blackjack, ¡chévere!",
          category: "redirect",
          confidence: 0.8,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { redirectReason: "acknowledgment" }
        },
        priority: 3
      },
      {
        trigger: /seguro|insurance/i,
        response: {
          content: "Si la casa muestra un As, podé apostá un seguro, pero cuidado, ¡e' opcional!",
          category: "mechanics",
          confidence: 0.9,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { rulesReferenced: ["insurance"] }
        },
        priority: 2
      },
      {
        trigger: /rendirse|surrender|me rindo|rindo/i,
        response: {
          content: "Si tá feo, podé rendirte y salvá la mitad de la apuesta, ¡pero no te acobarde, jeje!",
          category: "mechanics",
          confidence: 0.9,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { rulesReferenced: ["surrender"] }
        },
        priority: 2
      },
      {
        trigger: /empate|tie|push/i,
        response: {
          content: "Si empatamo, nadie gana ni pierde, te devolvemo la apuesta, ¡tá bien!",
          category: "rules",
          confidence: 0.9,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { rulesReferenced: ["push"] }
        },
        priority: 2
      },
      {
        trigger: /carta boca abajo|hole card/i,
        response: {
          content: "La casa tiene una carta boca abajo, se revela al final, ¡a vel si te pongo en apuro!",
          category: "rules",
          confidence: 0.9,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { rulesReferenced: ["hole_card"] }
        },
        priority: 2
      },
      {
        trigger: /bust|pasarse|me pase|pase de 21/i,
        response: {
          content: "Coño, si te pasa de 21, te bustea y pierde, ¡cuidáo con pedí mucha carta!",
          category: "rules",
          confidence: 0.9,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { rulesReferenced: ["bust"] }
        },
        priority: 2
      },
      
      // CONSEJOS ESPECÍFICOS - REDIRECT
      {
        trigger: /qué hago|qué debo|que hago|que debo/i,
        response: {
          content: "¡Tranquilo, tigre! No te doy consejo específico, pero puedo explicarte las opcione: pedir, plantarse, doblar o dividir.",
          category: "redirect",
          confidence: 0.9,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { redirectReason: "no-specific-advice" }
        },
        priority: 2
      }
    ];
  }

  /**
   * Generates the complete system prompt for the LLM
   */
  getSystemPrompt(): string {
    return this.config.systemPrompt;
  }

  /**
   * Gets the response format instructions
   */
  getResponseFormat(): string {
    return this.config.responseFormat;
  }

  /**
   * Gets the list of restrictions
   */
  getRestrictions(): string[] {
    return [...this.config.restrictions];
  }

  /**
   * Gets example interactions for few-shot prompting
   */
  getExamples(): Array<{ input: string; output: AssistantResponseSchema }> {
    return [...this.config.examples];
  }

  /**
   * Builds a complete prompt with system instructions, format, and user question
   */
  buildPrompt(userQuestion: string): string {
    const examples = this.config.examples
      .map(ex => `Usuario: ${ex.input}\nAsistente: ${JSON.stringify(ex.output, null, 2)}`)
      .join('\n\n');

    return `${this.config.systemPrompt}

${this.config.responseFormat}

EJEMPLOS:
${examples}

PREGUNTA DEL USUARIO:
${userQuestion}

RESPUESTA (JSON únicamente):`;
  }

  /**
   * Finds a fallback response for a given question
   */
  findFallbackResponse(question: string): AssistantResponseSchema | null {
    const matchingFallbacks = this.fallbacks
      .filter(fallback => fallback.trigger.test(question))
      .sort((a, b) => a.priority - b.priority);

    return matchingFallbacks.length > 0 ? matchingFallbacks[0].response : null;
  }

  /**
   * Gets a generic fallback response when no specific match is found
   */
  getGenericFallback(): AssistantResponseSchema {
    return {
      content: "¡Klk, mi pana! Soy Javi, tu dealer del Malecón. Puedo ayudarte con las regla', valore' de carta', y mecánica' del blackjack.",
      category: "redirect",
      confidence: 0.8,
      isBlackjackRelated: true,
      containsAdvice: false,
      metadata: {
        redirectReason: "generic-help"
      }
    };
  }

  /**
   * Adds a new fallback response
   */
  addFallback(trigger: RegExp, response: AssistantResponseSchema, priority: number = 5): void {
    this.fallbacks.push({ trigger, response, priority });
    this.fallbacks.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Updates the system prompt
   */
  updateSystemPrompt(newPrompt: string): void {
    this.config.systemPrompt = newPrompt;
  }

  /**
   * Adds a new example for few-shot learning
   */
  addExample(input: string, output: AssistantResponseSchema): void {
    this.config.examples.push({ input, output });
  }

  /**
   * Validates that a prompt doesn't contain injection attempts
   */
  validatePromptSafety(userInput: string): boolean {
    const dangerousPatterns = [
      /ignore\s+previous\s+instructions/i,
      /forget\s+everything/i,
      /you\s+are\s+now/i,
      /new\s+role/i,
      /system\s*:/i,
      /assistant\s*:/i,
      /<\s*script/i,
      /javascript\s*:/i,
      /eval\s*\(/i,
      /function\s*\(/i
    ];

    return !dangerousPatterns.some(pattern => pattern.test(userInput));
  }

  /**
   * Sanitizes user input to prevent prompt injection
   */
  sanitizeUserInput(input: string): string {
    return input
      .replace(/system\s*:/gi, 'sistema:')
      .replace(/assistant\s*:/gi, 'asistente:')
      .replace(/ignore\s+previous/gi, 'ignorar anterior')
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .trim()
      .substring(0, 500); // Limit length
  }
}