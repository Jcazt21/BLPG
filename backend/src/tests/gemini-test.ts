import { DEALER_DOMINICANO } from '../config/dealerPersonaConfig';
import { DealerPersonaService } from '../services/dealerPersonaService';
import { geminiConfigManager } from '../config/aiConfig';
import { isGeminiConfigured } from '../services/geminiService';

// Initialize the dealer persona service
const dealerService = new DealerPersonaService();

// Check if Gemini is configured
const geminiConfigured = isGeminiConfigured();

if (!geminiConfigured) {
  console.log('⚠️  Gemini AI service is not properly configured.');
  console.log('   This test will only show default dealer responses.');
  console.log('   To enable AI features, configure GEMINI_API_KEY in your .env file.\n');
} else {
  console.log('✅ Gemini AI service is configured and ready to use!\n');
}

/**
 * Test function that shows dealer information and tests responses
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
  
  console.log('\n🔧 Gemini AI Status:', geminiConfigured ? '✅ Enabled' : '❌ Disabled');
  if (!geminiConfigured) {
    console.log('   Using fallback responses only');
  }

  console.log('\n🎪 Frases características del dealer:');
  DEALER_DOMINICANO.ejemplo_frases.slice(0, 5).forEach((frase, index) => {
    console.log(`   ${index + 1}. "${frase}"`);
  });

  // Test different game situations
  const testScenarios = [
    { situacion: 'inicio_juego', desc: 'Inicio del juego', mensaje: '¡Hola! ¿Estás listo para jugar?' },
    { situacion: 'blackjack', desc: 'Jugador obtiene blackjack', mensaje: '¡Tengo blackjack con As y Jota!' },
    { situacion: 'jugador_gana', desc: 'Jugador gana la mano', mensaje: '¡Gané esta ronda!' },
    { situacion: 'jugador_pierde', desc: 'Jugador pierde la mano', mensaje: 'Me pasé de 21, ¡te toca a ti!' },
    { situacion: 'bust', desc: 'Jugador se pasa de 21', mensaje: '¡Me pasé de 21!' },
    { situacion: 'empate', desc: 'Empate', mensaje: '¡Es un empate!' },
    { situacion: 'general', desc: 'Mensaje general', mensaje: '¿Qué te parece si jugamos otra ronda?' }
  ];

  for (const scenario of testScenarios) {
    console.log(`\n🎭 Testing Scenario: ${scenario.desc} (${scenario.situacion})`);
    console.log(`📝 Mensaje: "${scenario.mensaje}"`);
    
    const context = {
      situacion: scenario.situacion as any,
      jugador_nombre: 'Jugador de Prueba',
      cartas_jugador: ['As', 'Rey'],
      cartas_dealer: ['8', '9'],
      apuesta: 100
    };

    try {
      const response = await dealerService.generarRespuestaDealer(context, scenario.mensaje);
      console.log('💬 Respuesta del dealer:');
      console.log(`   "${response.contenido}"`);
      console.log(`   Tono: ${response.tono_usado}`);
      if (response.metadata) {
        console.log(`   Modelo: ${response.metadata.modelo || 'N/A'}`);
        console.log(`   Tokens: ${response.metadata.tokens || 'N/A'}`);
      }
    } catch (error) {
      console.error('❌ Error al generar respuesta:', error instanceof Error ? error.message : 'Error desconocido');
    }
  }
  
  console.log('\n✅ Prueba de escenarios completada');
  
  if (!geminiConfigured) {
    console.log('\n🔧 Para habilitar respuestas de IA:');
    console.log('   1. Obtén una API key de Google AI Studio');
    console.log('   2. Configura la variable GEMINI_API_KEY en tu archivo .env');
    console.log('   3. Reinicia el servidor');
    console.log('\n   Ejemplo de .env:');
    console.log('   GEMINI_API_KEY=tu_api_key_aquí');
  } else {
    console.log('\n🎉 ¡La integración con Gemini está funcionando correctamente!');
  }
}

/**
 * Interactive test - chat with the dealer
 */
async function interactiveTest() {
  console.log('\n💬 Modo Interactivo');
  console.log(`   Escribe tu mensaje y presiona Enter para chatear con ${DEALER_DOMINICANO.nombre}.`);
  console.log('   Escribe "salir" para terminar.\n');

  if (!geminiConfigured) {
    console.log('⚠️  La IA está deshabilitada. Solo se mostrarán respuestas predeterminadas.');
    console.log('   Configura GEMINI_API_KEY en tu archivo .env para habilitar respuestas de IA.\n');
  }

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askQuestion = () => {
    rl.question('Tú: ', async (input: string) => {
      if (input.toLowerCase() === 'salir') {
        console.log('\n👋 ¡Hasta luego!');
        rl.close();
        return;
      }

      try {
        const context = {
          situacion: 'general',
          jugador_nombre: 'Tú',
          cartas_jugador: [],
          cartas_dealer: [],
          apuesta: 0
        };

        console.log('\n🤖 Dealer: Pensando...\n');
        const response = await dealerService.generarRespuestaDealer(context, input);
        
        console.log(`🤖 ${DEALER_DOMINICANO.nombre}:`);
        console.log(`   "${response.contenido}"`);
        
        if (response.metadata) {
          console.log(`   [Modelo: ${response.metadata.modelo || 'N/A'}]`);
        } else if (!geminiConfigured) {
          console.log('   [Respuesta predeterminada - IA deshabilitada]');
        }
        
      } catch (error) {
        console.error('\n❌ Error al generar respuesta:', error instanceof Error ? error.message : 'Error desconocido');
        console.log('   Mostrando respuesta predeterminada...');
        console.log('   "¡Eso está interesante! ¿Qué más quieres saber sobre el blackjack?"');
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