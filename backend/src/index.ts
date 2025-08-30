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
import { 
  MultiplayerPlayer, 
  MultiplayerDealer, 
  MultiplayerGameState, 
  GameResult, 
  Room,
  BETTING_CONSTANTS,
  GameResultStatus 
} from './types/bettingTypes';
import { BettingManager } from './services/bettingManager';
import { BettingPhaseManager } from './services/bettingPhaseManager';
import { ConfigManager } from './config/environment';
import { HelpNamespace } from './sockets/helpNamespace';
import { HelpAssistantService } from './services/helpAssistant/helpAssistantService';

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
// Types are now imported from ./types/bettingTypes.ts

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

// Initialize betting manager
const bettingManager = new BettingManager(rooms);

// Initialize betting phase manager (will be initialized after io is created)
let bettingPhaseManager: BettingPhaseManager;

// Auto-advance timers for rooms (7.5 seconds after results)
const autoAdvanceTimers = new Map<string, NodeJS.Timeout>();

// Constants for auto-advance
const AUTO_ADVANCE_DELAY_MS = 12500; // 12.5 seconds (updated from 7.5s)

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

// Auto-advance to next round after showing results
function scheduleAutoAdvance(roomCode: string) {
  // Clear any existing timer for this room
  const existingTimer = autoAdvanceTimers.get(roomCode);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Schedule auto-advance after 7.5 seconds
  const timer = setTimeout(() => {
    const room = rooms.get(roomCode);
    if (!room || !room.gameState) return;

    // Only auto-advance if still in result phase
    if (room.gameState.phase === 'result') {
      console.log(`Auto-advancing room ${roomCode} to next round`);
      
      // Use the same logic as manual restart but without creator check
      autoRestartGame(roomCode);
    }
    
    // Clean up timer
    autoAdvanceTimers.delete(roomCode);
  }, AUTO_ADVANCE_DELAY_MS);

  autoAdvanceTimers.set(roomCode, timer);
  
  // Emit countdown to clients so they know auto-advance is coming
  io.to(roomCode).emit('autoAdvanceScheduled', {
    delayMs: AUTO_ADVANCE_DELAY_MS,
    message: 'Next round will start automatically in 12.5 seconds'
  });
}

// Process payouts for all players at the end of a round
async function processGamePayouts(roomCode: string, gameState: MultiplayerGameState) {
  const room = rooms.get(roomCode);
  if (!room || !gameState.results) return;
  
  // Create results map for BettingManager
  const gameResults: { [playerId: string]: GameResultStatus } = {};
  for (const [playerId, result] of Object.entries(gameState.results)) {
    gameResults[playerId] = result.status;
  }
  
  try {
    // Process payouts using BettingManager
    const payoutResults = await bettingManager.processPayouts(roomCode, gameResults);
    
    // Update game state results with payout information
    for (const [playerId, payoutResult] of Object.entries(payoutResults)) {
      if (gameState.results[playerId]) {
        gameState.results[playerId].payout = payoutResult.payoutAmount;
        gameState.results[playerId].finalBalance = payoutResult.finalBalance;
      }
    }
    
    // Clear all player bets for next round
    bettingManager.resetPlayerBets(roomCode);
    
    // Broadcast updated results with payout information
    broadcastGameState(roomCode, gameState);
    
    // Emit payout confirmation to all players
    io.to(roomCode).emit('payoutsProcessed', {
      payouts: payoutResults,
      message: 'Payouts have been processed and balances updated'
    });
    
    console.log(`Payouts processed for room ${roomCode}:`, payoutResults);
    
  } catch (error) {
    console.error(`Error processing payouts for room ${roomCode}:`, error);
    
    // Emit error to room
    io.to(roomCode).emit('payoutError', {
      error: 'Failed to process payouts',
      message: 'There was an error processing payouts. Please contact support.'
    });
  }
}

// Auto-restart game without creator permission check
function autoRestartGame(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;
  
  // Clear ready state for new round
  room.playersReady.clear();
  
  // Use BettingManager to persist balances between rounds
  bettingManager.persistBalancesBetweenRounds(roomCode);
  
  // Clean up betting phase timers from previous round
  bettingPhaseManager.cleanup(roomCode);
  
  // Reset player state for new round (preserve victory counters and balances)
  room.players.forEach(p => {
    p.hand = [];
    p.total = 0;
    p.isBust = false;
    p.isStand = false;
    p.isBlackjack = false;
    p.status = 'playing';
    // Reset betting state for new round
    p.currentBet = 0;
    p.hasPlacedBet = false;
    // Victory counters and balances are preserved between rounds via BettingManager
  });

  // Create new game state for the round
  const gameState: MultiplayerGameState = {
    started: true,
    players: Array.from(room.players.values()),
    dealer: { hand: [], total: 0, isBust: false, isBlackjack: false },
    deck: [],
    turn: 0,
    phase: 'betting',
    bettingTimeLeft: BETTING_CONSTANTS.BETTING_TIME_SECONDS,
    minBet: BETTING_CONSTANTS.MIN_BET,
    maxBet: Math.max(...Array.from(room.players.values()).map(p => p.balance)),
    roundId: `${roomCode}-${Date.now()}`,
    totalPot: 0,
    results: undefined, // Clear previous results
  };
  
  room.gameState = gameState;
  io.to(roomCode).emit('gameStarted', gameState);
  
  // Start with betting phase
  bettingPhaseManager.startBettingPhase(roomCode);
  console.log(`Auto-restart: Nueva ronda iniciada en sala ${roomCode}`);
}

// Cancel auto-advance when manual restart happens
function cancelAutoAdvance(roomCode: string) {
  const timer = autoAdvanceTimers.get(roomCode);
  if (timer) {
    clearTimeout(timer);
    autoAdvanceTimers.delete(roomCode);
    io.to(roomCode).emit('autoAdvanceCancelled');
  }
}

// Optimized broadcasting with minimal payload sizes
function emitPlayersUpdate(roomCode: string) {
  const room = rooms.get(roomCode);
  if (room) {
    const minimalPlayers = Array.from(room.players.values()).map(p => ({ 
      id: p.id, 
      name: p.name,
      position: p.position,
      victories: p.victories,
      gamesWon: p.gamesWon,
      gamesBlackjack: p.gamesBlackjack,
      // Include balance information for betting display
      balance: p.balance,
      currentBet: p.currentBet,
      hasPlacedBet: p.hasPlacedBet
    }));
    io.to(roomCode).emit('playersUpdate', {
      players: minimalPlayers,
      creator: room.creator
    });
  }
}

// Enhanced real-time betting synchronization with optimized broadcasting
function broadcastGameState(roomCode: string, gameState: MultiplayerGameState) {
  const room = rooms.get(roomCode);
  if (!room) return;
  
  // Create enhanced state for broadcasting with betting synchronization
  const enhancedState = {
    phase: gameState.phase,
    turn: gameState.turn,
    // Enhanced betting state synchronization
    bettingState: {
      phase: gameState.phase,
      timeLeft: gameState.bettingTimeLeft,
      minBet: gameState.minBet,
      maxBet: gameState.maxBet,
      totalPot: gameState.totalPot,
      roundId: gameState.roundId,
      playersWithBets: gameState.players.filter(p => p.hasPlacedBet).length,
      totalPlayers: gameState.players.length,
      // Additional betting synchronization data
      bettingComplete: gameState.players.filter(p => p.hasPlacedBet).length === gameState.players.length,
      averageBet: gameState.players.length > 0 ? 
        gameState.players.reduce((sum, p) => sum + p.currentBet, 0) / gameState.players.length : 0,
      highestBet: Math.max(...gameState.players.map(p => p.currentBet), 0),
      lowestBet: Math.min(...gameState.players.filter(p => p.currentBet > 0).map(p => p.currentBet), gameState.minBet)
    },
    players: gameState.players.map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      hand: p.hand,
      total: p.total,
      status: p.status,
      isBust: p.isBust,
      isStand: p.isStand,
      isBlackjack: p.isBlackjack,
      // Include victory counters
      victories: p.victories,
      gamesWon: p.gamesWon,
      gamesBlackjack: p.gamesBlackjack,
      gamesLost: p.gamesLost,
      gamesDraw: p.gamesDraw,
      gamesBust: p.gamesBust,
      // Enhanced betting information for real-time sync
      balance: p.balance,
      currentBet: p.currentBet,
      hasPlacedBet: p.hasPlacedBet,
      totalWinnings: p.totalWinnings,
      totalLosses: p.totalLosses,
      // Enhanced betting status indicators
      bettingStatus: p.hasPlacedBet ? 'placed' : 'pending',
      canAffordMinBet: p.balance >= gameState.minBet,
      betPercentageOfBalance: p.balance > 0 ? (p.currentBet / p.balance) * 100 : 0
    })),
    dealer: {
      hand: gameState.dealer.hand,
      total: gameState.dealer.total,
      isBust: gameState.dealer.isBust,
      isBlackjack: gameState.dealer.isBlackjack,
      ...(gameState.dealer.hiddenCard && { hiddenCard: gameState.dealer.hiddenCard })
    },
    ...(gameState.results && { results: gameState.results }),
    // Enhanced real-time synchronization metadata
    syncTimestamp: Date.now(),
    serverTime: new Date().toISOString(),
    syncId: `${roomCode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    // Connection quality indicators
    connectionQuality: {
      lastUpdate: Date.now(),
      updateFrequency: 'real-time',
      dataIntegrity: 'verified'
    }
  };
  
  io.to(roomCode).emit('gameStateUpdate', enhancedState);
}

// Enhanced optimized betting-specific broadcast for immediate updates
function broadcastBettingUpdate(roomCode: string, updateType: 'bet_placed' | 'bet_updated' | 'bet_cleared' | 'timer_update' | 'bet_confirmed' | 'sync_request', data: any) {
  const room = rooms.get(roomCode);
  if (!room || !room.gameState) return;
  
  // Calculate real-time betting statistics
  const playersWithBets = room.gameState.players.filter(p => p.hasPlacedBet);
  const totalPot = room.gameState.players.reduce((sum, p) => sum + p.currentBet, 0);
  
  // Create enhanced optimized betting update payload
  const bettingUpdate = {
    type: updateType,
    timestamp: Date.now(),
    serverTime: new Date().toISOString(),
    roomCode,
    roundId: room.gameState.roundId,
    // Enhanced betting state with real-time synchronization
    bettingState: {
      phase: room.gameState.phase,
      timeLeft: room.gameState.bettingTimeLeft,
      totalPot,
      playersWithBets: playersWithBets.length,
      totalPlayers: room.gameState.players.length,
      bettingComplete: playersWithBets.length === room.gameState.players.length,
      minBet: room.gameState.minBet,
      maxBet: room.gameState.maxBet,
      // Real-time betting progress indicators
      bettingProgress: {
        percentage: room.gameState.players.length > 0 ? 
          (playersWithBets.length / room.gameState.players.length) * 100 : 0,
        playersRemaining: room.gameState.players.length - playersWithBets.length,
        urgency: room.gameState.bettingTimeLeft <= 10 ? 'high' : 
                room.gameState.bettingTimeLeft <= 20 ? 'medium' : 'low'
      }
    },
    data,
    // Enhanced player betting info for real-time synchronization
    playerBets: room.gameState.players.map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      currentBet: p.currentBet,
      hasPlacedBet: p.hasPlacedBet,
      balance: p.balance,
      bettingStatus: p.hasPlacedBet ? 'placed' : 'pending',
      canAffordMinBet: p.balance >= (room.gameState?.minBet || 0),
      // Betting timing information
      betTimestamp: p.hasPlacedBet ? Date.now() : null
    })),
    // Synchronization metadata for connection recovery
    syncMetadata: {
      updateId: `${roomCode}-${updateType}-${Date.now()}`,
      sequenceNumber: Date.now(),
      checksumData: {
        totalPot,
        playerCount: room.gameState.players.length,
        betsPlaced: playersWithBets.length
      }
    }
  };
  
  // Emit immediate betting update
  io.to(roomCode).emit('bettingUpdate', bettingUpdate);
  
  // Also emit specific event type for targeted handling
  switch (updateType) {
    case 'bet_placed':
    case 'bet_updated':
      io.to(roomCode).emit('betConfirmation', {
        ...bettingUpdate,
        confirmationType: updateType
      });
      break;
    case 'bet_cleared':
      io.to(roomCode).emit('betCancellation', bettingUpdate);
      break;
    case 'timer_update':
      io.to(roomCode).emit('bettingTimerSync', {
        timeLeft: room.gameState.bettingTimeLeft,
        ...bettingUpdate.bettingState.bettingProgress,
        timestamp: bettingUpdate.timestamp
      });
      break;
  }
}

// Enhanced betting timer synchronization across all clients
function broadcastBettingTimerSync(roomCode: string, forceSync: boolean = false) {
  const room = rooms.get(roomCode);
  if (!room || !room.gameState || room.gameState.phase !== 'betting') return;
  
  const playersWithBets = room.gameState.players.filter(p => p.hasPlacedBet);
  const totalPlayers = room.gameState.players.length;
  
  // Enhanced timer synchronization data
  const timerSyncData = {
    type: 'timer_sync',
    timestamp: Date.now(),
    serverTime: new Date().toISOString(),
    roomCode,
    roundId: room.gameState.roundId,
    
    // Core timer data
    timeLeft: room.gameState.bettingTimeLeft,
    totalTime: BETTING_CONSTANTS.BETTING_TIME_SECONDS,
    timeElapsed: BETTING_CONSTANTS.BETTING_TIME_SECONDS - room.gameState.bettingTimeLeft,
    
    // Enhanced synchronization metadata
    timerSync: {
      serverTimestamp: Date.now(),
      clientSyncId: `timer-${roomCode}-${Date.now()}`,
      syncAccuracy: 'millisecond',
      driftCorrection: true,
      forceSync
    },
    
    // Betting progress with timer context
    bettingProgress: {
      playersWithBets: playersWithBets.length,
      totalPlayers,
      percentage: totalPlayers > 0 ? (playersWithBets.length / totalPlayers) * 100 : 0,
      bettingComplete: playersWithBets.length === totalPlayers,
      canProceedEarly: playersWithBets.length === totalPlayers
    },
    
    // Urgency and warning levels
    urgencyLevel: room.gameState.bettingTimeLeft <= 5 ? 'critical' :
                  room.gameState.bettingTimeLeft <= 10 ? 'high' :
                  room.gameState.bettingTimeLeft <= 20 ? 'medium' : 'low',
    
    // Warning flags
    warnings: {
      timeRunningOut: room.gameState.bettingTimeLeft <= 10,
      criticalTime: room.gameState.bettingTimeLeft <= 5,
      lastChance: room.gameState.bettingTimeLeft <= 3,
      aboutToEnd: room.gameState.bettingTimeLeft <= 1
    },
    
    // Auto-advance indicators
    autoAdvance: {
      willAutoAdvance: room.gameState.bettingTimeLeft <= 0,
      canSkipTimer: playersWithBets.length === totalPlayers,
      estimatedEnd: Date.now() + (room.gameState.bettingTimeLeft * 1000)
    }
  };
  
  // Emit comprehensive timer sync
  io.to(roomCode).emit('bettingTimerSync', timerSyncData);
  
  // Emit specific warning events at key intervals
  if (room.gameState.bettingTimeLeft === 10 && !forceSync) {
    io.to(roomCode).emit('bettingTimeWarning', {
      type: 'warning_10s',
      message: '10 seconds remaining to place bets!',
      timeLeft: 10,
      urgency: 'medium',
      autoHide: false
    });
  } else if (room.gameState.bettingTimeLeft === 5 && !forceSync) {
    io.to(roomCode).emit('bettingTimeWarning', {
      type: 'warning_5s',
      message: '5 seconds remaining! Place your bets now!',
      timeLeft: 5,
      urgency: 'high',
      autoHide: false
    });
  } else if (room.gameState.bettingTimeLeft === 1 && !forceSync) {
    io.to(roomCode).emit('bettingTimeWarning', {
      type: 'warning_1s',
      message: 'Last chance! Betting ends in 1 second!',
      timeLeft: 1,
      urgency: 'critical',
      autoHide: false
    });
  }
}

// Enhanced real-time betting progress updates for all players
function broadcastBettingProgress(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || !room.gameState) return;
  
  const playersWithBets = room.gameState.players.filter(p => p.hasPlacedBet);
  const totalPlayers = room.gameState.players.length;
  const totalPot = room.gameState.players.reduce((sum, p) => sum + p.currentBet, 0);
  const playersWithoutBets = room.gameState.players.filter(p => !p.hasPlacedBet);
  
  // Calculate enhanced progress metrics
  const progressPercentage = totalPlayers > 0 ? (playersWithBets.length / totalPlayers) * 100 : 0;
  const averageBet = playersWithBets.length > 0 ? totalPot / playersWithBets.length : 0;
  const bettingVelocity = playersWithBets.length / Math.max(1, BETTING_CONSTANTS.BETTING_TIME_SECONDS - room.gameState.bettingTimeLeft);
  
  const progressUpdate = {
    // Basic progress data
    playersWithBets: playersWithBets.length,
    totalPlayers,
    totalPot,
    bettingComplete: playersWithBets.length === totalPlayers,
    timeLeft: room.gameState.bettingTimeLeft,
    roundId: room.gameState.roundId,
    timestamp: Date.now(),
    serverTime: new Date().toISOString(),
    
    // Enhanced progress analytics
    progressMetrics: {
      percentage: progressPercentage,
      playersRemaining: totalPlayers - playersWithBets.length,
      averageBet,
      highestBet: Math.max(...room.gameState.players.map(p => p.currentBet), 0),
      lowestBet: Math.min(...playersWithBets.map(p => p.currentBet), room.gameState.minBet),
      bettingVelocity: bettingVelocity, // bets per second
      estimatedCompletion: bettingVelocity > 0 ? 
        Math.min(room.gameState.bettingTimeLeft, (totalPlayers - playersWithBets.length) / bettingVelocity) : 
        room.gameState.bettingTimeLeft
    },
    
    // Player-specific progress data
    playerProgress: {
      playersWithBets: playersWithBets.map(p => ({
        id: p.id,
        name: p.name,
        betAmount: p.currentBet,
        betPercentageOfBalance: p.balance > 0 ? (p.currentBet / (p.balance + p.currentBet)) * 100 : 0
      })),
      playersWithoutBets: playersWithoutBets.map(p => ({
        id: p.id,
        name: p.name,
        balance: p.balance,
        canAffordMinBet: p.balance >= (room.gameState?.minBet || 0)
      }))
    },
    
    // Urgency and timing indicators
    urgencyLevel: room.gameState.bettingTimeLeft <= 5 ? 'critical' :
                  room.gameState.bettingTimeLeft <= 10 ? 'high' :
                  room.gameState.bettingTimeLeft <= 20 ? 'medium' : 'low',
    
    // Phase transition indicators
    phaseTransition: {
      canProceed: playersWithBets.length > 0,
      willAutoAdvance: room.gameState.bettingTimeLeft <= 0,
      readyForDealing: playersWithBets.length === totalPlayers || room.gameState.bettingTimeLeft <= 0
    }
  };
  
  // Emit comprehensive progress update
  io.to(roomCode).emit('bettingProgress', progressUpdate);
  
  // Emit simplified progress for lightweight clients
  io.to(roomCode).emit('bettingProgressSimple', {
    playersWithBets: playersWithBets.length,
    totalPlayers,
    percentage: progressPercentage,
    timeLeft: room.gameState.bettingTimeLeft,
    totalPot,
    urgency: progressUpdate.urgencyLevel
  });
}

// Betting phase management is now handled by BettingPhaseManager

// Start dealing phase after betting is complete
function startDealingPhase(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || !room.gameState) return;
  
  // Ensure we're transitioning from betting or dealing phase (dealing phase set by BettingPhaseManager)
  if (room.gameState.phase !== 'betting' && room.gameState.phase !== 'dealing') {
    console.warn(`Cannot start dealing phase: current phase is ${room.gameState.phase}, expected 'betting' or 'dealing'`);
    return;
  }
  
  // Create shuffled deck
  const deck = createShuffledDeck();
  
  // Deal initial cards using authentic casino sequence and update existing players
  const players: MultiplayerPlayer[] = [];
  
  for (const [playerId, player] of room.players.entries()) {
    // Only deal cards to players who have placed bets
    if (!player.hasPlacedBet || player.currentBet <= 0) {
      // Player sits out this round but stays in the game
      player.hand = [];
      player.total = 0;
      player.isBust = false;
      player.isBlackjack = false;
      player.isStand = true; // Mark as standing so they don't participate in gameplay
      player.status = 'playing';
      players.push(player);
      continue;
    }
    
    const hand = [deck.pop()!, deck.pop()!];
    const handStatus = calculateHand(hand);
    
    // Update the existing player object to preserve victory counters and betting info
    player.hand = hand;
    player.total = handStatus.total;
    player.isBust = handStatus.isBust;
    player.isBlackjack = handStatus.isBlackjack;
    player.isStand = false;
    player.status = handStatus.isBust ? 'bust' : handStatus.isBlackjack ? 'blackjack' : 'playing';
    
    players.push(player);
  }
  
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
  
  // Update game state with the same player references
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
      
      // Find first player who is not standing (has placed a bet and is not bust/blackjack)
      let firstActivePlayer = 0;
      while (firstActivePlayer < room.gameState.players.length && 
             (room.gameState.players[firstActivePlayer].isStand || 
              room.gameState.players[firstActivePlayer].currentBet <= 0)) {
        firstActivePlayer++;
      }
      
      room.gameState.turn = firstActivePlayer < room.gameState.players.length ? firstActivePlayer : 0;
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

// Initialize betting phase manager after io is created
bettingPhaseManager = new BettingPhaseManager(io, rooms, bettingManager, startDealingPhase);

// Initialize help assistant service and namespace
const helpAssistantService = new HelpAssistantService();
const helpNamespace = new HelpNamespace(io, helpAssistantService);

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
      // Initialize victory counters
      victories: 0,
      gamesWon: 0,
      gamesBlackjack: 0,
      gamesLost: 0,
      gamesDraw: 0,
      gamesBust: 0,
      // Initialize betting fields
      balance: BETTING_CONSTANTS.INITIAL_BALANCE,
      currentBet: 0,
      hasPlacedBet: false,
      betHistory: [],
      totalWinnings: 0,
      totalLosses: 0,
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
    
    // Initialize player balance using BettingManager
    bettingManager.initializePlayerBalance(socket.id, code);
    
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
      // Initialize victory counters
      victories: 0,
      gamesWon: 0,
      gamesBlackjack: 0,
      gamesLost: 0,
      gamesDraw: 0,
      gamesBust: 0,
      // Initialize betting fields
      balance: BETTING_CONSTANTS.INITIAL_BALANCE,
      currentBet: 0,
      hasPlacedBet: false,
      betHistory: [],
      totalWinnings: 0,
      totalLosses: 0,
    };
    room.sockets.add(socket.id);
    room.players.set(socket.id, player);
    
    // Initialize player balance using BettingManager
    bettingManager.initializePlayerBalance(socket.id, code);
    
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
        // Clean up auto-advance timer when room is deleted
        cancelAutoAdvance(code);
        // Clean up betting phase manager timers
        bettingPhaseManager.cleanup(code);
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
    
    // Clear ready state for new game
    room.playersReady.clear();
    
    // Clean up any existing betting phase timers
    bettingPhaseManager.cleanup(code);
    
    // Reset player state (preserve victory counters, initialize betting state)
    room.players.forEach(p => {
      p.hand = [];
      p.total = 0;
      p.isBust = false;
      p.isStand = false;
      p.isBlackjack = false;
      p.status = 'playing';
      // Initialize betting state for new game
      p.currentBet = 0;
      p.hasPlacedBet = false;
      // Victory counters are preserved between rounds
    });

    // Create initial game state
    const gameState: MultiplayerGameState = {
      started: true,
      players: Array.from(room.players.values()),
      dealer: { hand: [], total: 0, isBust: false, isBlackjack: false },
      deck: [],
      turn: 0,
      phase: 'betting',
      bettingTimeLeft: BETTING_CONSTANTS.BETTING_TIME_SECONDS,
      minBet: BETTING_CONSTANTS.MIN_BET,
      maxBet: Math.max(...Array.from(room.players.values()).map(p => p.balance)),
      roundId: `${code}-${Date.now()}`,
      totalPot: 0,
      results: undefined, // No previous results
    };
    
    room.gameState = gameState;
    io.to(code).emit('gameStarted', gameState);
    
    // Start with betting phase
    bettingPhaseManager.startBettingPhase(code);
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
    
    // Cancel auto-advance since manual restart was triggered
    cancelAutoAdvance(code);
    
    // Clear ready state for new round
    room.playersReady.clear();
    
    // Use BettingManager to persist balances between rounds
    bettingManager.persistBalancesBetweenRounds(code);
    
    // Clean up betting phase timers from previous round
    bettingPhaseManager.cleanup(code);
    
    // Reset player state for new round (preserve victory counters and balances)
    room.players.forEach(p => {
      p.hand = [];
      p.total = 0;
      p.isBust = false;
      p.isStand = false;
      p.isBlackjack = false;
      p.status = 'playing';
      // Reset betting state for new round
      p.currentBet = 0;
      p.hasPlacedBet = false;
      // Victory counters and balances are preserved between rounds via BettingManager
    });

    // Create new game state for the round
    const gameState: MultiplayerGameState = {
      started: true,
      players: Array.from(room.players.values()),
      dealer: { hand: [], total: 0, isBust: false, isBlackjack: false },
      deck: [],
      turn: 0,
      phase: 'betting',
      bettingTimeLeft: BETTING_CONSTANTS.BETTING_TIME_SECONDS,
      minBet: BETTING_CONSTANTS.MIN_BET,
      maxBet: Math.max(...Array.from(room.players.values()).map(p => p.balance)),
      roundId: `${code}-${Date.now()}`,
      totalPot: 0,
      results: undefined, // Clear previous results
    };
    
    room.gameState = gameState;
    io.to(code).emit('gameStarted', gameState);
    
    // Start with betting phase
    bettingPhaseManager.startBettingPhase(code);
    console.log(`Nueva ronda iniciada en sala ${code}`);
  });



  // ===== BETTING SYSTEM EVENTS =====
  
  // Chip button events - enhanced with immediate feedback and real-time sync
  socket.on('addChipToBet', async ({ code, chipValue }: { code: string, chipValue: number }) => {
    updateActivity();
    code = code.toUpperCase();
    
    const room = rooms.get(code);
    if (!room) {
      socket.emit('chipAddRejected', { 
        success: false, 
        error: 'Room not found',
        timestamp: Date.now()
      });
      return;
    }
    
    const player = room.players.get(socket.id);
    if (!player) {
      socket.emit('chipAddRejected', { 
        success: false, 
        error: 'Player not found',
        timestamp: Date.now()
      });
      return;
    }
    
    // Calculate new bet amount (current bet + chip value)
    const newBetAmount = player.currentBet + chipValue;
    
    try {
      const result = await bettingManager.placeBet(code, socket.id, newBetAmount);
      
      if (result.success) {
        // Enhanced immediate chip add confirmation with real-time sync data
        socket.emit('chipAddConfirmed', {
          success: true,
          newBalance: result.newBalance,
          currentBet: result.betAmount,
          chipAdded: chipValue,
          timestamp: Date.now(),
          serverTime: new Date().toISOString(),
          roundId: room.gameState?.roundId,
          // Enhanced confirmation data
          confirmationId: `chip-add-${socket.id}-${Date.now()}`,
          balanceChange: -chipValue,
          betChange: chipValue,
          // Real-time synchronization metadata
          syncData: {
            playerId: socket.id,
            playerName: player.name,
            action: 'chip_added',
            previousBet: result.betAmount - chipValue,
            newBet: result.betAmount,
            balanceAfter: result.newBalance
          }
        });
        
        // Real-time betting update
        if (room.gameState) {
          // Update total pot
          room.gameState.totalPot = Array.from(room.players.values())
            .reduce((sum, p) => sum + p.currentBet, 0);
          
          // Enhanced broadcast chip add update with immediate synchronization
          broadcastBettingUpdate(code, 'bet_confirmed', {
            playerId: socket.id,
            playerName: player.name,
            action: 'chip_added',
            chipValue,
            betAmount: result.betAmount,
            newBalance: result.newBalance,
            totalPot: room.gameState.totalPot,
            // Enhanced real-time sync data
            betChange: chipValue,
            balanceChange: -chipValue,
            confirmationTimestamp: Date.now(),
            // Immediate feedback data
            immediateSync: {
              type: 'chip_add_confirmed',
              playerId: socket.id,
              betBefore: result.betAmount - chipValue,
              betAfter: result.betAmount,
              potBefore: room.gameState.totalPot - chipValue,
              potAfter: room.gameState.totalPot
            }
          });
          
          // Broadcast progress
          broadcastBettingProgress(code);
          
          // Full sync
          broadcastGameState(code, room.gameState);
          emitPlayersUpdate(code);
        }
      } else {
        socket.emit('chipAddRejected', {
          success: false,
          error: result.error,
          chipValue,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error adding chip to bet:', error);
      socket.emit('chipAddRejected', {
        success: false,
        error: { message: 'Internal server error' },
        chipValue,
        timestamp: Date.now()
      });
    }
  });

  // Remove chip from bet
  socket.on('removeChipFromBet', async ({ code, chipValue }: { code: string, chipValue: number }) => {
    updateActivity();
    code = code.toUpperCase();
    
    const room = rooms.get(code);
    if (!room) {
      socket.emit('chipRemoveResult', { success: false, error: 'Room not found' });
      return;
    }
    
    const player = room.players.get(socket.id);
    if (!player) {
      socket.emit('chipRemoveResult', { success: false, error: 'Player not found' });
      return;
    }
    
    // Calculate new bet amount (current bet - chip value, minimum 0)
    const newBetAmount = Math.max(0, player.currentBet - chipValue);
    
    try {
      if (newBetAmount === 0) {
        // Clear the bet entirely
        const success = bettingManager.clearPlayerBet(socket.id, code);
        
        if (success) {
          socket.emit('chipRemoveResult', {
            success: true,
            newBalance: player.balance,
            currentBet: 0,
            chipRemoved: chipValue
          });
        } else {
          socket.emit('chipRemoveResult', {
            success: false,
            error: { message: 'Failed to clear bet' }
          });
        }
      } else {
        // Update to new bet amount
        const result = await bettingManager.placeBet(code, socket.id, newBetAmount);
        
        if (result.success) {
          socket.emit('chipRemoveResult', {
            success: true,
            newBalance: result.newBalance,
            currentBet: result.betAmount,
            chipRemoved: chipValue
          });
        } else {
          socket.emit('chipRemoveResult', {
            success: false,
            error: result.error
          });
        }
      }
      
      // Update all players in room
      emitPlayersUpdate(code);
      if (room.gameState) {
        broadcastGameState(code, room.gameState);
      }
    } catch (error) {
      console.error('Error removing chip from bet:', error);
      socket.emit('chipRemoveResult', {
        success: false,
        error: { message: 'Internal server error' }
      });
    }
  });

  // Place a bet with exact amount - enhanced with immediate confirmation and real-time sync
  socket.on('placeBet', async ({ code, amount }: { code: string, amount: number }) => {
    updateActivity();
    code = code.toUpperCase();
    
    try {
      const result = await bettingManager.placeBet(code, socket.id, amount);
      
      if (result.success) {
        const room = rooms.get(code);
        const player = room?.players.get(socket.id);
        
        // Enhanced immediate bet confirmation response with real-time sync
        socket.emit('betConfirmed', {
          success: true,
          newBalance: result.newBalance,
          betAmount: result.betAmount,
          timestamp: Date.now(),
          serverTime: new Date().toISOString(),
          roundId: room?.gameState?.roundId,
          confirmationId: `bet-placed-${socket.id}-${Date.now()}`,
          // Enhanced confirmation metadata
          transactionType: 'bet_placement',
          balanceChange: -result.betAmount,
          // Real-time synchronization data
          syncData: {
            playerId: socket.id,
            playerName: player?.name,
            action: 'bet_placed',
            betAmount: result.betAmount,
            balanceAfter: result.newBalance,
            hasPlacedBet: true,
            bettingStatus: 'placed'
          },
          // Immediate feedback indicators
          feedback: {
            type: 'bet_confirmed',
            message: `Bet of ${result.betAmount} chips placed successfully`,
            urgency: 'normal',
            autoHide: true
          }
        });
        
        // Broadcast betting update to all players for real-time synchronization
        if (room && room.gameState) {
          // Update total pot in game state
          room.gameState.totalPot = Array.from(room.players.values())
            .reduce((sum, p) => sum + p.currentBet, 0);
          
          // Optimized betting broadcast
          broadcastBettingUpdate(code, 'bet_placed', {
            playerId: socket.id,
            playerName: player?.name,
            betAmount: result.betAmount,
            newBalance: result.newBalance,
            totalPot: room.gameState.totalPot
          });
          
          // Broadcast betting progress
          broadcastBettingProgress(code);
          
          // Full game state update for synchronization
          broadcastGameState(code, room.gameState);
          
          // Update players list
          emitPlayersUpdate(code);
        }
      } else {
        // Immediate error response to the player
        socket.emit('betRejected', {
          success: false,
          error: result.error,
          timestamp: Date.now(),
          attemptedAmount: amount
        });
      }
    } catch (error) {
      console.error('Error placing bet:', error);
      socket.emit('betRejected', {
        success: false,
        error: {
          type: 'SYSTEM_ERROR',
          message: 'Internal server error while placing bet',
          recoverable: true
        },
        timestamp: Date.now(),
        attemptedAmount: amount
      });
    }
  });

  // Update/modify an existing bet - enhanced with immediate confirmation
  socket.on('updateBet', async ({ code, amount }: { code: string, amount: number }) => {
    updateActivity();
    code = code.toUpperCase();
    
    try {
      const result = await bettingManager.placeBet(code, socket.id, amount);
      
      if (result.success) {
        const room = rooms.get(code);
        const player = room?.players.get(socket.id);
        
        // Immediate bet update confirmation
        socket.emit('betUpdateConfirmed', {
          success: true,
          newBalance: result.newBalance,
          betAmount: result.betAmount,
          timestamp: Date.now(),
          roundId: room?.gameState?.roundId,
          updateId: `${socket.id}-update-${Date.now()}`
        });
        
        // Real-time betting update broadcast
        if (room && room.gameState) {
          // Update total pot
          room.gameState.totalPot = Array.from(room.players.values())
            .reduce((sum, p) => sum + p.currentBet, 0);
          
          // Broadcast betting update
          broadcastBettingUpdate(code, 'bet_updated', {
            playerId: socket.id,
            playerName: player?.name,
            betAmount: result.betAmount,
            newBalance: result.newBalance,
            totalPot: room.gameState.totalPot
          });
          
          // Broadcast progress update
          broadcastBettingProgress(code);
          
          // Full synchronization
          broadcastGameState(code, room.gameState);
          emitPlayersUpdate(code);
        }
      } else {
        // Immediate error response
        socket.emit('betUpdateRejected', {
          success: false,
          error: result.error,
          timestamp: Date.now(),
          attemptedAmount: amount
        });
      }
    } catch (error) {
      console.error('Error updating bet:', error);
      socket.emit('betUpdateRejected', {
        success: false,
        error: {
          type: 'SYSTEM_ERROR',
          message: 'Internal server error while updating bet',
          recoverable: true
        },
        timestamp: Date.now(),
        attemptedAmount: amount
      });
    }
  });

  // Place all-in bet (bet entire balance)
  socket.on('allIn', async ({ code }: { code: string }) => {
    updateActivity();
    code = code.toUpperCase();
    
    const room = rooms.get(code);
    if (!room) {
      socket.emit('allInResult', { 
        success: false, 
        error: {
          type: 'ROOM_NOT_FOUND',
          message: 'Room not found',
          recoverable: false
        }
      });
      return;
    }

    const player = room.players.get(socket.id);
    if (!player) {
      socket.emit('allInResult', { 
        success: false, 
        error: {
          type: 'PLAYER_NOT_FOUND',
          message: 'Player not found',
          recoverable: false
        }
      });
      return;
    }

    // Check if player has any balance to bet
    if (player.balance <= 0) {
      socket.emit('allInResult', {
        success: false,
        error: {
          type: 'INSUFFICIENT_BALANCE',
          message: 'No balance available for all-in bet',
          recoverable: false,
          suggestedAction: 'Wait for next round or contact support'
        }
      });
      return;
    }

    try {
      // Place bet for entire balance
      const result = await bettingManager.placeBet(code, socket.id, player.balance);
      
      if (result.success) {
        // Emit success to the player
        socket.emit('allInResult', {
          success: true,
          newBalance: result.newBalance,
          betAmount: result.betAmount,
          isAllIn: true
        });
        
        // Broadcast all-in notification to other players
        socket.to(code).emit('playerWentAllIn', {
          playerId: socket.id,
          playerName: player.name,
          betAmount: result.betAmount
        });
        
        // Update all players in room about the all-in bet
        emitPlayersUpdate(code);
        if (room.gameState) {
          broadcastGameState(code, room.gameState);
        }
      } else {
        // Emit error to the player
        socket.emit('allInResult', {
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error placing all-in bet:', error);
      socket.emit('allInResult', {
        success: false,
        error: {
          type: 'SYSTEM_ERROR',
          message: 'Internal server error while placing all-in bet',
          recoverable: true
        }
      });
    }
  });

  // Clear/cancel a bet - enhanced with immediate confirmation and real-time sync
  socket.on('clearBet', ({ code }: { code: string }) => {
    updateActivity();
    code = code.toUpperCase();
    
    const room = rooms.get(code);
    const player = room?.players.get(socket.id);
    const previousBet = player?.currentBet || 0;
    
    const success = bettingManager.clearPlayerBet(socket.id, code);
    
    if (success) {
      // Immediate confirmation to player
      socket.emit('betClearConfirmed', { 
        success: true,
        restoredBalance: player?.balance || 0,
        clearedAmount: previousBet,
        timestamp: Date.now(),
        roundId: room?.gameState?.roundId
      });
      
      // Real-time betting update broadcast
      if (room && room.gameState) {
        // Update total pot
        room.gameState.totalPot = Array.from(room.players.values())
          .reduce((sum, p) => sum + p.currentBet, 0);
        
        // Broadcast betting update
        broadcastBettingUpdate(code, 'bet_cleared', {
          playerId: socket.id,
          playerName: player?.name,
          clearedAmount: previousBet,
          newBalance: player?.balance || 0,
          totalPot: room.gameState.totalPot
        });
        
        // Broadcast progress update
        broadcastBettingProgress(code);
        
        // Full synchronization
        broadcastGameState(code, room.gameState);
        emitPlayersUpdate(code);
      }
    } else {
      socket.emit('betClearRejected', { 
        success: false, 
        error: 'Failed to clear bet',
        timestamp: Date.now()
      });
    }
  });

  // Get player balance - frontend should never calculate this
  socket.on('getBalance', ({ code }: { code: string }) => {
    updateActivity();
    code = code.toUpperCase();
    
    const balance = bettingManager.getPlayerBalance(socket.id, code);
    socket.emit('balanceUpdate', { balance });
  });

  // Skip betting phase if all players are ready (optional feature)
  socket.on('readyToBet', ({ code }: { code: string }) => {
    updateActivity();
    code = code.toUpperCase();
    
    const room = rooms.get(code);
    if (!room || !room.gameState || room.gameState.phase !== 'betting') return;
    
    room.playersReady.add(socket.id);
    
    // Check if all players are ready using BettingPhaseManager
    if (bettingPhaseManager.areAllPlayersReady(code)) {
      // End betting phase early since all players are ready
      bettingPhaseManager.endBettingPhase(code, 'all_ready');
      io.to(code).emit('bettingPhaseSkipped', {
        message: 'All players ready! Starting game...'
      });
    }
  });

  // Get betting information - frontend reads all data from backend
  socket.on('getBettingInfo', ({ code }: { code: string }) => {
    updateActivity();
    code = code.toUpperCase();
    
    const room = rooms.get(code);
    if (!room) {
      socket.emit('bettingInfo', { error: 'Room not found' });
      return;
    }
    
    const player = room.players.get(socket.id);
    if (!player) {
      socket.emit('bettingInfo', { error: 'Player not found' });
      return;
    }
    
    // Send all betting-related information
    socket.emit('bettingInfo', {
      balance: player.balance,
      currentBet: player.currentBet,
      hasPlacedBet: player.hasPlacedBet,
      minBet: BETTING_CONSTANTS.MIN_BET,
      maxBet: player.balance, // Max bet is player's balance
      totalWinnings: player.totalWinnings,
      totalLosses: player.totalLosses,
      // Available chip denominations for buttons
      availableChips: [25, 50, 100, 250, 500, 1000],
      // Betting phase info
      bettingPhase: room.gameState?.phase === 'betting',
      bettingTimeLeft: room.gameState?.bettingTimeLeft || 0
    });
  });

  // Get betting phase status - enhanced with real-time sync data
  socket.on('getBettingPhaseStatus', ({ code }: { code: string }) => {
    updateActivity();
    code = code.toUpperCase();
    
    const status = bettingPhaseManager.getBettingPhaseStatus(code);
    if (status) {
      const room = rooms.get(code);
      const enhancedStatus = {
        ...status,
        timestamp: Date.now(),
        serverTime: new Date().toISOString(),
        syncVersion: `${code}-${Date.now()}`,
        // Add real-time betting data
        bettingProgress: {
          playersReady: status.playersWithBets,
          playersTotal: status.totalPlayers,
          completionPercentage: status.totalPlayers > 0 ? 
            Math.round((status.playersWithBets / status.totalPlayers) * 100) : 0
        },
        // Include current player's betting info if available
        playerBettingInfo: room?.players.get(socket.id) ? {
          balance: room.players.get(socket.id)!.balance,
          currentBet: room.players.get(socket.id)!.currentBet,
          hasPlacedBet: room.players.get(socket.id)!.hasPlacedBet
        } : null
      };
      
      socket.emit('bettingPhaseStatus', enhancedStatus);
    } else {
      socket.emit('bettingPhaseStatus', { 
        error: 'Room not found or no active game',
        timestamp: Date.now()
      });
    }
  });

  // Enhanced request full betting state synchronization (for connection recovery)
  socket.on('requestBettingSync', ({ code, syncType = 'full' }: { code: string, syncType?: 'full' | 'partial' | 'timer_only' }) => {
    updateActivity();
    code = code.toUpperCase();
    
    const room = rooms.get(code);
    if (!room) {
      socket.emit('bettingSyncRequested', {
        success: false,
        timestamp: Date.now(),
        serverTime: new Date().toISOString(),
        error: 'Room not found',
        syncType
      });
      return;
    }
    
    const player = room.players.get(socket.id);
    if (!player) {
      socket.emit('bettingSyncRequested', {
        success: false,
        timestamp: Date.now(),
        serverTime: new Date().toISOString(),
        error: 'Player not found in room',
        syncType
      });
      return;
    }
    
    // Enhanced synchronization based on sync type
    if (room.gameState) {
      switch (syncType) {
        case 'full':
          // Complete state synchronization
          bettingPhaseManager.forceBettingStateSync(code);
          broadcastGameState(code, room.gameState);
          emitPlayersUpdate(code);
          broadcastBettingProgress(code);
          broadcastBettingTimerSync(code, true);
          break;
          
        case 'partial':
          // Betting-specific synchronization only
          broadcastBettingUpdate(code, 'sync_request', {
            playerId: socket.id,
            playerName: player.name,
            requestType: 'partial_sync'
          });
          broadcastBettingProgress(code);
          break;
          
        case 'timer_only':
          // Timer synchronization only
          broadcastBettingTimerSync(code, true);
          break;
      }
      
      // Send comprehensive sync confirmation to requesting client
      const bettingStatus = bettingPhaseManager.getBettingPhaseStatus(code);
      socket.emit('bettingSyncRequested', {
        success: true,
        syncType,
        bettingStatus,
        playerState: {
          balance: player.balance,
          currentBet: player.currentBet,
          hasPlacedBet: player.hasPlacedBet,
          bettingStatus: player.hasPlacedBet ? 'placed' : 'pending'
        },
        roomState: {
          phase: room.gameState.phase,
          roundId: room.gameState.roundId,
          totalPot: room.gameState.totalPot,
          playersCount: room.players.size
        },
        timestamp: Date.now(),
        serverTime: new Date().toISOString(),
        message: `Betting state synchronized successfully (${syncType})`
      });
    } else {
      socket.emit('bettingSyncRequested', {
        success: false,
        timestamp: Date.now(),
        serverTime: new Date().toISOString(),
        error: 'No active game state',
        syncType
      });
    }
  });

  // Enhanced handle betting connection recovery with comprehensive synchronization
  socket.on('bettingConnectionRecovery', ({ code, lastKnownRoundId, connectionId }: { code: string, lastKnownRoundId?: string, connectionId?: string }) => {
    updateActivity();
    code = code.toUpperCase();
    
    const room = rooms.get(code);
    if (!room || !room.gameState) {
      socket.emit('bettingRecoveryResult', {
        success: false,
        error: 'Room not found or no active game',
        timestamp: Date.now(),
        serverTime: new Date().toISOString(),
        connectionId
      });
      return;
    }

    const player = room.players.get(socket.id);
    if (!player) {
      socket.emit('bettingRecoveryResult', {
        success: false,
        error: 'Player not found in room',
        timestamp: Date.now(),
        serverTime: new Date().toISOString(),
        connectionId
      });
      return;
    }

    const currentRoundId = room.gameState.roundId;
    const isStaleConnection = lastKnownRoundId && lastKnownRoundId !== currentRoundId;
    const connectionGap = Date.now() - (connectionPool.get(socket.id)?.lastActivity || Date.now());
    
    // Enhanced recovery information
    socket.emit('bettingRecoveryResult', {
      success: true,
      timestamp: Date.now(),
      serverTime: new Date().toISOString(),
      connectionId,
      recoveryData: {
        currentRoundId,
        lastKnownRoundId,
        isStaleConnection,
        connectionGap,
        gamePhase: room.gameState.phase,
        bettingTimeLeft: room.gameState.bettingTimeLeft,
        // Player state recovery
        playerState: {
          balance: player.balance,
          currentBet: player.currentBet,
          hasPlacedBet: player.hasPlacedBet,
          bettingStatus: player.hasPlacedBet ? 'placed' : 'pending'
        },
        // Room state recovery
        roomState: {
          totalPot: room.gameState.totalPot,
          playersWithBets: room.gameState.players.filter(p => p.hasPlacedBet).length,
          totalPlayers: room.players.size,
          minBet: room.gameState.minBet,
          maxBet: room.gameState.maxBet
        }
      },
      message: isStaleConnection ? 
        'Connection recovered - new round detected, full sync required' : 
        'Connection recovered - same round, partial sync sufficient',
      // Recovery recommendations
      recommendations: {
        syncType: isStaleConnection ? 'full' : 'partial',
        immediateAction: isStaleConnection ? 'request_full_sync' : 'continue_betting',
        dataIntegrity: 'verified'
      }
    });

    // Enhanced synchronization based on connection state
    if (isStaleConnection || connectionGap > 30000) { // 30 second gap
      // Force full synchronization for stale connections
      bettingPhaseManager.forceBettingStateSync(code);
      broadcastGameState(code, room.gameState);
      emitPlayersUpdate(code);
      broadcastBettingProgress(code);
      broadcastBettingTimerSync(code, true);
    } else {
      // Partial synchronization for recent connections
      broadcastBettingUpdate(code, 'sync_request', {
        playerId: socket.id,
        playerName: player.name,
        requestType: 'connection_recovery',
        connectionGap
      });
      broadcastBettingProgress(code);
    }

    // Update connection pool
    const conn = connectionPool.get(socket.id);
    if (conn) {
      conn.lastActivity = Date.now();
      conn.roomCode = code;
    }
  });

  // Get payout calculation preview (before placing bet)
  socket.on('getPayoutPreview', ({ code, betAmount }: { code: string, betAmount: number }) => {
    updateActivity();
    code = code.toUpperCase();
    
    const room = rooms.get(code);
    if (!room) {
      socket.emit('payoutPreview', { error: 'Room not found' });
      return;
    }
    
    // Calculate potential payouts for all possible outcomes
    const payouts = {
      win: bettingManager.calculatePayout(betAmount, 'win'),
      blackjack: bettingManager.calculatePayout(betAmount, 'blackjack'),
      draw: bettingManager.calculatePayout(betAmount, 'draw'),
      lose: bettingManager.calculatePayout(betAmount, 'lose'),
      bust: bettingManager.calculatePayout(betAmount, 'bust')
    };
    
    socket.emit('payoutPreview', {
      betAmount,
      potentialPayouts: payouts,
      // Net profit/loss for each outcome
      netResults: {
        win: payouts.win - betAmount,
        blackjack: payouts.blackjack - betAmount,
        draw: payouts.draw - betAmount,
        lose: payouts.lose - betAmount,
        bust: payouts.bust - betAmount
      }
    });
  });

  // ===== GAME ACTION EVENTS =====

  // Acciones de jugador: hit, stand
  socket.on('playerAction', async ({ code, action }: { code: string, action: 'hit' | 'stand' | 'double' | 'split' }) => {
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
        
        // Update victory counters based on result
        switch (status) {
          case 'win':
            p.gamesWon++;
            p.victories++;
            break;
          case 'blackjack':
            p.gamesBlackjack++;
            p.victories++;
            break;
          case 'lose':
            p.gamesLost++;
            break;
          case 'draw':
            p.gamesDraw++;
            break;
          case 'bust':
            p.gamesBust++;
            p.gamesLost++; // Bust counts as a loss
            break;
        }
        
        gs.results[p.id] = {
          status,
          payout: 0, // Will be calculated in payout processing
          finalBalance: p.balance // Will be updated with payout
        };
        
        // Update player status for display
        p.status = status === 'bust' ? 'bust' : status === 'blackjack' ? 'blackjack' : p.isStand ? 'stand' : 'playing';
      }
      
      // Process payouts for all players
      await processGamePayouts(code, gs);
      
      // Schedule auto-advance to next round after 7.5 seconds
      scheduleAutoAdvance(code);
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
        // Clean up auto-advance timer when room is deleted
        cancelAutoAdvance(code);
        // Clean up betting phase manager timers
        bettingPhaseManager.cleanup(code);
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