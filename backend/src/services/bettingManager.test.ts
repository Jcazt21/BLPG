import { BettingManager } from './bettingManager';
import {
  MultiplayerPlayer,
  Room,
  MultiplayerGameState,
  BettingErrorType,
  BETTING_CONSTANTS,
  GameResultStatus
} from '../types';

describe('BettingManager', () => {
  let bettingManager: BettingManager;
  let mockRooms: Map<string, Room>;
  let mockPlayer: MultiplayerPlayer;
  let mockRoom: Room;
  let mockGameState: MultiplayerGameState;

  beforeEach(() => {
    // Create mock player with updated initial balance (2000 chips as per requirement 1.1)
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
      balance: BETTING_CONSTANTS.INITIAL_BALANCE, // Use constant for consistency
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

  describe('validateBet', () => {
    it('should validate a correct bet amount', () => {
      const result = bettingManager.validateBet(mockPlayer, 100, 'ROOM1');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-numeric bet amounts', () => {
      const result = bettingManager.validateBet(mockPlayer, NaN, 'ROOM1');
      
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe(BettingErrorType.INVALID_AMOUNT);
      expect(result.error?.message).toContain('valid number');
    });

    it('should reject negative bet amounts', () => {
      const result = bettingManager.validateBet(mockPlayer, -50, 'ROOM1');
      
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe(BettingErrorType.INVALID_AMOUNT);
      expect(result.error?.message).toContain('greater than 0');
    });

    it('should reject zero bet amounts', () => {
      const result = bettingManager.validateBet(mockPlayer, 0, 'ROOM1');
      
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe(BettingErrorType.INVALID_AMOUNT);
      expect(result.error?.message).toContain('greater than 0');
    });

    it('should reject bet amounts below minimum', () => {
      const result = bettingManager.validateBet(mockPlayer, 10, 'ROOM1');
      
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe(BettingErrorType.INVALID_AMOUNT);
      expect(result.error?.message).toContain(`at least ${BETTING_CONSTANTS.MIN_BET}`);
    });

    it('should reject bet amounts exceeding player balance', () => {
      const result = bettingManager.validateBet(mockPlayer, 2500, 'ROOM1');
      
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe(BettingErrorType.INSUFFICIENT_BALANCE);
      expect(result.error?.message).toContain('Insufficient balance');
    });

    it('should accept bet equal to player balance (all-in)', () => {
      const result = bettingManager.validateBet(mockPlayer, BETTING_CONSTANTS.INITIAL_BALANCE, 'ROOM1');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept minimum bet amount', () => {
      const result = bettingManager.validateBet(mockPlayer, BETTING_CONSTANTS.MIN_BET, 'ROOM1');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle infinite values', () => {
      const result = bettingManager.validateBet(mockPlayer, Infinity, 'ROOM1');
      
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe(BettingErrorType.INVALID_AMOUNT);
    });
  });

  describe('placeBet', () => {
    it('should successfully place a valid bet', async () => {
      const result = await bettingManager.placeBet('ROOM1', 'player1', 100);
      
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(1900); // 2000 - 100
      expect(result.betAmount).toBe(100);
      expect(result.error).toBeUndefined();
      expect(mockPlayer.currentBet).toBe(100);
      expect(mockPlayer.hasPlacedBet).toBe(true);
    });

    it('should fail when room does not exist', async () => {
      const result = await bettingManager.placeBet('NONEXISTENT', 'player1', 100);
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(BettingErrorType.ROOM_NOT_FOUND);
    });

    it('should fail when player does not exist', async () => {
      const result = await bettingManager.placeBet('ROOM1', 'nonexistent', 100);
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(BettingErrorType.PLAYER_NOT_FOUND);
    });

    it('should fail when betting phase is not active', async () => {
      mockGameState.phase = 'playing';
      
      const result = await bettingManager.placeBet('ROOM1', 'player1', 100);
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(BettingErrorType.BETTING_CLOSED);
    });

    it('should update existing bet correctly', async () => {
      // Place initial bet
      await bettingManager.placeBet('ROOM1', 'player1', 100);
      expect(mockPlayer.balance).toBe(1900);
      expect(mockPlayer.currentBet).toBe(100);
      
      // Update bet to higher amount
      const result = await bettingManager.placeBet('ROOM1', 'player1', 200);
      
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(1800); // 2000 - 200
      expect(result.betAmount).toBe(200);
      expect(mockPlayer.currentBet).toBe(200);
    });

    it('should handle insufficient balance for bet update', async () => {
      // Place initial bet
      await bettingManager.placeBet('ROOM1', 'player1', 1800);
      
      // Try to update to amount exceeding remaining balance + current bet
      const result = await bettingManager.placeBet('ROOM1', 'player1', 2100);
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(BettingErrorType.INSUFFICIENT_BALANCE);
    });
  });

  describe('calculatePayout', () => {
    it('should calculate standard win payout (2:1)', () => {
      const payout = bettingManager.calculatePayout(100, 'win');
      expect(payout).toBe(200);
    });

    it('should calculate blackjack payout (2.5:1 rounded down)', () => {
      const payout = bettingManager.calculatePayout(100, 'blackjack');
      expect(payout).toBe(250);
      
      // Test rounding down
      const payoutOdd = bettingManager.calculatePayout(101, 'blackjack');
      expect(payoutOdd).toBe(252); // Math.floor(101 * 2.5) = 252
    });

    it('should calculate draw payout (1:1)', () => {
      const payout = bettingManager.calculatePayout(100, 'draw');
      expect(payout).toBe(100);
    });

    it('should calculate loss payout (0)', () => {
      const payout = bettingManager.calculatePayout(100, 'lose');
      expect(payout).toBe(0);
    });

    it('should calculate bust payout (0)', () => {
      const payout = bettingManager.calculatePayout(100, 'bust');
      expect(payout).toBe(0);
    });

    it('should return 0 for invalid bet amounts', () => {
      expect(bettingManager.calculatePayout(0, 'win')).toBe(0);
      expect(bettingManager.calculatePayout(-100, 'win')).toBe(0);
    });
  });

  describe('processPayouts', () => {
    beforeEach(() => {
      // Set up players with bets
      mockPlayer.currentBet = 100;
      mockPlayer.hasPlacedBet = true;
      mockPlayer.balance = 1900; // After placing 100 bet from 2000 initial balance
    });

    it('should process payouts for winning player', async () => {
      const results = { 'player1': 'win' as GameResultStatus };
      
      const payoutResults = await bettingManager.processPayouts('ROOM1', results);
      
      expect(payoutResults['player1']).toEqual({
        playerId: 'player1',
        betAmount: 100,
        gameResult: 'win',
        payoutMultiplier: 2,
        payoutAmount: 200,
        finalBalance: 2100, // 1900 + 200
        isValid: true,
        errors: undefined
      });
      expect(mockPlayer.balance).toBe(2100);
    });

    it('should process payouts for blackjack player', async () => {
      const results = { 'player1': 'blackjack' as GameResultStatus };
      
      const payoutResults = await bettingManager.processPayouts('ROOM1', results);
      
      expect(payoutResults['player1']).toEqual({
        playerId: 'player1',
        betAmount: 100,
        gameResult: 'blackjack',
        payoutMultiplier: 2.5,
        payoutAmount: 250,
        finalBalance: 2150, // 1900 + 250
        isValid: true,
        errors: undefined
      });
    });

    it('should process payouts for losing player', async () => {
      const results = { 'player1': 'lose' as GameResultStatus };
      
      const payoutResults = await bettingManager.processPayouts('ROOM1', results);
      
      expect(payoutResults['player1']).toEqual({
        playerId: 'player1',
        betAmount: 100,
        gameResult: 'lose',
        payoutMultiplier: 0,
        payoutAmount: 0,
        finalBalance: 1900, // No change
        isValid: true,
        errors: undefined
      });
      expect(mockPlayer.balance).toBe(1900);
    });

    it('should handle nonexistent room', async () => {
      const results = { 'player1': 'win' as GameResultStatus };
      
      const payoutResults = await bettingManager.processPayouts('NONEXISTENT', results);
      
      expect(payoutResults).toEqual({});
    });

    it('should handle nonexistent player', async () => {
      const results = { 'nonexistent': 'win' as GameResultStatus };
      
      const payoutResults = await bettingManager.processPayouts('ROOM1', results);
      
      expect(payoutResults['nonexistent']).toEqual({
        playerId: 'nonexistent',
        betAmount: 0,
        gameResult: 'win',
        payoutMultiplier: 0,
        payoutAmount: 0,
        finalBalance: 0,
        isValid: false,
        errors: ['Player not found']
      });
    });
  });

  describe('updateBalance', () => {
    it('should add to player balance', () => {
      const success = bettingManager.updateBalance('player1', 500, 'add', 'ROOM1');
      
      expect(success).toBe(true);
      expect(mockPlayer.balance).toBe(2500);
    });

    it('should subtract from player balance', () => {
      const success = bettingManager.updateBalance('player1', 300, 'subtract', 'ROOM1');
      
      expect(success).toBe(true);
      expect(mockPlayer.balance).toBe(1700);
    });

    it('should fail to subtract more than available balance', () => {
      const success = bettingManager.updateBalance('player1', 2500, 'subtract', 'ROOM1');
      
      expect(success).toBe(false);
      expect(mockPlayer.balance).toBe(2000); // Unchanged
    });

    it('should fail for nonexistent room', () => {
      const success = bettingManager.updateBalance('player1', 100, 'add', 'NONEXISTENT');
      
      expect(success).toBe(false);
    });

    it('should fail for nonexistent player', () => {
      const success = bettingManager.updateBalance('nonexistent', 100, 'add', 'ROOM1');
      
      expect(success).toBe(false);
    });

    it('should fail for invalid amounts', () => {
      expect(bettingManager.updateBalance('player1', -100, 'add', 'ROOM1')).toBe(false);
      expect(bettingManager.updateBalance('player1', NaN, 'add', 'ROOM1')).toBe(false);
    });
  });

  describe('getPlayerBalance', () => {
    it('should return player balance', () => {
      const balance = bettingManager.getPlayerBalance('player1', 'ROOM1');
      expect(balance).toBe(2000);
    });

    it('should return 0 for nonexistent room', () => {
      const balance = bettingManager.getPlayerBalance('player1', 'NONEXISTENT');
      expect(balance).toBe(0);
    });

    it('should return 0 for nonexistent player', () => {
      const balance = bettingManager.getPlayerBalance('nonexistent', 'ROOM1');
      expect(balance).toBe(0);
    });
  });

  describe('resetPlayerBets', () => {
    beforeEach(() => {
      mockPlayer.currentBet = 100;
      mockPlayer.hasPlacedBet = true;
      mockGameState.totalPot = 100;
    });

    it('should reset all player bets in room', () => {
      bettingManager.resetPlayerBets('ROOM1');
      
      expect(mockPlayer.currentBet).toBe(0);
      expect(mockPlayer.hasPlacedBet).toBe(false);
      expect(mockGameState.totalPot).toBe(0);
    });

    it('should handle nonexistent room gracefully', () => {
      expect(() => bettingManager.resetPlayerBets('NONEXISTENT')).not.toThrow();
    });

    it('should handle room without game state', () => {
      mockRoom.gameState = null;
      
      expect(() => bettingManager.resetPlayerBets('ROOM1')).not.toThrow();
      expect(mockPlayer.currentBet).toBe(0);
      expect(mockPlayer.hasPlacedBet).toBe(false);
    });
  });

  describe('Balance Management System', () => {
    describe('initializePlayerBalance', () => {
      it('should initialize player balance with default amount', () => {
        // Reset player balance to test initialization
        mockPlayer.balance = 0;
        mockPlayer.currentBet = 50;
        mockPlayer.hasPlacedBet = true;
        mockPlayer.betHistory = [{ roundId: 'test', amount: 50, result: 'win', payout: 100, timestamp: Date.now() }];
        mockPlayer.totalWinnings = 100;
        mockPlayer.totalLosses = 50;

        const success = bettingManager.initializePlayerBalance('player1', 'ROOM1');

        expect(success).toBe(true);
        expect(mockPlayer.balance).toBe(BETTING_CONSTANTS.INITIAL_BALANCE);
        expect(mockPlayer.currentBet).toBe(0);
        expect(mockPlayer.hasPlacedBet).toBe(false);
        expect(mockPlayer.betHistory).toEqual([]);
        expect(mockPlayer.totalWinnings).toBe(0);
        expect(mockPlayer.totalLosses).toBe(0);
      });

      it('should initialize player balance with custom amount', () => {
        const customAmount = 5000;
        const success = bettingManager.initializePlayerBalance('player1', 'ROOM1', customAmount);

        expect(success).toBe(true);
        expect(mockPlayer.balance).toBe(customAmount);
      });

      it('should fail for nonexistent room', () => {
        const success = bettingManager.initializePlayerBalance('player1', 'NONEXISTENT');
        expect(success).toBe(false);
      });

      it('should fail for nonexistent player', () => {
        const success = bettingManager.initializePlayerBalance('nonexistent', 'ROOM1');
        expect(success).toBe(false);
      });

      it('should fail for invalid amounts', () => {
        expect(bettingManager.initializePlayerBalance('player1', 'ROOM1', -100)).toBe(false);
        expect(bettingManager.initializePlayerBalance('player1', 'ROOM1', NaN)).toBe(false);
      });
    });

    describe('restoreBalanceFromBet', () => {
      beforeEach(() => {
        mockPlayer.balance = 1900;
        mockPlayer.currentBet = 100;
        mockPlayer.hasPlacedBet = true;
      });

      it('should restore balance from current bet', () => {
        const success = bettingManager.restoreBalanceFromBet('player1', 'ROOM1');

        expect(success).toBe(true);
        expect(mockPlayer.balance).toBe(2000); // 1900 + 100
        expect(mockPlayer.currentBet).toBe(0);
        expect(mockPlayer.hasPlacedBet).toBe(false);
      });

      it('should handle player with no bet gracefully', () => {
        mockPlayer.currentBet = 0;
        mockPlayer.hasPlacedBet = false;

        const success = bettingManager.restoreBalanceFromBet('player1', 'ROOM1');

        expect(success).toBe(true);
        expect(mockPlayer.balance).toBe(1900); // Unchanged
      });

      it('should fail for nonexistent room', () => {
        const success = bettingManager.restoreBalanceFromBet('player1', 'NONEXISTENT');
        expect(success).toBe(false);
      });

      it('should fail for nonexistent player', () => {
        const success = bettingManager.restoreBalanceFromBet('nonexistent', 'ROOM1');
        expect(success).toBe(false);
      });
    });

    describe('clearPlayerBet', () => {
      beforeEach(() => {
        mockPlayer.balance = 1900;
        mockPlayer.currentBet = 100;
        mockPlayer.hasPlacedBet = true;
      });

      it('should clear player bet and restore balance', () => {
        const success = bettingManager.clearPlayerBet('player1', 'ROOM1');

        expect(success).toBe(true);
        expect(mockPlayer.balance).toBe(2000);
        expect(mockPlayer.currentBet).toBe(0);
        expect(mockPlayer.hasPlacedBet).toBe(false);
      });
    });

    describe('persistBalancesBetweenRounds', () => {
      beforeEach(() => {
        mockPlayer.balance = 1500;
        mockPlayer.currentBet = 200;
        mockPlayer.hasPlacedBet = true;
        mockPlayer.totalWinnings = 300;
        mockPlayer.totalLosses = 100;
        mockPlayer.betHistory = [
          { roundId: 'round1', amount: 100, result: 'win', payout: 200, timestamp: Date.now() }
        ];
      });

      it('should preserve balances and statistics between rounds', () => {
        const success = bettingManager.persistBalancesBetweenRounds('ROOM1');

        expect(success).toBe(true);
        // Balance and statistics should be preserved
        expect(mockPlayer.balance).toBe(1500);
        expect(mockPlayer.totalWinnings).toBe(300);
        expect(mockPlayer.totalLosses).toBe(100);
        expect(mockPlayer.betHistory).toHaveLength(1);
        
        // Betting state should be reset
        expect(mockPlayer.currentBet).toBe(0);
        expect(mockPlayer.hasPlacedBet).toBe(false);
      });

      it('should handle multiple players correctly', () => {
        // Add second player
        const player2: MultiplayerPlayer = {
          ...mockPlayer,
          id: 'player2',
          name: 'Player 2',
          balance: 1800,
          currentBet: 150,
          hasPlacedBet: true,
          totalWinnings: 200,
          totalLosses: 50
        };
        mockRoom.players.set('player2', player2);

        const success = bettingManager.persistBalancesBetweenRounds('ROOM1');

        expect(success).toBe(true);
        
        // Check both players
        expect(mockPlayer.balance).toBe(1500);
        expect(mockPlayer.currentBet).toBe(0);
        expect(mockPlayer.hasPlacedBet).toBe(false);
        
        expect(player2.balance).toBe(1800);
        expect(player2.currentBet).toBe(0);
        expect(player2.hasPlacedBet).toBe(false);
        expect(player2.totalWinnings).toBe(200);
        expect(player2.totalLosses).toBe(50);
      });

      it('should fail for nonexistent room', () => {
        const success = bettingManager.persistBalancesBetweenRounds('NONEXISTENT');
        expect(success).toBe(false);
      });
    });

    describe('Enhanced updateBalance with transaction logging', () => {
      it('should log transactions with proper metadata', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        const success = bettingManager.updateBalance('player1', 100, 'subtract', 'ROOM1', 'bet', 'round123');
        
        expect(success).toBe(true);
        expect(consoleSpy).toHaveBeenCalledWith('Balance Transaction:', expect.objectContaining({
          playerId: 'player1',
          roomCode: 'ROOM1',
          type: 'bet',
          amount: 100,
          balanceBefore: 2000,
          balanceAfter: 1900,
          roundId: 'round123'
        }));
        
        consoleSpy.mockRestore();
      });

      it('should handle different transaction types', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        // Test payout transaction
        bettingManager.updateBalance('player1', 200, 'add', 'ROOM1', 'payout', 'round123');
        
        expect(consoleSpy).toHaveBeenCalledWith('Balance Transaction:', expect.objectContaining({
          type: 'payout',
          amount: 200,
          balanceBefore: 2000,
          balanceAfter: 2200
        }));
        
        consoleSpy.mockRestore();
      });

      it('should generate round ID when not provided', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        bettingManager.updateBalance('player1', 50, 'subtract', 'ROOM1', 'bet');
        
        expect(consoleSpy).toHaveBeenCalledWith('Balance Transaction:', expect.objectContaining({
          roundId: expect.stringMatching(/^round-\d+$/)
        }));
        
        consoleSpy.mockRestore();
      });
    });

    describe('Balance consistency and atomicity', () => {
      it('should maintain balance consistency during bet updates', async () => {
        // Place initial bet
        await bettingManager.placeBet('ROOM1', 'player1', 500);
        expect(mockPlayer.balance).toBe(1500);
        expect(mockPlayer.currentBet).toBe(500);

        // Update bet - should restore previous bet and deduct new amount
        await bettingManager.placeBet('ROOM1', 'player1', 300);
        expect(mockPlayer.balance).toBe(1700); // 2000 - 300
        expect(mockPlayer.currentBet).toBe(300);
      });

      it('should handle balance restoration failure gracefully', async () => {
        // Mock a scenario where balance restoration fails
        mockPlayer.balance = 1900;
        mockPlayer.currentBet = 100;
        mockPlayer.hasPlacedBet = true;

        // Temporarily break the updateBalance method for restoration
        const originalUpdateBalance = bettingManager.updateBalance.bind(bettingManager);
        let callCount = 0;
        bettingManager.updateBalance = jest.fn().mockImplementation((playerId: string, amount: number, operation: 'add' | 'subtract', roomCode: string, transactionType?: 'bet' | 'payout' | 'refund' | 'initial', roundId?: string) => {
          callCount++;
          if (callCount === 1) {
            // First call (restoration) fails
            return false;
          }
          // Subsequent calls use original method
          return originalUpdateBalance(playerId, amount, operation, roomCode, transactionType, roundId);
        });

        const result = await bettingManager.placeBet('ROOM1', 'player1', 200);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Failed to restore previous bet');
        
        // Restore original method
        bettingManager.updateBalance = originalUpdateBalance;
      });

      it('should prevent negative balances', () => {
        mockPlayer.balance = 100;
        
        const success = bettingManager.updateBalance('player1', 150, 'subtract', 'ROOM1');
        
        expect(success).toBe(false);
        expect(mockPlayer.balance).toBe(100); // Unchanged
      });

      it('should handle concurrent balance operations', () => {
        const initialBalance = mockPlayer.balance;
        
        // Simulate concurrent operations
        const results = [
          bettingManager.updateBalance('player1', 100, 'subtract', 'ROOM1'),
          bettingManager.updateBalance('player1', 50, 'add', 'ROOM1'),
          bettingManager.updateBalance('player1', 25, 'subtract', 'ROOM1')
        ];
        
        expect(results.every(r => r === true)).toBe(true);
        expect(mockPlayer.balance).toBe(initialBalance - 100 + 50 - 25); // 1925
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent bet placements', async () => {
      // Simulate concurrent bets
      const promises = [
        bettingManager.placeBet('ROOM1', 'player1', 100),
        bettingManager.placeBet('ROOM1', 'player1', 200)
      ];
      
      const results = await Promise.all(promises);
      
      // Both should succeed but the second one should update the first
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(mockPlayer.currentBet).toBe(200);
    });

    it('should handle very large bet amounts', () => {
      mockPlayer.balance = Number.MAX_SAFE_INTEGER;
      const result = bettingManager.validateBet(mockPlayer, Number.MAX_SAFE_INTEGER, 'ROOM1');
      
      expect(result.isValid).toBe(true);
    });

    it('should handle floating point bet amounts', () => {
      const result = bettingManager.validateBet(mockPlayer, 99.99, 'ROOM1');
      
      expect(result.isValid).toBe(true);
    });

    it('should maintain balance precision with floating point operations', () => {
      mockPlayer.balance = 100.50;
      const success = bettingManager.updateBalance('player1', 50.25, 'subtract', 'ROOM1');
      
      expect(success).toBe(true);
      expect(mockPlayer.balance).toBeCloseTo(50.25, 2);
    });
  });
});