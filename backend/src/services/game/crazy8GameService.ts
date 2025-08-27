import { Server } from 'socket.io';
import { Card, Suit, Crazy8Player, Crazy8GameState, Crazy8GamePhase, ScoreResult } from '../../types/gameTypes';
import { Crazy8Room } from '../../models/roomModel';
import { DealingService } from './dealingService';
import { Crazy8ErrorCode, Crazy8ValidationResult } from '../../types/crazy8Types';

/**
 * Service for managing Crazy 8 game logic and state
 */
export class Crazy8GameService {
  private io: Server;
  private dealingService: DealingService;
  private rooms: Map<string, Crazy8Room> = new Map();
  private turnTimers: Map<string, { timer: NodeJS.Timeout; playerId: string }> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.dealingService = new DealingService();
  }

  /**
   * Creates a new Crazy 8 room
   * Requirements: 1.2, 1.3
   */
  createRoom(creatorId: string, creatorName: string): string {
    const roomCode = this.generateRoomCode();
    
    const room: Crazy8Room = {
      code: roomCode,
      creatorId,
      playerIds: [creatorId],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      gameType: 'crazy8',
      gameState: null,
      maxPlayers: 6,
      minPlayers: 2
    };

    this.rooms.set(roomCode, room);
    
    // Emit room created event
    this.io.to(creatorId).emit('crazy8:room-created', { roomCode });
    
    return roomCode;
  }

  /**
   * Starts a new Crazy 8 game in the specified room
   * Requirements: 1.2, 1.3
   */
  startGame(roomCode: string, players: Crazy8Player[]): void {
    const room = this.rooms.get(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    if (players.length < room.minPlayers || players.length > room.maxPlayers) {
      throw new Error(`Invalid player count. Must be between ${room.minPlayers} and ${room.maxPlayers}`);
    }

    // Initialize game state
    const gameState = this.initializeGameState(players);
    room.gameState = gameState;
    room.updatedAt = new Date();

    // Deal initial cards (7 cards per player)
    this.dealInitialHand(gameState);

    // Set up starting discard pile
    this.setupStartingDiscardPile(gameState);

    // Randomly select first player (Requirement 3.1)
    gameState.currentPlayerIndex = Math.floor(Math.random() * players.length);
    gameState.players[gameState.currentPlayerIndex].isCurrentTurn = true;

    // Update phase to playing
    gameState.phase = 'playing';

    // Start turn timer for the first player (Requirement 3.3)
    this.startTurnTimer(roomCode, gameState);

    // Broadcast game started event
    this.broadcastGameState(roomCode, gameState);
  }

  /**
   * Handles a player playing a card
   * Requirements: 2.2, 2.3, 4.1
   */
  playCard(roomCode: string, playerId: string, card: Card): boolean {
    const room = this.rooms.get(roomCode);
    if (!room?.gameState) {
      return false;
    }

    const validation = this.validatePlay(room.gameState, playerId, card);
    if (!validation.isValid) {
      this.emitError(playerId, validation.errorMessage || 'Invalid play');
      return false;
    }

    const player = room.gameState.players.find(p => p.id === playerId);
    if (!player) {
      return false;
    }

    // Remove card from player's hand
    const cardIndex = player.hand.findIndex(c => c.suit === card.suit && c.value === card.value);
    if (cardIndex === -1) {
      return false;
    }

    player.hand.splice(cardIndex, 1);
    player.cardCount = player.hand.length;

    // Add card to discard pile
    room.gameState.discardPile.push(card);
    room.gameState.topCard = card;

    // Handle special case for 8s (wild cards)
    if (card.value === '8') {
      room.gameState.phase = 'suit-selection';
      this.io.to(playerId).emit('crazy8:suit-selection-required', { playerId });
      return true;
    }

    // Update active suit
    room.gameState.activeSuit = card.suit;

    // Check win condition
    if (this.checkWinCondition(player)) {
      this.handleGameEnd(roomCode, player);
      return true;
    }

    // Advance turn
    this.advanceTurn(room.gameState);

    // Broadcast updated game state
    this.broadcastGameState(roomCode, room.gameState);

    return true;
  }

  /**
   * Handles a player drawing a card from the deck
   * Requirements: 2.5, 2.6, 2.7, 3.2
   */
  drawCard(roomCode: string, playerId: string): void {
    const room = this.rooms.get(roomCode);
    if (!room?.gameState) {
      return;
    }

    const player = room.gameState.players.find(p => p.id === playerId);
    if (!player || !player.isCurrentTurn) {
      this.emitError(playerId, 'Not your turn', Crazy8ErrorCode.NOT_PLAYER_TURN);
      return;
    }

    // Enhanced turn validation (Requirement 3.2)
    if (room.gameState.players[room.gameState.currentPlayerIndex].id !== playerId) {
      this.emitError(playerId, 'Turn order validation failed', Crazy8ErrorCode.NOT_PLAYER_TURN);
      return;
    }

    if (room.gameState.phase !== 'playing') {
      this.emitError(playerId, 'Game is not in playing phase', Crazy8ErrorCode.GAME_NOT_STARTED);
      return;
    }

    // Handle empty deck by reshuffling discard pile
    if (room.gameState.deckCount === 0) {
      this.reshuffleDiscardPile(room.gameState);
    }

    // Draw card from deck
    const drawnCard = this.dealingService.drawCard();
    player.hand.push(drawnCard);
    player.cardCount = player.hand.length;
    room.gameState.deckCount--;

    // Check if drawn card is playable
    const canPlayDrawnCard = this.isValidPlay(drawnCard, room.gameState.topCard, room.gameState.activeSuit);
    
    if (canPlayDrawnCard) {
      // Player can choose to play the drawn card immediately
      // For now, we'll advance the turn and let them decide on their next action
    }

    // Advance turn
    this.advanceTurn(room.gameState);

    // Broadcast updated game state
    this.broadcastGameState(roomCode, room.gameState);
  }

  /**
   * Handles suit selection when an 8 is played
   * Requirements: 4.1, 4.2, 4.3, 3.2
   */
  chooseSuit(roomCode: string, playerId: string, suit: Suit): void {
    const room = this.rooms.get(roomCode);
    if (!room?.gameState || room.gameState.phase !== 'suit-selection') {
      this.emitError(playerId, 'Suit selection not required', Crazy8ErrorCode.GAME_NOT_STARTED);
      return;
    }

    const player = room.gameState.players.find(p => p.id === playerId);
    if (!player || !player.isCurrentTurn) {
      this.emitError(playerId, 'Not your turn', Crazy8ErrorCode.NOT_PLAYER_TURN);
      return;
    }

    // Enhanced turn validation (Requirement 3.2)
    if (room.gameState.players[room.gameState.currentPlayerIndex].id !== playerId) {
      this.emitError(playerId, 'Turn order validation failed', Crazy8ErrorCode.NOT_PLAYER_TURN);
      return;
    }

    // Update active suit
    room.gameState.activeSuit = suit;
    room.gameState.phase = 'playing';

    // Check win condition after playing the 8
    if (this.checkWinCondition(player)) {
      this.handleGameEnd(roomCode, player);
      return;
    }

    // Advance turn
    this.advanceTurn(room.gameState);

    // Broadcast updated game state
    this.broadcastGameState(roomCode, room.gameState);
  }

  /**
   * Gets the current game state for a room
   */
  getGameState(roomCode: string): Crazy8GameState | null {
    const room = this.rooms.get(roomCode);
    return room?.gameState || null;
  }

  /**
   * Gets room information
   */
  getRoom(roomCode: string): Crazy8Room | null {
    return this.rooms.get(roomCode) || null;
  }

  /**
   * Cleans up resources when a room is destroyed
   */
  destroyRoom(roomCode: string): void {
    this.clearTurnTimer(roomCode);
    this.rooms.delete(roomCode);
  }

  /**
   * Checks if a card can be played according to Crazy 8 rules
   * Requirements: 2.2, 2.3, 2.4
   */
  isValidPlay(card: Card, topCard: Card, activeSuit: Suit): boolean {
    // 8s can always be played (wild cards)
    if (card.value === '8') {
      return true;
    }

    // Must match suit or rank
    return card.suit === activeSuit || card.value === topCard.value;
  }

  /**
   * Gets all playable cards from a player's hand
   * Requirements: 2.2, 2.3
   */
  getPlayableCards(hand: Card[], topCard: Card, activeSuit: Suit): Card[] {
    return hand.filter(card => this.isValidPlay(card, topCard, activeSuit));
  }

  // Private helper methods

  /**
   * Generates a unique room code
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Initializes the game state for a new game
   */
  private initializeGameState(players: Crazy8Player[]): Crazy8GameState {
    return {
      players: players.map(player => ({
        ...player,
        hand: [],
        cardCount: 0,
        isCurrentTurn: false,
        hasWon: false,
        score: 0,
        isConnected: true
      })),
      currentPlayerIndex: 0,
      direction: 1,
      discardPile: [],
      topCard: { suit: 'hearts', value: 'A' }, // Placeholder, will be set during setup
      activeSuit: 'hearts', // Placeholder, will be set during setup
      deckCount: 52,
      phase: 'waiting',
      gameType: 'crazy8',
      maxPlayers: 6,
      minPlayers: 2
    };
  }

  /**
   * Deals 7 cards to each player
   * Requirements: 1.4
   */
  private dealInitialHand(gameState: Crazy8GameState): void {
    // Reset and shuffle deck
    this.dealingService.reshuffle();
    
    // Deal 7 cards to each player
    for (const player of gameState.players) {
      for (let i = 0; i < 7; i++) {
        const card = this.dealingService.drawCard();
        player.hand.push(card);
      }
      player.cardCount = player.hand.length;
    }

    // Update deck count
    gameState.deckCount = this.dealingService.cardsRemaining;
  }

  /**
   * Sets up the starting discard pile, ensuring it's not an 8
   * Requirements: 1.5, 1.6
   */
  private setupStartingDiscardPile(gameState: Crazy8GameState): void {
    let startingCard: Card;
    
    do {
      startingCard = this.dealingService.drawCard();
      gameState.deckCount--;
    } while (startingCard.value === '8'); // Reshuffle if starting card is an 8

    gameState.discardPile.push(startingCard);
    gameState.topCard = startingCard;
    gameState.activeSuit = startingCard.suit;
  }

  /**
   * Validates if a card play is legal
   * Requirements: 2.2, 2.3, 3.2
   */
  private validatePlay(gameState: Crazy8GameState, playerId: string, card: Card): Crazy8ValidationResult {
    const player = gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return {
        isValid: false,
        errorCode: Crazy8ErrorCode.PLAYER_NOT_IN_ROOM,
        errorMessage: 'Player not found in game'
      };
    }

    // Enhanced turn validation (Requirement 3.2)
    if (!player.isCurrentTurn) {
      return {
        isValid: false,
        errorCode: Crazy8ErrorCode.NOT_PLAYER_TURN,
        errorMessage: 'Not your turn'
      };
    }

    // Verify the current player index matches
    if (gameState.players[gameState.currentPlayerIndex].id !== playerId) {
      return {
        isValid: false,
        errorCode: Crazy8ErrorCode.NOT_PLAYER_TURN,
        errorMessage: 'Turn order validation failed'
      };
    }

    if (gameState.phase !== 'playing') {
      return {
        isValid: false,
        errorCode: Crazy8ErrorCode.GAME_NOT_STARTED,
        errorMessage: 'Game is not in playing phase'
      };
    }

    // Check if player has the card
    const hasCard = player.hand.some(c => c.suit === card.suit && c.value === card.value);
    if (!hasCard) {
      return {
        isValid: false,
        errorCode: Crazy8ErrorCode.CARD_NOT_IN_HAND,
        errorMessage: 'Card not in hand'
      };
    }

    // Check if card is playable
    if (!this.isValidPlay(card, gameState.topCard, gameState.activeSuit)) {
      return {
        isValid: false,
        errorCode: Crazy8ErrorCode.INVALID_CARD,
        errorMessage: 'Card cannot be played'
      };
    }

    return { isValid: true };
  }



  /**
   * Checks if a player has won the game
   * Requirements: 5.1
   */
  private checkWinCondition(player: Crazy8Player): boolean {
    return player.hand.length === 0;
  }

  /**
   * Advances the turn to the next player
   * Requirements: 3.1, 3.2, 3.3
   */
  private advanceTurn(gameState: Crazy8GameState): void {
    const roomCode = this.getRoomCodeByGameState(gameState);
    if (!roomCode) return;

    // Clear current player's turn flag
    gameState.players[gameState.currentPlayerIndex].isCurrentTurn = false;

    // Clear any existing turn timer
    this.clearTurnTimer(roomCode);

    // Move to next player
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + gameState.direction + gameState.players.length) % gameState.players.length;

    // Set new current player's turn flag
    gameState.players[gameState.currentPlayerIndex].isCurrentTurn = true;

    // Start turn timer for the new current player
    this.startTurnTimer(roomCode, gameState);
  }

  /**
   * Starts a 60-second turn timer for the current player
   * Requirements: 3.3
   */
  private startTurnTimer(roomCode: string, gameState: Crazy8GameState): void {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // Clear any existing timer first
    this.clearTurnTimer(roomCode);

    // Start new timer
    const timer = setTimeout(() => {
      this.handleTurnTimeout(roomCode, currentPlayer.id);
    }, 60000); // 60 seconds

    this.turnTimers.set(roomCode, { timer, playerId: currentPlayer.id });

    // Notify clients about the turn timer
    this.io.to(roomCode).emit('crazy8:turn-timer-started', {
      playerId: currentPlayer.id,
      timeoutSeconds: 60
    });
  }

  /**
   * Clears the turn timer for a room
   */
  private clearTurnTimer(roomCode: string): void {
    const timerData = this.turnTimers.get(roomCode);
    if (timerData) {
      clearTimeout(timerData.timer);
      this.turnTimers.delete(roomCode);
    }
  }

  /**
   * Handles when a player's turn times out
   * Requirements: 3.3
   */
  private handleTurnTimeout(roomCode: string, playerId: string): void {
    const room = this.rooms.get(roomCode);
    if (!room?.gameState || room.gameState.phase !== 'playing') {
      return;
    }

    const player = room.gameState.players.find(p => p.id === playerId);
    if (!player || !player.isCurrentTurn) {
      return;
    }

    // Notify all players about the timeout first
    this.io.to(roomCode).emit('crazy8:turn-timeout', {
      playerId,
      playerName: player.name
    });

    // Force draw a card and advance turn (bypass normal validation)
    this.forceDrawCardAndAdvanceTurn(room.gameState, player);

    // Broadcast updated game state
    this.broadcastGameState(roomCode, room.gameState);
  }

  /**
   * Forces a player to draw a card and advances the turn (used for timeouts)
   */
  private forceDrawCardAndAdvanceTurn(gameState: Crazy8GameState, player: Crazy8Player): void {
    // Handle empty deck by reshuffling discard pile
    if (gameState.deckCount === 0) {
      this.reshuffleDiscardPile(gameState);
    }

    // Draw card from deck
    const drawnCard = this.dealingService.drawCard();
    player.hand.push(drawnCard);
    player.cardCount = player.hand.length;
    gameState.deckCount--;

    // Advance turn
    this.advanceTurn(gameState);
  }

  /**
   * Gets room code by game state (helper method)
   */
  private getRoomCodeByGameState(gameState: Crazy8GameState): string | null {
    for (const [roomCode, room] of this.rooms.entries()) {
      if (room.gameState === gameState) {
        return roomCode;
      }
    }
    return null;
  }

  /**
   * Handles game end when a player wins
   * Requirements: 5.1, 5.2, 5.3, 5.4
   */
  private handleGameEnd(roomCode: string, winner: Crazy8Player): void {
    const room = this.rooms.get(roomCode);
    if (!room?.gameState) {
      return;
    }

    // Clear turn timer when game ends
    this.clearTurnTimer(roomCode);

    winner.hasWon = true;
    room.gameState.phase = 'finished';
    room.gameState.winner = winner.id;

    // Calculate scores
    const scores = this.calculateScore(room.gameState.players);
    room.gameState.scores = scores;

    // Broadcast game end
    this.io.to(roomCode).emit('crazy8:game-ended', {
      winner: winner.name,
      scores
    });
  }

  /**
   * Calculates final scores for all players
   * Requirements: 5.3, 5.4
   */
  private calculateScore(players: Crazy8Player[]): ScoreResult[] {
    return players.map(player => {
      const points = player.hand.reduce((total, card) => {
        if (card.value === '8') return total + 50;
        if (['J', 'Q', 'K'].includes(card.value)) return total + 10;
        if (card.value === 'A') return total + 1;
        return total + parseInt(card.value);
      }, 0);

      return {
        playerId: player.id,
        playerName: player.name,
        remainingCards: player.hand.length,
        points
      };
    });
  }

  /**
   * Reshuffles the discard pile when deck is empty
   * Requirements: 2.7
   */
  private reshuffleDiscardPile(gameState: Crazy8GameState): void {
    if (gameState.discardPile.length <= 1) {
      return; // Can't reshuffle if only top card remains
    }

    // Keep the top card, reshuffle the rest
    const topCard = gameState.discardPile.pop()!;
    const cardsToShuffle = [...gameState.discardPile];
    
    // Clear discard pile except for top card
    gameState.discardPile = [topCard];
    
    // Add shuffled cards back to deck (simulated by updating deck count)
    gameState.deckCount += cardsToShuffle.length;
    
    // In a real implementation, we would add these cards back to the dealing service
    // For now, we'll just update the count
  }

  /**
   * Broadcasts game state to all players in the room
   */
  private broadcastGameState(roomCode: string, gameState: Crazy8GameState): void {
    this.io.to(roomCode).emit('crazy8:game-state-update', { gameState });
  }

  /**
   * Emits an error to a specific player
   */
  private emitError(playerId: string, message: string, code?: Crazy8ErrorCode): void {
    this.io.to(playerId).emit('crazy8:error', { message, code });
  }
}