import {
  MultiplayerPlayer,
  BetValidationResult,
  BetResult,
  BettingError,
  BettingErrorType,
  PayoutResults,
  PayoutCalculation,
  GameResultStatus,
  BETTING_CONSTANTS,
  Room,
  BalanceTransaction
} from '../types';

/**
 * BettingManager handles all betting validation, balance management, and payout calculations
 * for the multiplayer blackjack game system.
 */
export class BettingManager {
  private rooms: Map<string, Room>;

  constructor(rooms: Map<string, Room>) {
    this.rooms = rooms;
  }

  /**
   * Validates a bet amount for a specific player
   * @param player - The player attempting to place the bet
   * @param amount - The bet amount to validate
   * @param roomCode - The room code for error reporting
   * @returns BetValidationResult indicating if the bet is valid
   */
  validateBet(player: MultiplayerPlayer, amount: number, roomCode: string): BetValidationResult {
    // Check if amount is a valid number
    if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
      return {
        isValid: false,
        error: this.createBettingError(
          BettingErrorType.INVALID_AMOUNT,
          'Bet amount must be a valid number',
          player.id,
          roomCode,
          false,
          'Please enter a valid numeric bet amount'
        )
      };
    }

    // Check if amount is positive
    if (amount <= 0) {
      return {
        isValid: false,
        error: this.createBettingError(
          BettingErrorType.INVALID_AMOUNT,
          'Bet amount must be greater than 0',
          player.id,
          roomCode,
          true,
          'Please enter a positive bet amount'
        )
      };
    }

    // Check minimum bet requirement
    if (amount < BETTING_CONSTANTS.MIN_BET) {
      return {
        isValid: false,
        error: this.createBettingError(
          BettingErrorType.INVALID_AMOUNT,
          `Bet amount must be at least ${BETTING_CONSTANTS.MIN_BET} chips`,
          player.id,
          roomCode,
          true,
          `Please bet at least ${BETTING_CONSTANTS.MIN_BET} chips`
        )
      };
    }

    // Check if player has sufficient balance
    if (amount > player.balance) {
      return {
        isValid: false,
        error: this.createBettingError(
          BettingErrorType.INSUFFICIENT_BALANCE,
          `Insufficient balance. Available: ${player.balance}, Required: ${amount}`,
          player.id,
          roomCode,
          true,
          `Reduce bet amount to ${player.balance} or less`
        )
      };
    }

    // Check maximum bet (player's balance)
    if (amount > player.balance) {
      return {
        isValid: false,
        error: this.createBettingError(
          BettingErrorType.INVALID_AMOUNT,
          `Bet amount cannot exceed your balance of ${player.balance} chips`,
          player.id,
          roomCode,
          true,
          `Maximum bet is ${player.balance} chips`
        )
      };
    }

    // All validations passed
    return { isValid: true };
  }

  /**
   * Places a bet for a player after validation
   * @param roomCode - The room code
   * @param playerId - The player's ID
   * @param amount - The bet amount
   * @returns BetResult indicating success or failure
   */
  async placeBet(roomCode: string, playerId: string, amount: number): Promise<BetResult> {
    const room = this.rooms.get(roomCode);
    
    if (!room) {
      return {
        success: false,
        newBalance: 0,
        betAmount: 0,
        error: this.createBettingError(
          BettingErrorType.ROOM_NOT_FOUND,
          `Room ${roomCode} not found`,
          playerId,
          roomCode,
          false,
          'Please rejoin the room'
        )
      };
    }

    const player = room.players.get(playerId);
    
    if (!player) {
      return {
        success: false,
        newBalance: 0,
        betAmount: 0,
        error: this.createBettingError(
          BettingErrorType.PLAYER_NOT_FOUND,
          `Player ${playerId} not found in room ${roomCode}`,
          playerId,
          roomCode,
          false,
          'Please rejoin the room'
        )
      };
    }

    // Check if betting phase is active
    if (!room.gameState || room.gameState.phase !== 'betting') {
      return {
        success: false,
        newBalance: player.balance,
        betAmount: player.currentBet,
        error: this.createBettingError(
          BettingErrorType.BETTING_CLOSED,
          'Betting phase is not active',
          playerId,
          roomCode,
          false,
          'Wait for the next betting phase'
        )
      };
    }

    // Validate the bet
    const validationResult = this.validateBet(player, amount, roomCode);
    
    if (!validationResult.isValid) {
      return {
        success: false,
        newBalance: player.balance,
        betAmount: player.currentBet,
        error: validationResult.error
      };
    }

    // If player already has a bet, restore their previous bet to balance first
    if (player.hasPlacedBet && player.currentBet > 0) {
      const restoreSuccess = this.restoreBalanceFromBet(playerId, roomCode);
      if (!restoreSuccess) {
        return {
          success: false,
          newBalance: player.balance,
          betAmount: player.currentBet,
          error: this.createBettingError(
            BettingErrorType.INSUFFICIENT_BALANCE,
            'Failed to restore previous bet to balance',
            playerId,
            roomCode,
            true,
            'Please try again'
          )
        };
      }
    }

    // Deduct bet amount from balance
    const success = this.updateBalance(playerId, amount, 'subtract', roomCode, 'bet');
    
    if (!success) {
      return {
        success: false,
        newBalance: player.balance,
        betAmount: player.currentBet,
        error: this.createBettingError(
          BettingErrorType.INSUFFICIENT_BALANCE,
          'Failed to deduct bet amount from balance',
          playerId,
          roomCode,
          true,
          'Please try again with a smaller amount'
        )
      };
    }

    // Update player's bet information
    player.currentBet = amount;
    player.hasPlacedBet = true;

    return {
      success: true,
      newBalance: player.balance,
      betAmount: amount
    };
  }

  /**
   * Calculates payout based on bet amount and game result
   * @param bet - The original bet amount
   * @param result - The game result status
   * @returns The payout amount
   */
  calculatePayout(bet: number, result: GameResultStatus): number {
    if (bet <= 0) return 0;

    switch (result) {
      case 'win':
        return bet * BETTING_CONSTANTS.PAYOUT_MULTIPLIERS.WIN;
      case 'blackjack':
        // 2.5:1 payout rounded down as specified in requirements
        return Math.floor(bet * BETTING_CONSTANTS.PAYOUT_MULTIPLIERS.BLACKJACK);
      case 'draw':
        return bet * BETTING_CONSTANTS.PAYOUT_MULTIPLIERS.DRAW; // Return original bet
      case 'lose':
      case 'bust':
        return bet * BETTING_CONSTANTS.PAYOUT_MULTIPLIERS.LOSE; // 0 payout
      default:
        return 0;
    }
  }

  /**
   * Processes payouts for all players in a room
   * @param roomCode - The room code
   * @param results - Game results for each player
   * @returns PayoutResults with calculation details
   */
  async processPayouts(roomCode: string, results: { [playerId: string]: GameResultStatus }): Promise<PayoutResults> {
    const room = this.rooms.get(roomCode);
    const payoutResults: PayoutResults = {};

    if (!room) {
      // Return empty results if room not found
      return payoutResults;
    }

    // Process each player's payout
    for (const [playerId, gameResult] of Object.entries(results)) {
      const player = room.players.get(playerId);
      
      if (!player) {
        payoutResults[playerId] = {
          playerId,
          betAmount: 0,
          gameResult,
          payoutMultiplier: 0,
          payoutAmount: 0,
          finalBalance: 0,
          isValid: false,
          errors: ['Player not found']
        };
        continue;
      }

      const betAmount = player.currentBet;
      const payoutAmount = this.calculatePayout(betAmount, gameResult);
      const payoutMultiplier = betAmount > 0 ? payoutAmount / betAmount : 0;

      // Add payout to player's balance
      const balanceUpdateSuccess = this.updateBalance(playerId, payoutAmount, 'add', roomCode, 'payout');

      payoutResults[playerId] = {
        playerId,
        betAmount,
        gameResult,
        payoutMultiplier,
        payoutAmount,
        finalBalance: player.balance,
        isValid: balanceUpdateSuccess,
        errors: balanceUpdateSuccess ? undefined : ['Failed to update balance']
      };

      // Update player statistics
      if (balanceUpdateSuccess) {
        if (payoutAmount > betAmount) {
          player.totalWinnings += (payoutAmount - betAmount);
        } else if (payoutAmount < betAmount) {
          player.totalLosses += (betAmount - payoutAmount);
        }
      }
    }

    return payoutResults;
  }

  /**
   * Initializes balance for a new player
   * @param playerId - The player's ID
   * @param roomCode - The room code
   * @param initialAmount - Optional custom initial amount, defaults to BETTING_CONSTANTS.INITIAL_BALANCE
   * @returns boolean indicating success
   */
  initializePlayerBalance(playerId: string, roomCode: string, initialAmount?: number): boolean {
    const room = this.rooms.get(roomCode);
    
    if (!room) {
      return false;
    }

    const player = room.players.get(playerId);
    
    if (!player) {
      return false;
    }

    const amount = initialAmount ?? BETTING_CONSTANTS.INITIAL_BALANCE;
    
    // Validate amount
    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
      return false;
    }

    // Set initial balance
    player.balance = amount;
    player.currentBet = 0;
    player.hasPlacedBet = false;
    player.betHistory = [];
    player.totalWinnings = 0;
    player.totalLosses = 0;

    return true;
  }

  /**
   * Updates a player's balance atomically with transaction logging
   * @param playerId - The player's ID
   * @param amount - The amount to add or subtract
   * @param operation - Whether to 'add' or 'subtract'
   * @param roomCode - The room code for finding the player
   * @param transactionType - Type of transaction for logging
   * @param roundId - Optional round ID for transaction tracking
   * @returns boolean indicating success
   */
  updateBalance(
    playerId: string, 
    amount: number, 
    operation: 'add' | 'subtract', 
    roomCode: string,
    transactionType: 'bet' | 'payout' | 'refund' | 'initial' = 'bet',
    roundId?: string
  ): boolean {
    const room = this.rooms.get(roomCode);
    
    if (!room) {
      return false;
    }

    const player = room.players.get(playerId);
    
    if (!player) {
      return false;
    }

    // Validate amount
    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
      return false;
    }

    // Store balance before transaction for logging
    const balanceBefore = player.balance;

    // Perform atomic balance update
    if (operation === 'add') {
      player.balance += amount;
    } else if (operation === 'subtract') {
      // Ensure we don't go below 0
      if (player.balance < amount) {
        return false;
      }
      player.balance -= amount;
    }

    // Log transaction (in a real system, this would go to a database)
    const transaction: BalanceTransaction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      roomCode,
      type: transactionType,
      amount,
      balanceBefore,
      balanceAfter: player.balance,
      timestamp: Date.now(),
      roundId: roundId || `round-${Date.now()}`
    };

    // In a production system, you would persist this transaction
    // For now, we'll just log it for debugging
    console.log('Balance Transaction:', transaction);

    return true;
  }

  /**
   * Restores balance by cancelling a bet (atomic operation)
   * @param playerId - The player's ID
   * @param roomCode - The room code
   * @returns boolean indicating success
   */
  restoreBalanceFromBet(playerId: string, roomCode: string): boolean {
    const room = this.rooms.get(roomCode);
    
    if (!room) {
      return false;
    }

    const player = room.players.get(playerId);
    
    if (!player) {
      return false;
    }

    // Only restore if player has placed a bet
    if (!player.hasPlacedBet || player.currentBet <= 0) {
      return true; // Nothing to restore, consider it successful
    }

    // Restore the bet amount to balance
    const success = this.updateBalance(
      playerId, 
      player.currentBet, 
      'add', 
      roomCode, 
      'refund'
    );

    if (success) {
      // Clear bet information
      player.currentBet = 0;
      player.hasPlacedBet = false;
    }

    return success;
  }

  /**
   * Ensures balance persistence between rounds by maintaining player state
   * @param roomCode - The room code
   * @returns boolean indicating success
   */
  persistBalancesBetweenRounds(roomCode: string): boolean {
    const room = this.rooms.get(roomCode);
    
    if (!room) {
      return false;
    }

    // Reset betting state while preserving balances
    room.players.forEach(player => {
      // Preserve balance and statistics
      const preservedBalance = player.balance;
      const preservedTotalWinnings = player.totalWinnings;
      const preservedTotalLosses = player.totalLosses;
      const preservedBetHistory = [...player.betHistory];

      // Reset only betting-specific fields for new round
      player.currentBet = 0;
      player.hasPlacedBet = false;
      
      // Ensure preserved values are maintained
      player.balance = preservedBalance;
      player.totalWinnings = preservedTotalWinnings;
      player.totalLosses = preservedTotalLosses;
      player.betHistory = preservedBetHistory;
    });

    return true;
  }

  /**
   * Gets a player's current balance
   * @param playerId - The player's ID
   * @param roomCode - The room code
   * @returns The player's balance or 0 if not found
   */
  getPlayerBalance(playerId: string, roomCode: string): number {
    const room = this.rooms.get(roomCode);
    
    if (!room) {
      return 0;
    }

    const player = room.players.get(playerId);
    return player ? player.balance : 0;
  }

  /**
   * Clears a specific player's bet and restores balance
   * @param playerId - The player's ID
   * @param roomCode - The room code
   * @returns boolean indicating success
   */
  clearPlayerBet(playerId: string, roomCode: string): boolean {
    return this.restoreBalanceFromBet(playerId, roomCode);
  }

  /**
   * Resets all player bets in a room (for new round) while preserving balances
   * @param roomCode - The room code
   */
  resetPlayerBets(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    
    if (!room) {
      return;
    }

    // Use the balance persistence method to properly reset for new round
    this.persistBalancesBetweenRounds(roomCode);

    // Reset game state betting fields if game state exists
    if (room.gameState) {
      room.gameState.totalPot = 0;
    }
  }

  /**
   * Creates a standardized betting error object
   * @param type - The error type
   * @param message - The error message
   * @param playerId - The player ID
   * @param roomCode - The room code
   * @param recoverable - Whether the error is recoverable
   * @param suggestedAction - Suggested action for recovery
   * @returns BettingError object
   */
  private createBettingError(
    type: BettingErrorType,
    message: string,
    playerId: string,
    roomCode: string,
    recoverable: boolean,
    suggestedAction?: string
  ): BettingError {
    return {
      type,
      message,
      playerId,
      roomCode,
      timestamp: Date.now(),
      recoverable,
      suggestedAction
    };
  }
}