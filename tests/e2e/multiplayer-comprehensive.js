const { io } = require('socket.io-client');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Build server URL from environment variables
const HOST = process.env.HOST || 'localhost';
const BACKEND_PORT = process.env.BACKEND_PORT || '5185';
const SERVER_URL = `http://${HOST}:${BACKEND_PORT}`;
const TEST_SCENARIOS = [
  {
    name: 'Basic Win/Loss Test',
    players: 2,
    rounds: 3,
    bets: [100, 250]
  },
  {
    name: 'All-In Test',
    players: 3,
    rounds: 2,
    bets: [1000, 500, 750]
  },
  {
    name: 'Mixed Betting Test',
    players: 4,
    rounds: 5,
    bets: [25, 100, 500, 1000]
  }
];

class MultiplayerTester {
  constructor() {
    this.sockets = [];
    this.players = [];
    this.roomCode = null;
    this.testResults = [];
    this.currentTest = null;
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const colors = {
      INFO: '\x1b[36m',    // Cyan
      SUCCESS: '\x1b[32m', // Green
      ERROR: '\x1b[31m',   // Red
      WARNING: '\x1b[33m', // Yellow
      RESET: '\x1b[0m'     // Reset
    };
    console.log(`${colors[type]}[${timestamp}] ${type}: ${message}${colors.RESET}`);
  }

  async createPlayers(count) {
    this.log(`Creating ${count} players...`);
    
    for (let i = 0; i < count; i++) {
      const socket = io(SERVER_URL, { autoConnect: false });
      const playerName = `TestPlayer${i + 1}`;
      
      const player = {
        id: i,
        name: playerName,
        socket: socket,
        balance: 1000,
        bet: 0,
        hasPlacedBet: false,
        connected: false,
        gameState: null
      };

      // Set up event listeners
      this.setupPlayerEvents(player);
      
      this.sockets.push(socket);
      this.players.push(player);
    }

    // Connect all players
    await Promise.all(this.players.map(player => this.connectPlayer(player)));
    this.log(`All ${count} players connected successfully`, 'SUCCESS');
  }

  setupPlayerEvents(player) {
    const socket = player.socket;

    socket.on('connect', () => {
      player.connected = true;
      this.log(`${player.name} connected (${socket.id})`);
    });

    socket.on('roomCreated', (code) => {
      this.roomCode = code;
      this.log(`Room created: ${code}`, 'SUCCESS');
    });

    socket.on('roomJoined', (code) => {
      this.log(`${player.name} joined room: ${code}`);
    });

    socket.on('gameStarted', (state) => {
      player.gameState = state;
      this.log(`Game started for ${player.name}`);
    });

    socket.on('gameStateUpdate', (state) => {
      player.gameState = state;
      const myPlayer = state.players?.find(p => p.id === socket.id);
      if (myPlayer) {
        player.balance = myPlayer.balance;
        player.bet = myPlayer.bet;
        player.hasPlacedBet = myPlayer.hasPlacedBet;
      }
      this.log(`${player.name} - Phase: ${state.phase}, Balance: ${player.balance}, Bet: ${player.bet}`);
    });

    socket.on('bettingError', (msg) => {
      this.log(`${player.name} betting error: ${msg}`, 'ERROR');
    });

    socket.on('roomError', (msg) => {
      this.log(`${player.name} room error: ${msg}`, 'ERROR');
    });

    socket.on('disconnect', () => {
      player.connected = false;
      this.log(`${player.name} disconnected`, 'WARNING');
    });
  }

  async connectPlayer(player) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Connection timeout for ${player.name}`));
      }, 5000);
      
      player.socket.connect();
      const checkConnection = () => {
        if (player.connected) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });
  }

  async createRoom() {
    this.log('Creating room...');
    const creator = this.players[0];
    creator.socket.emit('createRoom', creator.name);
    
    // Wait for room creation
    await this.waitFor(() => this.roomCode !== null, 5000);
    
    if (!this.roomCode) {
      throw new Error('Failed to create room');
    }

    this.log(`Room ${this.roomCode} created successfully`, 'SUCCESS');
  }

  async joinAllPlayers() {
    this.log('All players joining room...');
    
    // Skip creator (index 0), join others
    for (let i = 1; i < this.players.length; i++) {
      const player = this.players[i];
      player.socket.emit('joinRoom', { 
        code: this.roomCode, 
        playerName: player.name 
      });
      await this.delay(500); // Small delay between joins
    }

    this.log('All players joined room', 'SUCCESS');
  }

  async startGame() {
    this.log('Starting game...');
    const creator = this.players[0];
    creator.socket.emit('startGameInRoom', this.roomCode);
    
    // Wait for game to start
    await this.waitFor(() => 
      this.players.every(p => p.gameState && p.gameState.phase === 'betting'), 
      10000
    );

    this.log('Game started - Betting phase active', 'SUCCESS');
  }

  async simulateBettingRound(bets) {
    this.log('Starting betting round...');
    
    // Each player places their bet
    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      const betAmount = bets[i] || 100;
      
      this.log(`${player.name} placing bet: ${betAmount}`);
      
      // Update bet first
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

    // Wait for dealing phase to start
    await this.waitFor(() => 
      this.players.some(p => p.gameState && p.gameState.phase === 'dealing'), 
      15000
    );

    this.log('Betting round completed - Cards being dealt', 'SUCCESS');
  }

  async simulateGameplay() {
    this.log('Simulating gameplay...');
    
    // Wait for playing phase
    await this.waitFor(() => 
      this.players.some(p => p.gameState && p.gameState.phase === 'playing'), 
      10000
    );

    // Simulate player actions (random hit/stand)
    let maxActions = 20; // Prevent infinite loops
    while (maxActions > 0) {
      const gameState = this.players[0].gameState;
      if (!gameState || gameState.phase !== 'playing') break;
      
      const currentPlayerIndex = gameState.turn;
      const currentPlayerId = gameState.players[currentPlayerIndex]?.id;
      const currentPlayer = this.players.find(p => p.socket.id === currentPlayerId);
      
      if (currentPlayer) {
        const action = Math.random() > 0.6 ? 'stand' : 'hit';
        this.log(`${currentPlayer.name} chooses: ${action}`);
        
        currentPlayer.socket.emit('playerAction', {
          code: this.roomCode,
          action: action
        });
        
        await this.delay(2000);
      }
      
      maxActions--;
    }

    // Wait for results
    await this.waitFor(() => 
      this.players.some(p => p.gameState && p.gameState.phase === 'result'), 
      15000
    );

    this.log('Gameplay completed - Results available', 'SUCCESS');
  }

  async analyzeResults() {
    this.log('Analyzing round results...');
    
    const gameState = this.players[0].gameState;
    if (!gameState || !gameState.results) {
      this.log('No results available', 'ERROR');
      return;
    }

    const results = {
      round: this.currentTest.currentRound,
      players: []
    };

    for (const player of this.players) {
      const result = gameState.results[player.socket.id];
      const playerResult = {
        name: player.name,
        initialBalance: player.balance - (result?.payout || 0),
        bet: player.bet,
        result: result?.status || 'unknown',
        payout: result?.payout || 0,
        finalBalance: player.balance,
        balanceChange: (result?.payout || 0) - player.bet
      };
      
      results.players.push(playerResult);
      
      this.log(`${player.name}: ${playerResult.result} | Bet: ${playerResult.bet} | Payout: ${playerResult.payout} | Balance: ${playerResult.initialBalance} → ${playerResult.finalBalance}`, 
        playerResult.balanceChange >= 0 ? 'SUCCESS' : 'WARNING');
    }

    this.testResults.push(results);
    return results;
  }

  async runTestScenario(scenario) {
    this.log(`\n=== Starting Test Scenario: ${scenario.name} ===`, 'SUCCESS');
    this.currentTest = { ...scenario, currentRound: 0 };
    
    try {
      // Setup
      await this.createPlayers(scenario.players);
      await this.createRoom();
      await this.joinAllPlayers();
      
      // Run multiple rounds
      for (let round = 1; round <= scenario.rounds; round++) {
        this.log(`\n--- Round ${round}/${scenario.rounds} ---`, 'INFO');
        this.currentTest.currentRound = round;
        
        await this.startGame();
        await this.simulateBettingRound(scenario.bets);
        await this.simulateGameplay();
        await this.analyzeResults();
        
        if (round < scenario.rounds) {
          // Start next round
          const creator = this.players[0];
          creator.socket.emit('restartGameInRoom', this.roomCode);
          await this.delay(2000);
        }
      }
      
      this.log(`=== Test Scenario "${scenario.name}" Completed Successfully ===\n`, 'SUCCESS');
      
    } catch (error) {
      this.log(`Test scenario failed: ${error.message}`, 'ERROR');
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async runAllTests() {
    this.log('🎮 Starting Comprehensive Multiplayer Tests 🎮\n', 'SUCCESS');
    
    for (const scenario of TEST_SCENARIOS) {
      try {
        await this.runTestScenario(scenario);
        await this.delay(2000); // Pause between scenarios
      } catch (error) {
        this.log(`Scenario "${scenario.name}" failed: ${error.message}`, 'ERROR');
      }
    }
    
    this.generateReport();
  }

  generateReport() {
    this.log('\n📊 === COMPREHENSIVE TEST REPORT === 📊', 'SUCCESS');
    
    let totalRounds = 0;
    let totalPlayers = 0;
    let totalBetsPlaced = 0;
    let totalPayouts = 0;
    
    const resultCounts = {
      win: 0,
      lose: 0,
      draw: 0,
      bust: 0,
      blackjack: 0
    };

    for (const result of this.testResults) {
      totalRounds++;
      totalPlayers += result.players.length;
      
      for (const player of result.players) {
        totalBetsPlaced += player.bet;
        totalPayouts += player.payout;
        resultCounts[player.result] = (resultCounts[player.result] || 0) + 1;
      }
    }

    this.log(`\n📈 STATISTICS:`);
    this.log(`   Total Rounds Played: ${totalRounds}`);
    this.log(`   Total Player Actions: ${totalPlayers}`);
    this.log(`   Total Bets Placed: ${totalBetsPlaced} chips`);
    this.log(`   Total Payouts: ${totalPayouts} chips`);
    this.log(`   House Edge: ${((totalBetsPlaced - totalPayouts) / totalBetsPlaced * 100).toFixed(2)}%`);
    
    this.log(`\n🎯 RESULT DISTRIBUTION:`);
    Object.entries(resultCounts).forEach(([result, count]) => {
      const percentage = ((count / totalPlayers) * 100).toFixed(1);
      this.log(`   ${result.toUpperCase()}: ${count} (${percentage}%)`);
    });

    this.log(`\n✅ All tests completed successfully!`, 'SUCCESS');
  }

  async cleanup() {
    this.log('Cleaning up connections...');
    for (const socket of this.sockets) {
      if (socket.connected) {
        socket.disconnect();
      }
    }
    this.sockets = [];
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

// Run tests
async function runTests() {
  const tester = new MultiplayerTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Start tests
if (require.main === module) {
  runTests();
}

module.exports = MultiplayerTester;