import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import express from 'express';
import cors from 'cors';
import gameRoutes from './routes/gameRoutes';
import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Card, Suit, Value } from './types/gameTypes';
import { ConfigManager } from './config/environment';

// Validate configuration on startup
ConfigManager.validate();
const config = ConfigManager.get();

const app = express();

app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true
}));
app.use(express.json());

// Health check endpoint for Docker
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'blackjack-backend'
  });
});

app.use('/game', gameRoutes);

// --- Multiplayer Room Logic ---
type MultiplayerPlayer = { 
  id: string;
  name: string;
  position: number;
  hand: Card[];
  total: number;
  isBust: boolean;
  isStand: boolean;
  isBlackjack: boolean;
  status: 'playing' | 'stand' | 'bust' | 'blackjack';
};

type MultiplayerDealer = { 
  hand: Card[];
  hiddenCard?: Card;
  total: number;
  isBust: boolean;
  isBlackjack: boolean;
};

type MultiplayerGameState = {
  started: boolean;
  players: MultiplayerPlayer[];
  dealer: MultiplayerDealer;
  deck: Card[];
  turn: number; // index of current player
  phase: 'dealing' | 'playing' | 'dealer' | 'result';
  results?: { [playerId: string]: GameResult };
};

type GameResult = {
  status: 'win' | 'lose' | 'draw' | 'bust' | 'blackjack';
};

type Room = {
  sockets: Set<string>;
  players: Map<string, MultiplayerPlayer>;
  creator: string;
  gameState: MultiplayerGameState | null;
  playersReady: Set<string>;
};

/*
// ===== MULTIPLAYER: Dealer único y global =====
// Descomenta este bloque para asegurar que el dealer es el mismo para todos los jugadores de la sala.
// 1. El dealer y su mano viven en el estado global de la sala (room.gameState.dealer)
// 2. Cada vez que cambie el estado de la partida, se debe emitir el estado completo (incluyendo dealer) a todos los sockets de la sala.
// 3. Los jugadores nunca deben tener una copia local del dealer, siempre se usa el del estado global.
//
// Ejemplo de actualización (en handlers de acciones):
//
// room.gameState.dealer = actualizarDealer(room.gameState.dealer, room.gameState.deck);
// io.to(roomCode).emit('gameStateUpdate', room.gameState);
//
// Para activar, elimina los comentarios de este bloque y asegúrate de usar SIEMPRE room.gameState.dealer como fuente de verdad.
// =========================================================
*/

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
const rooms = new Map<string, Room>();

// Helper: create a new shuffled deck
function createShuffledDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values: Value[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function calculateHand(cards: Card[]) {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.value === 'A') {
      aces++;
      total += 11;
    } else if (['K', 'Q', 'J'].includes(card.value)) {
      total += 10;
    } else {
      total += parseInt(card.value);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return {
    total,
    isBlackjack: cards.length === 2 && total === 21,
    isBust: total > 21,
  };
}

// Optimized broadcasting with minimal payload sizes
function emitPlayersUpdate(roomCode: string) {
  const room = rooms.get(roomCode);
  if (room) {
    const minimalPlayers = Array.from(room.players.values()).map(p => ({ 
      id: p.id, 
      name: p.name,
      position: p.position 
    }));
    io.to(roomCode).emit('playersUpdate', {
      players: minimalPlayers,
      creator: room.creator
    });
  }
}

// Optimized game state broadcasting with minimal data
function broadcastGameState(roomCode: string, gameState: MultiplayerGameState) {
  const room = rooms.get(roomCode);
  if (!room) return;
  
  // Create minimal state for broadcasting - only send necessary data
  const minimalState = {
    phase: gameState.phase,
    turn: gameState.turn,
    players: gameState.players.map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      hand: p.hand,
      total: p.total,
      status: p.status,
      isBust: p.isBust,
      isStand: p.isStand,
      isBlackjack: p.isBlackjack
    })),
    dealer: {
      hand: gameState.dealer.hand,
      total: gameState.dealer.total,
      isBust: gameState.dealer.isBust,
      isBlackjack: gameState.dealer.isBlackjack,
      ...(gameState.dealer.hiddenCard && { hiddenCard: gameState.dealer.hiddenCard })
    },
    ...(gameState.results && { results: gameState.results })
  };
  
  io.to(roomCode).emit('gameStateUpdate', minimalState);
}

// Start dealing phase directly (no betting phase)
function startDealingPhase(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || !room.gameState) return;
  
  // Create shuffled deck
  const deck = createShuffledDeck();
  
  // Deal initial cards using authentic casino sequence
  const players = Array.from(room.players.values()).map((p: MultiplayerPlayer) => {
    const hand = [deck.pop()!, deck.pop()!];
    const handStatus = calculateHand(hand);
    return {
      ...p,
      hand,
      total: handStatus.total,
      isBust: handStatus.isBust,
      isBlackjack: handStatus.isBlackjack,
      isStand: false,
      status: handStatus.isBust ? 'bust' as const : handStatus.isBlackjack ? 'blackjack' as const : 'playing' as const,
    };
  });
  
  // Deal dealer cards (one visible, one hidden)
  const dealerHand = [deck.pop()!, deck.pop()!];
  const dealerStatus = calculateHand([dealerHand[0]]);
  const dealer: MultiplayerDealer = {
    hand: [dealerHand[0]],
    hiddenCard: dealerHand[1],
    total: dealerStatus.total,
    isBust: dealerStatus.isBust,
    isBlackjack: false,
  };
  
  // Update game state
  room.gameState.players = players;
  room.gameState.dealer = dealer;
  room.gameState.deck = deck;
  room.gameState.phase = 'dealing';
  room.gameState.turn = 0;
  
  // Transition to playing phase after a short delay using optimized broadcast
  broadcastGameState(roomCode, room.gameState);
  
  setTimeout(() => {
    if (room.gameState) {
      room.gameState.phase = 'playing';
      broadcastGameState(roomCode, room.gameState);
    }
  }, 2000); // 2 second delay for dealing animation
  
  console.log(`Dealing phase started in room ${roomCode}`);
}



const httpServer = createServer(app);

// Optimized Socket.IO configuration for better performance
const io = new SocketIOServer(httpServer, { 
  cors: { 
    origin: config.CORS_ORIGIN,
    credentials: true
  },
  // Connection optimization settings
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6, // 1MB
  // Connection pooling optimization
  transports: ['websocket', 'polling'],
  allowUpgrades: true
});

// Connection pooling and cleanup optimizations
const connectionPool = new Map<string, { socket: Socket; lastActivity: number; roomCode?: string }>();
const CLEANUP_INTERVAL = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 300000; // 5 minutes

// Periodic cleanup of inactive connections
setInterval(() => {
  const now = Date.now();
  const toRemove: string[] = [];
  
  connectionPool.forEach((conn, socketId) => {
    if (now - conn.lastActivity > CONNECTION_TIMEOUT) {
      toRemove.push(socketId);
      if (conn.socket.connected) {
        conn.socket.disconnect(true);
      }
    }
  });
  
  toRemove.forEach(socketId => {
    connectionPool.delete(socketId);
  });
  
  if (toRemove.length > 0) {
    console.log(`Cleaned up ${toRemove.length} inactive connections`);
  }
}, CLEANUP_INTERVAL);



io.on('connection', (socket: Socket) => {
  console.log('Nuevo cliente WebSocket conectado:', socket.id);
  
  // Add to connection pool for optimization
  connectionPool.set(socket.id, {
    socket,
    lastActivity: Date.now(),
    roomCode: undefined
  });
  
  // Update activity tracker for connection pooling
  const updateActivity = () => {
    const conn = connectionPool.get(socket.id);
    if (conn) {
      conn.lastActivity = Date.now();
    }
  };

  socket.on('createRoom', (playerName: string) => {
    updateActivity();
    let code;
    do {
      code = generateRoomCode();
    } while (rooms.has(code));
    const player: MultiplayerPlayer = {
      id: socket.id,
      name: playerName || 'Jugador',
      position: 0,
      hand: [],
      total: 0,
      isBust: false,
      isStand: false,
      isBlackjack: false,
      status: 'playing',
    };
    const players = new Map<string, MultiplayerPlayer>();
    players.set(socket.id, player);
    rooms.set(code, {
      sockets: new Set([socket.id]),
      players,
      creator: socket.id,
      gameState: null,

      playersReady: new Set(),
    });
    socket.join(code);
    socket.emit('roomCreated', code);
    emitPlayersUpdate(code);
    console.log(`Sala creada: ${code} por ${socket.id}`);
  });

  socket.on('joinRoom', ({ code, playerName }: { code: string, playerName: string }) => {
    updateActivity();
    code = code.toUpperCase();
    if (!rooms.has(code)) {
      socket.emit('roomError', 'La sala no existe');
      return;
    }
    const room = rooms.get(code)!;
    if (room.players.has(socket.id)) {
      socket.emit('roomError', 'Ya estás en la sala');
      return;
    }
    const player: MultiplayerPlayer = {
      id: socket.id,
      name: playerName || 'Jugador',
      position: room.players.size,
      hand: [],
      total: 0,
      isBust: false,
      isStand: false,
      isBlackjack: false,
      status: 'playing',
    };
    room.sockets.add(socket.id);
    room.players.set(socket.id, player);
    socket.join(code);
    socket.emit('roomJoined', code);
    emitPlayersUpdate(code);
    socket.to(code).emit('roomJoined', code);
    console.log(`${socket.id} se unió a la sala ${code}`);
  });

  socket.on('leaveRoom', (code: string) => {
    updateActivity();
    code = code.toUpperCase();
    if (rooms.has(code)) {
      const room = rooms.get(code)!;
      room.sockets.delete(socket.id);
      room.players.delete(socket.id);
      socket.leave(code);
      emitPlayersUpdate(code);
      if (room.sockets.size === 0) {
        rooms.delete(code);
        console.log(`Sala eliminada: ${code}`);
      }
    }
  });

  // Iniciar partida (solo el creador puede) - ahora inicia directamente el juego
  socket.on('startGameInRoom', (code: string) => {
    updateActivity();
    code = code.toUpperCase();
    const room = rooms.get(code);
    if (!room) return;
    if (room.creator !== socket.id) {
      socket.emit('roomError', 'Solo el creador puede iniciar la partida');
      return;
    }
    
    room.playersReady.clear();
    
    // Reset player state
    room.players.forEach(p => {
      p.hand = [];
      p.total = 0;
      p.isBust = false;
      p.isStand = false;
      p.isBlackjack = false;
      p.status = 'playing';
    });

    const gameState: MultiplayerGameState = {
      started: true,
      players: Array.from(room.players.values()),
      dealer: { hand: [], total: 0, isBust: false, isBlackjack: false },
      deck: [],
      turn: 0,
      phase: 'dealing',
    };
    
    room.gameState = gameState;
    io.to(code).emit('gameStarted', gameState);
    
    // Start dealing immediately
    startDealingPhase(code);
    console.log(`Juego iniciado en sala ${code}`);
  });

  // Reiniciar partida (next round, solo el creador) - ahora inicia directamente nueva ronda
  socket.on('restartGameInRoom', (code: string) => {
    updateActivity();
    code = code.toUpperCase();
    const room = rooms.get(code);
    if (!room) return;
    if (room.creator !== socket.id) {
      socket.emit('roomError', 'Solo el creador puede reiniciar la partida');
      return;
    }
    
    room.playersReady.clear();
    
    room.players.forEach(p => {
      p.hand = [];
      p.total = 0;
      p.isBust = false;
      p.isStand = false;
      p.isBlackjack = false;
      p.status = 'playing';
    });

    const gameState: MultiplayerGameState = {
      started: true,
      players: Array.from(room.players.values()),
      dealer: { hand: [], total: 0, isBust: false, isBlackjack: false },
      deck: [],
      turn: 0,
      phase: 'dealing',
    };
    
    room.gameState = gameState;
    io.to(code).emit('gameStarted', gameState);
    
    // Start dealing immediately
    startDealingPhase(code);
    console.log(`Nueva ronda iniciada en sala ${code}`);
  });



  // Acciones de jugador: hit, stand
  socket.on('playerAction', ({ code, action }: { code: string, action: 'hit' | 'stand' | 'double' | 'split' }) => {
    updateActivity();
    code = code.toUpperCase();
    const room = rooms.get(code);
    if (!room || !room.gameState) return;
    const gs = room.gameState;
    const playerIdx = gs.players.findIndex(p => p.id === socket.id);
    if (playerIdx !== gs.turn) {
      socket.emit('roomError', 'No es tu turno');
      return;
    }
    const player = gs.players[playerIdx];
    if (action === 'hit') {
      const card = gs.deck.pop()!;
      player.hand.push(card);
      const handStatus = calculateHand(player.hand);
      player.total = handStatus.total;
      player.isBust = handStatus.isBust;
      player.isBlackjack = handStatus.isBlackjack;
      if (player.isBust) player.isStand = true;
    } else if (action === 'stand') {
      player.isStand = true;
    }
    // Avanzar turno
    let nextTurn = gs.turn;
    do {
      nextTurn = (nextTurn + 1) % gs.players.length;
    } while (gs.players[nextTurn].isStand && nextTurn !== gs.turn);
    // Si todos han terminado, dealer juega
    if (gs.players.every(p => p.isStand || p.isBust)) {
      gs.phase = 'dealer';
      // Revelar carta oculta del dealer
      gs.dealer.hand.push(gs.dealer.hiddenCard!);
      const dealerHand = gs.dealer.hand;
      let dealerStatus = calculateHand(dealerHand);
      gs.dealer.total = dealerStatus.total;
      gs.dealer.isBust = dealerStatus.isBust;
      gs.dealer.isBlackjack = dealerStatus.isBlackjack;
      // Dealer juega
      while (gs.dealer.total < 17) {
        const card = gs.deck.pop()!;
        gs.dealer.hand.push(card);
        dealerStatus = calculateHand(gs.dealer.hand);
        gs.dealer.total = dealerStatus.total;
        gs.dealer.isBust = dealerStatus.isBust;
        gs.dealer.isBlackjack = dealerStatus.isBlackjack;
      }
      // Calcular resultados sin sistema de apuestas
      gs.phase = 'result';
      gs.results = {};
      for (const p of gs.players) {
        let status: 'win' | 'lose' | 'draw' | 'bust' | 'blackjack';
        
        if (p.isBust) {
          status = 'bust';
        } else if (p.isBlackjack && !gs.dealer.isBlackjack) {
          status = 'blackjack';
        } else if (!p.isBlackjack && gs.dealer.isBlackjack) {
          status = 'lose';
        } else if (gs.dealer.isBust) {
          status = 'win';
        } else if (p.total > gs.dealer.total) {
          status = 'win';
        } else if (p.total < gs.dealer.total) {
          status = 'lose';
        } else {
          status = 'draw';
        }
        
        gs.results[p.id] = {
          status
        };
        
        // Update player status for display
        p.status = status === 'bust' ? 'bust' : status === 'blackjack' ? 'blackjack' : p.isStand ? 'stand' : 'playing';
      }
    } else {
      gs.turn = nextTurn;
    }
    broadcastGameState(code, gs);
  });

  socket.on('disconnect', () => {
    // Clean up connection pool
    connectionPool.delete(socket.id);
    
    // Clean up rooms
    for (const [code, room] of rooms.entries()) {
      room.sockets.delete(socket.id);
      room.players.delete(socket.id);
      emitPlayersUpdate(code);
      if (room.sockets.size === 0) {
        rooms.delete(code);
        console.log(`Sala eliminada: ${code}`);
      }
    }
    console.log('Cliente WebSocket desconectado:', socket.id);
  });
});

httpServer.listen(config.BACKEND_PORT, config.HOST, () => {
  console.log(`Server running (HTTP + WS) on http://${config.HOST}:${config.BACKEND_PORT}`);
}); 