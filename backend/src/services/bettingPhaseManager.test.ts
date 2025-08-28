import { BettingPhaseManager } from './bettingPhaseManager';
import { BettingManager } from './bettingManager';
import { Server as SocketIOServer } from 'socket.io';
import {
  MultiplayerPlayer,
  MultiplayerGameState,
  Room,
  BETTING_CONSTANTS
} from '../types/bettingTypes';

// Mock Socket.IO
const mockIo = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn()
} as unknown as SocketIOServer;

// Mock BettingManager
const mockBettingManager = {
  resetPlayerBets: jest.fn(),
  placeBet: jest.fn().mockResolvedValue({
    success: true,
    newBalance: 975,
    betAmount: 25
  }),
} as unknown as BettingManager;

describe('BettingPhaseManager', () => {
  let bettingPhaseManager: BettingPhaseManager;
  let rooms: Map<string, Room>;
  let mockRoom: Room;
  let mockPlayer1: MultiplayerPlayer;
  let mockPlayer2: MultiplayerPlayer;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    rooms = new Map();
    const mockStartDealingPhase = jest.fn();
    bettingPhaseManager = new BettingPhaseManager(mockIo, rooms, mockBettingManager, mockStartDealingPhase);

    // Create mock players
    mockPlayer1 = {
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
      balance: 1000,
      currentBet: 0,
      hasPlacedBet: false,
      betHistory: [],
      totalWinnings: 0,
      totalLosses: 0
    };

    mockPlayer2 = {
      id: 'player2',
      name: 'Player 2',
      position: 1,
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
      balance: 500,
      currentBet: 0,
      hasPlacedBet: false,
      betHistory: [],
      totalWinnings: 0,
      totalLosses: 0
    };  
  // Create mock room
    mockRoom = {
      sockets: new Set(['player1', 'player2']),
      players: new Map([
        ['player1', mockPlayer1],
        ['player2', mockPlayer2]
      ]),
      creator: 'player1',
      gameState: {
        started: true,
        players: [mockPlayer1, mockPlayer2],
        dealer: { hand: [], total: 0, isBust: false, isBlackjack: false },
        deck: [],
        turn: 0,
        phase: 'dealing',
        bettingTimeLeft: 0,
        minBet: BETTING_CONSTANTS.MIN_BET,
        maxBet: 1000,
        roundId: 'test-round-1',
        totalPot: 0
      } as MultiplayerGameState,
      playersReady: new Set()
    };

    rooms.set('TEST', mockRoom);
  });

  afterEach(() => {
    // Clean up any timers
    bettingPhaseManager.cleanup('TEST');
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('startBettingPhase', () => {
    it('should start betting phase successfully', () => {
      const result = bettingPhaseManager.startBettingPhase('TEST');

      expect(result).toBe(true);
      expect(mockRoom.gameState?.phase).toBe('betting');
      expect(mockRoom.gameState?.bettingTimeLeft).toBe(BETTING_CONSTANTS.BETTING_TIME_SECONDS);
      expect(mockBettingManager.resetPlayerBets).toHaveBeenCalledWith('TEST');
      expect(mockIo.to).toHaveBeenCalledWith('TEST');
      expect(mockIo.emit).toHaveBeenCalledWith('bettingPhaseStarted', expect.any(Object));
    });

    it('should return false for non-existent room', () => {
      const result = bettingPhaseManager.startBettingPhase('NONEXISTENT');

      expect(result).toBe(false);
    });

    it('should set correct maxBet based on player balances', () => {
      bettingPhaseManager.startBettingPhase('TEST');

      expect(mockRoom.gameState?.maxBet).toBe(1000); // Max balance among players
    });

    it('should generate new round ID', () => {
      const originalRoundId = mockRoom.gameState?.roundId;
      bettingPhaseManager.startBettingPhase('TEST');

      expect(mockRoom.gameState?.roundId).not.toBe(originalRoundId);
      expect(mockRoom.gameState?.roundId).toContain('TEST-');
    });
  });

  describe('endBettingPhase', () => {
    beforeEach(() => {
      bettingPhaseManager.startBettingPhase('TEST');
    });

    it('should end betting phase successfully', () => {
      const result = bettingPhaseManager.endBettingPhase('TEST', 'manual');

      expect(result).toBe(true);
      expect(mockRoom.gameState?.bettingTimeLeft).toBe(0);
      expect(mockIo.emit).toHaveBeenCalledWith('bettingPhaseEnded', expect.any(Object));
    });

    it('should return false for non-existent room', () => {
      const result = bettingPhaseManager.endBettingPhase('NONEXISTENT');

      expect(result).toBe(false);
    });

    it('should calculate total pot correctly', () => {
      // Set up players with bets
      mockPlayer1.currentBet = 100;
      mockPlayer2.currentBet = 50;

      bettingPhaseManager.endBettingPhase('TEST');

      expect(mockRoom.gameState?.totalPot).toBe(150);
    });
  });

  describe('betting timer functionality', () => {
    beforeEach(() => {
      bettingPhaseManager.startBettingPhase('TEST');
    });

    it('should countdown betting time correctly', () => {
      expect(mockRoom.gameState?.bettingTimeLeft).toBe(BETTING_CONSTANTS.BETTING_TIME_SECONDS);

      // Advance timer by 1 second
      jest.advanceTimersByTime(1000);

      expect(mockIo.emit).toHaveBeenCalledWith('bettingTimeUpdate', {
        timeLeft: BETTING_CONSTANTS.BETTING_TIME_SECONDS - 1
      });
    });

    it('should end betting phase when timer expires', () => {
      // Mock placeBet to simulate automatic bet placement
      (mockBettingManager.placeBet as jest.Mock).mockResolvedValue({
        success: true,
        newBalance: 975,
        betAmount: 25
      });

      // Advance timer to expiration
      jest.advanceTimersByTime(BETTING_CONSTANTS.BETTING_TIME_SECONDS * 1000);

      expect(mockRoom.gameState?.bettingTimeLeft).toBe(0);
      expect(mockIo.emit).toHaveBeenCalledWith('bettingPhaseEnded', expect.any(Object));
    });

    it('should place automatic minimum bets for players without bets on timeout', async () => {
      // Mock placeBet to simulate automatic bet placement
      (mockBettingManager.placeBet as jest.Mock).mockResolvedValue({
        success: true,
        newBalance: 975,
        betAmount: 25
      });

      // Advance timer to expiration
      jest.advanceTimersByTime(BETTING_CONSTANTS.BETTING_TIME_SECONDS * 1000);

      // Wait for async operations to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockBettingManager.placeBet).toHaveBeenCalledWith('TEST', 'player1', BETTING_CONSTANTS.MIN_BET);
      expect(mockBettingManager.placeBet).toHaveBeenCalledWith('TEST', 'player2', BETTING_CONSTANTS.MIN_BET);
      expect(mockIo.emit).toHaveBeenCalledWith('automaticBetsPlaced', expect.any(Object));
    }, 10000);

    it('should not place automatic bet for players with insufficient balance', async () => {
      // Set player2 balance below minimum bet
      mockPlayer2.balance = 10;

      // Mock placeBet to simulate automatic bet placement for player1 only
      (mockBettingManager.placeBet as jest.Mock).mockResolvedValue({
        success: true,
        newBalance: 975,
        betAmount: 25
      });

      // Advance timer to expiration
      jest.advanceTimersByTime(BETTING_CONSTANTS.BETTING_TIME_SECONDS * 1000);

      // Wait for async operations to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockBettingManager.placeBet).toHaveBeenCalledWith('TEST', 'player1', BETTING_CONSTANTS.MIN_BET);
      expect(mockBettingManager.placeBet).not.toHaveBeenCalledWith('TEST', 'player2', BETTING_CONSTANTS.MIN_BET);
    }, 10000);
  });

  describe('isBettingPhaseComplete', () => {
    beforeEach(() => {
      bettingPhaseManager.startBettingPhase('TEST');
    });

    it('should return true when time expires', () => {
      if (mockRoom.gameState) {
        mockRoom.gameState.bettingTimeLeft = 0;
      }

      const result = bettingPhaseManager.isBettingPhaseComplete('TEST');
      expect(result).toBe(true);
    });

    it('should return true when all players have placed bets', () => {
      mockPlayer1.hasPlacedBet = true;
      mockPlayer2.hasPlacedBet = true;

      const result = bettingPhaseManager.isBettingPhaseComplete('TEST');
      expect(result).toBe(true);
    });

    it('should return false when betting is still active', () => {
      const result = bettingPhaseManager.isBettingPhaseComplete('TEST');
      expect(result).toBe(false);
    });

    it('should return false for non-existent room', () => {
      const result = bettingPhaseManager.isBettingPhaseComplete('NONEXISTENT');
      expect(result).toBe(false);
    });
  });

  describe('areAllPlayersReady', () => {
    it('should return true when all players are ready and have bets', () => {
      mockRoom.playersReady.add('player1');
      mockRoom.playersReady.add('player2');
      mockPlayer1.hasPlacedBet = true;
      mockPlayer2.hasPlacedBet = true;

      const result = bettingPhaseManager.areAllPlayersReady('TEST');
      expect(result).toBe(true);
    });

    it('should return false when not all players are ready', () => {
      mockRoom.playersReady.add('player1');
      mockPlayer1.hasPlacedBet = true;
      mockPlayer2.hasPlacedBet = true;

      const result = bettingPhaseManager.areAllPlayersReady('TEST');
      expect(result).toBe(false);
    });

    it('should return false when not all players have bets', () => {
      mockRoom.playersReady.add('player1');
      mockRoom.playersReady.add('player2');
      mockPlayer1.hasPlacedBet = true;

      const result = bettingPhaseManager.areAllPlayersReady('TEST');
      expect(result).toBe(false);
    });

    it('should return false for non-existent room', () => {
      const result = bettingPhaseManager.areAllPlayersReady('NONEXISTENT');
      expect(result).toBe(false);
    });
  });

  describe('getBettingPhaseStatus', () => {
    beforeEach(() => {
      bettingPhaseManager.startBettingPhase('TEST');
    });

    it('should return correct betting phase status', () => {
      mockPlayer1.hasPlacedBet = true;
      mockPlayer1.currentBet = 100;
      if (mockRoom.gameState) {
        mockRoom.gameState.totalPot = 100;
      }

      const status = bettingPhaseManager.getBettingPhaseStatus('TEST');

      expect(status).toEqual({
        phase: 'betting',
        timeLeft: BETTING_CONSTANTS.BETTING_TIME_SECONDS,
        totalPot: 100,
        playersWithBets: 1,
        totalPlayers: 2
      });
    });

    it('should return null for non-existent room', () => {
      const status = bettingPhaseManager.getBettingPhaseStatus('NONEXISTENT');
      expect(status).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should clear betting timer for room', () => {
      bettingPhaseManager.startBettingPhase('TEST');
      
      // Verify timer is running
      expect(mockRoom.gameState?.bettingTimeLeft).toBe(BETTING_CONSTANTS.BETTING_TIME_SECONDS);
      
      bettingPhaseManager.cleanup('TEST');
      
      // Advance time and verify timer is not running
      jest.advanceTimersByTime(5000);
      expect(mockRoom.gameState?.bettingTimeLeft).toBe(BETTING_CONSTANTS.BETTING_TIME_SECONDS); // Should not have changed
    });
  });

  describe('edge cases', () => {
    it('should handle room without game state', () => {
      mockRoom.gameState = null;
      
      const result = bettingPhaseManager.startBettingPhase('TEST');
      expect(result).toBe(false);
    });

    it('should handle ending betting phase when not in betting phase', () => {
      if (mockRoom.gameState) {
        mockRoom.gameState.phase = 'playing';
      }
      
      const result = bettingPhaseManager.endBettingPhase('TEST');
      expect(result).toBe(false);
    });

    it('should handle no players with bets after timeout', () => {
      // Set both players with insufficient balance
      mockPlayer1.balance = 10;
      mockPlayer2.balance = 5;

      bettingPhaseManager.startBettingPhase('TEST');
      
      // Mock placeBet to fail for insufficient balance
      (mockBettingManager.placeBet as jest.Mock).mockResolvedValue({
        success: false,
        error: { message: 'Insufficient balance' }
      });

      // Advance timer to expiration
      jest.advanceTimersByTime(BETTING_CONSTANTS.BETTING_TIME_SECONDS * 1000);

      expect(mockIo.emit).toHaveBeenCalledWith('noBetsPlaced', expect.any(Object));
    });
  });
});