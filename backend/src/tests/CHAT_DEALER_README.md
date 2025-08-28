# Chat Interactivo con Javi "El Tigre del Malecón"

## 🎰 Descripción

Chat interactivo en consola para conversar con Javi "El Tigre", el dealer dominicano de blackjack. Usa la configuración completa del `dealerPersonaConfig.ts` para generar respuestas auténticas con flow caribeño.

## 🚀 Cómo ejecutar

### Desde el directorio backend:

```bash
npm run chat:dealer
```

### O directamente con ts-node:

```bash
ts-node src/tests/interactive-dealer-chat.ts
```

## 📋 Requisitos

1. **Variable de ambiente**: Asegúrate de tener `GEMINI_API_KEY` en tu archivo `.env`
2. **Dependencias**: Ejecuta `npm install` si no lo has hecho

## 💬 Comandos disponibles

### Chat normal
Simplemente escribe cualquier cosa y Javi te responderá con su personalidad dominicana:

```
🎮 Tú: Hola Javi, ¿cómo estás?
🎰 Javi "El Tigre del Malecón": ¡Klk mi pana! Aquí andamos en el vacilón, listo pa' partir esta mesa. ¿Tú cómo tú tá'?
```

### Situaciones específicas
Usa el comando `situacion` para probar respuestas en contextos específicos del juego:

```
🎮 Tú: situacion inicio_juego Los jugadores están llegando
🎰 Javi "El Tigre del Malecón": ¡Eyyy, qué lo qué mi gente! Bienvenidos a la mesa del Tigre, aquí vamo' a romper con este blackjack...
```

### Comandos especiales

- **`frases`** - Muestra todas las frases características de Javi
- **`info`** - Información completa del dealer (personalidad, contexto, etc.)
- **`exit`** - Salir del chat

## 🎲 Situaciones disponibles

- `inicio_juego` - Cuando llegan jugadores nuevos
- `repartiendo_cartas` - Durante el reparto de cartas
- `jugador_gana` - Cuando un jugador gana
- `jugador_pierde` - Cuando un jugador pierde
- `blackjack` - Cuando alguien saca blackjack
- `bust` - Cuando alguien se pasa de 21
- `empate` - En caso de empate
- `general` - Conversación general

## 🎭 Personalidad del Dealer

**Javi "El Tigre del Malecón"** es un dealer profesional dominicano con:

- 15 años de experiencia en casinos
- Personalidad carismática y jocosa
- Flow auténtico dominicano
- Ambiente relajado y familiar
- Más de 20 frases características

## 🔧 Características técnicas

- Usa Gemini AI para generar respuestas
- Configuración optimizada para personalidad natural
- Análisis automático de expresiones dominicanas
- Métricas de respuesta (tiempo y tokens)
- Manejo de errores robusto

## 🎉 Ejemplos de uso

### Chat casual:
```
🎮 Tú: ¿Qué tal el ambiente hoy?
🎰 Javi: ¡Diablo, mi hermano! Hoy tá' más caliente que un fogón en Navidad, el ambiente tá' brutal.
```

### Situación de juego:
```
🎮 Tú: situacion blackjack ¡Saqué As y Rey!
🎰 Javi: ¡Blackjack, carajo! Tú tienes un tumbao' bendito, mi pana. ¡Esa mano tá' pa'l Instagram!
```

### Ver frases:
```
🎮 Tú: frases
🎪 Frases características de Javi "El Tigre del Malecón":
   1. "¡Klk, qué lo qué, tiguere! ¿Listo pa' romper la mesa o qué?"
   2. "¡Eeeeh, pero mira ese flow! Esto tá' en candela, mi loco"
   ...
```

¡Disfruta chateando con el Tigre! 🐅🎰