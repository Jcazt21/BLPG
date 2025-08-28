# Design Document

## Overview

The Intelligent Dealer System provides AI-powered assistance for the multiplayer blackjack game. Phase 1 implements a Blackjack Help Assistant - a specialized chatbot that helps players understand blackjack rules and mechanics. The system integrates with LLM APIs to provide intelligent, contextual responses while maintaining strict boundaries around blackjack-related topics.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Backend      │    │   LLM API       │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │Help Button  │ │◄──►│ │Help Assistant│ │◄──►│ │OpenAI/      │ │
│ │Chat UI      │ │    │ │Service       │ │    │ │Anthropic    │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ └─────────────┘ │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │                 │
│ │Game UI      │ │    │ │Socket.IO     │ │    │                 │
│ │(Blackjack)  │ │    │ │Server        │ │    │                 │
│ └─────────────┘ │    │ └──────────────┘ │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### System Components

1. **Frontend Help Interface**
   - Help button in blackjack game UI
   - Chat modal/sidebar component
   - Message display and input handling

2. **Backend Help Assistant Service**
   - LLM API integration
   - Prompt management and templating
   - Response processing and validation

3. **Socket.IO Integration**
   - Real-time chat communication
   - Session management
   - Error handling and fallbacks

## Components and Interfaces

### Frontend Components

#### HelpButton Component
```typescript
interface HelpButtonProps {
  onOpen: () => void;
  disabled?: boolean;
}

// Renders a help icon button in the game UI
// Opens the help chat when clicked
```

#### HelpChat Component
```typescript
interface HelpChatProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// Manages the chat interface
// Handles message sending and receiving
// Displays conversation history
```

### Backend Services

#### HelpAssistantService
```typescript
interface HelpAssistantService {
  // Process user question and generate response
  processQuestion(question: string, context?: GameContext): Promise<AssistantResponse>;
  
  // Validate that question is blackjack-related
  validateQuestion(question: string): boolean;
  
  // Get fallback response when API is unavailable
  getFallbackResponse(question: string): string;
}

interface AssistantResponse {
  content: string;
  confidence: number;
  isBlackjackRelated: boolean;
  responseTime: number;
}
```

#### LLMProvider Interface
```typescript
interface LLMProvider {
  name: string;
  generateResponse(prompt: string, options?: LLMOptions): Promise<LLMResponse>;
  isAvailable(): Promise<boolean>;
  getRateLimit(): RateLimitInfo;
}

interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}
```

### Socket.IO Events

#### Client to Server
```typescript
// Request help chat session
'help:startSession' -> { roomCode?: string }

// Send question to assistant
'help:askQuestion' -> { 
  question: string, 
  sessionId: string 
}

// End help session
'help:endSession' -> { sessionId: string }
```

#### Server to Client
```typescript
// Help session started
'help:sessionStarted' -> { 
  sessionId: string, 
  welcomeMessage: string 
}

// Assistant response
'help:response' -> { 
  sessionId: string,
  message: ChatMessage,
  isTyping: false
}

// Show typing indicator
'help:typing' -> { sessionId: string }

// Error occurred
'help:error' -> { 
  sessionId: string,
  error: string,
  canRetry: boolean
}

// Session ended
'help:sessionEnded' -> { sessionId: string }
```

## Data Models

### Configuration Model
```typescript
interface HelpAssistantConfig {
  enabled: boolean;
  llmProvider: 'openai' | 'anthropic' | 'mock';
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  fallbackEnabled: boolean;
}
```

### Session Model
```typescript
interface HelpSession {
  id: string;
  socketId: string;
  roomCode?: string;
  startTime: Date;
  lastActivity: Date;
  messageCount: number;
  isActive: boolean;
}
```

### Prompt Templates
```typescript
interface PromptTemplate {
  name: string;
  system: string;
  userPrefix?: string;
  examples?: Array<{
    user: string;
    assistant: string;
  }>;
}
```

## Error Handling

### Error Types and Responses

1. **API Unavailable**
   - Fallback to predefined responses
   - Show "Try again later" message
   - Log error for monitoring

2. **Rate Limit Exceeded**
   - Queue requests with exponential backoff
   - Show "Please wait" message
   - Temporary disable for user

3. **Invalid Question**
   - Politely redirect to blackjack topics
   - Suggest valid question types
   - Maintain helpful tone

4. **Timeout**
   - Cancel request after 5 seconds
   - Show timeout message
   - Allow retry

### Fallback System

```typescript
interface FallbackResponse {
  trigger: string | RegExp;
  response: string;
  category: 'rules' | 'strategy' | 'betting' | 'general';
}

// Example fallback responses
const fallbackResponses: FallbackResponse[] = [
  {
    trigger: /reglas|rules/i,
    response: "El blackjack es un juego donde buscas llegar a 21 sin pasarte. Las cartas valen su número, las figuras valen 10, y el As vale 1 u 11.",
    category: 'rules'
  },
  {
    trigger: /estrategia|strategy/i,
    response: "La estrategia básica sugiere pedir carta con 11 o menos, plantarse con 17 o más. Con 12-16 depende de la carta visible del dealer.",
    category: 'strategy'
  }
];
```

## Testing Strategy

### Unit Tests
- **HelpAssistantService**: Test question processing, validation, fallbacks
- **LLMProvider**: Test API integration, error handling, rate limiting
- **PromptTemplate**: Test template rendering and validation

### Integration Tests
- **Socket.IO Events**: Test complete chat flow from frontend to backend
- **API Integration**: Test with real LLM providers (using test keys)
- **Error Scenarios**: Test API failures, timeouts, rate limits

### End-to-End Tests
- **Complete User Flow**: Open help, ask questions, receive responses, close chat
- **Multiple Sessions**: Test concurrent help sessions
- **Game Integration**: Test help button in actual blackjack game

### Mock Testing
```typescript
interface MockLLMProvider extends LLMProvider {
  setResponse(response: string): void;
  setError(error: Error): void;
  setDelay(ms: number): void;
  getCallHistory(): Array<{ prompt: string; timestamp: Date }>;
}
```

## Guardrails and Response Validation

### JSON Schema for Structured Responses

```typescript
interface AssistantResponseSchema {
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

const responseSchema = {
  type: "object",
  properties: {
    content: { 
      type: "string", 
      maxLength: 300,
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
        redirectReason: { type: "string", maxLength: 100 }
      }
    }
  },
  required: ["content", "category", "confidence", "isBlackjackRelated", "containsAdvice"],
  additionalProperties: false
};
```

### Guardrails Implementation

#### Content Guardrails
```typescript
interface ContentGuardrails {
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

const guardrails: ContentGuardrails = {
  noSpecificAdvice: {
    patterns: [
      /deberías (pedir|plantarte|doblar)/i,
      /te recomiendo que/i,
      /en tu situación/i,
      /con esas cartas/i
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
    profanity: [/palabrotas|groserías/i],
    gambling: [/apostar dinero real|casino online|ganar dinero/i],
    financial: [/inversión|préstamo|deuda/i]
  }
};
```

#### Prompt Guardrails
```typescript
interface PromptGuardrails {
  systemPrompt: string;
  responseFormat: string;
  restrictions: string[];
  examples: Array<{
    input: string;
    output: AssistantResponseSchema;
  }>;
}

const promptGuardrails: PromptGuardrails = {
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
  ]
};
```

### Response Validation Pipeline

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedResponse?: AssistantResponseSchema;
}

class ResponseValidator {
  validateSchema(response: any): ValidationResult {
    // Validate against JSON schema
    const ajv = new Ajv();
    const validate = ajv.compile(responseSchema);
    
    if (!validate(response)) {
      return {
        isValid: false,
        errors: validate.errors?.map(e => e.message) || ['Invalid schema']
      };
    }
    
    return { isValid: true, errors: [] };
  }
  
  validateContent(response: AssistantResponseSchema): ValidationResult {
    const errors: string[] = [];
    
    // Check guardrails
    if (!response.isBlackjackRelated) {
      errors.push('Response not blackjack-related');
    }
    
    // Check for specific advice when not allowed
    if (response.containsAdvice && response.category !== 'strategy') {
      errors.push('Contains specific advice outside strategy category');
    }
    
    // Check content safety
    for (const filter of guardrails.safetyFilters.profanity) {
      if (filter.test(response.content)) {
        errors.push('Content contains inappropriate language');
      }
    }
    
    // Check length
    if (response.content.length > 300) {
      errors.push('Response too long');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedResponse: errors.length === 0 ? response : undefined
    };
  }
  
  sanitizeResponse(response: AssistantResponseSchema): AssistantResponseSchema {
    return {
      ...response,
      content: response.content
        .replace(/<[^>]*>/g, '') // Remove HTML
        .replace(/[{}[\]]/g, '') // Remove brackets
        .substring(0, 300), // Truncate if needed
      confidence: Math.max(0, Math.min(1, response.confidence)) // Clamp 0-1
    };
  }
}
```

### Fallback System with Guardrails

```typescript
interface GuardedFallback {
  trigger: RegExp;
  response: AssistantResponseSchema;
  priority: number;
}

const guardedFallbacks: GuardedFallback[] = [
  {
    trigger: /reglas|rules|cómo se juega/i,
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
    trigger: /qué hago|qué debo|consejo/i,
    response: {
      content: "No doy consejos específicos, pero puedo explicarte las opciones: pedir carta, plantarse, doblar o dividir.",
      category: "redirect",
      confidence: 0.9,
      isBlackjackRelated: true,
      containsAdvice: false,
      metadata: { redirectReason: "no-specific-advice" }
    },
    priority: 2
  }
];
```

## Security Considerations

### Input Validation
- Sanitize all user input before sending to LLM
- Limit message length (max 500 characters)
- Rate limit per user (5 messages per minute)
- Validate session ownership
- **JSON Schema validation** for all LLM responses
- **Guardrails enforcement** before displaying responses

### API Security
- Store API keys in environment variables
- Use HTTPS for all API calls
- Implement request signing where available
- Monitor for unusual usage patterns
- **Structured prompts** to prevent prompt injection

### Content Filtering
- **Multi-layer validation**: Schema → Guardrails → Safety filters
- Filter out any non-blackjack related information
- Prevent prompt injection attempts
- **Automatic fallbacks** for invalid responses
- Log suspicious interactions

## Performance Optimization

### Caching Strategy
```typescript
interface ResponseCache {
  get(questionHash: string): Promise<string | null>;
  set(questionHash: string, response: string, ttl: number): Promise<void>;
  clear(): Promise<void>;
}

// Cache common questions for 1 hour
// Use question hash as key to handle similar questions
// Implement LRU eviction for memory management
```

### Rate Limiting
```typescript
interface RateLimiter {
  checkLimit(userId: string, action: string): Promise<boolean>;
  recordRequest(userId: string, action: string): Promise<void>;
  getRemainingRequests(userId: string, action: string): Promise<number>;
}

// Per-user limits:
// - 5 questions per minute
// - 50 questions per hour
// - 200 questions per day
```

### Connection Management
- Reuse HTTP connections for API calls
- Implement connection pooling
- Set appropriate timeouts (5s for API calls)
- Clean up inactive sessions after 10 minutes

## Monitoring and Analytics

### Metrics to Track
- Response time (target: <3 seconds)
- API success rate (target: >99%)
- User satisfaction (implicit: session duration, question count)
- Cost per interaction
- Most common question types

### Logging Strategy
```typescript
interface HelpAssistantLogger {
  logQuestion(sessionId: string, question: string, metadata: any): void;
  logResponse(sessionId: string, response: string, responseTime: number): void;
  logError(sessionId: string, error: Error, context: any): void;
  logApiCall(provider: string, tokens: number, cost: number): void;
}
```

### Health Checks
- API availability monitoring
- Response time monitoring  
- Error rate alerting
- Cost threshold alerting

## Configuration Management

### Environment Variables
```bash
# LLM Configuration
HELP_ASSISTANT_ENABLED=true
HELP_ASSISTANT_PROVIDER=openai
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Rate Limiting
HELP_RATE_LIMIT_PER_MINUTE=5
HELP_RATE_LIMIT_PER_HOUR=50

# Caching
HELP_CACHE_TTL=3600
HELP_CACHE_MAX_SIZE=1000

# Monitoring
HELP_LOG_LEVEL=info
HELP_METRICS_ENABLED=true
```

### Runtime Configuration
```typescript
interface RuntimeConfig {
  prompts: {
    system: string;
    welcome: string;
    fallback: string;
    redirect: string;
  };
  responses: {
    maxLength: number;
    timeout: number;
    retries: number;
  };
  ui: {
    theme: 'light' | 'dark';
    position: 'sidebar' | 'modal';
    animations: boolean;
  };
}
```

This design provides a solid foundation for implementing the Blackjack Help Assistant while maintaining flexibility for future expansion to the full dealer narrator system.