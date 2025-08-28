import { AssistantResponseSchema } from '../../types/assistantTypes';

export interface PromptTemplate {
  name: string;
  system: string;
  userPrefix?: string;
  examples?: Array<{
    user: string;
    assistant: string;
  }>;
  variables?: Record<string, string>;
}

export interface TemplateContext {
  userQuestion: string;
  sessionContext?: {
    previousQuestions: string[];
    questionCategories: string[];
  };
  gameContext?: {
    roomCode?: string;
    playerCount?: number;
  };
  [key: string]: any;
}

/**
 * PromptTemplateSystem manages dynamic prompt generation with context injection
 */
export class PromptTemplateSystem {
  private templates: Map<string, PromptTemplate> = new Map();
  private defaultTemplate: PromptTemplate;

  constructor() {
    this.initializeDefaultTemplates();
    this.defaultTemplate = this.templates.get('default')!;
  }

  /**
   * Initialize default prompt templates
   */
  private initializeDefaultTemplates(): void {
    // Default blackjack help template
    const defaultTemplate: PromptTemplate = {
      name: 'default',
      system: `Eres un asistente especializado en blackjack. Tu único propósito es ayudar a los jugadores a entender las reglas y mecánicas básicas del blackjack.

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
}`,
      examples: [
        {
          user: "¿Cuánto vale un As?",
          assistant: JSON.stringify({
            content: "El As vale 1 u 11 puntos, lo que sea más conveniente para tu mano sin pasarte de 21.",
            category: "rules",
            confidence: 1.0,
            isBlackjackRelated: true,
            containsAdvice: false,
            metadata: {
              rulesReferenced: ["valor-as", "suma-cartas"]
            }
          }, null, 2)
        },
        {
          user: "¿Qué hago con mi mano?",
          assistant: JSON.stringify({
            content: "No puedo aconsejarte sobre tu mano específica, pero puedo explicarte las opciones: pedir, plantarse, doblar o dividir.",
            category: "redirect",
            confidence: 0.9,
            isBlackjackRelated: true,
            containsAdvice: false,
            metadata: {
              redirectReason: "no-specific-advice"
            }
          }, null, 2)
        }
      ]
    };

    // Rules-focused template
    const rulesTemplate: PromptTemplate = {
      name: 'rules',
      system: `Eres un experto en las reglas del blackjack. Explica las reglas de manera clara y concisa.

ENFOQUE: Reglas básicas del blackjack
- Objetivo del juego
- Valores de las cartas
- Mecánicas básicas
- Acciones permitidas

FORMATO: Responde en JSON con categoría "rules"`,
      examples: [
        {
          user: "¿Cómo se juega blackjack?",
          assistant: JSON.stringify({
            content: "El objetivo es llegar a 21 o acercarse sin pasarse. Recibes 2 cartas y puedes pedir más, plantarte, doblar o dividir.",
            category: "rules",
            confidence: 1.0,
            isBlackjackRelated: true,
            containsAdvice: false,
            metadata: {
              rulesReferenced: ["objetivo", "acciones-basicas"]
            }
          }, null, 2)
        }
      ]
    };

    // Strategy template (general strategy, no specific advice)
    const strategyTemplate: PromptTemplate = {
      name: 'strategy',
      system: `Eres un instructor de estrategia básica de blackjack. Proporciona información general sobre estrategia sin dar consejos específicos.

ENFOQUE: Estrategia general del blackjack
- Conceptos básicos de estrategia
- Cuándo considerar cada acción
- Principios generales
- NO consejos específicos de mano

FORMATO: Responde en JSON con categoría "strategy"`,
      examples: [
        {
          user: "¿Cuándo debo doblar?",
          assistant: JSON.stringify({
            content: "Generalmente se dobla con 11 puntos, o con 10 si el dealer muestra carta baja. Depende de tu total y la carta visible del dealer.",
            category: "strategy",
            confidence: 0.9,
            isBlackjackRelated: true,
            containsAdvice: false,
            metadata: {
              strategyConcepts: ["doblar", "carta-dealer"]
            }
          }, null, 2)
        }
      ]
    };

    this.templates.set('default', defaultTemplate);
    this.templates.set('rules', rulesTemplate);
    this.templates.set('strategy', strategyTemplate);
  }

  /**
   * Generates a prompt using the specified template and context
   */
  generatePrompt(templateName: string, context: TemplateContext): string {
    const template = this.templates.get(templateName) || this.defaultTemplate;
    
    let prompt = template.system;

    // Add examples if available
    if (template.examples && template.examples.length > 0) {
      prompt += '\n\nEJEMPLOS:\n';
      template.examples.forEach(example => {
        prompt += `Usuario: ${example.user}\n`;
        prompt += `Asistente: ${example.assistant}\n\n`;
      });
    }

    // Add session context if available
    if (context.sessionContext) {
      const { previousQuestions, questionCategories } = context.sessionContext;
      
      if (previousQuestions.length > 0) {
        prompt += '\nCONTEXTO DE LA CONVERSACIÓN:\n';
        prompt += `Preguntas anteriores: ${previousQuestions.slice(-3).join(', ')}\n`;
        prompt += `Categorías: ${questionCategories.slice(-3).join(', ')}\n`;
      }
    }

    // Add game context if available
    if (context.gameContext?.roomCode) {
      prompt += `\nCONTEXTO DEL JUEGO:\n`;
      prompt += `Sala: ${context.gameContext.roomCode}\n`;
      if (context.gameContext.playerCount) {
        prompt += `Jugadores: ${context.gameContext.playerCount}\n`;
      }
    }

    // Add user question
    prompt += `\nPREGUNTA DEL USUARIO:\n${context.userQuestion}\n`;
    prompt += '\nRESPUESTA (JSON únicamente):';

    return prompt;
  }

  /**
   * Determines the best template to use based on the question
   */
  selectTemplate(question: string): string {
    const questionLower = question.toLowerCase();

    // Rules-related keywords
    if (/reglas|cómo se juega|objetivo|valores|cartas/.test(questionLower)) {
      return 'rules';
    }

    // Strategy-related keywords
    if (/estrategia|cuándo|debo|mejor|recomend/.test(questionLower)) {
      return 'strategy';
    }

    // Default template for everything else
    return 'default';
  }

  /**
   * Generates a contextual prompt by automatically selecting the best template
   */
  generateContextualPrompt(context: TemplateContext): string {
    const templateName = this.selectTemplate(context.userQuestion);
    return this.generatePrompt(templateName, context);
  }

  /**
   * Adds a new template or updates an existing one
   */
  addTemplate(template: PromptTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * Gets a template by name
   */
  getTemplate(name: string): PromptTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * Lists all available template names
   */
  getTemplateNames(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Removes a template
   */
  removeTemplate(name: string): boolean {
    if (name === 'default') {
      throw new Error('Cannot remove default template');
    }
    return this.templates.delete(name);
  }

  /**
   * Validates template variables and replaces them in the prompt
   */
  private replaceVariables(text: string, variables: Record<string, string>): string {
    let result = text;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return result;
  }

  /**
   * Creates a template with dynamic variables
   */
  createDynamicTemplate(
    name: string, 
    baseTemplate: string, 
    variables: Record<string, string>
  ): PromptTemplate {
    const template: PromptTemplate = {
      name,
      system: this.replaceVariables(baseTemplate, variables),
      variables
    };
    
    this.addTemplate(template);
    return template;
  }

  /**
   * Gets template statistics
   */
  getTemplateStats(): {
    totalTemplates: number;
    templateNames: string[];
    defaultTemplate: string;
  } {
    return {
      totalTemplates: this.templates.size,
      templateNames: this.getTemplateNames(),
      defaultTemplate: this.defaultTemplate.name
    };
  }
}

// Export singleton instance
export const promptTemplateSystem = new PromptTemplateSystem();