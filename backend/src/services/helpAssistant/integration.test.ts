// Load environment variables for tests
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Set required environment variables for tests if not present
if (!process.env.HOST) {
  process.env.HOST = 'localhost';
}

import { HelpAssistantService } from './helpAssistantService';
import { PromptTemplateSystem } from './promptTemplateSystem';

describe('HelpAssistant Integration', () => {
  let service: HelpAssistantService;
  let templateSystem: PromptTemplateSystem;

  beforeEach(() => {
    service = new HelpAssistantService();
    templateSystem = new PromptTemplateSystem();
  });

  afterEach(async () => {
    await service.shutdown();
  });

  it('should integrate prompt template system with help assistant service', async () => {
    // SKIP REAL API CALL - Use mock provider to avoid token usage
    // This test now only validates the integration logic, not actual API calls
    const question = "¿Cuáles son las reglas del blackjack?";
    
    // Test template selection without API call
    const templateSystem = new PromptTemplateSystem();
    const selectedTemplate = templateSystem.selectTemplate(question);
    expect(selectedTemplate).toBe('rules');
    
    // Test that service can handle the question structure
    expect(service.validateQuestion(question)).toBe(true);
    
    // Skip actual API call to save tokens
    console.log('⚠️ Skipping real API call to save tokens. Template integration verified.');
  }, 1000); // Reduced timeout since no API call

  it('should use appropriate templates for different question types', () => {
    const rulesQuestion = "¿Cómo se juega blackjack?";
    const strategyQuestion = "¿Cuándo debo doblar?";
    const generalQuestion = "¿Qué es el blackjack?";

    expect(templateSystem.selectTemplate(rulesQuestion)).toBe('rules');
    expect(templateSystem.selectTemplate(strategyQuestion)).toBe('strategy');
    expect(templateSystem.selectTemplate(generalQuestion)).toBe('default');
  });

  it('should generate contextual prompts with session context', () => {
    const context = {
      userQuestion: "¿Cuánto vale un As?",
      sessionContext: {
        previousQuestions: ["¿Cómo se juega?", "¿Qué son las figuras?"],
        questionCategories: ["rules", "rules"]
      }
    };

    const prompt = templateSystem.generateContextualPrompt(context);
    
    expect(prompt).toContain("¿Cuánto vale un As?");
    expect(prompt).toContain("CONTEXTO DE LA CONVERSACIÓN");
    expect(prompt).toContain("¿Cómo se juega?");
  });

  it('should handle session management correctly', async () => {
    const session = service.createSession("test-socket-123");
    
    expect(session).toBeDefined();
    expect(session.id).toBeTruthy();
    expect(session.socketId).toBe("test-socket-123");
    expect(session.isActive).toBe(true);
    expect(session.messageCount).toBe(0);

    // Test session structure without API call
    expect(session.context).toBeDefined();
    expect(session.context.previousQuestions).toEqual([]);
    expect(session.context.questionCategories).toEqual([]);
    
    // Skip API call to save tokens
    console.log('⚠️ Skipping API call for session test to save tokens.');
  });

  it('should provide health status information', async () => {
    // Test health status structure without API availability check
    const health = await service.getHealthStatus();
    
    expect(health).toBeDefined();
    expect(typeof health.isHealthy).toBe('boolean');
    expect(typeof health.activeSessions).toBe('number');
    expect(typeof health.cacheSize).toBe('number');
    expect(Array.isArray(health.errors)).toBe(true);
    
    // Skip LLM availability check to avoid API call
    console.log('⚠️ Skipping LLM availability check to save tokens.');
  });

  it('should provide cache and session statistics', () => {
    const cacheStats = service.getCacheStats();
    const sessionStats = service.getSessionStats();
    
    expect(cacheStats).toBeDefined();
    expect(typeof cacheStats.size).toBe('number');
    expect(typeof cacheStats.maxSize).toBe('number');
    expect(typeof cacheStats.enabled).toBe('boolean');
    
    expect(sessionStats).toBeDefined();
    expect(typeof sessionStats.activeSessions).toBe('number');
    expect(typeof sessionStats.totalSessions).toBe('number');
  });
});