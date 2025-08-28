import { ContentGuardrails } from './contentGuardrails';
import { AssistantResponseSchema } from '../../types/assistantTypes';

describe('ContentGuardrails', () => {
  let guardrails: ContentGuardrails;

  beforeEach(() => {
    guardrails = new ContentGuardrails();
  });

  describe('validateContent', () => {
    it('should validate a proper blackjack response', () => {
      const response: AssistantResponseSchema = {
        content: "El As vale 1 u 11 puntos según convenga para tu mano.",
        category: "rules",
        confidence: 0.95,
        isBlackjackRelated: true,
        containsAdvice: false,
        metadata: {
          rulesReferenced: ["valor-as"]
        }
      };

      const result = guardrails.validateContent(response);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedResponse).toEqual(response);
    });

    it('should reject non-blackjack related content', () => {
      const response: AssistantResponseSchema = {
        content: "Hablemos de fútbol en lugar de cartas.",
        category: "redirect",
        confidence: 0.8,
        isBlackjackRelated: false,
        containsAdvice: false
      };

      const result = guardrails.validateContent(response);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Response not blackjack-related');
    });

    it('should reject specific game advice outside strategy category', () => {
      const response: AssistantResponseSchema = {
        content: "Deberías pedir carta con esa mano.",
        category: "rules",
        confidence: 0.9,
        isBlackjackRelated: true,
        containsAdvice: true
      };

      const result = guardrails.validateContent(response);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Contains specific advice outside strategy category');
    });

    it('should reject content that is too long', () => {
      const longContent = "a".repeat(301);
      const response: AssistantResponseSchema = {
        content: longContent,
        category: "rules",
        confidence: 0.9,
        isBlackjackRelated: true,
        containsAdvice: false
      };

      const result = guardrails.validateContent(response);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Response too long (max 300 characters)');
    });

    it('should reject empty content', () => {
      const response: AssistantResponseSchema = {
        content: "",
        category: "rules",
        confidence: 0.9,
        isBlackjackRelated: true,
        containsAdvice: false
      };

      const result = guardrails.validateContent(response);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Response content is empty');
    });

    it('should detect specific advice patterns', () => {
      const advicePatterns = [
        "Deberías pedir carta ahora",
        "Te recomiendo que te plantes",
        "En tu situación es mejor doblar",
        "Con esas cartas debes dividir"
      ];

      advicePatterns.forEach(content => {
        const response: AssistantResponseSchema = {
          content,
          category: "rules",
          confidence: 0.9,
          isBlackjackRelated: true,
          containsAdvice: false
        };

        const result = guardrails.validateContent(response);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Content contains specific game advice');
      });
    });

    it('should detect inappropriate gambling content', () => {
      const gamblingContent = [
        "Puedes apostar dinero real aquí",
        "Este casino online es bueno",
        "Vas a ganar dinero fácil"
      ];

      gamblingContent.forEach(content => {
        const response: AssistantResponseSchema = {
          content,
          category: "rules",
          confidence: 0.9,
          isBlackjackRelated: true,
          containsAdvice: false
        };

        const result = guardrails.validateContent(response);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Content contains inappropriate gambling references');
      });
    });
  });

  describe('sanitizeResponse', () => {
    it('should remove HTML tags', () => {
      const response: AssistantResponseSchema = {
        content: "El As vale <script>alert('hack')</script> 1 u 11 puntos.",
        category: "rules",
        confidence: 0.95,
        isBlackjackRelated: true,
        containsAdvice: false
      };

      const sanitized = guardrails.sanitizeResponse(response);
      expect(sanitized.content).toBe("El As vale  1 u 11 puntos.");
      expect(sanitized.content).not.toContain('<script>');
    });

    it('should remove brackets and code-like content', () => {
      const response: AssistantResponseSchema = {
        content: "El As vale {1 u 11} puntos [según convenga].",
        category: "rules",
        confidence: 0.95,
        isBlackjackRelated: true,
        containsAdvice: false
      };

      const sanitized = guardrails.sanitizeResponse(response);
      expect(sanitized.content).toBe("El As vale 1 u 11 puntos según convenga.");
    });

    it('should truncate long content', () => {
      const longContent = "a".repeat(350);
      const response: AssistantResponseSchema = {
        content: longContent,
        category: "rules",
        confidence: 0.95,
        isBlackjackRelated: true,
        containsAdvice: false
      };

      const sanitized = guardrails.sanitizeResponse(response);
      expect(sanitized.content.length).toBe(300);
      expect(sanitized.content.endsWith('...')).toBe(true);
    });

    it('should replace specific advice with generic response', () => {
      const response: AssistantResponseSchema = {
        content: "Deberías pedir carta con esa mano.",
        category: "rules",
        confidence: 0.95,
        isBlackjackRelated: true,
        containsAdvice: true
      };

      const sanitized = guardrails.sanitizeResponse(response);
      expect(sanitized.content).toBe("No puedo dar consejos específicos sobre tu mano actual, pero puedo explicarte las reglas generales.");
      expect(sanitized.containsAdvice).toBe(false);
    });

    it('should clamp confidence values', () => {
      const response: AssistantResponseSchema = {
        content: "El As vale 1 u 11 puntos.",
        category: "rules",
        confidence: 1.5, // Invalid: > 1
        isBlackjackRelated: true,
        containsAdvice: false
      };

      const sanitized = guardrails.sanitizeResponse(response);
      expect(sanitized.confidence).toBe(1);

      response.confidence = -0.5; // Invalid: < 0
      const sanitized2 = guardrails.sanitizeResponse(response);
      expect(sanitized2.confidence).toBe(0);
    });
  });

  describe('isBlackjackRelated', () => {
    it('should identify blackjack-related questions', () => {
      const blackjackQuestions = [
        "¿Cuánto vale un As?",
        "¿Cómo se juega blackjack?",
        "¿Qué significa doblar?",
        "¿Cuándo puedo dividir cartas?",
        "¿Qué es un blackjack natural?",
        "¿Cómo funciona el seguro?"
      ];

      blackjackQuestions.forEach(question => {
        expect(guardrails.isBlackjackRelated(question)).toBe(true);
      });
    });

    it('should reject non-blackjack questions', () => {
      const nonBlackjackQuestions = [
        "¿Cómo está el clima?",
        "¿Qué hora es?",
        "¿Cómo cocinar pasta?",
        "¿Cuál es la capital de Francia?",
        "¿Cómo funciona un motor?"
      ];

      nonBlackjackQuestions.forEach(question => {
        expect(guardrails.isBlackjackRelated(question)).toBe(false);
      });
    });
  });

  describe('getRedirectMessage', () => {
    it('should return the configured redirect message', () => {
      const message = guardrails.getRedirectMessage();
      expect(message).toBe("Soy un asistente especializado en blackjack. ¿Tienes alguna pregunta sobre las reglas o mecánicas del juego?");
    });
  });

  describe('getAllowedTopics', () => {
    it('should return the list of allowed topics', () => {
      const topics = guardrails.getAllowedTopics();
      expect(topics).toContain('reglas del blackjack');
      expect(topics).toContain('valores de cartas');
      expect(topics).toContain('acciones básicas');
      expect(topics).toContain('estrategia general');
      expect(topics).toContain('mecánicas del juego');
      expect(topics).toContain('terminología');
    });
  });
});