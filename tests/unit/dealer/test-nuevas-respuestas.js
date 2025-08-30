// Prueba de las nuevas respuestas del dealer dominicano
const { PromptGuardrails } = require('./backend/dist/services/helpAssistant/promptGuardrails');

console.log('🎮 Probando las nuevas respuestas del dealer Javi...\n');

const promptGuardrails = new PromptGuardrails();

const testQuestions = [
  'hola',
  'klk',
  'como se gana?',
  'cuanto vale un as?',
  'que es blackjack?',
  'como doblar?',
  'que es dividir?',
  'me planto',
  'pedir carta',
  'reglas del dealer',
  'como apostar?',
  'estrategia',
  'gracias',
  'buena suerte',
  'seguro',
  'me rindo',
  'empate',
  'me pase de 21',
  'que hago con mi mano?'
];

testQuestions.forEach(question => {
  console.log(`🎮 Tú: ${question}`);
  
  const fallback = promptGuardrails.findFallbackResponse(question);
  
  if (fallback) {
    console.log(`🤖 Javi: ${fallback.content}`);
    console.log(`📊 Categoría: ${fallback.category}, Confianza: ${fallback.confidence}\n`);
  } else {
    const generic = promptGuardrails.getGenericFallback();
    console.log(`🤖 Javi: ${generic.content}`);
    console.log(`📊 Categoría: ${generic.category} (genérico)\n`);
  }
});