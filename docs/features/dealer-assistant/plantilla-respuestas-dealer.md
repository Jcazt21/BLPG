# Plantilla de Respuestas del Dealer Dominicano

## Formato para cada respuesta:

```javascript
{
  trigger: /palabras|clave|regex/i,
  response: {
    content: "Respuesta del dealer con personalidad dominicana (máximo 300 caracteres)",
    category: "rules|strategy|betting|mechanics|redirect",
    confidence: 0.8-1.0,
    isBlackjackRelated: true,
    containsAdvice: false,
    metadata: { 
      rulesReferenced: ["regla1", "regla2"] // o strategyConcepts o redirectReason
    }
  },
  priority: 1-5 // 1 = más alta prioridad
}
```

## Categorías disponibles:
- **rules**: Reglas básicas del blackjack
- **strategy**: Estrategia general (sin consejos específicos)
- **betting**: Información sobre apuestas
- **mechanics**: Mecánicas del juego (doblar, dividir, etc.)
- **redirect**: Redirecciones o saludos

## Ejemplos de triggers (regex):
- `/hola|saludos|klk|que tal/i` - Saludos
- `/reglas|como se juega|objetivo/i` - Reglas
- `/valores|cuanto vale|carta/i` - Valores de cartas
- `/doblar|double/i` - Mecánica de doblar
- `/dividir|split/i` - Mecánica de dividir
- `/plantarse|stand|me planto/i` - Mecánica de plantarse
- `/pedir|hit|otra carta/i` - Mecánica de pedir carta
- `/blackjack|21/i` - Blackjack específico
- `/dealer|casa|crupier/i` - Sobre el dealer
- `/ganar|perder|como gano/i` - Objetivo del juego
- `/apuesta|apostar|dinero/i` - Sobre apuestas (redirect)

## Personalidad del dealer:
- Usa expresiones dominicanas: klk, tiguere, pana, socio, diablo, wao, chevere, bacano, tamo, eto, vaina
- Faltas ortográficas naturales: no poner 's' al final, cambiar 'r' por 'l' 
- Tono jocoso pero profesional
- Máximo 1 oración por respuesta
- Mantener bajo 300 caracteres

## Llena esta plantilla con 15-20 respuestas diferentes:

```javascript
// SALUDOS Y PRESENTACIÓN
{
  trigger: /hola|saludos|buenas|que tal/i,
  response: {
    content: "TU_RESPUESTA_AQUÍ",
    category: "redirect",
    confidence: 1.0,
    isBlackjackRelated: true,
    containsAdvice: false,
    metadata: { redirectReason: "greeting" }
  },
  priority: 1
},

// REGLAS BÁSICAS
{
  trigger: /objetivo|como ganar|como se gana|meta/i,
  response: {
    content: "TU_RESPUESTA_AQUÍ", 
    category: "rules",
    confidence: 1.0,
    isBlackjackRelated: true,
    containsAdvice: false,
    metadata: { rulesReferenced: ["objetivo"] }
  },
  priority: 1
},

// Continúa con más respuestas...
```

Llena la plantilla y me la das de vuelta para implementarla.