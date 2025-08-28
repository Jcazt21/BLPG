# Tests de Gemini con Personalidad del Dealer

Este directorio contiene 2 tests optimizados para conservar la cuota diaria de API de Gemini (50 requests gratuitos).

## Tests Disponibles

### 1. Test Automatizado (`gemini-test.ts`)
Test eficiente que usa **solo 1 request** para verificar la integración del API de Gemini con la personalidad del dealer.

**Características:**
- ✅ **Solo 1 request** - conserva tu cuota diaria
- Prueba situación de blackjack (la más emocionante)
- Verifica respuestas con características dominicanas
- Muestra métricas de rendimiento (tiempo, tokens)
- Análisis automático de la respuesta

**Ejecutar:**
```bash
# Test automatizado (1 request)
npm run test:gemini
```

### 2. Test Interactivo (`gemini-test.ts --interactive`)
Modo interactivo para chatear directamente con Javi "El Tigre".

**Características:**
- Chat en tiempo real con el dealer
- Contador de requests usados
- Soporte para situaciones específicas
- Análisis automático de respuestas
- Advertencias cuando te acercas al límite

**Ejecutar:**
```bash
# Test interactivo
npm run test:gemini:interactive
```

## Configuración del Dealer

Los tests usan la configuración completa de `dealerPersonaConfig.ts`:

- **Nombre:** Javi "El Tigre"
- **Personalidad:** Dealer profesional dominicano con 15 años de experiencia
- **Tono:** Jocoso
- **Frases características:** 16 frases típicas dominicanas
- **Situaciones:** 8 situaciones específicas del juego
- **Configuración del modelo:** Temperature 0.8, MaxTokens 150

## Comandos del Test Interactivo

### Test Básico Interactivo:
- `<situacion> <mensaje>` - Respuesta en situación específica
- `exit` - Salir

### Test Completo Interactivo:
- `<situacion> <mensaje>` - Respuesta en situación específica
- `frases` - Mostrar frases características
- `config` - Mostrar configuración completa del dealer
- `info` - Información del modelo
- `exit` - Salir

## Situaciones Disponibles

- `inicio_juego` - Saludo inicial con energía
- `repartiendo_cartas` - Comentario durante reparto
- `jugador_gana` - Felicitación genuina
- `jugador_pierde` - Consuelo y motivación
- `blackjack` - Sorpresa y admiración
- `bust` - Empatía con humor ligero
- `empate` - Comentario neutral amigable
- `general` - Conversación casual

## Ejemplos de Uso

```bash
# Test rápido automatizado (1 request)
npm run test:gemini

# Chatear con Javi "El Tigre" (usa requests según conversación)
npm run test:gemini:interactive
```

## ⚠️ Límites de API

- **50 requests gratuitos por día**
- **15 requests por minuto**
- Se resetea cada 24 horas
- El test automatizado usa solo 1 request
- El test interactivo usa 1 request por mensaje

## Análisis Automático

Los tests verifican automáticamente:
- ✅ Características dominicanas (klk, bro, hermano, tigre, vaina, eto)
- ✅ Tono jocoso (ja, eh, ay, dichoso)
- ✅ Profesionalismo (carta, mano, juego, apuesta)
- ✅ Concisión (máximo 25 palabras por respuesta)

## Requisitos

- Variable de entorno `GEMINI_API_KEY` configurada
- Dependencias instaladas (`npm install`)
- Configuración de Gemini habilitada en `aiConfig.ts`