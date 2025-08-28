import { BettingManager } from '../bettingManager';
import {
  MultiplayerPlayer,
  Room,
  MultiplayerGameState,
  BettingErrorType,
  BETTING_CONSTANTS,
  GameResultStatus
} from '../../types';

describe('Betting Validation Functions - Comprehensive Unit Tests', () => {
  let bettingManager: BettingManager;
  let mockRooms: Map<string, Room>;
  let mockPlayer: MultiplayerPlayer;
  let mockRoom: Room;
  let mockGameState: MultiplayerGameState;

  beforeEach(() => {
    // Create mock player with initial balance
    mockPlayer = {
      id: 'player1',
      name: 'Test Player',
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
      totalLosses: 0
    };

    // Create mock game state
    mockGameState = {
      started: true,
      players: [mockPlayer],
      dealer: { hand: [], total: 0, isBust: false, isBlackjack: false },
      deck: [],
      turn: 0,
      phase: 'betting',
      bettingTimeLeft: 30,
      minBet: BETTING_CONSTANTS.MIN_BET,
      maxBet: BETTING_CONSTANTS.INITIAL_BALANCE,
      roundId: 'round1',
      totalPot: 0
    };    
// Create mock room
    mockRoom = {
      sockets: new Set(['socket1']),
      players: new Map([['player1', mockPlayer]]),
      creator: 'player1',
      gameState: mockGameState,
      playersReady: new Set(['player1'])
    };

    // Create rooms map
    mockRooms = new Map([['ROOM1', mockRoom]]);

    // Initialize betting manager
    bettingManager = new BettingManager(mockRooms);
  });

  describe('validateBet - Core Validation Logic', () => {
    describe('Amount Validation', () => {
      it('should validate positive numeric amounts', () => {
        const validAmounts = [25, 50, 100, 250, 500, 1000, 1500, 2000];
        
        validAmounts.forEach(amount => {
          const result = bettingManager.validateBet(mockPlayer, amount, 'ROOM1');
          expect(result.isValid).toBe(true);
          expect(result.error).toBeUndefined();
        });
      });

      it('should reject non-numeric amounts', () => {
        const invalidAmounts = [NaN, undefined, null, 'abc', {}, []];
        
        invalidAmounts.forEach(amount => {
          const result = bettingManager.validateBet(mockPlayer, amount as any, 'ROOM1');
          expect(result.isValid).toBe(false);
          expect(result.error?.type).toBe(BettingErrorType.INVALID_AMOUNT);
          expect(result.error?.message).toContain('valid number');
        });
      });

      it('should reject negative amounts', () => {
        const negativeAmounts = [-1, -25, -100, -1000];
        
        negativeAmounts.forEach(amount => {
          const result = bettingManager.validateBet(mockPlayer, amount, 'ROOM1');
          expect(result.isValid).toBe(false);
          expect(result.error?.type).toBe(BettingErrorType.INVALID_AMOUNT);
          expect(result.error?.message).toContain('greater than 0');
        });
      });

      it('should reject zero amounts', () => {
        const result = bettingManager.validateBet(mockPlayer, 0, 'ROOM1');
        expect(result.isValid).toBe(false);
        expect(result.error?.type).toBe(BettingErrorType.INVALID_AMOUNT);
        expect(result.error?.message).toContain('greater than 0');
      });

      it('should handle infinite values', () => {
        const infiniteValues = [Infinity, -Infinity];
        
        infiniteValues.forEach(value => {
          const result = bettingManager.validateBet(mockPlayer, value, 'ROOM1');
          expect(result.isValid).toBe(false);
          expect(result.error?.type).toBe(BettingErrorType.INVALID_AMOUNT);
        });
      });

      it('should handle very large numbers', () => {
        const largeNumbers = [Number.MAX_VALUE, Number.MAX_SAFE_INTEGER];
        
        largeNumbers.forEach(number => {
          mockPlayer.balance = number;
          const result = bettingManager.validateBet(mockPlayer, number, 'ROOM1');
          expect(result.isValid).toBe(true);
        });
      });

      it('should handle floating point precision', () => {
        const floatAmounts = [25.5, 99.99, 100.01, 250.75];
        
        floatAmounts.forEach(amount => {
          const result = bettingManager.validateBet(mockPlayer, amount, 'ROOM1');
          expect(result.isValid).toBe(true);
        });
      });
    });

    describe('Minimum Bet Validation', () => {
      it('should accept minimum bet amount', () => {
        const result = bettingManager.validateBet(mockPlayer, BETTING_CONSTANTS.MIN_BET, 'ROOM1');
        expect(result.isValid).toBe(true);
      });

      it('should reject amounts below minimum', () => {
        const belowMinAmounts = [1, 10, 20, 24];
        
        belowMinAmounts.forEach(amount => {
          const result = bettingManager.validateBet(mockPlayer, amount, 'ROOM1');
          expect(result.isValid).toBe(false);
          expect(result.error?.type).toBe(BettingErrorType.INVALID_AMOUNT);
          expect(result.error?.message).toContain(`at least ${BETTING_CONSTANTS.MIN_BET}`);
        });
      });

      it('should handle edge case just below minimum', () => {
        const result = bettingManager.validateBet(mockPlayer, BETTING_CONSTANTS.MIN_BET - 0.01, 'ROOM1');
        expect(result.isValid).toBe(false);
        expect(result.error?.type).toBe(BettingErrorType.INVALID_AMOUNT);
      });
    });

    describe('Balance Validation', () => {
      it('should accept bet equal to balance (all-in)', () => {
        const result = bettingManager.validateBet(mockPlayer, mockPlayer.balance, 'ROOM1');
        expect(result.isValid).toBe(true);
      });

      it('should reject bet exceeding balance', () => {
        const excessiveAmounts = [
          mockPlayer.balance + 1,
          mockPlayer.balance + 100,
          mockPlayer.balance * 2
        ];
        
        excessiveAmounts.forEach(amount => {
          const result = bettingManager.validateBet(mockPlayer, amount, 'ROOM1');
          expect(result.isValid).toBe(false);
          expect(result.error?.type).toBe(BettingErrorType.INSUFFICIENT_BALANCE);
          expect(result.error?.message).toContain('Insufficient balance');
        });
      });

      it('should handle zero balance scenarios', () => {
        mockPlayer.balance = 0;
        const result = bettingManager.validateBet(mockPlayer, BETTING_CONSTANTS.MIN_BET, 'ROOM1');
        expect(result.isValid).toBe(false);
        expect(result.error?.type).toBe(BettingErrorType.INSUFFICIENT_BALANCE);
      });

      it('should handle low balance scenarios', () => {
        mockPlayer.balance = 10; // Below minimum bet
        const result = bettingManager.validateBet(mockPlayer, BETTING_CONSTANTS.MIN_BET, 'ROOM1');
        expect(result.isValid).toBe(false);
        expect(result.error?.type).toBe(BettingErrorType.INSUFFICIENT_BALANCE);
      });

      it('should validate with existing bet consideration', () => {
        mockPlayer.currentBet = 100;
        mockPlayer.balance = 1900; // Total available: 2000
        
        // Should be able to bet up to total available
        const result1 = bettingManager.validateBet(mockPlayer, 2000, 'ROOM1');
        expect(result1.isValid).toBe(true);
        
        // Should not be able to exceed total available
        const result2 = bettingManager.validateBet(mockPlayer, 2001, 'ROOM1');
        expect(result2.isValid).toBe(false);
      });
    });
  });

  describe('Game State Validation', () => {
    it('should validate betting phase is active', () => {
      mockGameState.phase = 'betting';
      const result = bettingManager.validateBet(mockPlayer, 100, 'ROOM1');
      expect(result.isValid).toBe(true);
    });

    it('should reject bets when not in betting phase', () => {
      const nonBettingPhases = ['dealing', 'playing', 'dealer', 'result'];
      
      nonBettingPhases.forEach(phase => {
        mockGameState.phase = phase as any;
        const result = bettingManager.validateBet(mockPlayer, 100, 'ROOM1');
        expect(result.isValid).toBe(false);
        expect(result.error?.type).toBe(BettingErrorType.BETTING_CLOSED);
      });
    });

    it('should handle missing game state', () => {
      mockRoom.gameState = null;
      const result = bettingManager.validateBet(mockPlayer, 100, 'ROOM1');
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe(BettingErrorType.BETTING_CLOSED);
    });

    it('should validate room existence', () => {
      const result = bettingManager.validateBet(mockPlayer, 100, 'NONEXISTENT');
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe(BettingErrorType.ROOM_NOT_FOUND);
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle concurrent validation calls', () => {
      const promises = Array.from({ length: 10 }, () => 
        Promise.resolve(bettingManager.validateBet(mockPlayer, 100, 'ROOM1'))
      );
      
      return Promise.all(promises).then(results => {
        results.forEach(result => {
          expect(result.isValid).toBe(true);
        });
      });
    });

    it('should provide detailed error messages', () => {
      const testCases = [
        {
          amount: -50,
          expectedMessage: 'Bet amount must be greater than 0'
        },
        {
          amount: 10,
          expectedMessage: `Bet amount must be at least ${BETTING_CONSTANTS.MIN_BET} chips`
        },
        {
          amount: 5000,
          expectedMessage: 'Insufficient balance'
        }
      ];

      testCases.forEach(({ amount, expectedMessage }) => {
        const result = bettingManager.validateBet(mockPlayer, amount, 'ROOM1');
        expect(result.isValid).toBe(false);
        expect(result.error?.message).toContain(expectedMessage);
      });
    });

    it('should handle player state mutations during validation', () => {
      const originalBalance = mockPlayer.balance;
      
      // Simulate balance change during validation
      const result = bettingManager.validateBet(mockPlayer, 100, 'ROOM1');
      mockPlayer.balance = 0; // Change balance after validation
      
      expect(result.isValid).toBe(true); // Should still be valid based on original state
      
      // Restore balance
      mockPlayer.balance = originalBalance;
    });

    it('should validate with different player configurations', () => {
      const playerConfigs = [
        { balance: 25, currentBet: 0, hasPlacedBet: false },
        { balance: 1000, currentBet: 100, hasPlacedBet: true },
        { balance: 50000, currentBet: 0, hasPlacedBet: false },
        { balance: 100, currentBet: 75, hasPlacedBet: true }
      ];

      playerConfigs.forEach(config => {
        Object.assign(mockPlayer, config);
        const result = bettingManager.validateBet(mockPlayer, BETTING_CONSTANTS.MIN_BET, 'ROOM1');
        
        if (config.balance >= BETTING_CONSTANTS.MIN_BET) {
          expect(result.isValid).toBe(true);
        } else {
          expect(result.isValid).toBe(false);
          expect(result.error?.type).toBe(BettingErrorType.INSUFFICIENT_BALANCE);
        }
      });
    });
  });

  describe('Performance and Stress Testing', () => {
    it('should handle rapid validation calls efficiently', () => {
      const startTime = Date.now();
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        bettingManager.validateBet(mockPlayer, 100, 'ROOM1');
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete 1000 validations in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should maintain validation accuracy under stress', () => {
      const validAmounts = [25, 50, 100, 250, 500];
      const invalidAmounts = [-25, 0, 5000, NaN];
      
      // Run multiple iterations
      for (let i = 0; i < 100; i++) {
        validAmounts.forEach(amount => {
          const result = bettingManager.validateBet(mockPlayer, amount, 'ROOM1');
          expect(result.isValid).toBe(true);
        });
        
        invalidAmounts.forEach(amount => {
          const result = bettingManager.validateBet(mockPlayer, amount, 'ROOM1');
          expect(result.isValid).toBe(false);
        });
      }
    });
  });
});