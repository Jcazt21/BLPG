// Prueba mínima - solo fallbacks, sin tokens
const { PromptGuardrails } = require('./backend/dist/services/helpAssistant/promptGuardrails');

console.log('🎮 Probando fallbacks del dealer dominicano (sin tokens)...\n');

const promptGuardrails = new PromptGuardrails();

const testQuestions = [
  'klk',
  'como se gana?', 
  'cuanto vale un as?',
  'que hago con mi mano?'
];

testQuestions.forEach(question => {
  console.log(`🎮 Tú: ${question}`);
  
  const fallback = promptGuardrails.findFallbackResponse(question);
  
  if (fallback) {
    console.log(`🤖 Javi: ${fallback.content}`);
    console.log(`📊 Categoría: ${fallback.category}\n`);
  } else {
    const generic = promptGuardrails.getGenericFallback();
    console.log(`🤖 Javi: ${generic.content}`);
    console.log(`📊 Categoría: ${generic.category} (genérico)\n`);
  }
});