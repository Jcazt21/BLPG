// import gameService from './gameService';

// describe('GameService Unit', () => {
//   it('should create a session and start a game', () => {
//     const sessionId = gameService.createSession('TestPlayer');
//     const gameState = gameService.startGame(sessionId, 'TestPlayer', 100, 1000);
//     expect(gameState.player.name).toBe('TestPlayer');
//     expect(gameState.player.bet).toBe(100);
//     expect(gameState.player.balance).toBe(900);
//     expect(gameState.dealer.hand.cards.length).toBe(1); // Only one card shown at start
//   });
// 
//   it('should allow player to hit and add a card', () => {
//     const sessionId = gameService.createSession('Hitter');
//     gameService.startGame(sessionId, 'Hitter', 50, 1000);
//     const before = gameService.getGameState(sessionId).player.hands[0].cards.length;
//     gameService.hit(sessionId);
//     const after = gameService.getGameState(sessionId).player.hands[0].cards.length;
//     expect(after).toBe(before + 1);
//   });
// 
//   it('should not allow hit without a valid session', () => {
//     expect(() => gameService.hit('invalid-session')).toThrow('Session not found');
//   });
// 
//   // Puedes agregar más tests para stand, doubleDown, split, etc.
// }); 