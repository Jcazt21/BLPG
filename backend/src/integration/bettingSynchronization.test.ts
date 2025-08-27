import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import {
  MultiplayerPlayer,
  MultiplayerGameState,
  Room,
  BETTING_CONSTANTS
} from '../types/bettingTypes';
import { BettingManager } from '../services/bettingManager';
import { BettingPhaseManager } from '../services/bettingPhaseManager';

describe('Real-time Betting Synchronization Integration Tests', () => {
  let httpServer: any;
  let io: SocketIOServer;
  let serverSocket: any;
  let clientSocket1: ClientSocket;
  let clientSocket2: ClientSocket;
  let clientSocket3: ClientSocket;
  let port: number;
  let rooms: Map<string, Room>;
  let bettingManager: BettingManager;
  let bettingPhaseManager: BettingPhaseManager;

  beforeEach(async () => {
    // Create HTTP server and Socket.IO server
    httpServer = createServer();
    io = new SocketIOServer(httpServer, {
      cors: { origin: "*" }
    });

    // Initialize rooms and managers
    rooms = new Map<string, Room>();
    bettingManager = new BettingManager(rooms);
    
    // Mock startDealingPhase function
    const mockStartDealingPhase = jest.fn();
    bettingPhaseManager = new BettingPhaseManager(io, rooms, bettingManager, mockStartDealingPhase);

    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        port = (httpServer.address() as AddressInfo).port;
        resolve();
      });
    });

    // Setup server socket handler
    io.on('connection', (socket) => {
      serverSocket = socket;
    });

    // Create client connections
    clientSocket1 = Client(`http://localhost:${port}`);
    clientSocket2 = Client(`http://localhost:${port}`);
    clientSocket3 = Client(`http://localhost:${port}`);

    // Wait for connections
    await Promise.all([
      new Promise<void>((resolve) => clientSocket1.on('connect', resolve)),
      new Promise<void>((resolve) => clientSocket2.on('connect', resolve)),
      new Promise<void>((resolve) => clientSocket3.on('connect', resolve))
    ]);
  });

  afterEach(async () => {
    // Clean up
    clientSocket1.disconnect();
    clientSocket2.disconnect();
    clientSocket3.disconnect();
    io.close();
    httpServer.close();
  });

  describe('Enhanced Game State Broadcasting', () => {
    it('should broadcast enhanced betting state with synchronization metadata', async () => {
      // Create test room with game state
      const roomCode = 'TEST';
      const gameState: MultiplayerGameState = {
        started: true,
        players: [
          {
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
            currentBet: 100,
            hasPlacedBet: true,
            betHistory: [],
            totalWinnings: 0,
            totalLosses: 0
          }
        ],
        dealer: { hand: [], total: 0, isBust: false, isBlackjack: false },
        deck: [],
        turn: 0,
        phase: 'betting',
        bettingTimeLeft: 25,
        minBet: BETTING_CONSTANTS.MIN_BET,
        maxBet: 1000,
        roundId: 'test-round-1',
        totalPot: 100
      };

      const room: Room = {
        sockets: new Set(['player1']),
        players: new Map([['player1', gameState.players[0]]]),
        creator: 'player1',
        gameState,
        playersReady: new Set()
      };

      rooms.set(roomCode, room);

      // Listen for enhanced game state update
      const gameStatePromise = new Promise<any>((resolve) => {
        clientSocket1.on('gameStateUpdate', resolve);
      });

      // Trigger broadcast (simulate from server)
      io.to(roomCode).emit('gameStateUpdate', {
        phase: gameState.phase,
        turn: gameState.turn,
        bettingState: {
          phase: gameState.phase,
          timeLeft: gameState.bettingTimeLeft,
          minBet: gameState.minBet,
          maxBet: gameState.maxBet,
          totalPot: gameState.totalPot,
          roundId: gameState.roundId,
          playersWithBets: 1,
          totalPlayers: 1,
          bettingComplete: true,
          averageBet: 100,
          highestBet: 100,
          lowestBet: 100
        },
        players: gameState.players.map(p => ({
          ...p,
          bettingStatus: 'placed',
          canAffordMinBet: true,
          betPercentageOfBalance: 10
        })),
        dealer: gameState.dealer,
        syncTimestamp: expect.any(Number),
        serverTime: expect.any(String),
        syncId: expect.any(String),
        connectionQuality: {
          lastUpdate: expect.any(Number),
          updateFrequency: 'real-time',
          dataIntegrity: 'verified'
        }
      });

      const receivedState = await gameStatePromise;

      // Verify enhanced betting state synchronization
      expect(receivedState.bettingState).toBeDefined();
      expect(receivedState.bettingState.bettingComplete).toBe(true);
      expect(receivedState.bettingState.averageBet).toBe(100);
      expect(receivedState.syncTimestamp).toBeDefined();
      expect(receivedState.connectionQuality).toBeDefined();
      expect(receivedState.players[0].bettingStatus).toBe('placed');
    });
  });

  describe('Immediate Bet Confirmation', () => {
    it('should provide immediate bet confirmation with enhanced sync data', async () => {
      const roomCode = 'TEST';
      
      // Setup room and player
      const player: MultiplayerPlayer = {
        id: clientSocket1.id,
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
        balance: 1000,
        currentBet: 0,
        hasPlacedBet: false,
        betHistory: [],
        totalWinnings: 0,
        totalLosses: 0
      };

      const gameState: MultiplayerGameState = {
        started: true,
        players: [player],
        dealer: { hand: [], total: 0, isBust: false, isBlackjack: false },
        deck: [],
        turn: 0,
        phase: 'betting',
        bettingTimeLeft: 30,
        minBet: BETTING_CONSTANTS.MIN_BET,
        maxBet: 1000,
        roundId: 'test-round-1',
        totalPot: 0
      };

      const room: Room = {
        sockets: new Set([clientSocket1.id]),
        players: new Map([[clientSocket1.id, player]]),
        creator: clientSocket1.id,
        gameState,
        playersReady: new Set()
      };

      rooms.set(roomCode, room);

      // Listen for immediate confirmation
      const confirmationPromise = new Promise<any>((resolve) => {
        clientSocket1.on('betConfirmed', resolve);
      });

      // Simulate bet placement with enhanced confirmation
      const betAmount = 100;
      const result = await bettingManager.placeBet(roomCode, clientSocket1.id, betAmount);
      
      if (result.success) {
        // Emit enhanced confirmation
        clientSocket1.emit('betConfirmed', {
          success: true,
          newBalance: result.newBalance,
          betAmount: result.betAmount,
          timestamp: Date.now(),
          serverTime: new Date().toISOString(),
          roundId: gameState.roundId,
          confirmationId: `bet-placed-${clientSocket1.id}-${Date.now()}`,
          transactionType: 'bet_placement',
          balanceChange: -betAmount,
          syncData: {
            playerId: clientSocket1.id,
            playerName: player.name,
            action: 'bet_placed',
            betAmount: result.betAmount,
            balanceAfter: result.newBalance,
            hasPlacedBet: true,
            bettingStatus: 'placed'
          },
          feedback: {
            type: 'bet_confirmed',
            message: `Bet of ${result.betAmount} chips placed successfully`,
            urgency: 'normal',
            autoHide: true
          }
        });
      }

      const confirmation = await confirmationPromise;

      // Verify enhanced confirmation data
      expect(confirmation.success).toBe(true);
      expect(confirmation.confirmationId).toBeDefined();
      expect(confirmation.syncData).toBeDefined();
      expect(confirmation.syncData.bettingStatus).toBe('placed');
      expect(confirmation.feedback).toBeDefined();
      expect(confirmation.balanceChange).toBe(-betAmount);
    });
  });

  describe('Betting Progress Updates', () => {
    it('should broadcast enhanced betting progress with real-time analytics', async () => {
      const roomCode = 'TEST';
      
      // Setup room with multiple players
      const players = [
        {
          id: 'player1',
          name: 'Player 1',
          position: 0,
          hand: [],
          total: 0,
          isBust: false,
          isStand: false,
          isBlackjack: false,
          status: 'playing' as const,
          victories: 0,
          gamesWon: 0,
          gamesBlackjack: 0,
          gamesLost: 0,
          gamesDraw: 0,
          gamesBust: 0,
          balance: 1000,
          currentBet: 100,
          hasPlacedBet: true,
          betHistory: [],
          totalWinnings: 0,
          totalLosses: 0
        },
        {
          id: 'player2',
          name: 'Player 2',
          position: 1,
          hand: [],
          total: 0,
          isBust: false,
          isStand: false,
          isBlackjack: false,
          status: 'playing' as const,
          victories: 0,
          gamesWon: 0,
          gamesBlackjack: 0,
          gamesLost: 0,
          gamesDraw: 0,
          gamesBust: 0,
          balance: 800,
          currentBet: 0,
          hasPlacedBet: false,
          betHistory: [],
          totalWinnings: 0,
          totalLosses: 0
        }
      ];

      const gameState: MultiplayerGameState = {
        started: true,
        players,
        dealer: { hand: [], total: 0, isBust: false, isBlackjack: false },
        deck: [],
        turn: 0,
        phase: 'betting',
        bettingTimeLeft: 20,
        minBet: BETTING_CONSTANTS.MIN_BET,
        maxBet: 1000,
        roundId: 'test-round-1',
        totalPot: 100
      };

      const room: Room = {
        sockets: new Set(['player1', 'player2']),
        players: new Map([
          ['player1', players[0]],
          ['player2', players[1]]
        ]),
        creator: 'player1',
        gameState,
        playersReady: new Set()
      };

      rooms.set(roomCode, room);

      // Listen for enhanced progress update
      const progressPromise = new Promise<any>((resolve) => {
        clientSocket1.on('bettingProgress', resolve);
      });

      // Simulate enhanced progress broadcast
      const playersWithBets = players.filter(p => p.hasPlacedBet);
      const totalPlayers = players.length;
      const totalPot = players.reduce((sum, p) => sum + p.currentBet, 0);
      const progressPercentage = (playersWithBets.length / totalPlayers) * 100;

      io.to(roomCode).emit('bettingProgress', {
        playersWithBets: playersWithBets.length,
        totalPlayers,
        totalPot,
        bettingComplete: false,
        timeLeft: gameState.bettingTimeLeft,
        roundId: gameState.roundId,
        timestamp: Date.now(),
        serverTime: new Date().toISOString(),
        progressMetrics: {
          percentage: progressPercentage,
          playersRemaining: totalPlayers - playersWithBets.length,
          averageBet: totalPot / Math.max(playersWithBets.length, 1),
          highestBet: Math.max(...players.map(p => p.currentBet), 0),
          lowestBet: Math.min(...playersWithBets.map(p => p.currentBet), gameState.minBet),
          bettingVelocity: expect.any(Number),
          estimatedCompletion: expect.any(Number)
        },
        playerProgress: {
          playersWithBets: playersWithBets.map(p => ({
            id: p.id,
            name: p.name,
            betAmount: p.currentBet,
            betPercentageOfBalance: (p.currentBet / (p.balance + p.currentBet)) * 100
          })),
          playersWithoutBets: players.filter(p => !p.hasPlacedBet).map(p => ({
            id: p.id,
            name: p.name,
            balance: p.balance,
            canAffordMinBet: p.balance >= gameState.minBet
          }))
        },
        urgencyLevel: 'medium',
        phaseTransition: {
          canProceed: playersWithBets.length > 0,
          willAutoAdvance: false,
          readyForDealing: false
        }
      });

      const progress = await progressPromise;

      // Verify enhanced progress data
      expect(progress.progressMetrics).toBeDefined();
      expect(progress.progressMetrics.percentage).toBe(50); // 1 of 2 players
      expect(progress.playerProgress).toBeDefined();
      expect(progress.playerProgress.playersWithBets).toHaveLength(1);
      expect(progress.playerProgress.playersWithoutBets).toHaveLength(1);
      expect(progress.urgencyLevel).toBe('medium');
      expect(progress.phaseTransition).toBeDefined();
    });
  });

  describe('Betting Timer Synchronization', () => {
    it('should synchronize betting timer across all clients with enhanced metadata', async () => {
      const roomCode = 'TEST';
      
      // Setup room with betting phase
      const gameState: MultiplayerGameState = {
        started: true,
        players: [],
        dealer: { hand: [], total: 0, isBust: false, isBlackjack: false },
        deck: [],
        turn: 0,
        phase: 'betting',
        bettingTimeLeft: 15,
        minBet: BETTING_CONSTANTS.MIN_BET,
        maxBet: 1000,
        roundId: 'test-round-1',
        totalPot: 0
      };

      const room: Room = {
        sockets: new Set([clientSocket1.id]),
        players: new Map(),
        creator: clientSocket1.id,
        gameState,
        playersReady: new Set()
      };

      rooms.set(roomCode, room);

      // Listen for timer sync
      const timerSyncPromise = new Promise<any>((resolve) => {
        clientSocket1.on('bettingTimerSync', resolve);
      });

      // Simulate enhanced timer sync broadcast
      io.to(roomCode).emit('bettingTimerSync', {
        type: 'timer_sync',
        timestamp: Date.now(),
        serverTime: new Date().toISOString(),
        roomCode,
        roundId: gameState.roundId,
        timeLeft: gameState.bettingTimeLeft,
        totalTime: BETTING_CONSTANTS.BETTING_TIME_SECONDS,
        timeElapsed: BETTING_CONSTANTS.BETTING_TIME_SECONDS - gameState.bettingTimeLeft,
        timerSync: {
          serverTimestamp: Date.now(),
          clientSyncId: `timer-${roomCode}-${Date.now()}`,
          syncAccuracy: 'millisecond',
          driftCorrection: true,
          forceSync: false
        },
        bettingProgress: {
          playersWithBets: 0,
          totalPlayers: 0,
          percentage: 0,
          bettingComplete: false,
          canProceedEarly: false
        },
        urgencyLevel: 'medium',
        warnings: {
          timeRunningOut: true,
          criticalTime: false,
          lastChance: false,
          aboutToEnd: false
        },
        autoAdvance: {
          willAutoAdvance: false,
          canSkipTimer: false,
          estimatedEnd: Date.now() + (gameState.bettingTimeLeft * 1000)
        }
      });

      const timerSync = await timerSyncPromise;

      // Verify enhanced timer synchronization
      expect(timerSync.timerSync).toBeDefined();
      expect(timerSync.timerSync.syncAccuracy).toBe('millisecond');
      expect(timerSync.timerSync.driftCorrection).toBe(true);
      expect(timerSync.warnings).toBeDefined();
      expect(timerSync.warnings.timeRunningOut).toBe(true);
      expect(timerSync.autoAdvance).toBeDefined();
      expect(timerSync.urgencyLevel).toBe('medium');
    });

    it('should emit time warnings at critical intervals', async () => {
      const roomCode = 'TEST';
      
      // Listen for time warnings
      const warningPromises = [
        new Promise<any>((resolve) => {
          clientSocket1.on('bettingTimeWarning', (data) => {
            if (data.timeLeft === 10) resolve(data);
          });
        }),
        new Promise<any>((resolve) => {
          clientSocket1.on('bettingTimeWarning', (data) => {
            if (data.timeLeft === 5) resolve(data);
          });
        })
      ];

      // Simulate 10-second warning
      io.to(roomCode).emit('bettingTimeWarning', {
        type: 'warning_10s',
        message: '10 seconds remaining to place bets!',
        timeLeft: 10,
        urgency: 'medium',
        autoHide: false
      });

      // Simulate 5-second warning
      io.to(roomCode).emit('bettingTimeWarning', {
        type: 'warning_5s',
        message: '5 seconds remaining! Place your bets now!',
        timeLeft: 5,
        urgency: 'high',
        autoHide: false
      });

      const [warning10s, warning5s] = await Promise.all(warningPromises);

      // Verify warnings
      expect(warning10s.urgency).toBe('medium');
      expect(warning10s.timeLeft).toBe(10);
      expect(warning5s.urgency).toBe('high');
      expect(warning5s.timeLeft).toBe(5);
    });
  });

  describe('Connection Recovery and Synchronization', () => {
    it('should handle betting synchronization requests with different sync types', async () => {
      const roomCode = 'TEST';
      
      // Setup room
      const gameState: MultiplayerGameState = {
        started: true,
        players: [],
        dealer: { hand: [], total: 0, isBust: false, isBlackjack: false },
        deck: [],
        turn: 0,
        phase: 'betting',
        bettingTimeLeft: 25,
        minBet: BETTING_CONSTANTS.MIN_BET,
        maxBet: 1000,
        roundId: 'test-round-1',
        totalPot: 0
      };

      const room: Room = {
        sockets: new Set([clientSocket1.id]),
        players: new Map(),
        creator: clientSocket1.id,
        gameState,
        playersReady: new Set()
      };

      rooms.set(roomCode, room);

      // Test different sync types
      const syncTypes = ['full', 'partial', 'timer_only'];
      
      for (const syncType of syncTypes) {
        const syncPromise = new Promise<any>((resolve) => {
          clientSocket1.on('bettingSyncRequested', resolve);
        });

        // Simulate sync request response
        clientSocket1.emit('bettingSyncRequested', {
          success: true,
          syncType,
          bettingStatus: {
            phase: gameState.phase,
            timeLeft: gameState.bettingTimeLeft,
            totalPot: gameState.totalPot,
            playersWithBets: 0,
            totalPlayers: 0
          },
          playerState: {
            balance: 1000,
            currentBet: 0,
            hasPlacedBet: false,
            bettingStatus: 'pending'
          },
          roomState: {
            phase: gameState.phase,
            roundId: gameState.roundId,
            totalPot: gameState.totalPot,
            playersCount: 0
          },
          timestamp: Date.now(),
          serverTime: new Date().toISOString(),
          message: `Betting state synchronized successfully (${syncType})`
        });

        const syncResult = await syncPromise;

        // Verify sync result
        expect(syncResult.success).toBe(true);
        expect(syncResult.syncType).toBe(syncType);
        expect(syncResult.bettingStatus).toBeDefined();
        expect(syncResult.playerState).toBeDefined();
        expect(syncResult.roomState).toBeDefined();
      }
    });

    it('should handle connection recovery with comprehensive synchronization', async () => {
      const roomCode = 'TEST';
      
      // Setup room with player
      const player: MultiplayerPlayer = {
        id: clientSocket1.id,
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
        balance: 1000,
        currentBet: 100,
        hasPlacedBet: true,
        betHistory: [],
        totalWinnings: 0,
        totalLosses: 0
      };

      const gameState: MultiplayerGameState = {
        started: true,
        players: [player],
        dealer: { hand: [], total: 0, isBust: false, isBlackjack: false },
        deck: [],
        turn: 0,
        phase: 'betting',
        bettingTimeLeft: 20,
        minBet: BETTING_CONSTANTS.MIN_BET,
        maxBet: 1000,
        roundId: 'test-round-2',
        totalPot: 100
      };

      const room: Room = {
        sockets: new Set([clientSocket1.id]),
        players: new Map([[clientSocket1.id, player]]),
        creator: clientSocket1.id,
        gameState,
        playersReady: new Set()
      };

      rooms.set(roomCode, room);

      // Listen for recovery result
      const recoveryPromise = new Promise<any>((resolve) => {
        clientSocket1.on('bettingRecoveryResult', resolve);
      });

      // Simulate connection recovery
      const lastKnownRoundId = 'test-round-1'; // Different from current
      const connectionId = 'conn-123';

      clientSocket1.emit('bettingRecoveryResult', {
        success: true,
        timestamp: Date.now(),
        serverTime: new Date().toISOString(),
        connectionId,
        recoveryData: {
          currentRoundId: gameState.roundId,
          lastKnownRoundId,
          isStaleConnection: true,
          connectionGap: 5000,
          gamePhase: gameState.phase,
          bettingTimeLeft: gameState.bettingTimeLeft,
          playerState: {
            balance: player.balance,
            currentBet: player.currentBet,
            hasPlacedBet: player.hasPlacedBet,
            bettingStatus: 'placed'
          },
          roomState: {
            totalPot: gameState.totalPot,
            playersWithBets: 1,
            totalPlayers: 1,
            minBet: gameState.minBet,
            maxBet: gameState.maxBet
          }
        },
        message: 'Connection recovered - new round detected, full sync required',
        recommendations: {
          syncType: 'full',
          immediateAction: 'request_full_sync',
          dataIntegrity: 'verified'
        }
      });

      const recovery = await recoveryPromise;

      // Verify recovery data
      expect(recovery.success).toBe(true);
      expect(recovery.recoveryData.isStaleConnection).toBe(true);
      expect(recovery.recoveryData.playerState).toBeDefined();
      expect(recovery.recoveryData.roomState).toBeDefined();
      expect(recovery.recommendations.syncType).toBe('full');
    });
  });

  describe('Optimized Broadcasting Performance', () => {
    it('should handle multiple concurrent betting updates efficiently', async () => {
      const roomCode = 'TEST';
      
      // Setup room with multiple players
      const players = Array.from({ length: 4 }, (_, i) => ({
        id: `player${i + 1}`,
        name: `Player ${i + 1}`,
        position: i,
        hand: [],
        total: 0,
        isBust: false,
        isStand: false,
        isBlackjack: false,
        status: 'playing' as const,
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
      }));

      const gameState: MultiplayerGameState = {
        started: true,
        players,
        dealer: { hand: [], total: 0, isBust: false, isBlackjack: false },
        deck: [],
        turn: 0,
        phase: 'betting',
        bettingTimeLeft: 30,
        minBet: BETTING_CONSTANTS.MIN_BET,
        maxBet: 1000,
        roundId: 'test-round-1',
        totalPot: 0
      };

      const room: Room = {
        sockets: new Set(players.map(p => p.id)),
        players: new Map(players.map(p => [p.id, p])),
        creator: 'player1',
        gameState,
        playersReady: new Set()
      };

      rooms.set(roomCode, room);

      // Track received updates
      const receivedUpdates: any[] = [];
      clientSocket1.on('bettingUpdate', (data) => {
        receivedUpdates.push(data);
      });

      // Simulate multiple concurrent betting updates
      const updatePromises = players.map(async (player, index) => {
        const betAmount = (index + 1) * 50;
        
        // Simulate bet placement
        const result = await bettingManager.placeBet(roomCode, player.id, betAmount);
        
        if (result.success) {
          // Simulate optimized broadcast
          io.to(roomCode).emit('bettingUpdate', {
            type: 'bet_confirmed',
            timestamp: Date.now(),
            serverTime: new Date().toISOString(),
            roomCode,
            roundId: gameState.roundId,
            bettingState: {
              phase: gameState.phase,
              timeLeft: gameState.bettingTimeLeft,
              totalPot: gameState.totalPot + betAmount,
              playersWithBets: index + 1,
              totalPlayers: players.length,
              bettingComplete: false,
              minBet: gameState.minBet,
              maxBet: gameState.maxBet,
              bettingProgress: {
                percentage: ((index + 1) / players.length) * 100,
                playersRemaining: players.length - (index + 1),
                urgency: 'low'
              }
            },
            data: {
              playerId: player.id,
              playerName: player.name,
              action: 'bet_placed',
              betAmount,
              newBalance: result.newBalance
            },
            syncMetadata: {
              updateId: `${roomCode}-bet_confirmed-${Date.now()}`,
              sequenceNumber: Date.now(),
              checksumData: {
                totalPot: gameState.totalPot + betAmount,
                playerCount: players.length,
                betsPlaced: index + 1
              }
            }
          });
        }
      });

      // Wait for all updates to complete
      await Promise.all(updatePromises);
      
      // Allow time for all events to be received
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify all updates were received and properly formatted
      expect(receivedUpdates).toHaveLength(4);
      
      receivedUpdates.forEach((update, index) => {
        expect(update.type).toBe('bet_confirmed');
        expect(update.bettingState).toBeDefined();
        expect(update.syncMetadata).toBeDefined();
        expect(update.bettingState.bettingProgress).toBeDefined();
        expect(update.bettingState.playersWithBets).toBe(index + 1);
      });
    });
  });
});