#!/usr/bin/env ts-node

/**
 * Prueba interactiva del Help Assistant con Gemini
 * Permite chatear en tiempo real para probar la generación de texto
 */

import dotenv from 'dotenv';
import path from 'path';
import * as readline from 'readline';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { HelpAssistantService } from '../services/helpAssistant/helpAssistantService';
import { helpAssistantConfig } from '../config/helpAssistantConfig';

async function testHelpAssistantInteractive() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('💬 CHAT INTERACTIVO - HELP ASSISTANT');
  console.log('====================================\n');

  // Verificar configuración
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY no encontrada en .env');
    console.log('💡 Agrega tu API key de Gemini en el archivo .env');
    rl.close();
    return;
  }

  console.log('✅ API Key encontrada');

  // Configurar modo de prueba
  helpAssistantConfig.setTestingMode(true);
  console.log('⚙️ Modo de prueba activado (límites conservadores)');

  const config = helpAssistantConfig.getConfig();
  console.log(`📊 Configuración:`);
  console.log(`   - Max tokens: ${config.maxTokens}`);
  console.log(`   - Temperature: ${config.temperature}`);
  console.log(`   - Rate limit: ${config.rateLimit.perMinute}/min\n`);

  try {
    // Inicializar servicio
    console.log('🔧 Inicializando Help Assistant...');
    const helpService = new HelpAssistantService();
    
    // Verificar disponibilidad
    const isAvailable = await helpService.isAvailable();
    if (!isAvailable) {
      console.error('❌ Servicio no disponible');
      rl.close();
      return;
    }

    console.log('✅ Help Assistant listo!\n');

    // Crear sesión
    const session = helpService.createSession('test-interactive-session');
    console.log(`🎯 Sesión creada: ${session.id}\n`);

    // Instrucciones
    console.log('💬 COMANDOS DISPONIBLES:');
    console.log('  • Escribe cualquier pregunta sobre blackjack');
    console.log('  • "stats" - Ver estadísticas del servicio');
    console.log('  • "session" - Ver información de la sesión');
    console.log('  • "cache" - Ver estadísticas del cache');
    console.log('  • "clear" - Limpiar cache');
    console.log('  • "exit" - Salir del chat\n');

    console.log('🎲 EJEMPLOS DE PREGUNTAS:');
    console.log('  • ¿Cuáles son las reglas del blackjack?');
    console.log('  • ¿Cuánto vale un As?');
    console.log('  • ¿Qué significa doblar?');
    console.log('  • ¿Cuándo debo pedir carta?\n');

    console.log('🤖 ¡Asistente listo! Escribe tu pregunta...\n');

    let questionCount = 0;
    let totalTokens = 0;

    const askQuestion = () => {
      rl.question('🎮 Tú: ', async (input: string) => {
        const trimmedInput = input.trim();
        
        if (trimmedInput.toLowerCase() === 'exit') {
          console.log('\n👋 ¡Hasta luego! Gracias por probar el Help Assistant.');
          console.log(`📊 Resumen de la sesión:`);
          console.log(`   - Preguntas realizadas: ${questionCount}`);
          console.log(`   - Tokens estimados: ~${totalTokens}`);
          console.log(`   - Costo estimado: ~$${(totalTokens * 0.000001).toFixed(4)}`);
          
          await helpService.shutdown();
          rl.close();
          return;
        }

        if (trimmedInput === '') {
          askQuestion();
          return;
        }

        try {
          // Comandos especiales
          if (trimmedInput.toLowerCase() === 'stats') {
            const stats = helpService.getSessionStats();
            console.log('\n📊 ESTADÍSTICAS DEL SERVICIO:');
            console.log(`   - Sesiones activas: ${stats.activeSessions}`);
            console.log(`   - Total sesiones: ${stats.totalSessions}`);
            console.log(`   - Promedio mensajes: ${stats.averageMessageCount}\n`);
            askQuestion();
            return;
          }

          if (trimmedInput.toLowerCase() === 'session') {
            const currentSession = helpService.getSession(session.id);
            if (currentSession) {
              console.log('\n🎯 INFORMACIÓN DE LA SESIÓN:');
              console.log(`   - ID: ${currentSession.id}`);
              console.log(`   - Mensajes: ${currentSession.messageCount}`);
              console.log(`   - Inicio: ${currentSession.startTime.toLocaleTimeString()}`);
              console.log(`   - Última actividad: ${currentSession.lastActivity.toLocaleTimeString()}`);
              console.log(`   - Preguntas previas: ${currentSession.context.previousQuestions.length}\n`);
            }
            askQuestion();
            return;
          }

          if (trimmedInput.toLowerCase() === 'cache') {
            const cacheStats = helpService.getCacheStats();
            console.log('\n💾 ESTADÍSTICAS DEL CACHE:');
            console.log(`   - Tamaño actual: ${cacheStats.size}`);
            console.log(`   - Tamaño máximo: ${cacheStats.maxSize}`);
            console.log(`   - TTL: ${cacheStats.ttl}s`);
            console.log(`   - Habilitado: ${cacheStats.enabled}\n`);
            askQuestion();
            return;
          }

          if (trimmedInput.toLowerCase() === 'clear') {
            helpService.clearCache();
            console.log('\n🗑️ Cache limpiado\n');
            askQuestion();
            return;
          }

          // Procesar pregunta
          console.log('\n🤖 Asistente: Pensando...');
          const startTime = Date.now();
          
          const resultado = await helpService.processQuestion(trimmedInput, {
            sessionId: session.id,
            useCache: true // Permitir cache para eficiencia
          });
          
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          questionCount++;
          totalTokens += config.maxTokens; // Estimación

          // Mostrar respuesta
          console.log('\n🤖 Asistente de Blackjack:');
          console.log(`💬 "${resultado.response.content}"`);
          console.log(`\n📊 Detalles:`);
          console.log(`   - Categoría: ${resultado.response.category}`);
          console.log(`   - Confianza: ${resultado.response.confidence}`);
          console.log(`   - Tiempo: ${responseTime}ms`);
          console.log(`   - Cache: ${resultado.fromCache ? 'Sí' : 'No'}`);
          console.log(`   - Tokens estimados: ~${config.maxTokens}`);

          // Validaciones
          if (!resultado.response.isBlackjackRelated) {
            console.log('⚠️ Nota: Esta respuesta fue redirigida (no relacionada con blackjack)');
          }

          console.log(''); // Línea en blanco

        } catch (error) {
          console.error(`\n❌ Error: ${error}`);
          
          if (error instanceof Error) {
            if (error.message.includes('rate limit')) {
              console.log('⚠️ Límite de velocidad alcanzado. Espera un momento...');
            } else if (error.message.includes('quota')) {
              console.log('⚠️ Cuota de API agotada. Verifica tu cuenta de Gemini.');
            }
          }
          
          console.log('🔄 Intenta de nuevo...\n');
        }

        askQuestion();
      });
    };

    // Iniciar el chat
    askQuestion();

  } catch (error) {
    console.error('\n❌ Error inicializando el chat:', error);
    rl.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testHelpAssistantInteractive().catch(console.error);
}

export { testHelpAssistantInteractive };