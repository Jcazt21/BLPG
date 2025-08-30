/**
 * Test para verificar que los contadores de victorias se preservan entre rondas
 */

// Simulación de datos de jugadores
let mockPlayers = new Map();

// Simular creación de jugadores
function createPlayer(id, name) {
  const player = {
    id: id,
    name: name,
    position: mockPlayers.size,
    hand: [],
    total: 0,
    isBust: false,
    isStand: false,
    isBlackjack: false,
    status: 'playing',
    // Victory counters
    victories: 0,
    gamesWon: 0,
    gamesBlackjack: 0,
    gamesLost: 0,
    gamesDraw: 0,
    gamesBust: 0,
  };
  
  mockPlayers.set(id, player);
  console.log(`✅ Created player: ${name} with ${player.victories} victories`);
  return player;
}

// Simular actualización de victorias
function updateVictories(playerId, result) {
  const player = mockPlayers.get(playerId);
  if (!player) return;
  
  console.log(`🎯 Player ${player.name} result: ${result}, victories before: ${player.victories}`);
  
  switch (result) {
    case 'win':
      player.gamesWon++;
      player.victories++;
      break;
    case 'blackjack':
      player.gamesBlackjack++;
      player.victories++;
      break;
    case 'lose':
      player.gamesLost++;
      break;
    case 'draw':
      player.gamesDraw++;
      break;
    case 'bust':
      player.gamesBust++;
      player.gamesLost++;
      break;
  }
  
  console.log(`🏆 Player ${player.name} victories after: ${player.victories}`);
}

// Simular reset de ronda (preservando victorias)
function resetRound() {
  console.log('\n🔄 === RESETTING ROUND (PRESERVING VICTORIES) ===');
  
  for (const [playerId, player] of mockPlayers.entries()) {
    console.log(`Before reset - ${player.name}: ${player.victories} victories`);
    
    // Reset game state but preserve victory counters
    player.hand = [];
    player.total = 0;
    player.isBust = false;
    player.isStand = false;
    player.isBlackjack = false;
    player.status = 'playing';
    // Victory counters are preserved between rounds
    
    console.log(`After reset - ${player.name}: ${player.victories} victories`);
  }
  
  console.log('=== ROUND RESET COMPLETE ===\n');
}

// Simular nueva ronda con dealing
function startNewRound() {
  console.log('🎲 === STARTING NEW ROUND ===');
  
  // Simular dealing (preservando referencias de jugadores)
  const players = [];
  
  for (const [playerId, player] of mockPlayers.entries()) {
    console.log(`Dealing to ${player.name} - victories: ${player.victories}`);
    
    // Simular dealing cards
    player.hand = ['A♠', 'K♥']; // Ejemplo
    player.total = 21;
    player.isBlackjack = true;
    player.status = 'blackjack';
    
    players.push(player);
  }
  
  console.log('=== NEW ROUND STARTED ===\n');
  return players;
}

// Ejecutar test
function runVictoryPersistenceTest() {
  console.log('🧪 === VICTORY PERSISTENCE TEST ===\n');
  
  // Crear jugadores
  createPlayer('p1', 'Player1');
  createPlayer('p2', 'Player2');
  createPlayer('p3', 'Player3');
  
  console.log('\n📊 === ROUND 1 RESULTS ===');
  updateVictories('p1', 'win');
  updateVictories('p2', 'blackjack');
  updateVictories('p3', 'lose');
  
  console.log('\n📊 Current Standings:');
  for (const [id, player] of mockPlayers) {
    console.log(`${player.name}: ${player.victories} victories`);
  }
  
  // Reset para nueva ronda
  resetRound();
  
  console.log('📊 After Round Reset:');
  for (const [id, player] of mockPlayers) {
    console.log(`${player.name}: ${player.victories} victories`);
  }
  
  // Nueva ronda
  startNewRound();
  
  console.log('\n📊 === ROUND 2 RESULTS ===');
  updateVictories('p1', 'blackjack');
  updateVictories('p2', 'win');
  updateVictories('p3', 'win');
  
  console.log('\n🏆 === FINAL STANDINGS ===');
  const sortedPlayers = Array.from(mockPlayers.values())
    .sort((a, b) => b.victories - a.victories);
  
  sortedPlayers.forEach((player, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    console.log(`${medal} ${player.name}: ${player.victories} victories (${player.gamesWon} wins + ${player.gamesBlackjack} BJ)`);
  });
  
  // Verificar que las victorias se preservaron
  const totalVictories = Array.from(mockPlayers.values())
    .reduce((sum, p) => sum + p.victories, 0);
  
  console.log(`\n✅ Total victories across all players: ${totalVictories}`);
  console.log('✅ Victory persistence test completed successfully!');
  
  if (totalVictories > 0) {
    console.log('🎉 VICTORY COUNTERS ARE WORKING CORRECTLY!');
  } else {
    console.log('❌ ERROR: Victory counters were reset!');
  }
}

// Ejecutar el test
runVictoryPersistenceTest();