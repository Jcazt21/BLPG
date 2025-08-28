import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { getGeminiService, isGeminiConfigured } from '../services/geminiService';
import { geminiConfigManager } from '../config/aiConfig';
import { DEALER_DOMINICANO, DEALER_SYSTEM_PROMPTS, DEALER_MODEL_CONFIG } from '../config/dealerPersonaConfig';

/**
 * Test automatizado que solo hace 1 request para verificar que todo funciona
 */
async function testGemini() {
  console.log('🧪 Testing Gemini API with Dealer Persona...\n');
  console.log(`🎭 Dealer: ${DEALER_DOMINICANO.nombre}`);
  console.log(`� Personaliidad: ${DEALER_DOMINICANO.personalidad.substring(0, 100)}...`);
  console.log(`� Tono: ${DEEALER_DOMINICANO.tono}\n`);

  // Initialize configuration
  geminiConfigManager.initialize();

  if (!isGeminiConfigured()) {
    console.error('❌ Gemini is not configured');
    console.log('Please add GEMINI_API_KEY to your .env file');
    return;
  }

  try {
    // Get service instance
    const geminiService = getGeminiService();
    console.log('✅ Gemini service initialized');

    // Show model info
    const modelInfo = geminiService.getModelInfo();
    console.log(`📡 Dealer model: ${modelInfo.dealerModel}`);
    console.log(`🔑 API configured: ${modelInfo.apiKeyConfigured}`);

    // Test availability
    console.log('\n🔍 Testing API availability...');
    const isAvailable = await geminiService.isAvailable();

    if (!isAvailable) {
      console.error('❌ Gemini API is not available');
      return;
    }

    console.log('✅ Gemini API is available');

    // Show configuration
    console.log('\n⚙️  Model Configuration:');
    console.log(`   Temperature: ${DEALER_MODEL_CONFIG.temperature} (más creatividad)`);
    console.log(`   Max Tokens: ${DEALER_MODEL_CONFIG.maxTokens} (respuestas cortas)`);
    console.log(`   Top P: ${DEALER_MODEL_CONFIG.topP}`);
    console.log(`   Frequency Penalty: ${DEALER_MODEL_CONFIG.frequencyPenalty} (evitar repetición)`);

    // Show some characteristic phrases
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
    console.log(`📋 System Prompt: ${DEALER_SYSTEM_PROMPTS[testSituacion as keyof typeof DEALER_SYSTEM_PROMPTS]}`);

    const response = await geminiService.generateDealerResponse(testPrompt, testSituacion);

    console.log(`\n⏱️  Response time: ${response.responseTime}ms`);
    console.log(`📊 Tokens: ${response.usage.totalTokens} (prompt: ${response.usage.promptTokens}, completion: ${response.usage.completionTokens})`);
    console.log(`🏁 Finish reason: ${response.finishReason}`);
    console.log(`🎭 ${DEALER_DOMINICANO.nombre} dice:`);
    console.log(`   "${response.content}"`);

    // Análisis de la respuesta
    const contenido = response.content.toLowerCase();
    const caracteristicas = {
      dominicano: contenido.includes('klk') || contenido.includes('bro') || contenido.includes('hermano') || contenido.includes('tigre') || contenido.includes('vaina') || contenido.includes('eto') || contenido.includes('tamo') || contenido.includes('dichoso'),
      jocoso: contenido.includes('ja') || contenido.includes('eh') || contenido.includes('ay') || contenido.includes('bárbaro') || contenido.includes('brutal'),
      profesional: contenido.includes('carta') || contenido.includes('mano') || contenido.includes('juego') || contenido.includes('apuesta') || contenido.includes('blackjack'),
      longitud: response.content.split(' ').length <= 25
    };

    console.log(`\n🔍 Análisis automático:`);
    console.log(`   🇩🇴 Dominicano: ${caracteristicas.dominicano ? '✅' : '❌'}`);
    console.log(`   😄 Jocoso: ${caracteristicas.jocoso ? '✅' : '❌'}`);
    console.log(`   🎯 Profesional: ${caracteristicas.profesional ? '✅' : '❌'}`);
    console.log(`   📏 Conciso (≤25 palabras): ${caracteristicas.longitud ? '✅' : '❌'}`);

    console.log('\n🎉 Gemini dealer test completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Dealer: ${DEALER_DOMINICANO.nombre}`);
    console.log(`   Requests used: 1 (conserva tu cuota diaria)`);
    console.log(`   Personalidad: ${DEALER_DOMINICANO.tono}`);
    console.log(`   Frases características: ${DEALER_DOMINICANO.ejemplo_frases.length}`);
    console.log(`   Contexto: ${DEALER_DOMINICANO.contexto.substring(0, 60)}...`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
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

  // Initialize configuration
  geminiConfigManager.initialize();

  if (!isGeminiConfigured()) {
    console.error('❌ Gemini is not configured');
    rl.close();
    return;
  }

  const geminiService = getGeminiService();

  console.log(`🎭 Interactive Chat with ${DEALER_DOMINICANO.nombre}`);
  console.log(`🎪 Personalidad: ${DEALER_DOMINICANO.personalidad.substring(0, 80)}...`);
  console.log(`🎯 Tono: ${DEALER_DOMINICANO.tono}`);
  console.log('\nCommands:');
  console.log('  <situacion> <mensaje> - Respuesta en situación específica');
  console.log('  Situaciones: inicio_juego, blackjack, jugador_gana, jugador_pierde, bust, empate');
  console.log('  exit - Salir');
  console.log('\n💬 También puedes chatear casualmente - ¡Javi te responderá!\n');

  let requestCount = 0;

  const askQuestion = () => {
    rl.question(`You (${requestCount} requests): `, async (input: string) => {
      if (input.toLowerCase() === 'exit') {
        console.log('👋 ¡Hasta luego!');
        console.log(`📊 Total requests usados: ${requestCount}`);
        rl.close();
        return;
      }

      if (input.trim() === '') {
        askQuestion();
        return;
      }

      try {
        const parts = input.trim().split(' ');
        const possibleSituacion = parts[0].toLowerCase();
        const situaciones = ['inicio_juego', 'blackjack', 'jugador_gana', 'jugador_pierde', 'bust', 'empate', 'repartiendo_cartas'];

        let situacion = 'general';
        let prompt = input;

        if (situaciones.includes(possibleSituacion)) {
          situacion = possibleSituacion;
          prompt = parts.slice(1).join(' ');
          console.log(`🎭 ${DEALER_DOMINICANO.nombre} respondiendo en situación: ${situacion}...`);
        } else {
          console.log(`🎭 ${DEALER_DOMINICANO.nombre} respondiendo casualmente...`);
        }

        const response = await geminiService.generateDealerResponse(prompt, situacion);
        requestCount++;

        console.log(`\n${DEALER_DOMINICANO.nombre} (${response.responseTime}ms, ${response.usage.totalTokens} tokens):`);
        console.log(`"${response.content}"`);

        // Mini análisis
        const contenido = response.content.toLowerCase();
        const caracteristicas = {
          dominicano: contenido.includes('klk') || contenido.includes('bro') || contenido.includes('hermano') || contenido.includes('tigre') || contenido.includes('vaina') || contenido.includes('eto'),
          jocoso: contenido.includes('ja') || contenido.includes('eh') || contenido.includes('ay') || contenido.includes('dichoso')
        };

        if (caracteristicas.dominicano) console.log('🇩🇴 ✅ Características dominicanas');
        if (caracteristicas.jocoso) console.log('😄 ✅ Tono jocoso');

        if (requestCount >= 45) {
          console.log('⚠️  ADVERTENCIA: Te estás acercando al límite diario de 50 requests!');
        }
        console.log('');

      } catch (error) {
        if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
          console.error('❌ Límite de requests alcanzado. Espera hasta mañana.');
          console.log('💡 El límite se resetea cada 24 horas.');
          rl.close();
          return;
        }
        console.error('❌ Error:', error.message);
      }

      askQuestion();
    });
  };

  // Check availability first
  try {
    const isAvailable = await geminiService.isAvailable();
    if (!isAvailable) {
      console.error('❌ Gemini service is not available');
      rl.close();
      return;
    }
    console.log(`✅ Conectado con ${DEALER_DOMINICANO.nombre}\n`);
    console.log(`💬 Ejemplo de frases que usa:`);
    DEALER_DOMINICANO.ejemplo_frases.slice(0, 3).forEach((frase, index) => {
      console.log(`   "${frase}"`);
    });
    console.log('');
    askQuestion();
  } catch (error) {
    console.error('❌ Failed to connect to Gemini:', error);
    rl.close();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--interactive') || args.includes('-i')) {
    await interactiveTest();
  } else {
    await testGemini();
  }
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}

export { testGemini, interactiveTest };