import { Server as SocketIOServer } from 'socket.io';
import {
  MultiplayerGameState,
  Room,
  BETTING_CONSTANTS,
  MultiplayerPlayer
} from '../types/bettingTypes';
import { BettingManager } from './bettingManager';

/**
 * BettingPhaseManager handles the betting phase lifecycle including:
 * - Starting and ending betting phases
 * - Managing the 30-second betting timer
 * - Automatic minimum bet placement for timeout
 * - Betting phase completion logic
 */
export class BettingPhaseManager {
  private io: SocketIOServer;
  private rooms: Map<string, Room>;
  private bettingManager: BettingManager;
  private bettingTimers: Map<string, NodeJS.Timeout>;
  private startDealingPhase: (roomCode: string) => void;

  constructor(
    io: SocketIOServer, 
    rooms: Map<string, Room>, 
    bettingManager: BettingManager,
    startDealingPhase: (roomCode: string) => void
  ) {
    this.io = io;
    this.rooms = rooms;
    this.bettingManager = bettingManager;
    this.bettingTimers = new Map();
    this.startDealingPhase = startDealingPhase;
  }

  /**
   * Starts the betting phase for a room
   * @param roomCode - The room code
   * @returns boolean indicating success
   */
  startBettingPhase(roomCode: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || !room.gameState) {
      console.error(`Cannot start betting phase: Room ${roomCode} not found or no game state`);
      return false;
    }

    // Clear any existing betting timer for this room
    this.clearBettingTimer(roomCode);

    // Set betting phase in game state
    room.gameState.phase = 'betting';
    room.gameState.bettingTimeLeft = BETTING_CONSTANTS.BETTING_TIME_SECONDS;
    
    // Reset all player bets for new round
    this.bettingManager.resetPlayerBets(roomCode);
    
    // Update max bet based on current balances
    const playerBalances = Array.from(room.players.values()).map(p => p.balance);
    room.gameState.maxBet = playerBalances.length > 0 ? Math.max(...playerBalances) : BETTING_CONSTANTS.MIN_BET;
    
    // Generate new round ID
    room.gameState.roundId = `${roomCode}-${Date.now()}`;
    room.gameState.totalPot = 0;
    
    // Broadcast betting phase start
    this.broadcastGameState(roomCode, room.gameState);
    this.io.to(roomCode).emit('bettingPhaseStarted', {
      timeLeft: BETTING_CONSTANTS.BETTING_TIME_SECONDS,
      minBet: BETTING_CONSTANTS.MIN_BET,
      maxBet: room.gameState.maxBet,
      roundId: room.gameState.roundId
    });

    // Start betting countdown timer
    this.startBettingTimer(roomCode);
    
    console.log(`Betting phase started in room ${roomCode} with ${BETTING_CONSTANTS.BETTING_TIME_SECONDS}s timer`);
    return true;
  }

  /**
   * Ends the betting phase for a room
   * @param roomCode - The room code
   * @param reason - Reason for ending ('timeout' | 'all_ready' | 'manual')
   * @returns boolean indicating success
   */
  endBettingPhase(roomCode: string, reason: 'timeout' | 'all_ready' | 'manual' = 'timeout'): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || !room.gameState) {
      console.error(`Cannot end betting phase: Room ${roomCode} not found or no game state`);
      return false;
    }

    // Clear betting timer
    this.clearBettingTimer(roomCode);

    // Check if betting phase is active
    if (room.gameState.phase !== 'betting') {
      console.warn(`Betting phase not active in room ${roomCode}, current phase: ${room.gameState.phase}`);
      return false;
    }

    // Handle players who haven't placed bets (automatic minimum bet placement)
    const playersWithoutBets = Array.from(room.players.values()).filter(p => !p.hasPlacedBet);
    
    if (playersWithoutBets.length > 0) {
      this.handleBettingTimeout(roomCode, playersWithoutBets);
    }

    // Calculate total pot
    room.gameState.totalPot = Array.from(room.players.values())
      .reduce((total, player) => total + player.currentBet, 0);

    // Set betting time to 0
    room.gameState.bettingTimeLeft = 0;

    // Broadcast betting phase end
    this.io.to(roomCode).emit('bettingPhaseEnded', {
      reason,
      totalPot: room.gameState.totalPot,
      playersWithBets: Array.from(room.players.values()).filter(p => p.hasPlacedBet).length,
      automaticBetsPlaced: playersWithoutBets.length
    });

    console.log(`Betting phase ended in room ${roomCode}, reason: ${reason}, total pot: ${room.gameState.totalPot}`);
    
    return true;
  }

  /**
   * Handles betting timeout by placing automatic minimum bets for players who haven't bet
   * @param roomCode - The room code
   * @param playersWithoutBets - Array of players who haven't placed bets
   */
  private async handleBettingTimeout(roomCode: string, playersWithoutBets: MultiplayerPlayer[]): Promise<void> {
    console.log(`Handling betting timeout for room ${roomCode}, ${playersWithoutBets.length} players without bets`);

    const automaticBetResults: { playerId: string; success: boolean; amount: number }[] = [];

    for (const player of playersWithoutBets) {
      // Only place automatic bet if player has sufficient balance
      if (player.balance >= BETTING_CONSTANTS.MIN_BET) {
        try {
          const result = await this.bettingManager.placeBet(roomCode, player.id, BETTING_CONSTANTS.MIN_BET);
          
          automaticBetResults.push({
            playerId: player.id,
            success: result.success,
            amount: result.success ? BETTING_CONSTANTS.MIN_BET : 0
          });

          if (result.success) {
            console.log(`Automatic minimum bet placed for player ${player.id} in room ${roomCode}`);
          } else {
            console.warn(`Failed to place automatic bet for player ${player.id}:`, result.error);
          }
        } catch (error) {
          console.error(`Error placing automatic bet for player ${player.id}:`, error);
          automaticBetResults.push({
            playerId: player.id,
            success: false,
            amount: 0
          });
        }
      } else {
        console.log(`Player ${player.id} has insufficient balance (${player.balance}) for minimum bet`);
        automaticBetResults.push({
          playerId: player.id,
          success: false,
          amount: 0
        });
      }
    }

    // Emit automatic bet results
    this.io.to(roomCode).emit('automaticBetsPlaced', {
      results: automaticBetResults,
      message: 'Automatic minimum bets placed for players who did not bet in time'
    });

    // Update all players about the new bets
    this.emitPlayersUpdate(roomCode);
  }

  /**
   * Checks if betting phase is complete (all players have placed bets or time expired)
   * @param roomCode - The room code
   * @returns boolean indicating if betting is complete
   */
  isBettingPhaseComplete(roomCode: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || !room.gameState || room.gameState.phase !== 'betting') {
      return false;
    }

    // Check if time has expired
    if (room.gameState.bettingTimeLeft <= 0) {
      return true;
    }

    // Check if all players have placed bets
    const allPlayersHaveBets = Array.from(room.players.values()).every(p => p.hasPlacedBet);
    return allPlayersHaveBets;
  }

  /**
   * Checks if all players are ready to skip betting phase
   * @param roomCode - The room code
   * @returns boolean indicating if all players are ready
   */
  areAllPlayersReady(roomCode: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;

    const allPlayersReady = room.players.size === room.playersReady.size;
    const allPlayersHaveBets = Array.from(room.players.values()).every(p => p.hasPlacedBet);
    
    return allPlayersReady && allPlayersHaveBets;
  }

  /**
   * Starts the betting countdown timer with enhanced synchronization
   * @param roomCode - The room code
   */
  private startBettingTimer(roomCode: string): void {
    const timer = setInterval(() => {
      const room = this.rooms.get(roomCode);
      
      if (!room || !room.gameState || room.gameState.phase !== 'betting') {
        clearInterval(timer);
        this.bettingTimers.delete(roomCode);
        return;
      }

      // Decrease betting time
      room.gameState.bettingTimeLeft--;
      
      // Enhanced timer synchronization with betting state
      const timerUpdate = {
        timeLeft: room.gameState.bettingTimeLeft,
        totalPot: room.gameState.totalPot,
        playersWithBets: Array.from(room.players.values()).filter(p => p.hasPlacedBet).length,
        totalPlayers: room.players.size,
        roundId: room.gameState.roundId,
        serverTime: new Date().toISOString(),
        timestamp: Date.now(),
        // Add urgency indicators
        isUrgent: room.gameState.bettingTimeLeft <= 10,
        isCritical: room.gameState.bettingTimeLeft <= 5
      };
      
      // Emit enhanced countdown update
      this.io.to(roomCode).emit('bettingTimerSync', timerUpdate);
      
      // Emit legacy event for backward compatibility
      this.io.to(roomCode).emit('bettingTimeUpdate', {
        timeLeft: room.gameState.bettingTimeLeft
      });

      // Emit special warnings at key intervals
      if (room.gameState.bettingTimeLeft === 10) {
        this.io.to(roomCode).emit('bettingTimeWarning', {
          message: '10 seconds remaining to place bets!',
          timeLeft: 10,
          urgency: 'medium'
        });
      } else if (room.gameState.bettingTimeLeft === 5) {
        this.io.to(roomCode).emit('bettingTimeWarning', {
          message: '5 seconds remaining! Place your bets now!',
          timeLeft: 5,
          urgency: 'high'
        });
      }

      // Check if betting should end
      if (room.gameState.bettingTimeLeft <= 0 || this.isBettingPhaseComplete(roomCode)) {
        clearInterval(timer);
        this.bettingTimers.delete(roomCode);
        
        // Only complete betting phase if still in betting phase
        if (room.gameState.phase === 'betting') {
          this.completeBettingPhase(roomCode);
        }
      }
    }, 1000);

    this.bettingTimers.set(roomCode, timer);
  }

  /**
   * Completes the betting phase and transitions to the next game phase
   * @param roomCode - The room code
   */
  private async completeBettingPhase(roomCode: string): Promise<void> {
    const room = this.rooms.get(roomCode);
    if (!room || !room.gameState) return;

    // Check if betting phase is still active
    if (room.gameState.phase !== 'betting') {
      console.log(`Betting phase already completed in room ${roomCode}, current phase: ${room.gameState.phase}`);
      return;
    }

    // Check if any players have placed bets
    const playersWithBets = Array.from(room.players.values()).filter(p => p.hasPlacedBet && p.currentBet > 0);
    
    if (playersWithBets.length === 0) {
      // No valid bets placed, restart betting phase after delay
      this.io.to(roomCode).emit('noBetsPlaced', {
        message: 'No valid bets were placed. Starting new betting round in 3 seconds.'
      });
      
      setTimeout(() => {
        this.startBettingPhase(roomCode);
      }, 3000);
    } else {
      // Proceed to dealing phase
      this.io.to(roomCode).emit('bettingComplete', {
        message: 'Betting complete! Starting to deal cards...',
        totalPot: room.gameState.totalPot,
        playersInRound: playersWithBets.length
      });
      
      // Transition to dealing phase after short delay
      setTimeout(() => {
        this.transitionToDealingPhase(roomCode);
      }, 2000);
    }
  }

  /**
   * Transitions from betting phase to dealing phase
   * @param roomCode - The room code
   */
  private transitionToDealingPhase(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room || !room.gameState) return;

    // Check if we're still in betting phase before transitioning
    if (room.gameState.phase !== 'betting') {
      console.log(`Cannot transition to dealing phase: current phase is ${room.gameState.phase}, expected 'betting'`);
      return;
    }

    // Set phase to dealing to prevent multiple transitions
    room.gameState.phase = 'dealing';

    // Emit dealing phase started event
    this.io.to(roomCode).emit('dealingPhaseStarted', {
      message: 'Dealing cards to all players...'
    });

    // Call the main game's startDealingPhase function directly
    this.startDealingPhase(roomCode);

    console.log(`Transitioned to dealing phase in room ${roomCode}`);
  }

  /**
   * Clears the betting timer for a room
   * @param roomCode - The room code
   */
  private clearBettingTimer(roomCode: string): void {
    const timer = this.bettingTimers.get(roomCode);
    if (timer) {
      clearInterval(timer);
      this.bettingTimers.delete(roomCode);
    }
  }

  /**
   * Cleans up betting timers for a room (called when room is deleted)
   * @param roomCode - The room code
   */
  cleanup(roomCode: string): void {
    this.clearBettingTimer(roomCode);
  }

  /**
   * Gets the current betting phase status for a room
   * @param roomCode - The room code
   * @returns Betting phase status or null if room not found
   */
  getBettingPhaseStatus(roomCode: string): {
    phase: string;
    timeLeft: number;
    totalPot: number;
    playersWithBets: number;
    totalPlayers: number;
  } | null {
    const room = this.rooms.get(roomCode);
    if (!room || !room.gameState) return null;

    const playersWithBets = Array.from(room.players.values()).filter(p => p.hasPlacedBet).length;

    return {
      phase: room.gameState.phase,
      timeLeft: room.gameState.bettingTimeLeft,
      totalPot: room.gameState.totalPot,
      playersWithBets,
      totalPlayers: room.players.size
    };
  }

  /**
   * Broadcasts optimized game state to all players in a room
   * @param roomCode - The room code
   * @param gameState - The game state to broadcast
   */
  private broadcastGameState(roomCode: string, gameState: MultiplayerGameState): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    
    // Create minimal state for broadcasting - only send necessary data
    const minimalState = {
      phase: gameState.phase,
      turn: gameState.turn,
      bettingTimeLeft: gameState.bettingTimeLeft,
      minBet: gameState.minBet,
      maxBet: gameState.maxBet,
      totalPot: gameState.totalPot,
      roundId: gameState.roundId,
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
        victories: p.victories,
        gamesWon: p.gamesWon,
        gamesBlackjack: p.gamesBlackjack,
        gamesLost: p.gamesLost,
        gamesDraw: p.gamesDraw,
        gamesBust: p.gamesBust,
        balance: p.balance,
        currentBet: p.currentBet,
        hasPlacedBet: p.hasPlacedBet,
        totalWinnings: p.totalWinnings,
        totalLosses: p.totalLosses
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
    
    this.io.to(roomCode).emit('gameStateUpdate', minimalState);
  }

  /**
   * Emits optimized players update to all players in a room
   * @param roomCode - The room code
   */
  private emitPlayersUpdate(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (room) {
      const minimalPlayers = Array.from(room.players.values()).map(p => ({ 
        id: p.id, 
        name: p.name,
        position: p.position,
        victories: p.victories,
        gamesWon: p.gamesWon,
        gamesBlackjack: p.gamesBlackjack,
        balance: p.balance,
        currentBet: p.currentBet,
        hasPlacedBet: p.hasPlacedBet
      }));
      this.io.to(roomCode).emit('playersUpdate', {
        players: minimalPlayers,
        creator: room.creator
      });
    }
  }

  /**
   * Broadcasts real-time betting synchronization update
   * @param roomCode - The room code
   * @param eventType - Type of betting event
   * @param eventData - Event-specific data
   */
  broadcastBettingSyncUpdate(roomCode: string, eventType: string, eventData: any): void {
    const room = this.rooms.get(roomCode);
    if (!room || !room.gameState) return;

    const syncUpdate = {
      eventType,
      timestamp: Date.now(),
      serverTime: new Date().toISOString(),
      roomCode,
      roundId: room.gameState.roundId,
      bettingState: {
        phase: room.gameState.phase,
        timeLeft: room.gameState.bettingTimeLeft,
        totalPot: room.gameState.totalPot,
        playersWithBets: Array.from(room.players.values()).filter(p => p.hasPlacedBet).length,
        totalPlayers: room.players.size,
        minBet: room.gameState.minBet,
        maxBet: room.gameState.maxBet
      },
      eventData,
      // Include current betting status of all players for synchronization
      allPlayerBets: Array.from(room.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        currentBet: p.currentBet,
        hasPlacedBet: p.hasPlacedBet,
        balance: p.balance,
        bettingStatus: p.hasPlacedBet ? 'placed' : 'pending'
      }))
    };

    this.io.to(roomCode).emit('bettingSyncUpdate', syncUpdate);
  }

  /**
   * Forces a complete betting state synchronization for all clients
   * @param roomCode - The room code
   */
  forceBettingStateSync(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room || !room.gameState) return;

    const fullSyncData = {
      type: 'full_sync',
      timestamp: Date.now(),
      serverTime: new Date().toISOString(),
      roomCode,
      roundId: room.gameState.roundId,
      gameState: {
        phase: room.gameState.phase,
        bettingTimeLeft: room.gameState.bettingTimeLeft,
        minBet: room.gameState.minBet,
        maxBet: room.gameState.maxBet,
        totalPot: room.gameState.totalPot,
        started: room.gameState.started
      },
      players: Array.from(room.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
        balance: p.balance,
        currentBet: p.currentBet,
        hasPlacedBet: p.hasPlacedBet,
        totalWinnings: p.totalWinnings,
        totalLosses: p.totalLosses,
        bettingStatus: p.hasPlacedBet ? 'placed' : 'pending'
      })),
      bettingStats: {
        playersWithBets: Array.from(room.players.values()).filter(p => p.hasPlacedBet).length,
        totalPlayers: room.players.size,
        averageBet: room.players.size > 0 ? 
          Array.from(room.players.values()).reduce((sum, p) => sum + p.currentBet, 0) / room.players.size : 0,
        highestBet: Math.max(...Array.from(room.players.values()).map(p => p.currentBet), 0)
      }
    };

    this.io.to(roomCode).emit('bettingFullSync', fullSyncData);
  }
}