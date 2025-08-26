/**
 * Demo del contador de victorias para multiplayer
 * Simula una sesión de 8 jugadores para mostrar el formato del reporte
 */

class VictoryCounterDemo {
  constructor() {
    this.players = [];
    this.totalRounds = 5;
  }

  log(message, type = 'INFO') {
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

    const logMessage = `${colors[type]}${message}${colors.RESET}`;
    console.log(logMessage);
  }

  // Simular datos de jugadores con resultados aleatorios
  generateMockPlayers() {
    const playerNames = ['Player1', 'Player2', 'Player3', 'Player4', 'Player5', 'Player6', 'Player7', 'Player8'];
    
    for (let i = 0; i < 8; i++) {
      const player = {
        name: playerNames[i],
        gamesWon: 0,
        gamesLost: 0,
        gamesDraw: 0,
        gamesBust: 0,
        gamesBlackjack: 0,
        roundResults: [],
        currentBalance: 1000
      };

      // Simular resultados para 5 rondas
      for (let round = 1; round <= this.totalRounds; round++) {
        const outcomes = ['win', 'lose', 'draw', 'bust', 'blackjack'];
        const weights = [0.35, 0.40, 0.10, 0.10, 0.05]; // Probabilidades realistas
        
        const result = this.weightedRandom(outcomes, weights);
        const bet = 50 + Math.floor(Math.random() * 200);
        let payout = 0;

        switch (result) {
          case 'win':
            player.gamesWon++;
            payout = bet * 2;
            break;
          case 'blackjack':
            player.gamesBlackjack++;
            payout = Math.floor(bet * 2.5);
            break;
          case 'draw':
            player.gamesDraw++;
            payout = bet;
            break;
          case 'lose':
            player.gamesLost++;
            payout = 0;
            break;
          case 'bust':
            player.gamesBust++;
            payout = 0;
            break;
        }

        player.roundResults.push({
          round: round,
          bet: bet,
          result: result,
          payout: payout,
          netChange: payout - bet
        });

        // Actualizar balance
        player.currentBalance = player.currentBalance - bet + payout;
      }

      this.players.push(player);
    }
  }

  weightedRandom(items, weights) {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    
    return items[items.length - 1];
  }

  generateVictoryReport() {
    this.log('\n🎯 === VICTORY COUNTER DEMO - 8 PLAYERS SESSION === 🎯', 'SUCCESS');

    // Collect player data for ranking
    const playerStats = [];

    this.log(`\n🏆 === VICTORY COUNTER BY SESSION === 🏆`);

    for (const player of this.players) {
      const totalVictories = player.gamesWon + player.gamesBlackjack;
      const winRate = player.roundResults.length > 0 ? (totalVictories / player.roundResults.length * 100) : 0;
      const netResult = player.currentBalance - 1000;

      // Store player stats for ranking
      playerStats.push({
        name: player.name,
        victories: totalVictories,
        winRate: winRate,
        gamesWon: player.gamesWon,
        gamesBlackjack: player.gamesBlackjack,
        gamesLost: player.gamesLost,
        gamesDraw: player.gamesDraw,
        gamesBust: player.gamesBust,
        totalGames: player.roundResults.length,
        finalBalance: player.currentBalance,
        netResult: netResult
      });

      // Display victory count prominently
      this.log(`🏆 ${player.name}: ${totalVictories} VICTORIES (${player.gamesWon} wins + ${player.gamesBlackjack} blackjacks) - Win Rate: ${winRate.toFixed(1)}%`, 'SUCCESS');
    }

    // Sort players by victories (descending)
    playerStats.sort((a, b) => b.victories - a.victories);

    this.log(`\n🥇 === VICTORY RANKING === 🥇`);
    playerStats.forEach((player, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      this.log(`${medal} ${player.name}: ${player.victories} victories (${player.winRate.toFixed(1)}% win rate)`, 'REWARD');
    });

    this.log(`\n📊 DETAILED PLAYER ANALYSIS:`);

    for (const player of playerStats) {
      this.log(`\n--- ${player.name} ---`);
      this.log(`  🏆 VICTORIES: ${player.victories} (${player.gamesWon} regular wins + ${player.gamesBlackjack} blackjacks)`);
      this.log(`  📊 Games: W:${player.gamesWon} L:${player.gamesLost} D:${player.gamesDraw} B:${player.gamesBust} BJ:${player.gamesBlackjack}`);
      this.log(`  📈 Win Rate: ${player.winRate.toFixed(1)}%`);
      this.log(`  💰 Final Balance: ${player.finalBalance} (Net: ${player.netResult >= 0 ? '+' : ''}${player.netResult})`);
    }

    // Victory distribution by round
    this.log(`\n🎯 VICTORIES BY ROUND:`);
    for (let round = 1; round <= this.totalRounds; round++) {
      const roundVictories = [];
      for (const player of this.players) {
        const roundResult = player.roundResults.find(r => r.round === round);
        if (roundResult && (roundResult.result === 'win' || roundResult.result === 'blackjack')) {
          roundVictories.push({
            name: player.name,
            result: roundResult.result,
            payout: roundResult.payout
          });
        }
      }
      
      this.log(`  Round ${round}: ${roundVictories.length} victories`);
      roundVictories.forEach(victory => {
        const victoryType = victory.result === 'blackjack' ? '🃏 BLACKJACK' : '🏆 WIN';
        this.log(`    ${victoryType} - ${victory.name} (payout: ${victory.payout})`);
      });
      
      if (roundVictories.length === 0) {
        this.log(`    No victories this round`);
      }
    }

    // Overall statistics
    const totalVictories = playerStats.reduce((sum, p) => sum + p.victories, 0);
    const totalGames = playerStats.reduce((sum, p) => sum + p.totalGames, 0);
    const champion = playerStats[0];
    
    this.log(`\n📈 OVERALL SESSION STATISTICS:`);
    this.log(`  Total Players: 8`);
    this.log(`  Total Rounds: ${this.totalRounds}`);
    this.log(`  Total Games Played: ${totalGames}`);
    this.log(`  🏆 TOTAL VICTORIES ACROSS ALL PLAYERS: ${totalVictories}`, 'SUCCESS');
    this.log(`  📊 Average Victories per Player: ${(totalVictories / 8).toFixed(1)}`);
    this.log(`  👑 SESSION CHAMPION: ${champion.name} with ${champion.victories} victories!`, 'REWARD');

    this.log(`\n🎯 DEMO COMPLETE: Victory counter successfully implemented for multiplayer sessions!`, 'SUCCESS');
  }

  runDemo() {
    this.generateMockPlayers();
    this.generateVictoryReport();
  }
}

// Ejecutar demo
if (require.main === module) {
  const demo = new VictoryCounterDemo();
  demo.runDemo();
}

module.exports = VictoryCounterDemo;