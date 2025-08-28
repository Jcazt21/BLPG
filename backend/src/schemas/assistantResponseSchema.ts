/**
 * JSON Schema definition for Assistant Response validation
 */

export const assistantResponseSchema = {
  type: "object",
  properties: {
    content: { 
      type: "string", 
      maxLength: 300,
      minLength: 1,
      pattern: "^[^<>{}\\[\\]]*$" // No HTML/code injection
    },
    category: { 
      type: "string", 
      enum: ["rules", "strategy", "betting", "mechanics", "redirect"] 
    },
    confidence: { 
      type: "number", 
      minimum: 0, 
      maximum: 1 
    },
    isBlackjackRelated: { type: "boolean" },
    containsAdvice: { type: "boolean" },
    metadata: {
      type: "object",
      properties: {
        rulesReferenced: { 
          type: "array", 
          items: { type: "string" },
          maxItems: 5
        },
        strategyConcepts: { 
          type: "array", 
          items: { type: "string" },
          maxItems: 3
        },
        redirectReason: { 
          type: "string", 
          maxLength: 100 
        }
      },
      additionalProperties: false
    }
  },
  required: ["content", "category", "confidence", "isBlackjackRelated", "containsAdvice"],
  additionalProperties: false
} as const;

export type AssistantResponseSchemaType = {
  content: string;
  category: 'rules' | 'strategy' | 'betting' | 'mechanics' | 'redirect';
  confidence: number;
  isBlackjackRelated: boolean;
  containsAdvice: boolean;
  metadata?: {
    rulesReferenced?: string[];
    strategyConcepts?: string[];
    redirectReason?: string;
  };
};