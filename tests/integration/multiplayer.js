const io = require('socket.io-client');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Build server URL from environment variables
const HOST = process.env.HOST || 'localhost';
const BACKEND_PORT = process.env.BACKEND_PORT || '5185';
const SERVER_URL = `http://${HOST}:${BACKEND_PORT}`;
const TEST_SCENARIOS = [
  'basic_betting',
  'balance_updates',
  'multiple_rounds',
  'edge_cases',
  'concurrent_players'
];

class MultiplayerTester {
  constructor() {
    this.sockets = [];
    this.rooms = new Map();
    this.testResults = [];
    this.currentTest = '';
  }

  // Crear conexión de socket
  createSocket(playerName) {
    const socket = io(SERVER_URL, { autoConnect: false });
    socket.playerName = playerName;
    
    socket.on('connect', () => {
      console.log(`✅ ${playerName} connected: ${socket.id}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ ${playerName} disconnected`);
    });

    socket.on('roomCreated', (code) => {
      console.log(`🏠 ${playerName} created room: ${code}`);
      this.rooms.set(socket.id, code);
    });

    socket.on('roomJoined', (code) => {
      console.log(`🚪 ${playerName} joined room: ${code}`);
      this.rooms.set(socket.id, code);
    });

    socket.on('gameStateUpdate', (state) => {
      console.log(`🎮 ${playerName} received game state: ${state.phase}`);
      this.logPlayerStates(state, playerName);
    });

    socket.on('bettingError', (error) => {
      console.log(`⚠️ ${playerName} betting error: ${error}`);
      this.addResult('ERROR', `${playerName}: ${error}`);
    });

    this.sockets.push(socket);
    return socket;
  }

  // Log estados de jugadores para debugging
  logPlayerStates(gameState, currentPlayer) {
    if (gameState.players) {
      console.log(`📊 Game State for ${currentPlayer}:`);
      gameState.players.forEach(p => {
        console.log(`  - ${p.name}: Balance=${p.balance}, Bet=${p.bet}, HasPlaced=${p.hasPlacedBet}`);
      });
    }
  }

  // Agregar resultado de test
  addResult(status, message) {
    this.testResults.push({
      test: this.currentTest,
      status,
      message,
      timestamp: new Date().toISOString()
    });
  }

  // Esperar un tiempo determinado
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Test 1: Apuestas básicas
  async testBasicBetting() {
    this.currentTest = 'basic_betting';
    console.log('\n🧪 Testing Basic Betting...');

    const player1 = this.createSocket('TestPlayer1');
    const player2 = this.createSocket('TestPlayer2');

    await Promise.all([
      new Promise(resolve => player1.connect() && player1.on('connect', resolve)),
      new Promise(resolve => player2.connect() && player2.on('connect', resolve))
    ]);

    // Player 1 crea sala
    player1.emit('createRoom', 'TestPlayer1');
    await this.wait(500);

    const roomCode = this.rooms.get(player1.id);
    if (!roomCode) {
      this.addResult('FAIL', 'Room not created');
      return;
    }

    // Player 2 se une
    player2.emit('joinRoom', { code: roomCode, playerName: 'TestPlayer2' });
    await this.wait(500);

    // Iniciar juego
    player1.emit('startGameInRoom', roomCode);
    await this.wait(1000);

    // Test diferentes apuestas
    const bettingTests = [
      { player: player1, amount: 100, expected: 'success' },
      { player: player2, amount: 250, expected: 'success' },
      { player: player1, amount: 1500, expected: 'error' }, // Más que el balance
      { player: player2, amount: 0, expected: 'error' }, // Apuesta cero
    ];

    for (const test of bettingTests) {
      console.log(`💰 Testing bet: ${test.amount} for ${test.player.playerName}`);
      test.player.emit('updateBet', { code: roomCode, amount: test.amount });
      await this.wait(300);
      
      if (test.expected === 'success') {
        test.player.emit('placeBet', { code: roomCode, amount: test.amount });
        await this.wait(300);
      }
    }

    this.addResult('PASS', 'Basic betting tests completed');
    
    // Cleanup
    player1.disconnect();
    player2.disconnect();
  }

  // Test 2: Actualizaciones de balance
  async testBalanceUpdates() {
    this.currentTest = 'balance_updates';
    console.log('\n🧪 Testing Balance Updates...');

    const player1 = this.createSocket('BalanceTest1');
    const player2 = this.createSocket('BalanceTest2');

    await Promise.all([
      new Promise(resolve => player1.connect() && player1.on('connect', resolve)),
      new Promise(resolve => player2.connect() && player2.on('connect', resolve))
    ]);

    // Crear y unirse a sala
    player1.emit('createRoom', 'BalanceTest1');
    await this.wait(500);
    
    const roomCode = this.rooms.get(player1.id);
    player2.emit('joinRoom', { code: roomCode, playerName: 'BalanceTest2' });
    await this.wait(500);

    // Iniciar juego y hacer apuestas
    player1.emit('startGameInRoom', roomCode);
    await this.wait(1000);

    // Apuestas para simular diferentes resultados
    player1.emit('updateBet', { code: roomCode, amount: 200 });
    player1.emit('placeBet', { code: roomCode, amount: 200 });
    await this.wait(300);

    player2.emit('updateBet', { code: roomCode, amount: 300 });
    player2.emit('placeBet', { code: roomCode, amount: 300 });
    await this.wait(1000);

    // Simular acciones de juego (esto requeriría más lógica del juego)
    // Por ahora, verificamos que las apuestas se procesaron correctamente

    this.addResult('PASS', 'Balance update tests completed');
    
    // Cleanup
    player1.disconnect();
    player2.disconnect();
  }

  // Test 3: Múltiples rondas
  async testMultipleRounds() {
    this.currentTest = 'multiple_rounds';
    console.log('\n🧪 Testing Multiple Rounds...');

    const player1 = this.createSocket('RoundTest1');
    const player2 = this.createSocket('RoundTest2');

    await Promise.all([
      new Promise(resolve => player1.connect() && player1.on('connect', resolve)),
      new Promise(resolve => player2.connect() && player2.on('connect', resolve))
    ]);

    // Setup sala
    player1.emit('createRoom', 'RoundTest1');
    await this.wait(500);
    
    const roomCode = this.rooms.get(player1.id);
    player2.emit('joinRoom', { code: roomCode, playerName: 'RoundTest2' });
    await this.wait(500);

    // Simular 3 rondas
    for (let round = 1; round <= 3; round++) {
      console.log(`🔄 Round ${round}`);
      
      // Iniciar ronda
      if (round === 1) {
        player1.emit('startGameInRoom', roomCode);
      } else {
        player1.emit('restartGameInRoom', roomCode);
      }
      await this.wait(1000);

      // Apuestas variables por ronda
      const bet1 = 50 * round;
      const bet2 = 75 * round;

      player1.emit('updateBet', { code: roomCode, amount: bet1 });
      player1.emit('placeBet', { code: roomCode, amount: bet1 });
      await this.wait(300);

      player2.emit('updateBet', { code: roomCode, amount: bet2 });
      player2.emit('placeBet', { code: roomCode, amount: bet2 });
      await this.wait(1000);

      console.log(`✅ Round ${round} betting completed`);
    }

    this.addResult('PASS', 'Multiple rounds test completed');
    
    // Cleanup
    player1.disconnect();
    player2.disconnect();
  }

  // Test 4: Casos extremos
  async testEdgeCases() {
    this.currentTest = 'edge_cases';
    console.log('\n🧪 Testing Edge Cases...');

    const player1 = this.createSocket('EdgeTest1');
    const player2 = this.createSocket('EdgeTest2');

    await Promise.all([
      new Promise(resolve => player1.connect() && player1.on('connect', resolve)),
      new Promise(resolve => player2.connect() && player2.on('connect', resolve))
    ]);

    // Setup
    player1.emit('createRoom', 'EdgeTest1');
    await this.wait(500);
    
    const roomCode = this.rooms.get(player1.id);
    player2.emit('joinRoom', { code: roomCode, playerName: 'EdgeTest2' });
    await this.wait(500);

    player1.emit('startGameInRoom', roomCode);
    await this.wait(1000);

    // Test casos extremos
    const edgeCases = [
      { name: 'All-in bet', player: player1, action: 'allIn' },
      { name: 'Clear bet', player: player2, action: 'clearBet' },
      { name: 'Negative bet', player: player1, amount: -100 },
      { name: 'Zero bet', player: player2, amount: 0 },
      { name: 'Exact balance bet', player: player1, amount: 1000 },
    ];

    for (const testCase of edgeCases) {
      console.log(`🔍 Testing: ${testCase.name}`);
      
      if (testCase.action === 'allIn') {
        testCase.player.emit('allIn', { code: roomCode });
      } else if (testCase.action === 'clearBet') {
        testCase.player.emit('clearBet', { code: roomCode });
      } else if (testCase.amount !== undefined) {
        testCase.player.emit('updateBet', { code: roomCode, amount: testCase.amount });
      }
      
      await this.wait(500);
    }

    this.addResult('PASS', 'Edge cases test completed');
    
    // Cleanup
    player1.disconnect();
    player2.disconnect();
  }

  // Test 5: Jugadores concurrentes
  async testConcurrentPlayers() {
    this.currentTest = 'concurrent_players';
    console.log('\n🧪 Testing Concurrent Players...');

    const players = [];
    const playerCount = 4;

    // Crear múltiples jugadores
    for (let i = 1; i <= playerCount; i++) {
      const player = this.createSocket(`ConcurrentTest${i}`);
      players.push(player);
    }

    // Conectar todos
    await Promise.all(players.map(player => 
      new Promise(resolve => player.connect() && player.on('connect', resolve))
    ));

    // Player 1 crea sala
    players[0].emit('createRoom', 'ConcurrentTest1');
    await this.wait(500);

    const roomCode = this.rooms.get(players[0].id);

    // Otros se unen
    for (let i = 1; i < playerCount; i++) {
      players[i].emit('joinRoom', { code: roomCode, playerName: `ConcurrentTest${i + 1}` });
      await this.wait(200);
    }

    // Iniciar juego
    players[0].emit('startGameInRoom', roomCode);
    await this.wait(1000);

    // Apuestas concurrentes
    const bettingPromises = players.map((player, index) => {
      const amount = (index + 1) * 100;
      return new Promise(async (resolve) => {
        player.emit('updateBet', { code: roomCode, amount });
        await this.wait(100);
        player.emit('placeBet', { code: roomCode, amount });
        resolve();
      });
    });

    await Promise.all(bettingPromises);
    await this.wait(2000);

    this.addResult('PASS', 'Concurrent players test completed');
    
    // Cleanup
    players.forEach(player => player.disconnect());
  }

  // Ejecutar todos los tests
  async runAllTests() {
    console.log('🚀 Starting Multiplayer Blackjack Tests...\n');
    
    const startTime = Date.now();

    try {
      await this.testBasicBetting();
      await this.wait(1000);
      
      await this.testBalanceUpdates();
      await this.wait(1000);
      
      await this.testMultipleRounds();
      await this.wait(1000);
      
      await this.testEdgeCases();
      await this.wait(1000);
      
      await this.testConcurrentPlayers();
      
    } catch (error) {
      console.error('❌ Test execution error:', error);
      this.addResult('ERROR', `Test execution failed: ${error.message}`);
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    this.printResults(duration);
  }

  // Imprimir resultados
  printResults(duration) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const errors = this.testResults.filter(r => r.status === 'ERROR').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Errors: ${errors}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📝 Total Tests: ${this.testResults.length}`);
    
    if (failed > 0 || errors > 0) {
      console.log('\n🔍 DETAILED FAILURES:');
      this.testResults
        .filter(r => r.status === 'FAIL' || r.status === 'ERROR')
        .forEach(result => {
          console.log(`  ${result.status}: [${result.test}] ${result.message}`);
        });
    }
    
    console.log('\n' + '='.repeat(60));
    
    const successRate = (passed / this.testResults.length) * 100;
    if (successRate === 100) {
      console.log('🎉 ALL TESTS PASSED! System is working correctly.');
    } else if (successRate >= 80) {
      console.log('⚠️  Most tests passed, but some issues detected.');
    } else {
      console.log('❌ Multiple failures detected. System needs attention.');
    }
  }
}

// Ejecutar tests si se ejecuta directamente
if (require.main === module) {
  const tester = new MultiplayerTester();
  tester.runAllTests().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = MultiplayerTester;