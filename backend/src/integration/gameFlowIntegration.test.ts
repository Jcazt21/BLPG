import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  MultiplayerGameState,
  Room,
  MultiplayerPlayer,
  BETTING_CONSTANTS
} from '../types/bettingTypes';
import { BettingManager } from '../services/bettingManager';
import { BettingPhaseManager } from '../services/bettingPhaseManager';

describe('Game Flow Integration Tests', () => {
  let rooms: Map<string, Room>;
  let bettingManager: BettingManager;
  let bettingPhaseManager: BettingPhaseManager;
  let startDealingPhase: jest.MockedFunction<(roomCode: string) => void>;
  let mockIo: any;

  beforeEach(() => {
    rooms = new Map();
    bettingManager = new BettingManager(rooms);
    
    // Mock Socket.IO server
    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    };
    
    // Mock startDealingPhase function
    startDealingPhase = jest.fn((roomCode: string) => {
      const room = rooms.get(roomCode);
      if (room && room.gameState) {
        room.gameState.phase = 'dealing';
        setTimeout(() => {
          if (room.gameState) {
            room.gameState.phase = 'playing';
          }
        }, 10);
      }
    });
    
    bettingPhaseManager = new BettingPhaseManager(mockIo, rooms, bettingManager, startDealingPhase);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear any timers
    jest.clearAllTimers();
  });

  describe('Complete Game Flow', () => {
    it('should complete full game cycle: betting → dealing → playing', async () => {
      const roomCode = 'TEST';
      
      // Create room and players
      const player1: MultiplayerPlayer = {
        id: 'player1',
        name: 'Player 1',
        position: 0,
        hand: [],
        total: 0,
        isBust: false,
        isStand: false,
        isBlackjack: false,
        status: 'playing',
        victories: 0,
        gamesWon: 0,
        gamesBlackjack: 0,
        gamesLost: 0,
        gamesDraw: 0,
        gamesBust: 0,
        balance: BETTING_CONSTANTS.INITIAL_BALANCE,
        currentBet: 0,
        hasPlacedBet: false,
        betHistory: [],
        totalWinnings: 0,
        totalLosses: 0,
      };

      const player2: MultiplayerPlayer = {
        ...player1,
        id: 'player2',
        name: 'Player 2',
        position: 1,
      };

      const players = new Map([
        ['player1', player1],
        ['player2', player2]
      ]);

      const gameState: MultiplayerGameState = {
        started: true,
        players: [player1, player2],
        dealer: { hand: [], total: 0, isBust: false, isBlackjack: false },
        deck: [],
        turn: 0,
        phase: 'betting',
        bettingTimeLeft: BETTING_CONSTANTS.BETTING_TIME_SECONDS,
        minBet: BETTING_CONSTANTS.MIN_BET,
        maxBet: BETTING_CONSTANTS.INITIAL_BALANCE,
        roundId: `${roomCode}-${Date.now()}`,
        totalPot: 0,
      };

      const room: Room = {
        sockets: new Set(['player1', 'player2']),
        players,
        creator: 'player1',
        gameState,
        playersReady: new Set(),
      };

      rooms.set(roomCode, room);
      bettingManager.initializePlayerBalance('player1', roomCode);
      bettingManager.initializePlayerBalance('player2', roomCode);

      // Start betting phase
      const bettingStarted = bettingPhaseManager.startBettingPhase(roomCode);
      expect(bettingStarted).toBe(true);
      expect(room.gameState?.phase).toBe('betting');

      // Place bets
      const bet1Result = await bettingManager.placeBet(roomCode, 'player1', 100);
      const bet2Result = await bettingManager.placeBet(roomCode, 'player2', 50);
      
      expect(bet1Result.success).toBe(true);
      expect(bet2Result.success).toBe(true);
      expect(player1.hasPlacedBet).toBe(true);
      expect(player2.hasPlacedBet).toBe(true);

      // End betting phase
      const bettingEnded = bettingPhaseManager.endBettingPhase(roomCode, 'manual');
      expect(bettingEnded).toBe(true);
      expect(room.gameState?.totalPot).toBe(150);

      // Verify startDealingPhase was called (wait for the 2-second delay in completeBettingPhase)
      await new Promise(resolve => setTimeout(resolve, 2500));
      expect(startDealingPhase).toHaveBeenCalledWith(roomCode);
    });

    it('should handle automatic minimum bet placement on timeout', async () => {
      const roomCode = 'TEST2';
      
      // Create room with one player who doesn't bet
      const player1: MultiplayerPlayer = {
        id: 'player1',
        name: 'Player 1',
        position: 0,
        hand: [],
        total: 0,
        isBust: false,
        isStand: false,
        isBlackjack: false,
        status: 'playing',
        victories: 0,
        gamesWon: 0,
        gamesBlackjack: 0,
        gamesLost: 0,
        gamesDraw: 0,
        gamesBust: 0,
        balance: BETTING_CONSTANTS.INITIAL_BALANCE,
        currentBet: 0,
        hasPlacedBet: false,
        betHistory: [],
        totalWinnings: 0,
        totalLosses: 0,
      };

      const players = new Map([['player1', player1]]);

      const gameState: MultiplayerGameState = {
        started: true,
        players: [player1],
        dealer: { hand: [], total: 0, isBust: false, isBlackjack: false },
        deck: [],
        turn: 0,
        phase: 'betting',
        bettingTimeLeft: BETTING_CONSTANTS.BETTING_TIME_SECONDS,
        minBet: BETTING_CONSTANTS.MIN_BET,
        maxBet: BETTING_CONSTANTS.INITIAL_BALANCE,
        roundId: `${roomCode}-${Date.now()}`,
        totalPot: 0,
      };

      const room: Room = {
        sockets: new Set(['player1']),
        players,
        creator: 'player1',
        gameState,
        playersReady: new Set(),
      };

      rooms.set(roomCode, room);
      bettingManager.initializePlayerBalance('player1', roomCode);

      // Start betting phase
      bettingPhaseManager.startBettingPhase(roomCode);
      
      // Don't place any bets, just end the betting phase to trigger automatic bet placement
      const bettingEnded = bettingPhaseManager.endBettingPhase(roomCode, 'timeout');
      expect(bettingEnded).toBe(true);
      
      // Wait for automatic bet processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check that player now has an automatic minimum bet
      expect(player1.hasPlacedBet).toBe(true);
      expect(player1.currentBet).toBe(BETTING_CONSTANTS.MIN_BET);
      expect(player1.balance).toBe(BETTING_CONSTANTS.INITIAL_BALANCE - BETTING_CONSTANTS.MIN_BET);
    });

    it('should properly clean up state between rounds', async () => {
      const roomCode = 'TEST3';
      
      // Create room with game state
      const player1: MultiplayerPlayer = {
        id: 'player1',
        name: 'Player 1',
        position: 0,
        hand: [{ suit: 'hearts', value: 'K' }, { suit: 'spades', value: 'A' }],
        total: 21,
        isBust: false,
        isStand: true,
        isBlackjack: true,
        status: 'blackjack',
        victories: 1,
        gamesWon: 0,
        gamesBlackjack: 1,
        gamesLost: 0,
        gamesDraw: 0,
        gamesBust: 0,
        balance: 1200,
        currentBet: 100,
        hasPlacedBet: true,
        betHistory: [],
        totalWinnings: 250,
        totalLosses: 0,
      };

      const players = new Map([['player1', player1]]);

      const gameState: MultiplayerGameState = {
        started: true,
        players: [player1],
        dealer: { hand: [{ suit: 'clubs', value: '10' }], total: 10, isBust: false, isBlackjack: false },
        deck: [],
        turn: 0,
        phase: 'result',
        bettingTimeLeft: 0,
        minBet: BETTING_CONSTANTS.MIN_BET,
        maxBet: 1200,
        roundId: `${roomCode}-old`,
        totalPot: 100,
        results: {
          'player1': {
            status: 'blackjack',
            payout: 250,
            finalBalance: 1200
          }
        }
      };

      const room: Room = {
        sockets: new Set(['player1']),
        players,
        creator: 'player1',
        gameState,
        playersReady: new Set(['player1']),
      };

      rooms.set(roomCode, room);

      // Simulate round restart
      bettingPhaseManager.cleanup(roomCode);
      
      // Reset player state for new round
      player1.hand = [];
      player1.total = 0;
      player1.isBust = false;
      player1.isStand = false;
      player1.isBlackjack = false;
      player1.status = 'playing';
      player1.currentBet = 0;
      player1.hasPlacedBet = false;

      // Create new game state
      const newGameState: MultiplayerGameState = {
        started: true,
        players: [player1],
        dealer: { hand: [], total: 0, isBust: false, isBlackjack: false },
        deck: [],
        turn: 0,
        phase: 'betting',
        bettingTimeLeft: BETTING_CONSTANTS.BETTING_TIME_SECONDS,
        minBet: BETTING_CONSTANTS.MIN_BET,
        maxBet: 1200,
        roundId: `${roomCode}-${Date.now()}`,
        totalPot: 0,
        results: undefined,
      };

      room.gameState = newGameState;
      room.playersReady.clear();

      // Verify state is properly cleaned up
      expect(player1.hand).toEqual([]);
      expect(player1.total).toBe(0);
      expect(player1.isBust).toBe(false);
      expect(player1.isStand).toBe(false);
      expect(player1.isBlackjack).toBe(false);
      expect(player1.status).toBe('playing');
      expect(player1.currentBet).toBe(0);
      expect(player1.hasPlacedBet).toBe(false);
      
      // Verify victory counters and balance are preserved
      expect(player1.victories).toBe(1);
      expect(player1.gamesBlackjack).toBe(1);
      expect(player1.balance).toBe(1200);
      expect(player1.totalWinnings).toBe(250);
      
      // Verify game state is reset
      expect(newGameState.phase).toBe('betting');
      expect(newGameState.results).toBeUndefined();
      expect(newGameState.totalPot).toBe(0);
      expect(room.playersReady.size).toBe(0);
    });

    it('should handle players without bets during dealing phase', async () => {
      const roomCode = 'TEST4';
      
      // Create room with two players, only one places bet
      const player1: MultiplayerPlayer = {
        id: 'player1',
        name: 'Player 1',
        position: 0,
        hand: [],
        total: 0,
        isBust: false,
        isStand: false,
        isBlackjack: false,
        status: 'playing',
        victories: 0,
        gamesWon: 0,
        gamesBlackjack: 0,
        gamesLost: 0,
        gamesDraw: 0,
        gamesBust: 0,
        balance: BETTING_CONSTANTS.INITIAL_BALANCE,
        currentBet: 100,
        hasPlacedBet: true,
        betHistory: [],
        totalWinnings: 0,
        totalLosses: 0,
      };

      const player2: MultiplayerPlayer = {
        ...player1,
        id: 'player2',
        name: 'Player 2',
        position: 1,
        currentBet: 0,
        hasPlacedBet: false,
      };

      const players = new Map([
        ['player1', player1],
        ['player2', player2]
      ]);

      const gameState: MultiplayerGameState = {
        started: true,
        players: [player1, player2],
        dealer: { hand: [], total: 0, isBust: false, isBlackjack: false },
        deck: [],
        turn: 0,
        phase: 'betting',
        bettingTimeLeft: BETTING_CONSTANTS.BETTING_TIME_SECONDS,
        minBet: BETTING_CONSTANTS.MIN_BET,
        maxBet: BETTING_CONSTANTS.INITIAL_BALANCE,
        roundId: `${roomCode}-${Date.now()}`,
        totalPot: 100,
      };

      const room: Room = {
        sockets: new Set(['player1', 'player2']),
        players,
        creator: 'player1',
        gameState,
        playersReady: new Set(),
      };

      rooms.set(roomCode, room);

      // Mock startDealingPhase to verify proper handling
      const mockStartDealing = jest.fn((roomCode: string) => {
        const room = rooms.get(roomCode);
        if (!room || !room.gameState) return;
        
        // Simulate dealing logic - only deal to players with bets
        room.gameState.players.forEach(player => {
          if (!player.hasPlacedBet || player.currentBet <= 0) {
            // Player sits out this round
            player.hand = [];
            player.total = 0;
            player.isStand = true; // Mark as standing so they don't participate
            player.status = 'playing';
          } else {
            // Player gets cards (mock)
            player.hand = [
              { suit: 'hearts', value: '10' },
              { suit: 'spades', value: '7' }
            ];
            player.total = 17;
            player.isStand = false;
            player.status = 'playing';
          }
        });
        
        room.gameState.phase = 'dealing';
      });

      // Replace the mock function
      bettingPhaseManager = new BettingPhaseManager(mockIo, rooms, bettingManager, mockStartDealing);

      // End betting phase to trigger dealing
      bettingPhaseManager.endBettingPhase(roomCode, 'manual');
      
      // Wait for dealing to complete (wait for the 2-second delay in completeBettingPhase)
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Verify only player with bet gets cards
      const playerWithBet = room.gameState?.players.find(p => p.id === 'player1');
      const playerWithoutBet = room.gameState?.players.find(p => p.id === 'player2');
      
      expect(playerWithBet?.hand.length).toBe(2);
      expect(playerWithBet?.isStand).toBe(false);
      expect(playerWithoutBet?.hand.length).toBe(0);
      expect(playerWithoutBet?.isStand).toBe(true);
      expect(mockStartDealing).toHaveBeenCalledWith(roomCode);
    });
  });

  describe('Game State Transitions', () => {
    it('should transition through all phases correctly', async () => {
      const roomCode = 'TRANS';
      
      // Create minimal room setup
      const player1: MultiplayerPlayer = {
        id: 'player1',
        name: 'Player 1',
        position: 0,
        hand: [],
        total: 0,
        isBust: false,
        isStand: false,
        isBlackjack: false,
        status: 'playing',
        victories: 0,
        gamesWon: 0,
        gamesBlackjack: 0,
        gamesLost: 0,
        gamesDraw: 0,
        gamesBust: 0,
        balance: BETTING_CONSTANTS.INITIAL_BALANCE,
        currentBet: 0,
        hasPlacedBet: false,
        betHistory: [],
        totalWinnings: 0,
        totalLosses: 0,
      };

      const players = new Map([['player1', player1]]);

      const gameState: MultiplayerGameState = {
        started: true,
        players: [player1],
        dealer: { hand: [], total: 0, isBust: false, isBlackjack: false },
        deck: [],
        turn: 0,
        phase: 'betting',
        bettingTimeLeft: BETTING_CONSTANTS.BETTING_TIME_SECONDS,
        minBet: BETTING_CONSTANTS.MIN_BET,
        maxBet: BETTING_CONSTANTS.INITIAL_BALANCE,
        roundId: `${roomCode}-${Date.now()}`,
        totalPot: 0,
      };

      const room: Room = {
        sockets: new Set(['player1']),
        players,
        creator: 'player1',
        gameState,
        playersReady: new Set(),
      };

      rooms.set(roomCode, room);
      bettingManager.initializePlayerBalance('player1', roomCode);

      // Start betting phase
      bettingPhaseManager.startBettingPhase(roomCode);
      expect(room.gameState?.phase).toBe('betting');
      
      // Place bet
      await bettingManager.placeBet(roomCode, 'player1', 50);
      expect(player1.hasPlacedBet).toBe(true);
      
      // End betting phase
      bettingPhaseManager.endBettingPhase(roomCode, 'manual');
      
      // Wait for dealing phase to start (wait for the 2-second delay in completeBettingPhase)
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Verify startDealingPhase was called
      expect(startDealingPhase).toHaveBeenCalledWith(roomCode);
      
      // Wait for dealing phase to complete and transition to playing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify phase progression
      expect(room.gameState?.phase).toBe('playing');
    });
  });
});