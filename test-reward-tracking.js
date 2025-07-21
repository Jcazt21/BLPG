const { io } = require('socket.io-client');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Build server URL from environment variables
const HOST = process.env.HOST || 'localhost';
const BACKEND_PORT = process.env.BACKEND_PORT || '5185';
const SERVER_URL = `http://${HOST}:${BACKEND_PORT}`;

class RewardTrackingTester {
  constructor() {
    this.players = [];
    this.roomCode = null;
    this.testResults = [];
    this.detailedLogs = [];
    this.rewardIssues = [];
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
      RESET: '\x1b[0m'
    };
    
    const playerPrefix = playerId ? `[${playerId}] ` : '';
    const logMessage = `${colors[type]}[${timestamp}] ${playerPrefix}${message}${colors.RESET}`;
    console.log(logMessage);
    
    this.detailedLogs.push({
      timestamp: new Date().toISOString(),
      type,
      playerId,
      message
    });
  }

  async createPlayer(playerName) {
    const socket = io(SERVER_URL, { 
      autoConnect: false,
      timeout: 3000,
      reconnection: false
    });
    
    const player = {
      name: playerName,
      socket: socket,
      connected: false,
      gameState: null,
      balanceTracking: {
        initial: 1000,
        current: 1000,
        bet: 0,
        expectedAfterBet: 1000,
        expectedAfterResult: 1000,
        actualAfterResult: 1000,
        rewardReceived: 0,
        rewardExpected: 0
      },
      events: []
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
      
      // Reset balance tracking for new game
      const myPlayer = state.players?.find(p => p.id === socket.id);
      if (myPlayer) {
        player.balanceTracking.current = myPlayer.balance;
        player.balanceTracking.initial = myPlayer.balance;
        this.log(`Initial balance set to: ${myPlayer.balance}`, 'BALANCE', player.name);
      }
    });

    socket.on('gameStateUpdate', (state) => {
      const previousBalance = player.balanceTracking.current;
      const previousBet = player.balanceTracking.bet;
      
      player.gameState = state;
      const myPlayer = state.players?.find(p => p.id === socket.id);
      
      if (myPlayer) {
        const balanceChange = myPlayer.balance - previousBalance;
        const betChange = myPlayer.bet - previousBet;
        
        // Update tracking
        player.balanceTracking.current = myPlayer.balance;
        player.balanceTracking.bet = myPlayer.bet;
        
        // Log balance changes
        if (balanceChange !== 0 || betChange !== 0) {
          this.log(`BALANCE UPDATE: Balance: ${myPlayer.balance} (${balanceChange >= 0 ? '+' : ''}${balanceChange}), Bet: ${myPlayer.bet} (${betChange >= 0 ? '+' : ''}${betChange}), Phase: ${state.phase}`, 'BALANCE', player.name);
        }
        
        // Track betting phase
        if (state.phase === 'betting' && betChange !== 0) {
          player.balanceTracking.expectedAfterBet = player.balanceTracking.initial - myPlayer.bet;
          this.log(`BET PLACED: Expected balance after bet: ${player.balanceTracking.expectedAfterBet}, Actual: ${myPlayer.balance}`, 'BALANCE', player.name);
          
          if (myPlayer.balance !== player.balanceTracking.expectedAfterBet) {
            this.rewardIssues.push({
              player: player.name,
              issue: 'Balance mismatch after betting',
              expected: player.balanceTracking.expectedAfterBet,
              actual: myPlayer.balance,
              phase: 'betting'
            });
          }
        }
        
        // Track result phase - THIS IS THE CRITICAL PART
        if (state.phase === 'result' && state.results && state.results[socket.id]) {
          const result = state.results[socket.id];
          
          this.log(`🎯 GAME RESULT: ${result.status}`, 'REWARD', player.name);
          this.log(`💰 PAYOUT INFO: Bet: ${myPlayer.bet}, Payout: ${result.payout}, Final Balance: ${result.finalBalance}`, 'REWARD', player.name);
          
          // Calculate expected reward
          player.balanceTracking.rewardExpected = this.calculateExpectedPayout(myPlayer.bet, result.status);
          player.balanceTracking.rewardReceived = result.payout;
          player.balanceTracking.expectedAfterResult = player.balanceTracking.expectedAfterBet + result.payout;
          player.balanceTracking.actualAfterResult = myPlayer.balance;
          
          this.log(`📊 REWARD ANALYSIS:`, 'REWARD', player.name);
          this.log(`   Expected Payout: ${player.balanceTracking.rewardExpected}`, 'REWARD', player.name);
          this.log(`   Actual Payout: ${player.balanceTracking.rewardReceived}`, 'REWARD', player.name);
          this.log(`   Expected Final Balance: ${player.balanceTracking.expectedAfterResult}`, 'REWARD', player.name);
          this.log(`   Actual Final Balance: ${player.balanceTracking.actualAfterResult}`, 'REWARD', player.name);
          
          // Check for payout issues
          if (player.balanceTracking.rewardExpected !== player.balanceTracking.rewardReceived) {
            this.rewardIssues.push({
              player: player.name,
              issue: 'Payout amount mismatch',
              expected: player.balanceTracking.rewardExpected,
              actual: player.balanceTracking.rewardReceived,
              phase: 'result',
              gameResult: result.status
            });
            this.log(`❌ PAYOUT MISMATCH!`, 'ERROR', player.name);
          }
          
          // Check for balance issues
          if (player.balanceTracking.expectedAfterResult !== player.balanceTracking.actualAfterResult) {
            this.rewardIssues.push({
              player: player.name,
              issue: 'Final balance mismatch',
              expected: player.balanceTracking.expectedAfterResult,
              actual: player.balanceTracking.actualAfterResult,
              phase: 'result',
              gameResult: result.status
            });
            this.log(`❌ BALANCE MISMATCH AFTER RESULT!`, 'ERROR', player.name);
          }
          
          if (player.balanceTracking.rewardExpected === player.balanceTracking.rewardReceived && 
              player.balanceTracking.expectedAfterResult === player.balanceTracking.actualAfterResult) {
            this.log(`✅ REWARD SYSTEM WORKING CORRECTLY`, 'SUCCESS', player.name);
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
        return bet * 2; // Return bet + winnings
      case 'blackjack':
        return Math.floor(bet * 2.5); // 3:2 payout for blackjack
      case 'draw':
        return bet; // Return bet only
      case 'lose':
      case 'bust':
        return 0; // Lose bet
      default:
        return 0;
    }
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
      await this.delay(500);
    }

    this.log('All players joined room', 'SUCCESS');
  }

  async startGame() {
    this.log('Starting game...');
    const creator = this.players[0];
    creator.socket.emit('startGameInRoom', this.roomCode);
    
    await this.waitFor(() => 
      this.players.every(p => p.gameState && p.gameState.phase === 'betting'), 
      10000
    );

    this.log('Game started - Betting phase active', 'SUCCESS');
  }

  async placeBets(bets) {
    this.log('=== PLACING BETS ===');
    
    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      const betAmount = bets[i] || 100;
      
      this.log(`Placing bet: ${betAmount}`, 'INFO', player.name);
      
      // Update bet
      player.socket.emit('updateBet', { 
        code: this.roomCode, 
        amount: betAmount 
      });
      
      await this.delay(500);
      
      // Place bet
      player.socket.emit('placeBet', { 
        code: this.roomCode, 
        amount: betAmount 
      });
      
      await this.delay(1000);
    }

    this.log('=== BETS PLACED ===');
  }

  async simulateGameplay() {
    this.log('=== SIMULATING GAMEPLAY ===');
    
    // Wait for dealing phase
    await this.waitFor(() => 
      this.players.some(p => p.gameState && p.gameState.phase === 'dealing'), 
      10000
    );
    
    this.log('Cards being dealt...');
    
    // Wait for playing phase
    await this.waitFor(() => 
      this.players.some(p => p.gameState && p.gameState.phase === 'playing'), 
      10000
    );

    this.log('Playing phase started');

    // Simulate player actions
    let maxActions = 15;
    while (maxActions > 0) {
      const gameState = this.players[0].gameState;
      if (!gameState || gameState.phase !== 'playing') break;
      
      const currentPlayerIndex = gameState.turn;
      const currentPlayerId = gameState.players[currentPlayerIndex]?.id;
      const currentPlayer = this.players.find(p => p.socket.id === currentPlayerId);
      
      if (currentPlayer) {
        const action = Math.random() > 0.7 ? 'stand' : 'hit';
        this.log(`Taking action: ${action}`, 'INFO', currentPlayer.name);
        
        currentPlayer.socket.emit('playerAction', {
          code: this.roomCode,
          action: action
        });
        
        await this.delay(1500);
      }
      
      maxActions--;
    }

    // Wait for results
    await this.waitFor(() => 
      this.players.some(p => p.gameState && p.gameState.phase === 'result'), 
      15000
    );

    this.log('=== GAMEPLAY COMPLETE ===');
  }

  async runRewardTest() {
    try {
      this.log('🎯 Starting Reward Tracking Test 🎯', 'SUCCESS');
      
      // Create players
      await Promise.all([
        this.createPlayer('RewardPlayer1'),
        this.createPlayer('RewardPlayer2')
      ]);
      
      // Setup game
      await this.createRoom();
      await this.joinAllPlayers();
      await this.startGame();
      
      // Test scenario
      await this.placeBets([150, 300]);
      await this.simulateGameplay();
      
      // Wait a bit for all events to process
      await this.delay(2000);
      
      this.generateRewardReport();
      
    } catch (error) {
      this.log(`Test failed: ${error.message}`, 'ERROR');
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  generateRewardReport() {
    this.log('\n🎯 === REWARD TRACKING REPORT === 🎯', 'SUCCESS');
    
    this.log(`\n📊 PLAYER REWARD ANALYSIS:`);
    
    for (const player of this.players) {
      const tracking = player.balanceTracking;
      
      this.log(`\n--- ${player.name} ---`);
      this.log(`  Initial Balance: ${tracking.initial}`);
      this.log(`  Bet Amount: ${tracking.bet}`);
      this.log(`  Balance After Bet: ${tracking.current} (Expected: ${tracking.expectedAfterBet})`);
      this.log(`  Expected Reward: ${tracking.rewardExpected}`);
      this.log(`  Actual Reward: ${tracking.rewardReceived}`);
      this.log(`  Final Balance: ${tracking.actualAfterResult} (Expected: ${tracking.expectedAfterResult})`);
      
      const rewardCorrect = tracking.rewardExpected === tracking.rewardReceived;
      const balanceCorrect = tracking.expectedAfterResult === tracking.actualAfterResult;
      
      if (rewardCorrect && balanceCorrect) {
        this.log(`  Status: ✅ WORKING CORRECTLY`, 'SUCCESS');
      } else {
        this.log(`  Status: ❌ ISSUES DETECTED`, 'ERROR');
      }
    }
    
    this.log(`\n🔍 ISSUES SUMMARY:`);
    this.log(`  Total Issues Found: ${this.rewardIssues.length}`);
    
    if (this.rewardIssues.length === 0) {
      this.log(`  🎉 NO ISSUES FOUND! Reward system is working perfectly.`, 'SUCCESS');
    } else {
      this.log(`  ⚠️ ISSUES DETECTED:`, 'ERROR');
      this.rewardIssues.forEach((issue, index) => {
        this.log(`    ${index + 1}. ${issue.player}: ${issue.issue}`, 'ERROR');
        this.log(`       Expected: ${issue.expected}, Actual: ${issue.actual}`, 'ERROR');
        this.log(`       Phase: ${issue.phase}${issue.gameResult ? `, Result: ${issue.gameResult}` : ''}`, 'ERROR');
      });
    }
    
    // Save detailed logs
    this.saveDetailedLogs();
  }

  saveDetailedLogs() {
    const fs = require('fs');
    const logData = {
      timestamp: new Date().toISOString(),
      rewardIssues: this.rewardIssues,
      playerTracking: this.players.map(p => ({
        name: p.name,
        balanceTracking: p.balanceTracking
      })),
      detailedLogs: this.detailedLogs
    };
    
    const filename = `reward-test-log-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(logData, null, 2));
    this.log(`📄 Detailed logs saved to: ${filename}`, 'INFO');
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
  async waitFor(condition, timeout = 10000) {
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

// Run reward tracking tests
async function runRewardTrackingTests() {
  const tester = new RewardTrackingTester();
  
  try {
    await tester.runRewardTest();
  } catch (error) {
    console.error('Reward tracking test suite failed:', error);
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
  runRewardTrackingTests();
}

module.exports = RewardTrackingTester;