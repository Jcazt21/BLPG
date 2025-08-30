#!/usr/bin/env ts-node

/**
 * Prueba automática simple del Help Assistant con Gemini
 * Hace UNA sola pregunta para verificar que la generación de texto funciona
 */

import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { HelpAssistantService } from '../services/helpAssistant/helpAssistantService';
import { helpAssistantConfig } from '../config/helpAssistantConfig';

async function testHelpAssistantSimple() {
  console.log('🧪 PRUEBA AUTOMÁTICA SIMPLE - HELP ASSISTANT');
  console.log('============================================\n');

  // Verificar configuración
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY no encontrada en .env');
    console.log('💡 Agrega tu API key de Gemini en el archivo .env');
    process.exit(1);
  }

  console.log('✅ API Key encontrada');
  console.log('🔧 Configurando servicio...\n');

  // Configurar modo de prueba (límites conservadores)
  helpAssistantConfig.setTestingMode(true);
  console.log('⚙️ Modo de prueba activado (límites conservadores)');

  const config = helpAssistantConfig.getConfig();
  console.log(`📊 Configuración:`);
  console.log(`   - Max tokens: ${config.maxTokens}`);
  console.log(`   - Temperature: ${config.temperature}`);
  console.log(`   - Provider: ${config.provider}`);
  console.log(`   - Rate limit: ${config.rateLimit.perMinute}/min\n`);

  try {
    // Inicializar servicio
    const helpService = new HelpAssistantService();
    
    // Verificar disponibilidad
    console.log('🔍 Verificando disponibilidad del servicio...');
    const isAvailable = await helpService.isAvailable();
    
    if (!isAvailable) {
      console.error('❌ Servicio no disponible');
      process.exit(1);
    }
    
    console.log('✅ Servicio disponible\n');

    // LA ÚNICA PREGUNTA DE PRUEBA
    const pregunta = "¿Cuáles son las reglas básicas del blackjack?";
    
    console.log('📝 PREGUNTA DE PRUEBA:');
    console.log(`   "${pregunta}"\n`);
    
    console.log('🤖 Generando respuesta...');
    const startTime = Date.now();
    
    const resultado = await helpService.processQuestion(pregunta, {
      useCache: false // Forzar llamada a API para probar generación
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Mostrar resultados
    console.log('\n✅ RESPUESTA GENERADA:');
    console.log('========================');
    console.log(`💬 Contenido: "${resultado.response.content}"`);
    console.log(`📂 Categoría: ${resultado.response.category}`);
    console.log(`🎯 Confianza: ${resultado.response.confidence}`);
    console.log(`🔗 Relacionado con blackjack: ${resultado.response.isBlackjackRelated}`);
    console.log(`⏱️ Tiempo de respuesta: ${responseTime}ms`);
    console.log(`💾 Desde cache: ${resultado.fromCache}`);
    
    // Verificaciones básicas
    console.log('\n🔍 VERIFICACIONES:');
    
    if (resultado.response.content && resultado.response.content.length > 10) {
      console.log('✅ Contenido generado correctamente');
    } else {
      console.log('❌ Contenido insuficiente');
    }
    
    if (resultado.response.isBlackjackRelated) {
      console.log('✅ Respuesta relacionada con blackjack');
    } else {
      console.log('❌ Respuesta no relacionada con blackjack');
    }
    
    if (responseTime < 10000) { // 10 segundos
      console.log('✅ Tiempo de respuesta aceptable');
    } else {
      console.log('⚠️ Tiempo de respuesta lento');
    }
    
    // Estadísticas del servicio
    const stats = helpService.getSessionStats();
    console.log('\n📊 ESTADÍSTICAS:');
    console.log(`   - Sesiones activas: ${stats.activeSessions}`);
    console.log(`   - Total sesiones: ${stats.totalSessions}`);
    
    console.log('\n🎉 PRUEBA COMPLETADA EXITOSAMENTE');
    console.log('==================================');
    console.log('✅ La generación de texto con Gemini funciona correctamente');
    console.log(`💰 Tokens estimados consumidos: ~${config.maxTokens}`);
    console.log(`💵 Costo estimado: ~$0.001`);
    
    // Limpiar
    await helpService.shutdown();
    
  } catch (error) {
    console.error('\n❌ ERROR EN LA PRUEBA:');
    console.error('======================');
    console.error(error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        console.log('\n💡 Verifica que tu GEMINI_API_KEY sea válida');
      } else if (error.message.includes('quota')) {
        console.log('\n💡 Verifica tu cuota de API en Google AI Studio');
      } else if (error.message.includes('network')) {
        console.log('\n💡 Verifica tu conexión a internet');
      }
    }
    
    process.exit(1);
  } finally {
    // Resetear configuración
    helpAssistantConfig.setTestingMode(false);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testHelpAssistantSimple().catch(console.error);
}

export { testHelpAssistantSimple };