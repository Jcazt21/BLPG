import dotenv from "dotenv";
import path from "path";
import * as readline from "readline";

// Carga las variables de ambiente
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { getGeminiService, isGeminiConfigured } from "../services/geminiService";
import { geminiConfigManager } from "../config/aiConfig";
import { DEALER_DOMINICANO, DEALER_SYSTEM_PROMPTS } from "../config/dealerPersonaConfig";

/**
 * Chat interactivo con Javi "El Tigre del Malecón"
 */
async function interactiveDealerChat() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("🎰 ========================================");
  console.log("🎭 CHAT INTERACTIVO CON JAVI EL TIGRE");
  console.log("🎰 ========================================\n");

  // Inicializa la configuración
  geminiConfigManager.initialize();

  if (!isGeminiConfigured()) {
    console.error("❌ Gemini no está configurado");
    console.log("💡 Agrega GEMINI_API_KEY en el archivo .env");
    rl.close();
    return;
  }

  try {
    const geminiService = getGeminiService();
    
    // Verifica que el servicio esté disponible
    console.log("🔍 Conectando con Javi...");
    const isAvailable = await geminiService.isAvailable();
    
    if (!isAvailable) {
      console.error("❌ No se pudo conectar con el servicio Gemini");
      rl.close();
      return;
    }

    // Muestra información del dealer
    console.log(`✅ ¡Conectado con ${DEALER_DOMINICANO.nombre}!\n`);
    console.log(`🎪 ${DEALER_DOMINICANO.personalidad.substring(0, 120)}...\n`);
    console.log(`🎯 Ambiente: ${DEALER_DOMINICANO.contexto.substring(0, 100)}...\n`);
    
    console.log("💬 COMANDOS DISPONIBLES:");
    console.log("  • Escribe cualquier cosa para chatear");
    console.log("  • 'situacion <tipo> <mensaje>' - Para situaciones específicas");
    console.log("  • 'frases' - Ver frases características");
    console.log("  • 'info' - Información del dealer");
    console.log("  • 'exit' - Salir del chat\n");
    
    console.log("🎲 SITUACIONES DISPONIBLES:");
    console.log("  inicio_juego, repartiendo_cartas, jugador_gana, jugador_pierde,");
    console.log("  blackjack, bust, empate, general\n");
    
    console.log("🎉 ¡Javi está listo para el vacilón! Escribe algo...\n");

    const askQuestion = () => {
      rl.question("🎮 Tú: ", async (input: string) => {
        const trimmedInput = input.trim();
        
        if (trimmedInput.toLowerCase() === "exit") {
          console.log(`\n👋 ${DEALER_DOMINICANO.nombre}: ¡Eyyy, que te vaya bien, mi pana! ¡Vuelve cuando quieras!`);
          rl.close();
          return;
        }

        if (trimmedInput === "") {
          askQuestion();
          return;
        }

        try {
          // Comandos especiales
          if (trimmedInput.toLowerCase() === "frases") {
            console.log(`\n🎪 Frases características de ${DEALER_DOMINICANO.nombre}:`);
            DEALER_DOMINICANO.ejemplo_frases.forEach((frase, index) => {
              console.log(`   ${index + 1}. "${frase}"`);
            });
            console.log("");
            askQuestion();
            return;
          }

          if (trimmedInput.toLowerCase() === "info") {
            console.log(`\n⚙️ INFORMACIÓN DEL DEALER:`);
            console.log(`   👤 Nombre: ${DEALER_DOMINICANO.nombre}`);
            console.log(`   🎭 Tono: ${DEALER_DOMINICANO.tono}`);
            console.log(`   🎪 Personalidad: ${DEALER_DOMINICANO.personalidad}`);
            console.log(`   🏛️ Contexto: ${DEALER_DOMINICANO.contexto}`);
            console.log(`   ⚠️ Límites: ${DEALER_DOMINICANO.limites_humor}`);
            console.log(`   📝 Frases: ${DEALER_DOMINICANO.ejemplo_frases.length} frases características\n`);
            askQuestion();
            return;
          }

          // Manejo de situaciones específicas
          let situacion = "general";
          let mensaje = trimmedInput;

          if (trimmedInput.toLowerCase().startsWith("situacion ")) {
            const parts = trimmedInput.substring(10).split(" ");
            const posibleSituacion = parts[0].toLowerCase();
            const situacionesValidas = [
              "inicio_juego", "repartiendo_cartas", "jugador_gana", 
              "jugador_pierde", "blackjack", "bust", "empate", "general"
            ];

            if (situacionesValidas.includes(posibleSituacion)) {
              situacion = posibleSituacion;
              mensaje = parts.slice(1).join(" ");
              console.log(`🎭 Javi respondiendo en situación: ${situacion}...`);
            } else {
              console.log(`⚠️ Situación no válida. Usa: ${situacionesValidas.join(", ")}`);
              askQuestion();
              return;
            }
          } else {
            console.log(`🎭 Javi respondiendo con su flow natural...`);
          }

          // Genera la respuesta del dealer
          const startTime = Date.now();
          const response = await geminiService.generateDealerResponse(mensaje, situacion);
          const responseTime = Date.now() - startTime;

          // Muestra la respuesta
          console.log(`\n🎰 ${DEALER_DOMINICANO.nombre} (${responseTime}ms, ${response.usage.totalTokens} tokens):`);
          console.log(`💬 "${response.content}"\n`);

          // Análisis de la respuesta (opcional)
          const contenidoLower = response.content.toLowerCase();
          const expresionesDominicanas = [
            "klk", "tigre", "pana", "socio", "diablo", "wao", "chevere", 
            "bacano", "tamo", "eto", "vainita", "mi loco", "compai", 
            "tiguere", "wepa", "coñazo", "bonche"
          ];
          
          const tieneFlow = expresionesDominicanas.some(expr => contenidoLower.includes(expr));
          if (tieneFlow) {
            console.log("🇩🇴 ¡Respuesta con flow dominicano auténtico!");
          }

        } catch (error) {
          console.error(`❌ Error: ${error}`);
          console.log("🔄 Intenta de nuevo...\n");
        }

        askQuestion();
      });
    };

    askQuestion();

  } catch (error) {
    console.error("❌ Error inicializando el chat:", error);
    rl.close();
  }
}

// Función principal
async function main() {
  await interactiveDealerChat();
}

// Ejecuta el chat si se llama directamente
if (require.main === module) {
  main().catch(console.error);
}

export { interactiveDealerChat };