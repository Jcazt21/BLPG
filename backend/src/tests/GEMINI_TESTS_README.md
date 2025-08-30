# 🧪 Pruebas de Gemini - Help Assistant

## 📋 Resumen de Pruebas Disponibles

Tienes exactamente **2 pruebas principales** para probar la generación de texto con Gemini:

### 1. 🤖 Prueba Automática Simple
**Archivo**: `help-gemini-simple.ts`  
**Comando**: `npm run test:help:gemini`

- ✅ Hace **UNA sola pregunta** predefinida
- ✅ Verifica que la generación de texto funcione
- ✅ Muestra estadísticas de tokens y tiempo
- ✅ Configuración conservadora (límites bajos)
- ✅ **Costo estimado**: ~$0.001

```bash
cd backend
npm run test:help:gemini
```

### 2. 💬 Prueba Interactiva
**Archivo**: `help-gemini-interactive.ts`  
**Comando**: `npm run test:help:chat`

- ✅ Chat en tiempo real contigo
- ✅ Puedes escribir múltiples preguntas
- ✅ Comandos especiales (stats, cache, etc.)
- ✅ Control total sobre cuántas preguntas hacer
- ✅ **Costo**: Depende de cuántas preguntas hagas

```bash
cd backend
npm run test:help:chat
```

## 🚫 Pruebas Eliminadas/Deshabilitadas

Las siguientes pruebas **NO consumen tokens** (usan mocks):

### ❌ Pruebas de Unidad
- `helpAssistantService.test.ts` - Solo usa fallbacks
- `llmProvider.test.ts` - Solo prueba MockProvider
- `integration.test.ts` - Skipeadas para evitar API calls

### ❌ Pruebas del Dealer (Diferentes)
- `gemini-test.ts` - Para el dealer del juego (no Help Assistant)
- `interactive-dealer-chat.ts` - Para el dealer del juego (no Help Assistant)

## ⚙️ Configuración de Seguridad

Ambas pruebas usan **modo de prueba** automáticamente:

```typescript
// Configuración automática en las pruebas
helpAssistantConfig.setTestingMode(true);

// Límites conservadores:
- Max tokens: 100 (en lugar de 150)
- Rate limit: 1/min (en lugar de 3/min)
- Temperature: 0.3 (respuestas más cortas)
```

## 🎯 Uso Recomendado

### Para Desarrollo Diario:
```bash
# Pruebas sin API calls (gratis)
npm run test:help:minimal
```

### Para Verificar Gemini:
```bash
# Una sola pregunta (muy barato)
npm run test:help:gemini
```

### Para Probar Interactivamente:
```bash
# Chat controlado (tú decides cuánto gastar)
npm run test:help:chat
```

## 📊 Estimación de Costos

| Prueba | Preguntas | Tokens | Costo Estimado |
|--------|-----------|--------|----------------|
| Automática | 1 | ~100 | $0.001 |
| Interactiva | Variable | ~100/pregunta | $0.001/pregunta |
| Desarrollo | 0 | 0 | $0.00 |

## 🔧 Configuración Requerida

Solo necesitas esto en tu `.env`:

```env
GEMINI_API_KEY=tu_api_key_aqui
```

Todo lo demás está configurado automáticamente en `helpAssistantConfig.ts`.

## 🚨 Protecciones Implementadas

1. **Modo de prueba automático** - Límites ultra-conservadores
2. **Una sola pregunta** en la prueba automática
3. **Control manual** en la prueba interactiva
4. **Confirmación requerida** para pruebas costosas
5. **Fallbacks automáticos** si no hay API key

## 📝 Comandos Rápidos

```bash
# Desarrollo seguro (0 tokens)
npm run test:help:minimal

# Verificar Gemini (1 pregunta)
npm run test:help:gemini

# Chat interactivo (controlado)
npm run test:help:chat

# Ver todos los comandos
npm run
```

## 🎉 Resultado

Ahora tienes **control total** sobre el consumo de tokens:
- **0 tokens** para desarrollo diario
- **~100 tokens** para verificar que Gemini funciona
- **Variable** para pruebas interactivas (tú decides)

¡No más sorpresas en la factura de API! 🎯