import { Socket, Server } from 'socket.io';
import { Card } from '../../types/gameTypes';
import { DealingService } from '../game/dealingService';
import { GameLogic } from '../game/gameLogic';
import { validateBet } from '../../utils/validationUtils';

/**
 * Service for managing multiplayer game state
 */
export class MultiplayerGameService {
  private io: Server;
  private dealingService: DealingService;
  
  constructor(io: Server) {
    this.io = io;
    this.dealingService = new DealingService();
  }
  
  /**
   * Starts a new game in a room
   */
  startGame(roomCode: string, players: any[]): void {
    // Reset the deck
    this.dealingService.reshuffle();
    
    // Deal initial cards
    const { playerHands, dealerHand, hiddenCard } = this.dealingService.dealInitialCards(players.length);
    
    // Update player hands
    players.forEach((player, index) => {
      player.hand = playerHands[index];
      const handStatus = GameLogic.hasBlackjack(player.hand);
      player.isBlackjack = handStatus;
    });
    
    // Broadcast game state to all players in the room
    this.broadcastGameState(roomCode, {
      players,
      dealer: {
        hand: dealerHand,
        hiddenCard
      },
      phase: 'dealing',
      turn: 0
    });
  }
  
  /**
   * Processes a player action (hit, stand)
   */
  processPlayerAction(roomCode: string, playerId: string, action: 'hit' | 'stand', gameState: any): void {
    const playerIndex = gameState.players.findIndex((p: any) => p.id === playerId);
    
    if (playerIndex === -1 || playerIndex !== gameState.turn) {
      return; // Not player's turn
    }
    
    const player = gameState.players[playerIndex];
    
    if (action === 'hit') {
      // Draw a card and add to player's hand
      const card = this.dealingService.drawCard();
      player.hand.push(card);
      
      // Check if player busts
      player.isBust = GameLogic.isBust(player.hand);
      if (player.isBust) {
        player.isStand = true;
      }
    } else if (action === 'stand') {
      player.isStand = true;
    }
    
    // Move to next player or dealer phase
    this.advanceTurn(roomCode, gameState);
  }
  
  /**
   * Advances the turn to the next player or dealer phase
   */
  private advanceTurn(roomCode: string, gameState: any): void {
    // Check if all players have finished
    const allPlayersFinished = gameState.players.every((p: any) => p.isStand || p.isBust);
    
    if (allPlayersFinished) {
      // Move to dealer phase
      this.processDealerTurn(roomCode, gameState);
    } else {
      // Find next player who hasn't stood or busted
      let nextTurn = gameState.turn;
      do {
        nextTurn = (nextTurn + 1) % gameState.players.length;
      } while ((gameState.players[nextTurn].isStand || gameState.players[nextTurn].isBust) && nextTurn !== gameState.turn);
      
      gameState.turn = nextTurn;
      this.broadcastGameState(roomCode, gameState);
    }
  }
  
  /**
   * Processes the dealer's turn
   */
  private processDealerTurn(roomCode: string, gameState: any): void {
    // Reveal hidden card
    gameState.dealer.hand.push(gameState.dealer.hiddenCard);
    delete gameState.dealer.hiddenCard;
    
    // Dealer draws until 17 or higher
    while (this.calculateDealerTotal(gameState.dealer.hand) < 17) {
      const card = this.dealingService.drawCard();
      gameState.dealer.hand.push(card);
    }
    
    // Calculate results
    this.calculateResults(gameState);
    
    // Broadcast final game state
    gameState.phase = 'result';
    this.broadcastGameState(roomCode, gameState);
  }
  
  /**
   * Calculates the dealer's hand total
   */
  private calculateDealerTotal(hand: Card[]): number {
    return calculateHand(hand).total;
  }
  
  /**
   * Calculates game results for all players
   */
  private calculateResults(gameState: any): void {
    const dealerHand = gameState.dealer.hand;
    const dealerTotal = this.calculateDealerTotal(dealerHand);
    const dealerBust = dealerTotal > 21;
    
    gameState.results = {};
    
    gameState.players.forEach((player: any) => {
      let result: 'player' | 'dealer' | 'push';
      
      if (player.isBust) {
        result = 'dealer';
      } else if (dealerBust) {
        result = 'player';
      } else {
        result = GameLogic.determineWinner(player.hand, dealerHand);
      }
      
      gameState.results[player.id] = {
        result
      };
    });
  }
  
  /**
   * Broadcasts game state to all players in a room
   */
  private broadcastGameState(roomCode: string, gameState: any): void {
    this.io.to(roomCode).emit('gameStateUpdate', gameState);
  }
}