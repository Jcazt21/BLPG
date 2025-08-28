import Ajv, { JSONSchemaType } from 'ajv';
import { assistantResponseSchema } from '../../schemas/assistantResponseSchema';
import { AssistantResponseSchema, ValidationResult } from '../../types/assistantTypes';
import { ContentGuardrails } from './contentGuardrails';

/**
 * ResponseValidator handles both JSON schema validation and content guardrails
 * for Assistant responses
 */
export class ResponseValidator {
  private ajv: Ajv;
  private schemaValidator: any;
  private contentGuardrails: ContentGuardrails;

  constructor(contentGuardrails?: ContentGuardrails) {
    this.ajv = new Ajv({ allErrors: true });
    this.schemaValidator = this.ajv.compile(assistantResponseSchema);
    this.contentGuardrails = contentGuardrails || new ContentGuardrails();
  }

  /**
   * Validates response against JSON schema
   */
  validateSchema(response: any): ValidationResult {
    try {
      const isValid = this.schemaValidator(response);
      
      if (!isValid) {
        const errors = this.schemaValidator.errors?.map((error: any) => {
          const path = error.instancePath || error.schemaPath || 'root';
          return `${path}: ${error.message}`;
        }) || ['Invalid schema'];

        return {
          isValid: false,
          errors
        };
      }

      return {
        isValid: true,
        errors: [],
        sanitizedResponse: response as AssistantResponseSchema
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Validates response content using guardrails
   */
  validateContent(response: AssistantResponseSchema): ValidationResult {
    return this.contentGuardrails.validateContent(response);
  }

  /**
   * Performs complete validation: schema + content
   */
  validateResponse(response: any): ValidationResult {
    // First validate schema
    const schemaResult = this.validateSchema(response);
    if (!schemaResult.isValid) {
      return schemaResult;
    }

    // Then validate content
    const contentResult = this.validateContent(schemaResult.sanitizedResponse!);
    if (!contentResult.isValid) {
      return {
        isValid: false,
        errors: [...schemaResult.errors, ...contentResult.errors]
      };
    }

    return {
      isValid: true,
      errors: [],
      sanitizedResponse: contentResult.sanitizedResponse
    };
  }

  /**
   * Sanitizes and validates response, returning a safe version
   */
  sanitizeAndValidate(response: any): ValidationResult {
    // First validate schema
    const schemaResult = this.validateSchema(response);
    if (!schemaResult.isValid) {
      return schemaResult;
    }

    // Sanitize content
    const sanitized = this.contentGuardrails.sanitizeResponse(schemaResult.sanitizedResponse!);
    
    // Validate sanitized content
    const contentResult = this.contentGuardrails.validateContent(sanitized);
    
    return {
      isValid: contentResult.isValid,
      errors: contentResult.errors,
      sanitizedResponse: sanitized
    };
  }

  /**
   * Checks if a question is blackjack-related
   */
  isQuestionValid(question: string): boolean {
    if (!question || question.trim().length === 0) {
      return false;
    }

    if (question.length > 500) {
      return false;
    }

    return this.contentGuardrails.isBlackjackRelated(question);
  }

  /**
   * Gets redirect message for invalid questions
   */
  getRedirectMessage(): string {
    return this.contentGuardrails.getRedirectMessage();
  }

  /**
   * Creates a redirect response for non-blackjack questions
   */
  createRedirectResponse(originalQuestion: string): AssistantResponseSchema {
    return {
      content: this.getRedirectMessage(),
      category: 'redirect',
      confidence: 0.9,
      isBlackjackRelated: true,
      containsAdvice: false,
      metadata: {
        redirectReason: 'non-blackjack-topic'
      }
    };
  }

  /**
   * Creates an error response for validation failures
   */
  createErrorResponse(errors: string[]): AssistantResponseSchema {
    return {
      content: "Lo siento, no pude procesar tu pregunta correctamente. ¿Puedes reformularla?",
      category: 'redirect',
      confidence: 0.5,
      isBlackjackRelated: true,
      containsAdvice: false,
      metadata: {
        redirectReason: 'validation-error'
      }
    };
  }
}