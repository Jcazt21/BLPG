const { io } = require('socket.io-client');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Build server URL from environment variables
const HOST = process.env.HOST || 'localhost';
const BACKEND_PORT = process.env.BACKEND_PORT || '5185';
const SERVER_URL = `http://${HOST}:${BACKEND_PORT}`;

class BalanceBetweenRoundsTest {
  constructor() {
    this.players = [];
    this.roomCode = null;
    this.roundNumber = 0;
    this.totalRounds = 5;
    this.balanceHistory = [];
    this.issues = [];
  }

  log(message, type = 'INFO', playerId = null) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const colors = {
      INFO: '\x1b[36m',
      SUCCESS: '\x1b[32m',
      ERROR: '\x1b[31m',
      WARNING: '\x1b[33m',
      BALANCE: '\x1b[94m',
      ROUND: '\x1b[93m',
      RESULT: '\x1b[95m',
      RESET: '\x1b[0m'
    };
    
    const playerPrefix = playerId ? `[${playerId}] ` : '';
    const logMessage = `${colors[type]}[${timestamp}] ${playerPrefix}${message}${colors.RESET}`;
    console.log(logMessage);
  }

  async createPlayer(playerName) {
    this.log(`Creating player ${playerName}...`);
    const socket = io(SERVER_URL, {
      autoConnect: false,
      timeout: 5000,
      reconnection: false
    });
    
    const player = {
      name: playerName,
      socket: socket,
      connected: false,
      gameState: null,
      balanceHistory: [{round: 0, balance: 1000, bet: 0, result: 'initial'}],
      currentBalance: 1000,
      currentBet: 0
    };

    this.setupPlayerEvents(player);
    this.players.push(player);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Connection timeout for ${playerName}`));
      }, 5000);
      
      socket.connect();
      
      const checkConnection = () => {
        if (player.connected) {
          clearTimeout(timeout);
          this.log(`${playerName} connected successfully`, 'SUCCESS');
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
      player.gameState = state;
      const myPlayer = state.players?.find(p => p.id === socket.id);
      
      if (myPlayer) {
        // Track balance changes
        if (player.currentBalance !== myPlayer.balance || player.currentBet !== myPlayer.bet) {
          this.log(`Balance: ${myPlayer.balance} (${myPlayer.balance - player.currentBalance >= 0 ? '+' : ''}${myPlayer.balance - player.currentBalance}), Bet: ${myPlayer.bet}, Phase: ${state.phase}`, 'BALANCE', player.name);
          player.currentBalance = myPlayer.balance;
          player.currentBet = myPlayer.bet;
        }
        
        // Track result phase
        if (state.phase === 'result' && state.results && state.results[socket.id]) {
          const result = state.results[socket.id];
          
          this.log(`RESULT: ${result.status} | Bet: ${myPlayer.bet} | Payout: ${result.payout} | Final: ${result.finalBalance}`, 'RESULT', player.name);
          
          // Record balance history
          player.balanceHistory.push({
            round: this.roundNumber,
            balance: result.finalBalance,
            bet: myPlayer.bet,
            payout: result.payout,
            result: result.status
          });
          
          // Verify balance calculation
          const expectedBalance = player.balanceHistory[player.balanceHistory.length - 2].balance - myPlayer.bet + result.payout;
          if (expectedBalance !== result.finalBalance) {
            const issue = {
              round: this.roundNumber,
              player: player.name,
              issue: 'Balance calculation error',
              expected: expectedBalance,
              actual: result.finalBalance,
              gameResult: result.status
            };
            this.issues.push(issue);
            this.log(`❌ BALANCE ERROR: Expected ${expectedBalance}, got ${result.finalBalance}`, 'ERROR', player.name);
          }
        }
      }
    });

    socket.on('disconnect', () => {
      player.connected = false;
      this.log(`Disconnected`, 'WARNING', player.name);
    });
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

  async joinRoom() {
    this.log('Player 2 joining room...');
    const player = this.players[1];
    player.socket.emit('joinRoom', {
      code: this.roomCode,
      playerName: player.name
    });
    
    await this.delay(1000); // Wait for join to complete
    this.log('All players joined room', 'SUCCESS');
  }

  async startGame() {
    this.log('Starting game...');
    const creator = this.players[0];
    creator.socket.emit('startGameInRoom', this.roomCode);
    
    await this.waitFor(() => 
      this.players.every(p => p.gameState && p.gameState.phase === 'betting'),
      5000
    );

    this.log('Game started - Betting phase active', 'SUCCESS');
  }

  async placeBets(round) {
    this.log(`=== ROUND ${round} BETTING PHASE ===`, 'ROUND');
    
    // Player 1 bets 100 * round number (with max check)
    const maxBet1 = this.players[0].currentBalance;
    const bet1 = Math.min(100 * round, maxBet1);
    
    if (bet1 <= 0) {
      this.log(`Player 1 has insufficient balance (${maxBet1}) for bet`, 'WARNING');
      return false;
    }
    
    this.players[0].socket.emit('updateBet', {
      code: this.roomCode,
      amount: bet1
    });
    await this.delay(300);
    this.players[0].socket.emit('placeBet', {
      code: this.roomCode,
      amount: bet1
    });
    this.log(`Player 1 bet: ${bet1}`, 'INFO');
    
    // Player 2 bets 150 * round number (with max check)
    const maxBet2 = this.players[1].currentBalance;
    const bet2 = Math.min(150 * round, maxBet2);
    
    if (bet2 <= 0) {
      this.log(`Player 2 has insufficient balance (${maxBet2}) for bet`, 'WARNING');
      return false;
    }
    
    this.players[1].socket.emit('updateBet', {
      code: this.roomCode,
      amount: bet2
    });
    await this.delay(300);
    this.players[1].socket.emit('placeBet', {
      code: this.roomCode,
      amount: bet2
    });
    this.log(`Player 2 bet: ${bet2}`, 'INFO');
    
    await this.delay(1000); // Wait for bets to be processed
    this.log(`=== ROUND ${round} BETS PLACED ===`, 'ROUND');
    return true;
  }

  async simulateGameplay() {
    this.log('=== SIMULATING GAMEPLAY ===');
    
    // Wait for dealing phase
    await this.waitFor(() => 
      this.players.some(p => p.gameState && p.gameState.phase === 'dealing'),
      5000
    );
    
    this.log('Cards being dealt...');
    
    // Wait for playing phase
    await this.waitFor(() => 
      this.players.some(p => p.gameState && p.gameState.phase === 'playing'),
      5000
    );

    this.log('Playing phase started');

    // Simulate player actions
    let maxActions = 10;
    while (maxActions > 0) {
      const gameState = this.players[0].gameState;
      if (!gameState || gameState.phase !== 'playing') break;
      
      const currentPlayerIndex = gameState.turn;
      const currentPlayerId = gameState.players[currentPlayerIndex]?.id;
      const currentPlayer = this.players.find(p => p.socket.id === currentPlayerId);
      
      if (currentPlayer) {
        // Simple strategy: stand if total >= 17, otherwise hit
        const playerInGameState = gameState.players[currentPlayerIndex];
        const action = playerInGameState.total >= 17 ? 'stand' : 'hit';
        
        this.log(`${currentPlayer.name} taking action: ${action}`, 'INFO');
        
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
      10000
    );

    this.log('=== GAMEPLAY COMPLETE ===');
    
    // Wait for results to be processed
    await this.delay(2000);
  }

  async restartGame() {
    this.log('Restarting game for next round...');
    const creator = this.players[0];
    creator.socket.emit('restartGameInRoom', this.roomCode);
    
    // Wait for the next round to start
    await this.waitFor(() => 
      this.players.every(p => p.gameState && p.gameState.phase === 'betting'),
      5000
    );
    
    this.log('Game restarted - Ready for next round', 'SUCCESS');
    await this.delay(1000);
  }

  async runTest() {
    try {
      this.log('🎮 Starting Balance Between Rounds Test 🎮', 'SUCCESS');
      
      // Setup
      await this.createPlayer('Player1');
      await this.createPlayer('Player2');
      await this.createRoom();
      await this.joinRoom();
      
      // Run 5 rounds
      for (let round = 1; round <= this.totalRounds; round++) {
        this.roundNumber = round;
        this.log(`\n🎲 === STARTING ROUND ${round}/${this.totalRounds} ===`, 'ROUND');
        
        if (round === 1) {
          await this.startGame();
        }
        
        // Check if both players have enough balance to continue
        if (this.players[0].currentBalance <= 0 && this.players[1].currentBalance <= 0) {
          this.log('Both players have no balance left. Ending test early.', 'WARNING');
          break;
        }
        
        // Place bets and continue if successful
        const betsPlaced = await this.placeBets(round);
        if (!betsPlaced) {
          this.log('Unable to place bets. Ending test early.', 'WARNING');
          break;
        }
        
        await this.simulateGameplay();
        
        // Wait between rounds
        if (round < this.totalRounds) {
          await this.restartGame();
        }
      }
      
      this.generateReport();
      
    } catch (error) {
      this.log(`Test failed: ${error.message}`, 'ERROR');
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  generateReport() {
    this.log('\n📊 === BALANCE BETWEEN ROUNDS TEST REPORT === 📊', 'SUCCESS');
    
    // Report for each player
    for (const player of this.players) {
      this.log(`\n--- ${player.name} Balance History ---`, 'INFO');
      
      let previousBalance = 1000; // Starting balance
      
      for (let i = 1; i < player.balanceHistory.length; i++) {
        const entry = player.balanceHistory[i];
        const balanceChange = entry.balance - previousBalance;
        
        this.log(`Round ${entry.round}: ${previousBalance} → ${entry.balance} (${balanceChange >= 0 ? '+' : ''}${balanceChange})`, 'BALANCE');
        this.log(`  Bet: ${entry.bet}, Result: ${entry.result}, Payout: ${entry.payout || 0}`, 'INFO');
        
        previousBalance = entry.balance;
      }
    }
    
    // Issues summary
    this.log('\n🔍 ISSUES SUMMARY:', 'INFO');
    if (this.issues.length === 0) {
      this.log('  ✅ NO ISSUES FOUND! Balance tracking works correctly across all rounds.', 'SUCCESS');
    } else {
      this.log(`  ❌ ${this.issues.length} ISSUES FOUND:`, 'ERROR');
      this.issues.forEach((issue, index) => {
        this.log(`    ${index + 1}. Round ${issue.round} - ${issue.player}: ${issue.issue}`, 'ERROR');
        this.log(`       Expected: ${issue.expected}, Actual: ${issue.actual}`, 'ERROR');
        if (issue.gameResult) {
          this.log(`       Game Result: ${issue.gameResult}`, 'ERROR');
        }
      });
    }
    
    this.log(`\n🎮 TEST COMPLETE: 2 players, ${this.totalRounds} rounds analyzed.`, 'SUCCESS');
  }

  async cleanup() {
    this.log('Cleaning up connections...');
    for (const player of this.players) {
      if (player.socket && player.socket.connected) {
        player.socket.disconnect();
      }
    }
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

// Run the test
async function runBalanceBetweenRoundsTest() {
  const tester = new BalanceBetweenRoundsTest();
  
  try {
    await tester.runTest();
  } catch (error) {
    console.error('Balance between rounds test failed:', error);
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(0);
});

// Start test
if (require.main === module) {
  runBalanceBetweenRoundsTest();
}

module.exports = BalanceBetweenRoundsTest;