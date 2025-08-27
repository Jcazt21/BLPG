import { BettingManager } from '../services/bettingManager';
import { 
  MultiplayerPlayer, 
  Room, 
  GameResultStatus, 
  BETTING_CONSTANTS,
  MultiplayerGameState 
} from '../types/bettingTypes';

describe('Payout Integration Tests', () => {
  let bettingManager: BettingManager;
  let rooms: Map<string, Room>;

  beforeEach(() => {
    rooms = new Map();
    bettingManager = new BettingManager(rooms);

    // Setup a room with multiple players
    const room: Room = {
      sockets: new Set(['player1', 'player2', 'player3']),
      players: new Map([
        ['player1', createTestPlayer('player1', 'Alice', 0)],
        ['player2', createTestPlayer('player2', 'Bob', 1)],
        ['player3', createTestPlayer('player3', 'Charlie', 2)]
      ]),
      creator: 'player1',
      gameState: {
        started: true,
        players: [],
        dealer: { hand: [], total: 0, isBust: false, isBlackjack: false },
        deck: [],
        turn: 0,
        phase: 'betting', // Set to betting phase to allow bets
        bettingTimeLeft: BETTING_CONSTANTS.BETTING_TIME_SECONDS,
        minBet: BETTING_CONSTANTS.MIN_BET,
        maxBet: BETTING_CONSTANTS.INITIAL_BALANCE,
        roundId: 'test-round-1',
        totalPot: 0,
      },
      playersReady: new Set(),
    };
    rooms.set('TEST_ROOM', room);

    // Initialize all players with starting balance
    bettingManager.initializePlayerBalance('player1', 'TEST_ROOM');
    bettingManager.initializePlayerBalance('player2', 'TEST_ROOM');
    bettingManager.initializePlayerBalance('player3', 'TEST_ROOM');
  });

  function createTestPlayer(id: string, name: string, position: number): MultiplayerPlayer {
    return {
      id,
      name,
      position,
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
  }

  it('should handle complete betting and payout cycle', async () => {
    // Phase 1: Players place bets
    await bettingManager.placeBet('TEST_ROOM', 'player1', 100);
    await bettingManager.placeBet('TEST_ROOM', 'player2', 250);
    await bettingManager.placeBet('TEST_ROOM', 'player3', 500);

    const room = rooms.get('TEST_ROOM')!;
    
    // Verify bets are placed correctly
    expect(room.players.get('player1')!.currentBet).toBe(100);
    expect(room.players.get('player1')!.balance).toBe(1900);
    expect(room.players.get('player2')!.currentBet).toBe(250);
    expect(room.players.get('player2')!.balance).toBe(1750);
    expect(room.players.get('player3')!.currentBet).toBe(500);
    expect(room.players.get('player3')!.balance).toBe(1500);

    // Phase 2: Game results (mixed outcomes)
    const gameResults = {
      'player1': 'blackjack' as GameResultStatus, // Should get 2.5x payout
      'player2': 'win' as GameResultStatus,       // Should get 2x payout
      'player3': 'lose' as GameResultStatus       // Should get 0 payout
    };

    // Phase 3: Process payouts
    const payoutResults = await bettingManager.processPayouts('TEST_ROOM', gameResults);

    // Verify payout calculations
    expect(payoutResults['player1'].payoutAmount).toBe(250); // Math.floor(100 * 2.5)
    expect(payoutResults['player2'].payoutAmount).toBe(500); // 250 * 2
    expect(payoutResults['player3'].payoutAmount).toBe(0);   // 0 for loss

    // Verify final balances
    expect(payoutResults['player1'].finalBalance).toBe(2150); // 1900 + 250
    expect(payoutResults['player2'].finalBalance).toBe(2250); // 1750 + 500
    expect(payoutResults['player3'].finalBalance).toBe(1500); // 1500 + 0

    // Verify player statistics are updated
    const player1 = room.players.get('player1')!;
    const player2 = room.players.get('player2')!;
    const player3 = room.players.get('player3')!;

    expect(player1.totalWinnings).toBe(150); // 250 payout - 100 bet
    expect(player2.totalWinnings).toBe(250); // 500 payout - 250 bet
    expect(player3.totalLosses).toBe(500);   // Lost the entire bet

    // Phase 4: Reset for next round
    bettingManager.resetPlayerBets('TEST_ROOM');

    // Verify bets are cleared but balances remain
    expect(player1.currentBet).toBe(0);
    expect(player1.hasPlacedBet).toBe(false);
    expect(player1.balance).toBe(2150); // Balance preserved

    expect(player2.currentBet).toBe(0);
    expect(player2.hasPlacedBet).toBe(false);
    expect(player2.balance).toBe(2250); // Balance preserved

    expect(player3.currentBet).toBe(0);
    expect(player3.hasPlacedBet).toBe(false);
    expect(player3.balance).toBe(1500); // Balance preserved
  });

  it('should handle edge case with all players having same result', async () => {
    // All players place different bet amounts
    await bettingManager.placeBet('TEST_ROOM', 'player1', 50);
    await bettingManager.placeBet('TEST_ROOM', 'player2', 100);
    await bettingManager.placeBet('TEST_ROOM', 'player3', 200);

    // All players get blackjack
    const gameResults = {
      'player1': 'blackjack' as GameResultStatus,
      'player2': 'blackjack' as GameResultStatus,
      'player3': 'blackjack' as GameResultStatus
    };

    const payoutResults = await bettingManager.processPayouts('TEST_ROOM', gameResults);

    // Verify all payouts are calculated correctly
    expect(payoutResults['player1'].payoutAmount).toBe(125); // Math.floor(50 * 2.5)
    expect(payoutResults['player2'].payoutAmount).toBe(250); // Math.floor(100 * 2.5)
    expect(payoutResults['player3'].payoutAmount).toBe(500); // Math.floor(200 * 2.5)

    // Verify all players have positive winnings
    const room = rooms.get('TEST_ROOM')!;
    expect(room.players.get('player1')!.totalWinnings).toBe(75);  // 125 - 50
    expect(room.players.get('player2')!.totalWinnings).toBe(150); // 250 - 100
    expect(room.players.get('player3')!.totalWinnings).toBe(300); // 500 - 200
  });

  it('should handle draw scenarios correctly', async () => {
    await bettingManager.placeBet('TEST_ROOM', 'player1', 100);

    const gameResults = {
      'player1': 'draw' as GameResultStatus
    };

    const payoutResults = await bettingManager.processPayouts('TEST_ROOM', gameResults);

    // Draw should return original bet (1:1)
    expect(payoutResults['player1'].payoutAmount).toBe(100);
    expect(payoutResults['player1'].finalBalance).toBe(2000); // Back to original balance

    // No winnings or losses for draw
    const player1 = rooms.get('TEST_ROOM')!.players.get('player1')!;
    expect(player1.totalWinnings).toBe(0);
    expect(player1.totalLosses).toBe(0);
  });
});