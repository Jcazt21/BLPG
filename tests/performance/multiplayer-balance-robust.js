const { io } = require('socket.io-client');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Build server URL from environment variables
const HOST = process.env.HOST || 'localhost';
const BACKEND_PORT = process.env.BACKEND_PORT || '5185';
const SERVER_URL = `http://${HOST}:${BACKEND_PORT}`;

class RobustMultiplayerBalanceTester {
    constructor() {
        this.players = [];
        this.roomCode = null;
        this.testResults = [];
        this.currentTest = null;
        this.detailedLogs = [];
    }

    log(message, type = 'INFO', playerId = null) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const colors = {
            INFO: '\x1b[36m',
            SUCCESS: '\x1b[32m',
            ERROR: '\x1b[31m',
            WARNING: '\x1b[33m',
            BALANCE: '\x1b[35m',
            PAYOUT: '\x1b[93m',
            RESET: '\x1b[0m'
        };

        const playerPrefix = playerId ? `[${playerId}] ` : '';
        const logMessage = `${colors[type]}[${timestamp}] ${playerPrefix}${message}${colors.RESET}`;
        console.log(logMessage);

        // Store detailed logs for analysis
        this.detailedLogs.push({
            timestamp: new Date().toISOString(),
            type,
            playerId,
            message,
            test: this.currentTest
        });
    }

    async createPlayer(playerName, playerId) {
        const socket = io(SERVER_URL, {
            autoConnect: false,
            timeout: 3000,
            reconnection: false
        });

        const player = {
            id: playerId,
            name: playerName,
            socket: socket,
            balance: 1000,
            bet: 0,
            hasPlacedBet: false,
            connected: false,
            gameState: null,
            balanceHistory: [{ action: 'initial', balance: 1000, bet: 0, timestamp: Date.now() }]
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
        });

        socket.on('gameStateUpdate', (state) => {
            const previousBalance = player.balance;
            const previousBet = player.bet;

            player.gameState = state;
            const myPlayer = state.players?.find(p => p.id === socket.id);

            if (myPlayer) {
                player.balance = myPlayer.balance;
                player.bet = myPlayer.bet;
                player.hasPlacedBet = myPlayer.hasPlacedBet;

                // Track balance changes
                if (previousBalance !== player.balance || previousBet !== player.bet) {
                    const balanceChange = player.balance - previousBalance;
                    const betChange = player.bet - previousBet;

                    player.balanceHistory.push({
                        action: `phase_${state.phase}`,
                        balance: player.balance,
                        bet: player.bet,
                        balanceChange,
                        betChange,
                        phase: state.phase,
                        timestamp: Date.now()
                    });

                    this.log(`Balance Update - Balance: ${player.balance} (${balanceChange >= 0 ? '+' : ''}${balanceChange}), Bet: ${player.bet} (${betChange >= 0 ? '+' : ''}${betChange}), Phase: ${state.phase}`, 'BALANCE', player.name);
                }
            }

            // Log results if available
            if (state.results && state.results[socket.id]) {
                const result = state.results[socket.id];
                this.log(`RESULT: ${result.status} | Bet: ${player.bet} | Payout: ${result.payout} | Final Balance: ${result.finalBalance}`, 'PAYOUT', player.name);

                // Verify payout calculation
                const expectedFinalBalance = player.balance;
                if (expectedFinalBalance !== result.finalBalance) {
                    this.log(`⚠️ PAYOUT MISMATCH: Expected ${expectedFinalBalance}, Got ${result.finalBalance}`, 'ERROR', player.name);
                }
            }
        });

        socket.on('bettingError', (msg) => {
            this.log(`Betting Error: ${msg}`, 'ERROR', player.name);
        });

        socket.on('roomError', (msg) => {
            this.log(`Room Error: ${msg}`, 'ERROR', player.name);
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
        this.log('=== BETTING PHASE START ===');

        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            const betAmount = bets[i] || 100;

            this.log(`Placing bet: ${betAmount}`, 'INFO', player.name);

            // Record pre-bet state
            const preBetBalance = player.balance;
            const preBetBet = player.bet;

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

            // Verify bet was placed correctly
            const expectedBalance = preBetBalance + preBetBet - betAmount;
            if (player.balance !== expectedBalance) {
                this.log(`⚠️ BET PLACEMENT ERROR: Expected balance ${expectedBalance}, got ${player.balance}`, 'ERROR', player.name);
            }

            if (player.bet !== betAmount) {
                this.log(`⚠️ BET AMOUNT ERROR: Expected bet ${betAmount}, got ${player.bet}`, 'ERROR', player.name);
            }
        }

        this.log('=== BETTING PHASE COMPLETE ===');
    }

    async simulateGameplay() {
        this.log('=== GAMEPLAY PHASE START ===');

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

        // Simulate player actions with detailed logging
        let maxActions = 20;
        while (maxActions > 0) {
            const gameState = this.players[0].gameState;
            if (!gameState || gameState.phase !== 'playing') break;

            const currentPlayerIndex = gameState.turn;
            const currentPlayerId = gameState.players[currentPlayerIndex]?.id;
            const currentPlayer = this.players.find(p => p.socket.id === currentPlayerId);

            if (currentPlayer) {
                const action = Math.random() > 0.6 ? 'stand' : 'hit';
                this.log(`Taking action: ${action}`, 'INFO', currentPlayer.name);

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

        this.log('=== GAMEPLAY PHASE COMPLETE ===');
    }

    async analyzeResults() {
        this.log('=== RESULT ANALYSIS START ===');

        const gameState = this.players[0].gameState;
        if (!gameState || !gameState.results) {
            this.log('No results available', 'ERROR');
            return null;
        }

        const roundResults = {
            round: this.currentTest?.currentRound || 1,
            players: [],
            issues: []
        };

        for (const player of this.players) {
            const result = gameState.results[player.socket.id];
            const preBetBalance = player.balanceHistory.find(h => h.action.includes('betting'))?.balance || 1000;

            if (!result) {
                this.log(`⚠️ NO RESULT DATA for player`, 'ERROR', player.name);
                roundResults.issues.push(`No result data for ${player.name}`);
                continue;
            }

            // Get the balance just before the result phase (after betting)
            const preResultBalance = player.balanceHistory
                .filter(h => h.phase && h.phase !== 'result')
                .slice(-1)[0]?.balance || player.balance;

            const playerResult = {
                name: player.name,
                socketId: player.socket.id,
                preBetBalance: preBetBalance,
                preResultBalance: preResultBalance,
                betAmount: player.bet,
                gameResult: result.status,
                expectedPayout: this.calculateExpectedPayout(player.bet, result.status),
                actualPayout: result.payout,
                expectedFinalBalance: preResultBalance + result.payout,
                actualFinalBalance: player.balance,
                balanceHistory: [...player.balanceHistory]
            };

            // Verify payout calculation
            if (playerResult.expectedPayout !== playerResult.actualPayout) {
                const issue = `${player.name}: Payout mismatch - Expected ${playerResult.expectedPayout}, Got ${playerResult.actualPayout}`;
                this.log(`⚠️ ${issue}`, 'ERROR', player.name);
                roundResults.issues.push(issue);
            }

            // Verify final balance
            if (playerResult.expectedFinalBalance !== playerResult.actualFinalBalance) {
                const issue = `${player.name}: Balance mismatch - Expected ${playerResult.expectedFinalBalance}, Got ${playerResult.actualFinalBalance}`;
                this.log(`⚠️ ${issue}`, 'ERROR', player.name);
                roundResults.issues.push(issue);
            }

            this.log(`ANALYSIS: ${playerResult.gameResult} | Bet: ${playerResult.betAmount} | Payout: ${playerResult.actualPayout}/${playerResult.expectedPayout} | Balance: ${playerResult.actualFinalBalance}/${playerResult.expectedFinalBalance}`,
                roundResults.issues.length > 0 ? 'ERROR' : 'SUCCESS', player.name);

            roundResults.players.push(playerResult);
        }

        this.log('=== RESULT ANALYSIS COMPLETE ===');
        return roundResults;
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

    async runRobustTest() {
        this.currentTest = { name: 'Robust Balance Test', currentRound: 1 };

        try {
            this.log('🎮 Starting Robust Multiplayer Balance Test 🎮', 'SUCCESS');

            // Create players in parallel for speed
            this.log('Creating players...');
            await Promise.all([
                this.createPlayer('Player1', 'p1'),
                this.createPlayer('Player2', 'p2')
            ]);

            // Setup game
            await this.createRoom();
            await this.joinAllPlayers();
            await this.startGame();

            // Test simple betting scenario
            const testScenarios = [
                { name: 'Simple Balance Test', bets: [100, 200] }
            ];

            for (const scenario of testScenarios) {
                this.log(`\n=== Testing Scenario: ${scenario.name} ===`, 'SUCCESS');
                this.currentTest.scenario = scenario.name;

                await this.placeBets(scenario.bets);
                await this.simulateGameplay();
                const results = await this.analyzeResults();

                if (results) {
                    this.testResults.push(results);
                }

                // Start next round if not last scenario
                if (scenario !== testScenarios[testScenarios.length - 1]) {
                    const creator = this.players[0];
                    creator.socket.emit('restartGameInRoom', this.roomCode);
                    await this.delay(3000);
                }
            }

            this.generateDetailedReport();

        } catch (error) {
            this.log(`Test failed: ${error.message}`, 'ERROR');
            throw error;
        } finally {
            await this.cleanup();
        }
    }

    generateDetailedReport() {
        this.log('\n📊 === DETAILED BALANCE TEST REPORT === 📊', 'SUCCESS');

        let totalIssues = 0;
        let totalPlayers = 0;
        let totalBetsPlaced = 0;
        let totalPayouts = 0;
        let totalExpectedPayouts = 0;

        for (const result of this.testResults) {
            this.log(`\n--- ${result.round ? `Round ${result.round}` : 'Test'} Results ---`);

            totalIssues += result.issues.length;
            totalPlayers += result.players.length;

            for (const player of result.players) {
                totalBetsPlaced += player.betAmount;
                totalPayouts += player.actualPayout;
                totalExpectedPayouts += player.expectedPayout;

                const status = result.issues.some(i => i.includes(player.name)) ? '❌' : '✅';
                this.log(`  ${status} ${player.name}: ${player.gameResult} | Bet: ${player.betAmount} | Payout: ${player.actualPayout} | Balance: ${player.actualFinalBalance}`);
            }

            if (result.issues.length > 0) {
                this.log(`  🔍 Issues Found:`, 'ERROR');
                result.issues.forEach(issue => this.log(`    - ${issue}`, 'ERROR'));
            }
        }

        this.log(`\n📈 SUMMARY:`);
        this.log(`   Total Players Tested: ${totalPlayers}`);
        this.log(`   Total Bets Placed: ${totalBetsPlaced} chips`);
        this.log(`   Expected Payouts: ${totalExpectedPayouts} chips`);
        this.log(`   Actual Payouts: ${totalPayouts} chips`);
        this.log(`   Payout Accuracy: ${totalExpectedPayouts === totalPayouts ? '✅ Perfect' : '❌ Issues Found'}`);
        this.log(`   Total Issues Found: ${totalIssues}`);

        if (totalIssues === 0) {
            this.log('\n🎉 ALL BALANCE TESTS PASSED! No issues found with payouts or balance tracking.', 'SUCCESS');
        } else {
            this.log(`\n⚠️ ${totalIssues} ISSUES FOUND! Balance system needs attention.`, 'ERROR');

            // Generate detailed issue report
            this.log('\n🔍 DETAILED ISSUE BREAKDOWN:', 'ERROR');
            this.testResults.forEach((result, index) => {
                if (result.issues.length > 0) {
                    this.log(`  Test ${index + 1}:`, 'ERROR');
                    result.issues.forEach(issue => this.log(`    - ${issue}`, 'ERROR'));
                }
            });
        }

        // Save detailed logs to file for analysis
        this.saveLogsToFile();
    }

    saveLogsToFile() {
        const fs = require('fs');
        const logData = {
            timestamp: new Date().toISOString(),
            testResults: this.testResults,
            detailedLogs: this.detailedLogs,
            playerBalanceHistories: this.players.map(p => ({
                name: p.name,
                balanceHistory: p.balanceHistory
            }))
        };

        const filename = `balance-test-log-${Date.now()}.json`;
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

// Run robust tests
async function runRobustBalanceTests() {
    const tester = new RobustMultiplayerBalanceTester();

    try {
        await tester.runRobustTest();
    } catch (error) {
        console.error('Robust balance test suite failed:', error);
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
    runRobustBalanceTests();
}

module.exports = RobustMultiplayerBalanceTester;