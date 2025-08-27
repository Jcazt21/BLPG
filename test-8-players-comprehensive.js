const { io } = require('socket.io-client');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Build server URL from environment variables
const HOST = process.env.HOST || 'localhost';
const BACKEND_PORT = process.env.BACKEND_PORT || '5185';
const SERVER_URL = `http://${HOST}:${BACKEND_PORT}`;

class EightPlayersComprehensiveTest {
  constructor() {
    this.players = [];
    this.roomCode = null;
    this.testResults = [];
    this.detailedLogs = [];
    this.allIssues = [];
    this.roundNumber = 0;
    this.totalRounds = 5;
  }

  log(message, type = 'INFO', playerId = null) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const colors = {
      INFO: '\x1b[36m',
      SUCCESS: '\x1b[32m',
      ERROR: '\x1b[31m',
      WARNING: '\x1b[33m',
      REWARD: '\x1b[95m',
      BALANCE: '\x1b[94m',
      ROUND: '\x1b[93m',
      RESET: '\x1b[0m'
    };

    const playerPrefix = playerId ? `[${playerId}] ` : '';
    const logMessage = `${colors[type]}[${timestamp}] ${playerPrefix}${message}${colors.RESET}`;
    console.log(logMessage);

    this.detailedLogs.push({
      timestamp: new Date().toISOString(),
      type,
      playerId,
      message,
      round: this.roundNumber
    });
  }

  async createPlayer(playerName, playerId) {
    this.log(`Attempting to connect ${playerName} to ${SERVER_URL}...`, 'INFO');
    const socket = io(SERVER_URL, {
      autoConnect: false,
      timeout: 5000,
      reconnection: false
    });

    const player = {
      id: playerId,
      name: playerName,
      socket: socket,
      connected: false,
      gameState: null,
      balanceHistory: [],
      currentBalance: 1000,
      currentBet: 0,
      roundResults: [],
      totalWinnings: 0,
      totalLosses: 0,
      gamesWon: 0,
      gamesLost: 0,
      gamesDraw: 0,
      gamesBust: 0,
      gamesBlackjack: 0
    };

    this.setupPlayerEvents(player);
    this.players.push(player);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Connection timeout for ${playerName}`));
      }, 5000);

      player.socket.connect();

      const checkConnection = () => {
        if (player.connected) {
          clearTimeout(timeout);
          this.log(`Connected successfully`, 'SUCCESS', player.name);
          resolve(player);
        } else {
          setTimeout(checkConnection, 50);
        }
      };
      checkConnection();
    });
  }

  setupPlayerEvents(player) {
    const socket = player.socket;

    socket.on('connect', () => {
      player.connected = true;
      this.log(`Socket connected: ${socket.id}`, 'INFO', player.name);
    });

    socket.on('roomCreated', (code) => {
      this.roomCode = code;
      this.log(`Room created: ${code}`, 'SUCCESS', player.name);
    });

    socket.on('roomJoined', (code) => {
      this.log(`Joined room: ${code}`, 'SUCCESS', player.name);
    });

    socket.on('gameStarted', (state) => {
      player.gameState = state;
      this.log(`Game started - Phase: ${state.phase}`, 'INFO', player.name);

      const myPlayer = state.players?.find(p => p.id === socket.id);
      if (myPlayer) {
        player.currentBalance = myPlayer.balance;
        player.currentBet = myPlayer.bet;
        this.log(`Round ${this.roundNumber} - Starting balance: ${myPlayer.balance}`, 'BALANCE', player.name);
      }
    });

    socket.on('gameStateUpdate', (state) => {
      const previousBalance = player.currentBalance;
      const previousBet = player.currentBet;

      player.gameState = state;
      const myPlayer = state.players?.find(p => p.id === socket.id);

      if (myPlayer) {
        const balanceChange = myPlayer.balance - previousBalance;
        const betChange = myPlayer.bet - previousBet;

        player.currentBalance = myPlayer.balance;
        player.currentBet = myPlayer.bet;

        // Log significant balance changes
        if (Math.abs(balanceChange) > 0) {
          this.log(`Balance: ${myPlayer.balance} (${balanceChange >= 0 ? '+' : ''}${balanceChange}), Bet: ${myPlayer.bet}, Phase: ${state.phase}`, 'BALANCE', player.name);
        }

        // Track result phase
        if (state.phase === 'result' && state.results && state.results[socket.id]) {
          const result = state.results[socket.id];

          this.log(`🎯 RESULT: ${result.status} | Bet: ${myPlayer.bet} | Payout: ${result.payout} | Final: ${result.finalBalance}`, 'REWARD', player.name);

          // Update player statistics
          player.roundResults.push({
            round: this.roundNumber,
            bet: myPlayer.bet,
            result: result.status,
            payout: result.payout,
            balanceBefore: previousBalance,
            balanceAfter: myPlayer.balance,
            netChange: result.payout - myPlayer.bet
          });

          // Update counters
          switch (result.status) {
            case 'win':
              player.gamesWon++;
              player.totalWinnings += result.payout;
              break;
            case 'lose':
              player.gamesLost++;
              player.totalLosses += myPlayer.bet;
              break;
            case 'draw':
              player.gamesDraw++;
              break;
            case 'bust':
              player.gamesBust++;
              player.totalLosses += myPlayer.bet;
              break;
            case 'blackjack':
              player.gamesBlackjack++;
              player.totalWinnings += result.payout;
              break;
          }

          // Verify payout calculation
          const expectedPayout = this.calculateExpectedPayout(myPlayer.bet, result.status);
          if (expectedPayout !== result.payout) {
            this.allIssues.push({
              round: this.roundNumber,
              player: player.name,
              issue: 'Payout mismatch',
              expected: expectedPayout,
              actual: result.payout,
              gameResult: result.status
            });
            this.log(`❌ PAYOUT ERROR: Expected ${expectedPayout}, got ${result.payout}`, 'ERROR', player.name);
          }

          // Verify balance calculation
          // Balance was already reduced when bet was placed, so final balance = balance_after_bet + payout
          const balanceAfterBet = previousBalance - myPlayer.bet;
          const expectedBalance = balanceAfterBet + result.payout;
          if (expectedBalance !== myPlayer.balance) {
            this.allIssues.push({
              round: this.roundNumber,
              player: player.name,
              issue: 'Balance calculation error',
              expected: expectedBalance,
              actual: myPlayer.balance,
              gameResult: result.status
            });
            this.log(`❌ BALANCE ERROR: Expected ${expectedBalance}, got ${myPlayer.balance}`, 'ERROR', player.name);
          }
        }
      }
    });

    socket.on('bettingError', (msg) => {
      this.log(`Betting Error: ${msg}`, 'ERROR', player.name);
    });

    socket.on('disconnect', () => {
      player.connected = false;
      this.log(`Disconnected`, 'WARNING', player.name);
    });
  }

  calculateExpectedPayout(bet, status) {
    switch (status) {
      case 'win':
        return bet * 2;
      case 'blackjack':
        return Math.floor(bet * 2.5);
      case 'draw':
        return bet;
      case 'lose':
      case 'bust':
        return 0;
      default:
        return 0;
    }
  }

  async createAllPlayers() {
    this.log('🎮 Creating 8 players...', 'SUCCESS');

    const playerPromises = [];
    for (let i = 1; i <= 8; i++) {
      playerPromises.push(this.createPlayer(`Player${i}`, `p${i}`));
    }

    await Promise.all(playerPromises);
    this.log('✅ All 8 players connected successfully', 'SUCCESS');
  }

  async createRoom() {
    this.log('Creating room...');
    const creator = this.players[0];
    creator.socket.emit('createRoom', creator.name);

    await this.waitFor(() => this.roomCode !== null, 5000);

    if (!this.roomCode) {
      throw new Error('Failed to create room');
    }

    this.log(`Room ${this.roomCode} created successfully`, 'SUCCESS');
  }

  async joinAllPlayers() {
    this.log('All players joining room...');

    for (let i = 1; i < this.players.length; i++) {
      const player = this.players[i];
      player.socket.emit('joinRoom', {
        code: this.roomCode,
        playerName: player.name
      });
      await this.delay(300);
    }

    this.log('✅ All players joined room', 'SUCCESS');
  }

  async startGame() {
    this.log('Starting game...');
    const creator = this.players[0];
    creator.socket.emit('startGameInRoom', this.roomCode);

    await this.waitFor(() =>
      this.players.every(p => p.gameState && p.gameState.phase === 'betting'),
      15000
    );

    this.log('✅ Game started - Betting phase active', 'SUCCESS');
  }

  generateBettingStrategy(player, round) {
    const strategies = [
      // Round 1: Conservative betting
      () => Math.min(50 + (player.id.slice(-1) * 25), player.currentBalance),

      // Round 2: Moderate betting
      () => Math.min(100 + (player.id.slice(-1) * 50), player.currentBalance),

      // Round 3: Aggressive betting
      () => Math.min(200 + (player.id.slice(-1) * 100), player.currentBalance),

      // Round 4: Mixed strategies
      () => {
        const playerId = parseInt(player.id.slice(-1));
        if (playerId <= 2) {
          // All-in for first 2 players
          return player.currentBalance;
        } else if (playerId <= 4) {
          // High bet for next 2 players
          return Math.min(500, player.currentBalance);
        } else if (playerId <= 6) {
          // Medium bet for next 2 players
          return Math.min(250, player.currentBalance);
        } else {
          // Conservative bet for last 2 players
          return Math.min(100, player.currentBalance);
        }
      },

      // Round 5: Final round - varied strategies
      () => {
        const playerId = parseInt(player.id.slice(-1));
        if (playerId % 2 === 0) {
          // Even players go all-in
          return player.currentBalance;
        } else {
          // Odd players bet half their balance
          return Math.floor(player.currentBalance / 2);
        }
      }
    ];

    return strategies[round - 1]();
  }

  async placeBets(round) {
    this.log(`=== ROUND ${round} BETTING PHASE ===`, 'ROUND');

    for (const player of this.players) {
      const betAmount = this.generateBettingStrategy(player, round);

      this.log(`Strategy bet: ${betAmount} (Balance: ${player.currentBalance})`, 'INFO', player.name);

      // Handle all-in case
      if (betAmount >= player.currentBalance) {
        this.log(`Going ALL-IN with ${player.currentBalance}`, 'WARNING', player.name);
        player.socket.emit('allIn', { code: this.roomCode });
      } else {
        // Regular bet
        player.socket.emit('updateBet', {
          code: this.roomCode,
          amount: betAmount
        });

        await this.delay(300);

        player.socket.emit('placeBet', {
          code: this.roomCode,
          amount: betAmount
        });
      }

      await this.delay(500);
    }

    this.log(`=== ROUND ${round} BETS PLACED ===`, 'ROUND');
  }

  async simulateGameplay() {
    this.log('=== SIMULATING GAMEPLAY ===');

    // Wait for dealing phase
    await this.waitFor(() =>
      this.players.some(p => p.gameState && p.gameState.phase === 'dealing'),
      15000
    );

    this.log('Cards being dealt...');

    // Wait for playing phase
    await this.waitFor(() =>
      this.players.some(p => p.gameState && p.gameState.phase === 'playing'),
      15000
    );

    this.log('Playing phase started');

    // Simulate player actions with varied strategies
    let maxActions = 30; // Increased for 8 players
    while (maxActions > 0) {
      const gameState = this.players[0].gameState;
      if (!gameState || gameState.phase !== 'playing') break;

      const currentPlayerIndex = gameState.turn;
      const currentPlayerId = gameState.players[currentPlayerIndex]?.id;
      const currentPlayer = this.players.find(p => p.socket.id === currentPlayerId);

      if (currentPlayer) {
        // Varied action strategies based on player ID
        const playerId = parseInt(currentPlayer.id.slice(-1));
        let action;

        if (playerId <= 2) {
          // Aggressive players - more likely to hit
          action = Math.random() > 0.4 ? 'hit' : 'stand';
        } else if (playerId <= 4) {
          // Moderate players
          action = Math.random() > 0.6 ? 'hit' : 'stand';
        } else if (playerId <= 6) {
          // Conservative players
          action = Math.random() > 0.8 ? 'hit' : 'stand';
        } else {
          // Very conservative players
          action = Math.random() > 0.9 ? 'hit' : 'stand';
        }

        this.log(`Taking action: ${action}`, 'INFO', currentPlayer.name);

        currentPlayer.socket.emit('playerAction', {
          code: this.roomCode,
          action: action
        });

        await this.delay(1000);
      }

      maxActions--;
    }

    // Wait for results
    await this.waitFor(() =>
      this.players.some(p => p.gameState && p.gameState.phase === 'result'),
      20000
    );

    this.log('=== GAMEPLAY COMPLETE ===');
  }

  async runComprehensiveTest() {
    try {
      this.log('🎯 Starting 8-Player 5-Round Comprehensive Test 🎯', 'SUCCESS');

      // Setup
      await this.createAllPlayers();
      await this.createRoom();
      await this.joinAllPlayers();

      // Run 5 rounds
      for (let round = 1; round <= this.totalRounds; round++) {
        this.roundNumber = round;
        this.log(`\n🎲 === STARTING ROUND ${round}/${this.totalRounds} ===`, 'ROUND');

        await this.startGame();
        await this.placeBets(round);
        await this.simulateGameplay();

        // Wait between rounds
        if (round < this.totalRounds) {
          this.log(`Round ${round} complete. Preparing next round...`, 'INFO');
          const creator = this.players[0];
          creator.socket.emit('restartGameInRoom', this.roomCode);
          await this.delay(3000);
        }
      }

      this.generateComprehensiveReport();

    } catch (error) {
      this.log(`Test failed: ${error.message}`, 'ERROR');
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  generateComprehensiveReport() {
    this.log('\n🎯 === COMPREHENSIVE 8-PLAYER TEST REPORT === 🎯', 'SUCCESS');

    // Overall statistics
    let totalBetsPlaced = 0;
    let totalPayouts = 0;
    let totalGamesPlayed = 0;

    const overallResults = {
      wins: 0,
      losses: 0,
      draws: 0,
      busts: 0,
      blackjacks: 0
    };

    this.log(`\n📊 INDIVIDUAL PLAYER ANALYSIS:`);

    for (const player of this.players) {
      const totalBet = player.roundResults.reduce((sum, r) => sum + r.bet, 0);
      const totalPayout = player.roundResults.reduce((sum, r) => sum + r.payout, 0);
      const netResult = totalPayout - totalBet;

      totalBetsPlaced += totalBet;
      totalPayouts += totalPayout;
      totalGamesPlayed += player.roundResults.length;

      overallResults.wins += player.gamesWon;
      overallResults.losses += player.gamesLost;
      overallResults.draws += player.gamesDraw;
      overallResults.busts += player.gamesBust;
      overallResults.blackjacks += player.gamesBlackjack;

      this.log(`\n--- ${player.name} ---`);
      this.log(`  Final Balance: ${player.currentBalance} (Started: 1000)`);
      this.log(`  Net Result: ${netResult >= 0 ? '+' : ''}${netResult} chips`);
      this.log(`  Total Bet: ${totalBet} chips`);
      this.log(`  Total Payout: ${totalPayout} chips`);
      this.log(`  Games: W:${player.gamesWon} L:${player.gamesLost} D:${player.gamesDraw} B:${player.gamesBust} BJ:${player.gamesBlackjack}`);
      this.log(`  Win Rate: ${((player.gamesWon + player.gamesBlackjack) / player.roundResults.length * 100).toFixed(1)}%`);
    }

    this.log(`\n📈 OVERALL STATISTICS:`);
    this.log(`  Total Players: 8`);
    this.log(`  Total Rounds: ${this.totalRounds}`);
    this.log(`  Total Games Played: ${totalGamesPlayed}`);
    this.log(`  Total Bets Placed: ${totalBetsPlaced} chips`);
    this.log(`  Total Payouts: ${totalPayouts} chips`);
    this.log(`  House Edge: ${((totalBetsPlaced - totalPayouts) / totalBetsPlaced * 100).toFixed(2)}%`);

    this.log(`\n🎯 RESULT DISTRIBUTION:`);
    this.log(`  Wins: ${overallResults.wins} (${(overallResults.wins / totalGamesPlayed * 100).toFixed(1)}%)`);
    this.log(`  Losses: ${overallResults.losses} (${(overallResults.losses / totalGamesPlayed * 100).toFixed(1)}%)`);
    this.log(`  Draws: ${overallResults.draws} (${(overallResults.draws / totalGamesPlayed * 100).toFixed(1)}%)`);
    this.log(`  Busts: ${overallResults.busts} (${(overallResults.busts / totalGamesPlayed * 100).toFixed(1)}%)`);
    this.log(`  Blackjacks: ${overallResults.blackjacks} (${(overallResults.blackjacks / totalGamesPlayed * 100).toFixed(1)}%)`);

    this.log(`\n🔍 ISSUES SUMMARY:`);
    this.log(`  Total Issues Found: ${this.allIssues.length}`);

    if (this.allIssues.length === 0) {
      this.log(`  🎉 NO ISSUES FOUND! All systems working perfectly across ${totalGamesPlayed} games.`, 'SUCCESS');
    } else {
      this.log(`  ⚠️ ISSUES DETECTED:`, 'ERROR');
      this.allIssues.forEach((issue, index) => {
        this.log(`    ${index + 1}. Round ${issue.round} - ${issue.player}: ${issue.issue}`, 'ERROR');
        this.log(`       Expected: ${issue.expected}, Actual: ${issue.actual}`, 'ERROR');
        if (issue.gameResult) {
          this.log(`       Game Result: ${issue.gameResult}`, 'ERROR');
        }
      });
    }

    // Save comprehensive logs
    this.saveComprehensiveLogs();

    this.log(`\n🎯 TEST COMPLETE: 8 players, ${this.totalRounds} rounds, ${totalGamesPlayed} total games analyzed.`, 'SUCCESS');
  }

  saveComprehensiveLogs() {
    const fs = require('fs');
    const logData = {
      timestamp: new Date().toISOString(),
      testSummary: {
        players: 8,
        rounds: this.totalRounds,
        totalGames: this.players.reduce((sum, p) => sum + p.roundResults.length, 0),
        issuesFound: this.allIssues.length
      },
      playerResults: this.players.map(p => ({
        name: p.name,
        finalBalance: p.currentBalance,
        roundResults: p.roundResults,
        statistics: {
          gamesWon: p.gamesWon,
          gamesLost: p.gamesLost,
          gamesDraw: p.gamesDraw,
          gamesBust: p.gamesBust,
          gamesBlackjack: p.gamesBlackjack,
          totalWinnings: p.totalWinnings,
          totalLosses: p.totalLosses
        }
      })),
      allIssues: this.allIssues,
      detailedLogs: this.detailedLogs
    };

    const filename = `8-players-test-log-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(logData, null, 2));
    this.log(`📄 Comprehensive logs saved to: ${filename}`, 'INFO');
  }

  async cleanup() {
    this.log('Cleaning up connections...');
    for (const player of this.players) {
      if (player.socket && player.socket.connected) {
        player.socket.disconnect();
      }
    }
    this.players = [];
    this.roomCode = null;
  }

  // Utility functions
  async waitFor(condition, timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (condition()) return true;
      await this.delay(100);
    }
    throw new Error(`Timeout waiting for condition after ${timeout}ms`);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run comprehensive 8-player test
async function runEightPlayersTest() {
  const tester = new EightPlayersComprehensiveTest();

  try {
    await tester.runComprehensiveTest();
  } catch (error) {
    console.error('8-player comprehensive test failed:', error);
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(0);
});

// Start tests
if (require.main === module) {
  runEightPlayersTest();
}

module.exports = EightPlayersComprehensiveTest;