import { DEALER_DOMINICANO } from '../config/dealerPersonaConfig';

console.log('⚠️  Gemini AI service is currently disabled.');
console.log('   This test will only show default dealer responses.');
console.log('   To enable AI features, configure GEMINI_API_KEY in your .env file.\n');

/**
 * Test function that shows dealer information
 */
async function testDealer() {
  console.log('🧪 Testing Dealer Persona...\n');
  console.log(`🎭 Dealer: ${DEALER_DOMINICANO.nombre}`);
  console.log(`🎭 Personalidad: ${DEALER_DOMINICANO.personalidad.substring(0, 100)}...`);
  console.log(`🎯 Tono: ${DEALER_DOMINICANO.tono}\n`);

  console.log('📝 Dealer Configuration:');
  console.log(`   Nombre: ${DEALER_DOMINICANO.nombre}`);
  console.log(`   Personalidad: ${DEALER_DOMINICANO.personalidad.substring(0, 80)}...`);
  console.log(`   Tono: ${DEALER_DOMINICANO.tono}`);
  console.log(`   Frases características: ${DEALER_DOMINICANO.ejemplo_frases.length}`);
  console.log(`   Contexto: ${DEALER_DOMINICANO.contexto.substring(0, 60)}...`);
  
  console.log('\n⚠️  AI service is currently disabled.');
  console.log('   To enable AI features, configure GEMINI_API_KEY in your .env file.');

  console.log('\n🎪 Frases características del dealer:');
  DEALER_DOMINICANO.ejemplo_frases.slice(0, 5).forEach((frase, index) => {
    console.log(`   ${index + 1}. "${frase}"`);
  });

  // Single test - blackjack situation (most exciting)
  console.log('\n🎭 Testing Dealer Response (Blackjack Situation)...');
  const testPrompt = "¡El jugador sacó As y Rey, blackjack!";
  const testSituacion = "blackjack";

  console.log(`📝 Situación: ${testSituacion}`);
  console.log(`📝 Prompt: "${testPrompt}"`);
  
  // Get a default response based on the situation
  const defaultResponses = {
    inicio_juego: '¡Eyyy, que tal mi pana! ¿Listos para jugar?',
    blackjack: '¡Blackjack! ¡Tú sí que tienes mano bendita!',
    jugador_gana: '¡Eso sí está bueno! Te felicito',
    jugador_pierde: 'No te preocupes, que en la próxima te va mejor',
    bust: 'Ay no, mi hermano, te pasaste... pero así es esto',
    empate: 'Empate, ni tú ni yo. ¡Vamos otra vez!',
    general: '¡Dale que vamos a ver qué sale!'
  };

  const response = defaultResponses[testSituacion as keyof typeof defaultResponses] || defaultResponses.general;
  
  console.log(`\n${DEALER_DOMINICANO.nombre}: "${response}"\n`);

  console.log('\n🎉 Dealer test completed successfully!');
  console.log(`\n📊 Summary:`);
  console.log(`   Dealer: ${DEALER_DOMINICANO.nombre}`);
  console.log(`   Personalidad: ${DEALER_DOMINICANO.tono}`);
  console.log(`   Frases características: ${DEALER_DOMINICANO.ejemplo_frases.length}`);
  console.log(`   Contexto: ${DEALER_DOMINICANO.contexto.substring(0, 60)}...`);
  
  // Show some example responses
  console.log('\n💬 Ejemplos de respuestas del dealer:');
  const exampleSituations = ['inicio_juego', 'blackjack', 'jugador_gana', 'jugador_pierde'];
  exampleSituations.forEach(situacion => {
    const response = defaultResponses[situacion as keyof typeof defaultResponses];
    console.log(`   ${situacion}: "${response}"`);
  });
  
  // Show analysis of the dealer's personality
  console.log('\n🔍 Análisis de la personalidad del dealer:');
  const contenido = DEALER_DOMINICANO.personalidad.toLowerCase();
  const caracteristicas = {
    dominicano: /(klk|bro|hermano|tigre|vaina|eto|tamo|dichoso|pana|manin)/.test(contenido),
    jocoso: /(ja|je|ji|jo|ju|eh|ay|jaj|jej|jij|joj|juj)/.test(contenido),
    profesional: /(carta|mano|juego|apuesta|blackjack)/.test(contenido),
    conciso: DEALER_DOMINICANO.ejemplo_frases.every(frase => frase.split(' ').length <= 25)
  };

  console.log('\n🔍 Análisis automático:');
  console.log(`   🇩🇴 Dominicano: ${caracteristicas.dominicano ? '✅' : '❌'}`);
  console.log(`   😄 Jocoso: ${caracteristicas.jocoso ? '✅' : '❌'}`);
  console.log(`   🎯 Profesional: ${caracteristicas.profesional ? '✅' : '❌'}`);
  console.log(`   📏 Frases concisas (≤25 palabras): ${caracteristicas.conciso ? '✅' : '❌'}`);

  console.log('\n🎉 Gemini dealer test completed successfully!');
  console.log('\n📊 Summary:');
}

/**
 * Test interactivo - permite chatear con el dealer
 */
async function interactiveTest() {
  const readline = require('readline');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(`🎭 Interactive Chat with ${DEALER_DOMINICANO.nombre}`);
  console.log(`🎪 Personalidad: ${DEALER_DOMINICANO.personalidad.substring(0, 80)}...`);
  console.log(`🎯 Tono: ${DEALER_DOMINICANO.tono}`);
  console.log('\n⚠️  AI service is currently disabled. Running in test mode.');
  console.log('\nComandos:');
  console.log('  <situacion> <mensaje> - Respuesta en situación específica');
  console.log('  Situaciones: inicio_juego, blackjack, jugador_gana, jugador_pierde, bust, empate');
  console.log('  exit - Salir\n');

  // Show some example phrases
  console.log('Ejemplos de respuestas del dealer:');
  DEALER_DOMINICANO.ejemplo_frases.slice(0, 3).forEach((frase: string, index: number) => {
    console.log(`   ${index + 1}. "${frase}"`);
  });
  
  console.log('\n⚠️  El servicio de IA está temporalmente deshabilitado.');
  console.log('   Las respuestas serán predeterminadas hasta que se reactive el servicio.\n');

  const askQuestion = () => {
    rl.question('Tú: ', (input: string) => {
      if (input.toLowerCase() === 'exit') {
        console.log('👋 ¡Hasta luego!');
        rl.close();
        return;
      }

      if (input.trim() === '') {
        askQuestion();
        return;
      }

      try {
        const situaciones = ['inicio_juego', 'blackjack', 'jugador_gana', 'jugador_pierde', 'bust', 'empate', 'repartiendo_cartas'];
        const parts = input.trim().split(' ');
        const possibleSituacion = parts[0].toLowerCase();
        
        let situacion = 'general';
        
        if (situaciones.includes(possibleSituacion)) {
          situacion = possibleSituacion;
          console.log(`🎭 ${DEALER_DOMINICANO.nombre} respondiendo en situación: ${situacion}...`);
        } else {
          console.log(`🎭 ${DEALER_DOMINICANO.nombre} respondiendo casualmente...`);
        }

        // Get a default response based on the situation
        const defaultResponses = {
          inicio_juego: '¡Eyyy, que tal mi pana! ¿Listos para jugar?',
          blackjack: '¡Blackjack! ¡Tú sí que tienes mano bendita!',
          jugador_gana: '¡Eso sí está bueno! Te felicito',
          jugador_pierde: 'No te preocupes, que en la próxima te va mejor',
          bust: 'Ay no, mi hermano, te pasaste... pero así es esto',
          empate: 'Empate, ni tú ni yo. ¡Vamos otra vez!',
          general: '¡Dale que vamos a ver qué sale!'
        };

        const response = defaultResponses[situacion as keyof typeof defaultResponses] || defaultResponses.general;
        
        console.log(`\n${DEALER_DOMINICANO.nombre}: "${response}"\n`);
        
      } catch (error) {
        console.error('❌ Error:', error);
      }

      askQuestion();
    });
  };

  // Start the interactive session
  askQuestion();
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--interactive') || args.includes('-i')) {
    await interactiveTest();
  } else {
    await testDealer();
  }
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}

export { testDealer, interactiveTest };