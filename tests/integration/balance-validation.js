const { io } = require('socket.io-client');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Build server URL from environment variables
const HOST = process.env.HOST || 'localhost';
const BACKEND_PORT = process.env.BACKEND_PORT || '5185';
const SERVER_URL = `http://${HOST}:${BACKEND_PORT}`;

class BalanceTester {
  constructor() {
    this.socket = null;
    this.roomCode = null;
    this.balance = 1000;
    this.bet = 0;
    this.gameState = null;
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const colors = {
      INFO: '\x1b[36m',
      SUCCESS: '\x1b[32m',
      ERROR: '\x1b[31m',
      WARNING: '\x1b[33m',
      RESET: '\x1b[0m'
    };
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.RESET}`);
  }

  async connect() {
    this.socket = io(SERVER_URL, {
      timeout: 5000,
      reconnection: false
    });
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout after 5 seconds'));
      }, 5000);

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        this.log(`Connected: ${this.socket.id}`, 'SUCCESS');
        this.setupEvents();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Connection failed: ${error.message}`));
      });
    });
  }

  setupEvents() {
    this.socket.on('roomCreated', (code) => {
      this.roomCode = code;
      this.log(`Room created: ${code}`, 'SUCCESS');
    });

    this.socket.on('gameStarted', (state) => {
      this.gameState = state;
      this.log('Game started - Betting phase active');
    });

    this.socket.on('gameStateUpdate', (state) => {
      this.gameState = state;
      const myPlayer = state.players?.find(p => p.id === this.socket.id);
      if (myPlayer) {
        this.balance = myPlayer.balance;
        this.bet = myPlayer.bet;
        this.log(`Balance: ${this.balance}, Bet: ${this.bet}, Phase: ${state.phase}`);
      }
    });

    this.socket.on('bettingError', (msg) => {
      this.log(`BETTING ERROR: ${msg}`, 'ERROR');
    });
  }

  async createAndStartGame() {
    this.log('Creating room and starting game...');
    this.socket.emit('createRoom', 'BalanceTester');
    
    // Wait for room creation with timeout
    await this.waitForCondition(() => this.roomCode !== null, 5000, 'Room creation');
    
    this.socket.emit('startGameInRoom', this.roomCode);
    
    // Wait for game to start with timeout
    await this.waitForCondition(() => this.gameState && this.gameState.phase === 'betting', 10000, 'Game start');
  }

  async waitForCondition(condition, timeout, description) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (condition()) {
        this.log(`✅ ${description} successful`);
        return;
      }
      await this.delay(100);
    }
    throw new Error(`Timeout waiting for ${description} after ${timeout}ms`);
  }

  async testBettingScenarios() {
    this.log('\n=== TESTING BETTING SCENARIOS ===', 'SUCCESS');

    const scenarios = [
      {
        name: 'Normal bet (100)',
        amount: 100,
        shouldSucceed: true
      },
      {
        name: 'Half balance (500)',
        amount: 500,
        shouldSucceed: true
      },
      {
        name: 'All-in (1000)',
        amount: 1000,
        shouldSucceed: true
      },
      {
        name: 'Over balance (1500)',
        amount: 1500,
        shouldSucceed: false
      },
      {
        name: 'Negative bet (-100)',
        amount: -100,
        shouldSucceed: false
      },
      {
        name: 'Zero bet (0)',
        amount: 0,
        shouldSucceed: false
      }
    ];

    for (const scenario of scenarios) {
      await this.testBettingScenario(scenario);
      await this.delay(1000);
    }
  }

  async testBettingScenario(scenario) {
    this.log(`\n--- Testing: ${scenario.name} ---`);
    
    // Ensure we're in betting phase
    if (this.gameState?.phase !== 'betting') {
      this.log('⚠️ Not in betting phase, restarting game...', 'WARNING');
      this.socket.emit('restartGameInRoom', this.roomCode);
      await this.waitForCondition(() => this.gameState?.phase === 'betting', 10000, 'Betting phase restart');
    }
    
    // Clear any existing bet first
    this.socket.emit('clearBet', { code: this.roomCode });
    await this.delay(500);
    
    const initialBalance = this.balance;
    const initialBet = this.bet;
    
    this.log(`Initial state - Balance: ${initialBalance}, Bet: ${initialBet}, Phase: ${this.gameState?.phase}`);
    
    this.lastError = null;
    
    // Update bet
    this.socket.emit('updateBet', { 
      code: this.roomCode, 
      amount: scenario.amount 
    });
    
    await this.delay(1000);
    
    const finalBalance = this.balance;
    const finalBet = this.bet;
    
    this.log(`Final state - Balance: ${finalBalance}, Bet: ${finalBet}`);
    
    // Validate results
    if (scenario.shouldSucceed) {
      const expectedBalance = initialBalance + initialBet - scenario.amount;
      const expectedBet = scenario.amount;
      
      if (finalBet === expectedBet && finalBalance === expectedBalance && !this.lastError) {
        this.log(`✅ SUCCESS: Bet placed correctly`, 'SUCCESS');
      } else {
        this.log(`❌ FAILED: Expected bet ${expectedBet}, balance ${expectedBalance}, got bet ${finalBet}, balance ${finalBalance}`, 'ERROR');
        if (this.lastError) {
          this.log(`   Error: ${this.lastError}`, 'ERROR');
        }
      }
    } else {
      // Should fail - either state unchanged OR error received
      const stateUnchanged = finalBet === initialBet && finalBalance === initialBalance;
      const hasError = !!this.lastError;
      
      if (stateUnchanged || hasError) {
        this.log(`✅ SUCCESS: Invalid bet correctly rejected${hasError ? ` (${this.lastError})` : ''}`, 'SUCCESS');
      } else {
        this.log(`❌ FAILED: Invalid bet should have been rejected`, 'ERROR');
      }
    }
  }

  async testChipAddition() {
    this.log('\n=== TESTING CHIP ADDITION ===', 'SUCCESS');
    
    // Clear bet first
    this.socket.emit('clearBet', { code: this.roomCode });
    await this.delay(500);
    
    const chipValues = [25, 50, 100, 250, 500];
    let expectedBet = 0;
    
    for (const chipValue of chipValues) {
      this.log(`Adding chip: ${chipValue}`);
      
      this.socket.emit('addChip', { 
        code: this.roomCode, 
        chipValue: chipValue 
      });
      
      expectedBet += chipValue;
      await this.delay(500);
      
      if (this.bet === expectedBet) {
        this.log(`✅ Chip added correctly. Total bet: ${this.bet}`, 'SUCCESS');
      } else {
        this.log(`❌ Chip addition failed. Expected: ${expectedBet}, Got: ${this.bet}`, 'ERROR');
      }
    }
    
    // Test adding chip that would exceed balance
    this.log('Testing chip that exceeds balance...');
    this.socket.emit('addChip', { 
      code: this.roomCode, 
      chipValue: 1000 
    });
    
    await this.delay(500);
    
    if (this.bet === expectedBet) {
      this.log(`✅ Excessive chip correctly rejected`, 'SUCCESS');
    } else {
      this.log(`❌ Excessive chip should have been rejected`, 'ERROR');
    }
  }

  async testAllIn() {
    this.log('\n=== TESTING ALL-IN FUNCTIONALITY ===', 'SUCCESS');
    
    // Clear bet first
    this.socket.emit('clearBet', { code: this.roomCode });
    await this.delay(500);
    
    const initialBalance = this.balance;
    
    this.log(`Testing All-In with balance: ${initialBalance}`);
    
    this.socket.emit('allIn', { code: this.roomCode });
    await this.delay(1000);
    
    if (this.bet === initialBalance && this.balance === 0) {
      this.log(`✅ All-In successful: Bet ${this.bet}, Balance ${this.balance}`, 'SUCCESS');
    } else {
      this.log(`❌ All-In failed: Expected bet ${initialBalance}, got ${this.bet}`, 'ERROR');
    }
  }

  async runAllTests() {
    try {
      await this.connect();
      await this.createAndStartGame();
      
      await this.testBettingScenarios();
      await this.testChipAddition();
      await this.testAllIn();
      
      this.log('\n🎉 All balance validation tests completed!', 'SUCCESS');
      
    } catch (error) {
      this.log(`Test failed: ${error.message}`, 'ERROR');
    } finally {
      if (this.socket) {
        this.socket.disconnect();
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run tests
async function runBalanceTests() {
  const tester = new BalanceTester();
  await tester.runAllTests();
}

if (require.main === module) {
  runBalanceTests();
}

module.exports = BalanceTester;