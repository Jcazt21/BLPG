import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import gameRoutes from './routes/gameRoutes';
import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Card, Suit, Value } from './types/gameTypes';

const app = express();
const PORT = process.env.PORT || 5185;
const HOST = process.env.HOST || '172.16.50.34';

app.use(cors());
app.use(express.json());
app.use('/game', gameRoutes);

// --- Multiplayer Room Logic ---
type Player = { id: string, name: string, hand: Card[], total: number, isBust: boolean, isStand: boolean, isBlackjack: boolean, bet: number, balance: number };
type Dealer = { hand: Card[], hiddenCard?: Card, total: number, isBust: boolean, isBlackjack: boolean };
type GameState = {
  started: boolean;
  players: Player[];
  dealer: Dealer;
  deck: Card[];
  turn: number; // index of current player
  phase: 'betting' | 'playing' | 'dealer' | 'result';
  results?: { [playerId: string]: 'win' | 'lose' | 'draw' | 'bust' | 'blackjack' };
};

type Room = {
  sockets: Set<string>;
  players: Player[];
  creator: string;
  gameState: GameState | null;
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
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
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

function emitPlayersUpdate(roomCode: string) {
  const room = rooms.get(roomCode);
  if (room) {
    io.to(roomCode).emit('playersUpdate', {
      players: room.players.map(p => ({ id: p.id, name: p.name })),
      creator: room.creator
    });
  }
}

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, { cors: { origin: '*' } });

io.on('connection', (socket: Socket) => {
  console.log('Nuevo cliente WebSocket conectado:', socket.id);

  socket.on('createRoom', (playerName: string) => {
    let code;
    do {
      code = generateRoomCode();
    } while (rooms.has(code));
    const player: Player = {
      id: socket.id,
      name: playerName || 'Jugador',
      hand: [],
      total: 0,
      isBust: false,
      isStand: false,
      isBlackjack: false,
      bet: 100,
      balance: 1000,
    };
    rooms.set(code, {
      sockets: new Set([socket.id]),
      players: [player],
      creator: socket.id,
      gameState: null
    });
    socket.join(code);
    socket.emit('roomCreated', code);
    emitPlayersUpdate(code);
    console.log(`Sala creada: ${code} por ${socket.id}`);
  });

  socket.on('joinRoom', ({ code, playerName }: { code: string, playerName: string }) => {
    code = code.toUpperCase();
    if (!rooms.has(code)) {
      socket.emit('roomError', 'La sala no existe');
      return;
    }
    const room = rooms.get(code)!;
    if (room.players.find(p => p.id === socket.id)) {
      socket.emit('roomError', 'Ya estás en la sala');
      return;
    }
    const player: Player = {
      id: socket.id,
      name: playerName || 'Jugador',
      hand: [],
      total: 0,
      isBust: false,
      isStand: false,
      isBlackjack: false,
      bet: 100,
      balance: 1000,
    };
    room.sockets.add(socket.id);
    room.players.push(player);
    socket.join(code);
    socket.emit('roomJoined', code);
    emitPlayersUpdate(code);
    socket.to(code).emit('roomJoined', code);
    console.log(`${socket.id} se unió a la sala ${code}`);
  });

  socket.on('leaveRoom', (code: string) => {
    code = code.toUpperCase();
    if (rooms.has(code)) {
      const room = rooms.get(code)!;
      room.sockets.delete(socket.id);
      room.players = room.players.filter((p: Player) => p.id !== socket.id);
      socket.leave(code);
      emitPlayersUpdate(code);
      if (room.sockets.size === 0) {
        rooms.delete(code);
        console.log(`Sala eliminada: ${code}`);
      }
    }
  });

  // Iniciar partida (solo el creador puede)
  socket.on('startGameInRoom', (code: string) => {
    code = code.toUpperCase();
    const room = rooms.get(code);
    if (!room) return;
    if (room.creator !== socket.id) {
      socket.emit('roomError', 'Solo el creador puede iniciar la partida');
      return;
    }
    // Inicializar el estado del juego
    const deck = createShuffledDeck();
    const players = room.players.map((p: Player) => {
      const hand = [deck.pop()!, deck.pop()!];
      const handStatus = calculateHand(hand);
      return {
        ...p,
        hand,
        total: handStatus.total,
        isBust: handStatus.isBust,
        isBlackjack: handStatus.isBlackjack,
        isStand: false,
        bet: 100,
        balance: p.balance - 100,
      };
    });
    const dealerHand = [deck.pop()!, deck.pop()!];
    const dealerStatus = calculateHand([dealerHand[0]]);
    const dealer: Dealer = {
      hand: [dealerHand[0]],
      hiddenCard: dealerHand[1],
      total: dealerStatus.total,
      isBust: dealerStatus.isBust,
      isBlackjack: false,
    };
    const gameState: GameState = {
      started: true,
      players,
      dealer,
      deck,
      turn: 0,
      phase: 'playing',
    };
    room.gameState = gameState;
    io.to(code).emit('gameStarted', gameState);
    io.to(code).emit('gameStateUpdate', gameState);
    console.log(`Partida iniciada en sala ${code}`);
  });

  // Reiniciar partida (next round, solo el creador)
  socket.on('restartGameInRoom', (code: string) => {
    code = code.toUpperCase();
    const room = rooms.get(code);
    if (!room) return;
    if (room.creator !== socket.id) {
      socket.emit('roomError', 'Solo el creador puede reiniciar la partida');
      return;
    }
    // Reiniciar el estado del juego, manteniendo balances
    const deck = createShuffledDeck();
    const players = room.players.map((p: Player) => {
      const hand = [deck.pop()!, deck.pop()!];
      const handStatus = calculateHand(hand);
      return {
        ...p,
        hand,
        total: handStatus.total,
        isBust: handStatus.isBust,
        isBlackjack: handStatus.isBlackjack,
        isStand: false,
        bet: 100,
        balance: p.balance - 100,
      };
    });
    const dealerHand = [deck.pop()!, deck.pop()!];
    const dealerStatus = calculateHand([dealerHand[0]]);
    const dealer: Dealer = {
      hand: [dealerHand[0]],
      hiddenCard: dealerHand[1],
      total: dealerStatus.total,
      isBust: dealerStatus.isBust,
      isBlackjack: false,
    };
    const gameState: GameState = {
      started: true,
      players,
      dealer,
      deck,
      turn: 0,
      phase: 'playing',
    };
    room.gameState = gameState;
    io.to(code).emit('gameStarted', gameState);
    io.to(code).emit('gameStateUpdate', gameState);
    console.log(`Partida REINICIADA en sala ${code}`);
  });

  // Acciones de jugador: hit, stand
  socket.on('playerAction', ({ code, action }: { code: string, action: 'hit' | 'stand' | 'double' | 'split' }) => {
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
      // Calcular resultados
      gs.phase = 'result';
      gs.results = {};
      for (const p of gs.players) {
        if (p.isBust) {
          gs.results[p.id] = 'bust';
        } else if (p.isBlackjack && !gs.dealer.isBlackjack) {
          gs.results[p.id] = 'blackjack';
        } else if (!p.isBlackjack && gs.dealer.isBlackjack) {
          gs.results[p.id] = 'lose';
        } else if (p.total > 21) {
          gs.results[p.id] = 'bust';
        } else if (gs.dealer.isBust) {
          gs.results[p.id] = 'win';
        } else if (p.total > gs.dealer.total) {
          gs.results[p.id] = 'win';
        } else if (p.total < gs.dealer.total) {
          gs.results[p.id] = 'lose';
        } else {
          gs.results[p.id] = 'draw';
        }
      }
    } else {
      gs.turn = nextTurn;
    }
    io.to(code).emit('gameStateUpdate', gs);
  });

  socket.on('disconnect', () => {
    for (const [code, room] of rooms.entries()) {
      room.sockets.delete(socket.id);
      room.players = room.players.filter((p: Player) => p.id !== socket.id);
      emitPlayersUpdate(code);
      if (room.sockets.size === 0) {
        rooms.delete(code);
        console.log(`Sala eliminada: ${code}`);
      }
    }
    console.log('Cliente WebSocket desconectado:', socket.id);
  });
});

httpServer.listen(Number(PORT), HOST, () => {
  console.log(`Server running (HTTP + WS) on http://${HOST}:${PORT}`);
}); 