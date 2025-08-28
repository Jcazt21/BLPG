const { io } = require('socket.io-client');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Build server URL from environment variables
const HOST = process.env.HOST || 'localhost';
const BACKEND_PORT = process.env.BACKEND_PORT || '5185';
const SERVER_URL = `http://${HOST}:${BACKEND_PORT}`;

class BalanceTestSuite {
  constructor() {
    this.socket = null;
    this.roomCode = null;
    this.playerState = {
      balance: 1000,
      bet: 0,
      hasPlacedBet: false
    };
    this.testResults = [];
    this.gamePhase = 'waiting';
  }

  log(message, type = 'INFO') {
    const colors = {
      INFO: '\x1b[36m',
      SUCCESS: '\x1b[32m',
      ERROR: '\x1b[31m',
      WARNING: '\x1b[33m',
      TEST: '\x1b[35m',
      RESET: '\x1b[0m'
    };
    console.log(`${colors[type]}${message}${colors.RESET}`);
  }

  addResult(testName, expected, actual, passed, error = null) {
    this.testResults.push({
      test: testName,
      expected,
      actual,
      passed,
      error: error?.message || null,
      timestamp: new Date().toISOString()
    });
  }

  async connect() {
    this.log('🔌 Connecting to server...', 'INFO');
    
    this.socket = io(SERVER_URL, {
      timeout: 5000,
      reconnection: false
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        this.log(`✅ Connected: ${this.socket.id}`, 'SUCCESS');
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
      this.log(`🏠 Room created: ${code}`, 'SUCCESS');
    });

    this.socket.on('gameStarted', (state) => {
      this.gamePhase = state.phase;
      this.log(`🎮 Game started - Phase: ${state.phase}`, 'SUCCESS');
    });

    this.socket.on('gameStateUpdate', (state) => {
      this.gamePhase = state.phase;
      const myPlayer = state.players?.find(p => p.id === this.socket.id);
      if (myPlayer) {
        this.playerState = {
          balance: myPlayer.balance,
          bet: myPlayer.bet,
          hasPlacedBet: myPlayer.hasPlacedBet
        };
        this.log(`💰 Balance: ${this.playerState.balance}, Bet: ${this.playerState.bet}, Phase: ${state.phase}`);
      }
    });

    this.socket.on('bettingError', (msg) => {
      this.log(`❌ Betting Error: ${msg}`, 'ERROR');
      this.lastError = msg;
    });
  }

  async setupGame() {
    this.log('🎮 Setting up game...', 'INFO');
    
    // Create room
    this.socket.emit('createRoom', 'BalanceTester');
    await this.waitForCondition(() => this.roomCode !== null, 5000, 'Room creation');
    
    // Start game
    this.socket.emit('startGameInRoom', this.roomCode);
    await this.waitForCondition(() => this.gamePhase === 'betting', 10000, 'Game start');
    
    this.log('✅ Game setup complete', 'SUCCESS');
  }

  async waitForCondition(condition, timeout, description) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (condition()) return;
      await this.delay(100);
    }
    throw new Error(`Timeout waiting for ${description} after ${timeout}ms`);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async resetBet() {
    this.socket.emit('clearBet', { code: this.roomCode });
    await this.delay(500);
  }

  // ==================== BALANCE TESTS ====================

  async testBasicBetting() {
    this.log('\n🧪 === BASIC BETTING TESTS ===', 'TEST');
    
    const tests = [
      { name: 'Small bet (25)', amount: 25, shouldSucceed: true },
      { name: 'Medium bet (250)', amount: 250, shouldSucceed: true },
      { name: 'Large bet (750)', amount: 750, shouldSucceed: true },
      { name: 'Maximum bet (1000)', amount: 1000, shouldSucceed: true }
    ];

    for (const test of tests) {
      await this.resetBet();
      await this.runBettingTest(test);
    }
  }

  async testInvalidBets() {
    this.log('\n🧪 === INVALID BETTING TESTS ===', 'TEST');
    
    const tests = [
      { name: 'Negative bet (-100)', amount: -100, shouldSucceed: false },
      { name: 'Zero bet (0)', amount: 0, shouldSucceed: false },
      { name: 'Over balance (1500)', amount: 1500, shouldSucceed: false },
      { name: 'Slightly over balance (1001)', amount: 1001, shouldSucceed: false }
    ];

    for (const test of tests) {
      await this.resetBet();
      await this.runBettingTest(test);
    }
  }

  async testChipAddition() {
    this.log('\n🧪 === CHIP ADDITION TESTS ===', 'TEST');
    
    await this.resetBet();
    
    const chipValues = [25, 50, 100, 250];
    let expectedTotal = 0;
    
    for (const chipValue of chipValues) {
      this.log(`Adding chip: ${chipValue}`, 'INFO');
      
      const initialBet = this.playerState.bet;
      expectedTotal += chipValue;
      
      this.socket.emit('addChip', { code: this.roomCode, chipValue });
      await this.delay(1000);
      
      const passed = this.playerState.bet === expectedTotal;
      this.addResult(
        `Add chip ${chipValue}`,
        expectedTotal,
        this.playerState.bet,
        passed
      );
      
      if (passed) {
        this.log(`✅ Chip ${chipValue} added correctly. Total: ${this.playerState.bet}`, 'SUCCESS');
      } else {
        this.log(`❌ Chip ${chipValue} failed. Expected: ${expectedTotal}, Got: ${this.playerState.bet}`, 'ERROR');
      }
    }

    // Test adding chip that exceeds balance
    this.log('Testing chip that would exceed balance...', 'INFO');
    const beforeBet = this.playerState.bet;
    this.socket.emit('addChip', { code: this.roomCode, chipValue: 1000 });
    await this.delay(1000);
    
    const passed = this.playerState.bet === beforeBet;
    this.addResult(
      'Add excessive chip (should fail)',
      beforeBet,
      this.playerState.bet,
      passed
    );
    
    if (passed) {
      this.log('✅ Excessive chip correctly rejected', 'SUCCESS');
    } else {
      this.log('❌ Excessive chip should have been rejected', 'ERROR');
    }
  }

  async testAllInFunctionality() {
    this.log('\n🧪 === ALL-IN TESTS ===', 'TEST');
    
    const scenarios = [
      { initialBalance: 1000, description: 'Full balance all-in' },
      { initialBalance: 500, description: 'Partial balance all-in' },
      { initialBalance: 100, description: 'Small balance all-in' }
    ];

    for (const scenario of scenarios) {
      await this.resetBet();
      
      // Simulate different balance scenarios by just updating bet without placing it
      if (scenario.initialBalance < 1000) {
        const tempBet = 1000 - scenario.initialBalance;
        this.socket.emit('updateBet', { code: this.roomCode, amount: tempBet });
        await this.delay(500);
        // Don't place the bet, just leave it as pending to simulate reduced available balance
      }
      
      this.log(`Testing ${scenario.description}...`, 'INFO');
      
      const initialBalance = this.playerState.balance;
      const initialBet = this.playerState.bet;
      this.socket.emit('allIn', { code: this.roomCode });
      await this.delay(1000);
      
      // All-in should use total available funds (balance + current bet)
      const expectedBet = initialBalance + initialBet;
      const expectedBalance = 0;
      
      const betPassed = this.playerState.bet === expectedBet;
      const balancePassed = this.playerState.balance === expectedBalance;
      const overallPassed = betPassed && balancePassed;
      
      this.addResult(
        `All-in ${scenario.description}`,
        `Bet: ${expectedBet}, Balance: ${expectedBalance}`,
        `Bet: ${this.playerState.bet}, Balance: ${this.playerState.balance}`,
        overallPassed
      );
      
      if (overallPassed) {
        this.log(`✅ All-in successful: Bet ${this.playerState.bet}, Balance ${this.playerState.balance}`, 'SUCCESS');
      } else {
        this.log(`❌ All-in failed: Expected bet ${expectedBet}, got ${this.playerState.bet}`, 'ERROR');
      }
    }
  }

  async testBetModification() {
    this.log('\n🧪 === BET MODIFICATION TESTS ===', 'TEST');
    
    const modifications = [
      { from: 0, to: 100, description: 'Set initial bet' },
      { from: 100, to: 250, description: 'Increase bet' },
      { from: 250, to: 150, description: 'Decrease bet' },
      { from: 150, to: 1000, description: 'Max out bet' },
      { from: 1000, to: 50, description: 'Reduce to minimum' }
    ];

    await this.resetBet();

    for (const mod of modifications) {
      this.log(`${mod.description}: ${mod.from} → ${mod.to}`, 'INFO');
      
      const initialBalance = this.playerState.balance;
      const initialBet = this.playerState.bet;
      
      this.socket.emit('updateBet', { code: this.roomCode, amount: mod.to });
      await this.delay(1000);
      
      const expectedBalance = initialBalance + initialBet - mod.to;
      const expectedBet = mod.to;
      
      const betPassed = this.playerState.bet === expectedBet;
      const balancePassed = this.playerState.balance === expectedBalance;
      const overallPassed = betPassed && balancePassed;
      
      this.addResult(
        mod.description,
        `Bet: ${expectedBet}, Balance: ${expectedBalance}`,
        `Bet: ${this.playerState.bet}, Balance: ${this.playerState.balance}`,
        overallPassed
      );
      
      if (overallPassed) {
        this.log(`✅ ${mod.description} successful`, 'SUCCESS');
      } else {
        this.log(`❌ ${mod.description} failed`, 'ERROR');
      }
    }
  }

  async testEdgeCases() {
    this.log('\n🧪 === EDGE CASE TESTS ===', 'TEST');
    
    // Test rapid betting changes
    await this.resetBet();
    this.log('Testing rapid bet changes...', 'INFO');
    
    const rapidChanges = [100, 200, 150, 300, 250];
    for (const amount of rapidChanges) {
      this.socket.emit('updateBet', { code: this.roomCode, amount });
      await this.delay(200); // Very short delay
    }
    
    await this.delay(1000); // Wait for final state
    
    const finalExpected = 250;
    const passed = this.playerState.bet === finalExpected;
    this.addResult(
      'Rapid bet changes',
      finalExpected,
      this.playerState.bet,
      passed
    );
    
    // Test bet clearing
    await this.resetBet();
    this.log('Testing bet clearing...', 'INFO');
    
    this.socket.emit('updateBet', { code: this.roomCode, amount: 500 });
    await this.delay(500);
    this.socket.emit('clearBet', { code: this.roomCode });
    await this.delay(500);
    
    const clearPassed = this.playerState.bet === 0 && this.playerState.balance === 1000;
    this.addResult(
      'Clear bet functionality',
      'Bet: 0, Balance: 1000',
      `Bet: ${this.playerState.bet}, Balance: ${this.playerState.balance}`,
      clearPassed
    );
  }

  async runBettingTest(test) {
    this.log(`Testing: ${test.name}`, 'INFO');
    
    const initialBalance = this.playerState.balance;
    const initialBet = this.playerState.bet;
    
    this.lastError = null;
    
    // Update bet
    this.socket.emit('updateBet', { code: this.roomCode, amount: test.amount });
    await this.delay(1000);
    
    if (test.shouldSucceed) {
      const expectedBalance = initialBalance + initialBet - test.amount;
      const expectedBet = test.amount;
      
      const betPassed = this.playerState.bet === expectedBet;
      const balancePassed = this.playerState.balance === expectedBalance;
      const noError = !this.lastError;
      const overallPassed = betPassed && balancePassed && noError;
      
      this.addResult(
        test.name,
        `Bet: ${expectedBet}, Balance: ${expectedBalance}`,
        `Bet: ${this.playerState.bet}, Balance: ${this.playerState.balance}`,
        overallPassed,
        this.lastError ? new Error(this.lastError) : null
      );
      
      if (overallPassed) {
        this.log(`✅ ${test.name} successful`, 'SUCCESS');
      } else {
        this.log(`❌ ${test.name} failed`, 'ERROR');
      }
    } else {
      // Should fail
      const stateUnchanged = this.playerState.bet === initialBet && 
                           this.playerState.balance === initialBalance;
      const hasError = !!this.lastError;
      const overallPassed = stateUnchanged && hasError;
      
      this.addResult(
        test.name,
        'Should be rejected with error',
        hasError ? `Rejected: ${this.lastError}` : 'Not rejected',
        overallPassed
      );
      
      if (overallPassed) {
        this.log(`✅ ${test.name} correctly rejected`, 'SUCCESS');
      } else {
        this.log(`❌ ${test.name} should have been rejected`, 'ERROR');
      }
    }
  }

  async runAllTests() {
    try {
      await this.connect();
      await this.setupGame();
      
      await this.testBasicBetting();
      await this.testInvalidBets();
      await this.testChipAddition();
      await this.testBetModification();
      await this.testAllInFunctionality();
      await this.testEdgeCases();
      
      this.generateReport();
      
    } catch (error) {
      this.log(`❌ Test suite failed: ${error.message}`, 'ERROR');
      throw error;
    } finally {
      if (this.socket) {
        this.socket.disconnect();
      }
    }
  }

  generateReport() {
    this.log('\n📊 === COMPREHENSIVE BALANCE TEST REPORT ===', 'SUCCESS');
    
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    const total = this.testResults.length;
    const successRate = ((passed / total) * 100).toFixed(1);
    
    this.log(`\n📈 SUMMARY:`);
    this.log(`   Total Tests: ${total}`);
    this.log(`   ✅ Passed: ${passed}`);
    this.log(`   ❌ Failed: ${failed}`);
    this.log(`   📊 Success Rate: ${successRate}%`);
    
    if (failed > 0) {
      this.log(`\n🔍 FAILED TESTS:`, 'ERROR');
      this.testResults
        .filter(r => !r.passed)
        .forEach(result => {
          this.log(`   ❌ ${result.test}`, 'ERROR');
          this.log(`      Expected: ${result.expected}`, 'ERROR');
          this.log(`      Actual: ${result.actual}`, 'ERROR');
          if (result.error) {
            this.log(`      Error: ${result.error}`, 'ERROR');
          }
        });
    }
    
    if (successRate === 100) {
      this.log('\n🎉 ALL BALANCE TESTS PASSED! Balance system is working perfectly.', 'SUCCESS');
    } else if (successRate >= 90) {
      this.log('\n✅ Most balance tests passed. Minor issues detected.', 'WARNING');
    } else {
      this.log('\n❌ Multiple balance issues detected. System needs attention.', 'ERROR');
    }
  }
}

// Run comprehensive balance tests
async function runBalanceTests() {
  const tester = new BalanceTestSuite();
  await tester.runAllTests();
}

if (require.main === module) {
  runBalanceTests().catch(error => {
    console.error('Balance test suite failed:', error);
    process.exit(1);
  });
}

module.exports = BalanceTestSuite;