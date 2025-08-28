import { ContentGuardrailsConfig, AssistantResponseSchema, ValidationResult } from '../../types/assistantTypes';

/**
 * ContentGuardrails class handles content safety and topic boundaries
 * for the Help Assistant system
 */
export class ContentGuardrails {
  private config: ContentGuardrailsConfig;

  constructor(config?: Partial<ContentGuardrailsConfig>) {
    this.config = {
      noSpecificAdvice: {
        patterns: [
          /deberías (pedir|plantarte|doblar)/i,
          /te recomiendo que/i,
          /en tu situación/i,
          /con esas cartas/i,
          /tu mano actual/i,
          /debes (pedir|plantarte|doblar)/i,
          /tienes que (pedir|plantarte|doblar)/i
        ],
        replacement: "No puedo dar consejos específicos sobre tu mano actual, pero puedo explicarte las reglas generales."
      },
      
      topicBoundaries: {
        allowedTopics: [
          'reglas del blackjack',
          'valores de cartas',
          'acciones básicas',
          'estrategia general',
          'mecánicas del juego',
          'terminología'
        ],
        redirectMessage: "Soy un asistente especializado en blackjack. ¿Tienes alguna pregunta sobre las reglas o mecánicas del juego?"
      },
      
      safetyFilters: {
        profanity: [
          /palabrotas/i,
          /groserías/i,
          /maldiciones/i,
          /insultos/i
        ],
        gambling: [
          /apostar dinero real/i,
          /casino online/i,
          /ganar dinero/i,
          /perder dinero/i,
          /deudas de juego/i,
          /adicción al juego/i
        ],
        financial: [
          /inversión/i,
          /préstamo/i,
          /deuda/i,
          /crédito/i,
          /banco/i,
          /hipoteca/i
        ]
      },
      ...config
    };
  }

  /**
   * Validates if content is appropriate and blackjack-related
   */
  validateContent(response: AssistantResponseSchema): ValidationResult {
    const errors: string[] = [];

    // Check if response is blackjack-related
    if (!response.isBlackjackRelated) {
      errors.push('Response not blackjack-related');
    }

    // Check for specific advice when not allowed
    if (response.containsAdvice && response.category !== 'strategy') {
      errors.push('Contains specific advice outside strategy category');
    }

    // Check content safety filters
    const content = response.content.toLowerCase();
    
    // Check profanity
    for (const filter of this.config.safetyFilters.profanity) {
      if (filter.test(content)) {
        errors.push('Content contains inappropriate language');
        break;
      }
    }

    // Check gambling-related content
    for (const filter of this.config.safetyFilters.gambling) {
      if (filter.test(content)) {
        errors.push('Content contains inappropriate gambling references');
        break;
      }
    }

    // Check financial content
    for (const filter of this.config.safetyFilters.financial) {
      if (filter.test(content)) {
        errors.push('Content contains inappropriate financial references');
        break;
      }
    }

    // Check for specific advice patterns
    for (const pattern of this.config.noSpecificAdvice.patterns) {
      if (pattern.test(content)) {
        errors.push('Content contains specific game advice');
        break;
      }
    }

    // Check length
    if (response.content.length > 300) {
      errors.push('Response too long (max 300 characters)');
    }

    if (response.content.length === 0) {
      errors.push('Response content is empty');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedResponse: errors.length === 0 ? response : undefined
    };
  }

  /**
   * Sanitizes response content by removing unsafe elements
   */
  sanitizeResponse(response: AssistantResponseSchema): AssistantResponseSchema {
    let sanitizedContent = response.content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags and content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[{}[\]]/g, '') // Remove brackets that could be code
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();

    // Truncate if too long
    if (sanitizedContent.length > 300) {
      sanitizedContent = sanitizedContent.substring(0, 297) + '...';
    }

    let containsAdvice = this.containsSpecificAdvice(sanitizedContent);

    // Replace specific advice with generic response
    for (const pattern of this.config.noSpecificAdvice.patterns) {
      if (pattern.test(sanitizedContent)) {
        sanitizedContent = this.config.noSpecificAdvice.replacement;
        containsAdvice = false; // After replacement, it no longer contains advice
        break;
      }
    }

    return {
      ...response,
      content: sanitizedContent,
      confidence: Math.max(0, Math.min(1, response.confidence)), // Clamp 0-1
      containsAdvice
    };
  }

  /**
   * Checks if content contains specific game advice
   */
  private containsSpecificAdvice(content: string): boolean {
    for (const pattern of this.config.noSpecificAdvice.patterns) {
      if (pattern.test(content)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if a question is about blackjack topics
   */
  isBlackjackRelated(question: string): boolean {
    const blackjackKeywords = [
      'blackjack', '21', 'cartas', 'dealer', 'crupier', 'mano',
      'pedir', 'plantarse', 'doblar', 'dividir', 'split',
      'as', 'figura', 'rey', 'reina', 'jota', 'jack',
      'reglas', 'estrategia', 'apostar', 'bet', 'bust',
      'blackjack natural', 'seguro', 'insurance'
    ];

    // Exclude common non-blackjack words that might appear in general questions
    const excludeKeywords = [
      'clima', 'tiempo', 'hora', 'cocinar', 'pasta', 'capital', 'francia', 'motor'
    ];

    const questionLower = question.toLowerCase();
    
    // If it contains exclude keywords, it's likely not about blackjack
    if (excludeKeywords.some(keyword => questionLower.includes(keyword))) {
      return false;
    }

    return blackjackKeywords.some(keyword => questionLower.includes(keyword));
  }

  /**
   * Gets redirect message for non-blackjack topics
   */
  getRedirectMessage(): string {
    return this.config.topicBoundaries.redirectMessage;
  }

  /**
   * Gets allowed topics list
   */
  getAllowedTopics(): string[] {
    return [...this.config.topicBoundaries.allowedTopics];
  }
}