import { ResponseValidator } from './responseValidator';
import { ContentGuardrails } from './contentGuardrails';
import { AssistantResponseSchema } from '../../types/assistantTypes';

describe('ResponseValidator', () => {
  let validator: ResponseValidator;
  let mockGuardrails: jest.Mocked<ContentGuardrails>;

  beforeEach(() => {
    mockGuardrails = {
      validateContent: jest.fn(),
      sanitizeResponse: jest.fn(),
      isBlackjackRelated: jest.fn(),
      getRedirectMessage: jest.fn(),
      getAllowedTopics: jest.fn()
    } as any;

    validator = new ResponseValidator(mockGuardrails);
  });

  describe('validateSchema', () => {
    it('should validate a correct response schema', () => {
      const validResponse = {
        content: "El As vale 1 u 11 puntos.",
        category: "rules",
        confidence: 0.95,
        isBlackjackRelated: true,
        containsAdvice: false,
        metadata: {
          rulesReferenced: ["valor-as"]
        }
      };

      const result = validator.validateSchema(validResponse);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedResponse).toEqual(validResponse);
    });

    it('should reject response with missing required fields', () => {
      const invalidResponse = {
        content: "El As vale 1 u 11 puntos.",
        // Missing category, confidence, isBlackjackRelated, containsAdvice
      };

      const result = validator.validateSchema(invalidResponse);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.includes('category'))).toBe(true);
    });

    it('should reject response with invalid category', () => {
      const invalidResponse = {
        content: "El As vale 1 u 11 puntos.",
        category: "invalid-category",
        confidence: 0.95,
        isBlackjackRelated: true,
        containsAdvice: false
      };

      const result = validator.validateSchema(invalidResponse);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('category'))).toBe(true);
    });

    it('should reject response with invalid confidence range', () => {
      const invalidResponse = {
        content: "El As vale 1 u 11 puntos.",
        category: "rules",
        confidence: 1.5, // Invalid: > 1
        isBlackjackRelated: true,
        containsAdvice: false
      };

      const result = validator.validateSchema(invalidResponse);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('confidence'))).toBe(true);
    });

    it('should reject response with content containing forbidden characters', () => {
      const invalidResponse = {
        content: "El As vale <script>alert('hack')</script> puntos.",
        category: "rules",
        confidence: 0.95,
        isBlackjackRelated: true,
        containsAdvice: false
      };

      const result = validator.validateSchema(invalidResponse);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('pattern') || error.includes('content'))).toBe(true);
    });

    it('should reject response with content too long', () => {
      const longContent = "a".repeat(301);
      const invalidResponse = {
        content: longContent,
        category: "rules",
        confidence: 0.95,
        isBlackjackRelated: true,
        containsAdvice: false
      };

      const result = validator.validateSchema(invalidResponse);
      expect(result.isValid).toBe(false);
      console.log('Validation errors:', result.errors);
      expect(result.errors.some(error => error.includes('maxLength') || error.includes('maximum') || error.includes('must NOT have more than'))).toBe(true);
    });

    it('should reject response with empty content', () => {
      const invalidResponse = {
        content: "",
        category: "rules",
        confidence: 0.95,
        isBlackjackRelated: true,
        containsAdvice: false
      };

      const result = validator.validateSchema(invalidResponse);
      expect(result.isValid).toBe(false);
      console.log('Validation errors:', result.errors);
      expect(result.errors.some(error => error.includes('minLength') || error.includes('minimum') || error.includes('must NOT have fewer than'))).toBe(true);
    });

    it('should validate metadata structure when present', () => {
      const validResponse = {
        content: "El As vale 1 u 11 puntos.",
        category: "rules",
        confidence: 0.95,
        isBlackjackRelated: true,
        containsAdvice: false,
        metadata: {
          rulesReferenced: ["valor-as", "suma-cartas"],
          strategyConcepts: ["flexibilidad-as"],
          redirectReason: "explanation"
        }
      };

      const result = validator.validateSchema(validResponse);
      expect(result.isValid).toBe(true);
    });

    it('should reject metadata with too many items in arrays', () => {
      const invalidResponse = {
        content: "El As vale 1 u 11 puntos.",
        category: "rules",
        confidence: 0.95,
        isBlackjackRelated: true,
        containsAdvice: false,
        metadata: {
          rulesReferenced: ["rule1", "rule2", "rule3", "rule4", "rule5", "rule6"], // Max 5
          strategyConcepts: ["concept1", "concept2", "concept3", "concept4"] // Max 3
        }
      };

      const result = validator.validateSchema(invalidResponse);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateContent', () => {
    it('should call content guardrails validation', () => {
      const response: AssistantResponseSchema = {
        content: "El As vale 1 u 11 puntos.",
        category: "rules",
        confidence: 0.95,
        isBlackjackRelated: true,
        containsAdvice: false
      };

      const expectedResult = { isValid: true, errors: [], sanitizedResponse: response };
      mockGuardrails.validateContent.mockReturnValue(expectedResult);

      const result = validator.validateContent(response);
      expect(mockGuardrails.validateContent).toHaveBeenCalledWith(response);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('validateResponse', () => {
    it('should perform both schema and content validation', () => {
      const validResponse = {
        content: "El As vale 1 u 11 puntos.",
        category: "rules",
        confidence: 0.95,
        isBlackjackRelated: true,
        containsAdvice: false
      };

      mockGuardrails.validateContent.mockReturnValue({
        isValid: true,
        errors: [],
        sanitizedResponse: validResponse as AssistantResponseSchema
      });

      const result = validator.validateResponse(validResponse);
      expect(result.isValid).toBe(true);
      expect(mockGuardrails.validateContent).toHaveBeenCalled();
    });

    it('should fail if schema validation fails', () => {
      const invalidResponse = {
        content: "El As vale 1 u 11 puntos.",
        // Missing required fields
      };

      const result = validator.validateResponse(invalidResponse);
      expect(result.isValid).toBe(false);
      expect(mockGuardrails.validateContent).not.toHaveBeenCalled();
    });

    it('should fail if content validation fails after schema passes', () => {
      const response = {
        content: "El As vale 1 u 11 puntos.",
        category: "rules",
        confidence: 0.95,
        isBlackjackRelated: true,
        containsAdvice: false
      };

      mockGuardrails.validateContent.mockReturnValue({
        isValid: false,
        errors: ['Content validation failed']
      });

      const result = validator.validateResponse(response);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content validation failed');
    });
  });

  describe('sanitizeAndValidate', () => {
    it('should sanitize and validate response', () => {
      const response = {
        content: "El As vale 1 u 11 puntos.",
        category: "rules",
        confidence: 0.95,
        isBlackjackRelated: true,
        containsAdvice: false
      };

      const sanitizedResponse = { ...response, content: "Sanitized content" } as AssistantResponseSchema;
      
      mockGuardrails.sanitizeResponse.mockReturnValue(sanitizedResponse);
      mockGuardrails.validateContent.mockReturnValue({
        isValid: true,
        errors: [],
        sanitizedResponse
      });

      const result = validator.sanitizeAndValidate(response);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedResponse).toEqual(sanitizedResponse);
      expect(mockGuardrails.sanitizeResponse).toHaveBeenCalledWith(response);
    });
  });

  describe('isQuestionValid', () => {
    it('should validate non-empty blackjack-related questions', () => {
      mockGuardrails.isBlackjackRelated.mockReturnValue(true);
      
      const result = validator.isQuestionValid("¿Cuánto vale un As?");
      expect(result).toBe(true);
      expect(mockGuardrails.isBlackjackRelated).toHaveBeenCalledWith("¿Cuánto vale un As?");
    });

    it('should reject empty questions', () => {
      const result = validator.isQuestionValid("");
      expect(result).toBe(false);
      expect(mockGuardrails.isBlackjackRelated).not.toHaveBeenCalled();
    });

    it('should reject questions that are too long', () => {
      const longQuestion = "a".repeat(501);
      const result = validator.isQuestionValid(longQuestion);
      expect(result).toBe(false);
      expect(mockGuardrails.isBlackjackRelated).not.toHaveBeenCalled();
    });

    it('should reject non-blackjack questions', () => {
      mockGuardrails.isBlackjackRelated.mockReturnValue(false);
      
      const result = validator.isQuestionValid("¿Cómo está el clima?");
      expect(result).toBe(false);
    });
  });

  describe('createRedirectResponse', () => {
    it('should create a redirect response', () => {
      mockGuardrails.getRedirectMessage.mockReturnValue("Redirect message");
      
      const result = validator.createRedirectResponse("Invalid question");
      expect(result.category).toBe('redirect');
      expect(result.content).toBe("Redirect message");
      expect(result.isBlackjackRelated).toBe(true);
      expect(result.containsAdvice).toBe(false);
      expect(result.metadata?.redirectReason).toBe('non-blackjack-topic');
    });
  });

  describe('createErrorResponse', () => {
    it('should create an error response', () => {
      const errors = ['Error 1', 'Error 2'];
      const result = validator.createErrorResponse(errors);
      
      expect(result.category).toBe('redirect');
      expect(result.content).toBe("Lo siento, no pude procesar tu pregunta correctamente. ¿Puedes reformularla?");
      expect(result.isBlackjackRelated).toBe(true);
      expect(result.containsAdvice).toBe(false);
      expect(result.metadata?.redirectReason).toBe('validation-error');
    });
  });

  describe('integration with real ContentGuardrails', () => {
    beforeEach(() => {
      // Use real ContentGuardrails for integration tests
      validator = new ResponseValidator();
    });

    it('should validate a complete valid response', () => {
      const validResponse = {
        content: "El As vale 1 u 11 puntos según convenga para tu mano.",
        category: "rules" as const,
        confidence: 0.95,
        isBlackjackRelated: true,
        containsAdvice: false,
        metadata: {
          rulesReferenced: ["valor-as"]
        }
      };

      const result = validator.validateResponse(validResponse);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject response with specific advice', () => {
      const invalidResponse = {
        content: "Deberías pedir carta con esa mano.",
        category: "rules" as const,
        confidence: 0.95,
        isBlackjackRelated: true,
        containsAdvice: false
      };

      const result = validator.validateResponse(invalidResponse);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('specific game advice'))).toBe(true);
    });
  });
});