/**
 * Type definitions for the Help Assistant system
 */

export interface AssistantResponseSchema {
  content: string;           // The actual response text
  category: 'rules' | 'strategy' | 'betting' | 'mechanics' | 'redirect';
  confidence: number;        // 0-1 confidence score
  isBlackjackRelated: boolean;
  containsAdvice: boolean;   // True if giving specific game advice
  metadata?: {
    rulesReferenced?: string[];
    strategyConcepts?: string[];
    redirectReason?: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedResponse?: AssistantResponseSchema;
}

export interface ContentGuardrailsConfig {
  // Prevent specific game advice
  noSpecificAdvice: {
    patterns: RegExp[];
    replacement: string;
  };
  
  // Ensure blackjack focus
  topicBoundaries: {
    allowedTopics: string[];
    redirectMessage: string;
  };
  
  // Content safety
  safetyFilters: {
    profanity: RegExp[];
    gambling: RegExp[];
    financial: RegExp[];
  };
}

export interface PromptGuardrailsConfig {
  systemPrompt: string;
  responseFormat: string;
  restrictions: string[];
  examples: Array<{
    input: string;
    output: AssistantResponseSchema;
  }>;
}

export interface GuardedFallback {
  trigger: RegExp;
  response: AssistantResponseSchema;
  priority: number;
}