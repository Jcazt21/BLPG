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
    // Test that the service can process questions using the template system
    const question = "¿Cuáles son las reglas del blackjack?";
    
    const result = await service.processQuestion(question);
    
    expect(result).toBeDefined();
    expect(result.response).toBeDefined();
    expect(result.response.content).toBeTruthy();
    expect(result.response.isBlackjackRelated).toBe(true);
    expect(result.response.category).toMatch(/rules|strategy|betting|mechanics|redirect/);
  });

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

    // Process a question with session context
    const question = "¿Cuáles son las reglas?";
    const result = await service.processQuestion(question, { sessionId: session.id });
    
    expect(result.sessionId).toBe(session.id);
    
    // Check that session was updated
    const updatedSession = service.getSession(session.id);
    expect(updatedSession?.messageCount).toBe(1);
    expect(updatedSession?.context.previousQuestions).toContain(question);
  });

  it('should provide health status information', async () => {
    const health = await service.getHealthStatus();
    
    expect(health).toBeDefined();
    expect(typeof health.isHealthy).toBe('boolean');
    expect(typeof health.llmAvailable).toBe('boolean');
    expect(typeof health.activeSessions).toBe('number');
    expect(typeof health.cacheSize).toBe('number');
    expect(Array.isArray(health.errors)).toBe(true);
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