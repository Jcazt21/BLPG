const { helpAssistantService } = require('./backend/dist/services/helpAssistant/helpAssistantService');

async function testDealerPersonality() {
  console.log('🎮 Probando la personalidad del dealer dominicano...\n');

  const testQuestions = [
    'klk',
    'como se gana?',
    'cuanto vale un as?',
    'que hago con mi mano?',
    'como se juega blackjack?'
  ];

  for (const question of testQuestions) {
    console.log(`🎮 Tú: ${question}`);
    
    try {
      const result = await helpAssistantService.processQuestion(question);
      console.log(`🤖 Javi: ${result.response.content}`);
      console.log(`📊 Categoría: ${result.response.category}, Confianza: ${result.response.confidence}`);
      console.log(`⚡ Tiempo: ${result.responseTime}ms, Cache: ${result.fromCache ? 'Sí' : 'No'}\n`);
    } catch (error) {
      console.error(`❌ Error: ${error.message}\n`);
    }
  }
}

testDealerPersonality().catch(console.error);