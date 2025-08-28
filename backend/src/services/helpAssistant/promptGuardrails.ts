import { PromptGuardrailsConfig, AssistantResponseSchema, GuardedFallback } from '../../types/assistantTypes';

/**
 * PromptGuardrails manages system prompts, restrictions, and fallback responses
 * for the Help Assistant system
 */
export class PromptGuardrails {
  private config: PromptGuardrailsConfig;
  private fallbacks: GuardedFallback[];

  constructor(config?: Partial<PromptGuardrailsConfig>) {
    this.config = {
      systemPrompt: `
Eres un asistente especializado en blackjack. Tu único propósito es ayudar a los jugadores a entender las reglas y mecánicas básicas del blackjack.

RESTRICCIONES ESTRICTAS:
1. SOLO responde preguntas sobre blackjack
2. NO des consejos específicos sobre manos actuales
3. NO reveles información sobre cartas ocultas
4. NO discutas apuestas con dinero real
5. NO proporciones estrategias de conteo de cartas
6. Mantén respuestas bajo 300 caracteres
7. Usa tono profesional y amigable
8. Responde en español neutro

FORMATO DE RESPUESTA:
Debes responder SIEMPRE en formato JSON válido según el schema proporcionado.
`,
      
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
            content: "El As vale 1 u 11 puntos, lo que sea más conveniente para tu mano sin pasarte de 21.",
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
            content: "No puedo aconsejarte sobre tu mano específica, pero puedo explicarte las opciones: pedir, plantarse, doblar o dividir.",
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
      {
        trigger: /reglas|rules|cómo se juega|como se juega/i,
        response: {
          content: "El blackjack busca llegar a 21 sin pasarse. Cartas 2-10 valen su número, figuras valen 10, As vale 1 u 11.",
          category: "rules",
          confidence: 1.0,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { rulesReferenced: ["objetivo", "valores-cartas"] }
        },
        priority: 1
      },
      {
        trigger: /qué hago|qué debo|consejo|que hago|que debo/i,
        response: {
          content: "No doy consejos específicos, pero puedo explicarte las opciones: pedir carta, plantarse, doblar o dividir.",
          category: "redirect",
          confidence: 0.9,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { redirectReason: "no-specific-advice" }
        },
        priority: 2
      },
      {
        trigger: /valores|valor|cartas/i,
        response: {
          content: "Cartas 2-10 valen su número, J/Q/K valen 10, As vale 1 u 11 según convenga.",
          category: "rules",
          confidence: 1.0,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { rulesReferenced: ["valores-cartas"] }
        },
        priority: 1
      },
      {
        trigger: /doblar|double|down/i,
        response: {
          content: "Doblar significa duplicar tu apuesta y recibir exactamente una carta más, luego te plantas automáticamente.",
          category: "mechanics",
          confidence: 1.0,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { rulesReferenced: ["doblar"] }
        },
        priority: 1
      },
      {
        trigger: /dividir|split|separar/i,
        response: {
          content: "Puedes dividir cuando tienes dos cartas iguales, creando dos manos separadas con apuestas independientes.",
          category: "mechanics",
          confidence: 1.0,
          isBlackjackRelated: true,
          containsAdvice: false,
          metadata: { rulesReferenced: ["dividir"] }
        },
        priority: 1
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
      content: "Soy un asistente de blackjack. Puedo ayudarte con reglas, valores de cartas, y mecánicas básicas del juego.",
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