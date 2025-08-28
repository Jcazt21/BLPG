const { io } = require('socket.io-client');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Build server URL from environment variables
const HOST = process.env.HOST || 'localhost';
const BACKEND_PORT = process.env.BACKEND_PORT || '5185';
const SERVER_URL = `http://${HOST}:${BACKEND_PORT}`;

class QuickTester {
  constructor() {
    this.socket = null;
    this.roomCode = null;
    this.connected = false;
    this.gameStarted = false;
  }

  log(message, type = 'INFO') {
    const colors = {
      INFO: '\x1b[36m',
      SUCCESS: '\x1b[32m',
      ERROR: '\x1b[31m',
      WARNING: '\x1b[33m',
      RESET: '\x1b[0m'
    };
    console.log(`${colors[type]}${message}${colors.RESET}`);
  }

  async connect() {
    this.log('🔌 Connecting to server...');
    
    this.socket = io(SERVER_URL, {
      timeout: 3000,
      reconnection: false
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 3000);

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        this.connected = true;
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
      this.gameStarted = true;
      this.log(`🎮 Game started - Phase: ${state.phase}`, 'SUCCESS');
    });

    this.socket.on('gameStateUpdate', (state) => {
      const myPlayer = state.players?.find(p => p.id === this.socket.id);
      if (myPlayer) {
        this.log(`💰 Balance: ${myPlayer.balance}, Bet: ${myPlayer.bet}, Phase: ${state.phase}`);
      }
    });

    this.socket.on('bettingError', (msg) => {
      this.log(`❌ Betting Error: ${msg}`, 'ERROR');
    });

    this.socket.on('roomError', (msg) => {
      this.log(`❌ Room Error: ${msg}`, 'ERROR');
    });
  }

  async testBasicFlow() {
    try {
      this.log(`🌐 Testing server at: ${SERVER_URL}`);
      
      // 1. Connect
      await this.connect();
      
      // 2. Create room
      this.log('🏠 Creating room...');
      this.socket.emit('createRoom', 'QuickTester');
      await this.delay(1000);
      
      if (!this.roomCode) {
        throw new Error('Room not created');
      }
      
      // 3. Start game
      this.log('🎮 Starting game...');
      this.socket.emit('startGameInRoom', this.roomCode);
      await this.delay(2000);
      
      if (!this.gameStarted) {
        throw new Error('Game not started');
      }
      
      // 4. Test basic betting
      this.log('💰 Testing basic bet (100)...');
      this.socket.emit('updateBet', { code: this.roomCode, amount: 100 });
      await this.delay(500);
      
      this.socket.emit('placeBet', { code: this.roomCode, amount: 100 });
      await this.delay(1000);
      
      // 5. Test invalid bet
      this.log('❌ Testing invalid bet (2000)...');
      this.socket.emit('updateBet', { code: this.roomCode, amount: 2000 });
      await this.delay(500);
      
      this.socket.emit('placeBet', { code: this.roomCode, amount: 2000 });
      await this.delay(1000);
      
      this.log('🎉 Quick test completed successfully!', 'SUCCESS');
      
    } catch (error) {
      this.log(`❌ Test failed: ${error.message}`, 'ERROR');
      throw error;
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

// Run quick test
async function runQuickTest() {
  console.log('🚀 Starting Quick Test...\n');
  
  const tester = new QuickTester();
  
  try {
    await tester.testBasicFlow();
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.log(`\n❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  runQuickTest();
}

module.exports = QuickTester;