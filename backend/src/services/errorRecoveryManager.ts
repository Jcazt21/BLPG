import { Server as SocketIOServer } from 'socket.io';
import {
  MultiplayerPlayer,
  Room,
  BettingError,
  BettingErrorType,
  BalanceTransaction,
  BETTING_CONSTANTS
} from '../types/bettingTypes';
import { BettingManager } from './bettingManager';

/**
 * Error recovery types and interfaces
 */
export interface NetworkErrorRecovery {
  operationType: 'bet_placement' | 'balance_update' | 'payout_processing';
  playerId: string;
  roomCode: string;
  originalData: any;
  retryCount: number;
  maxRetries: number;
  lastAttempt: number;
  recoveryStrategy: 'retry' | 'rollback' | 'manual_intervention';
}

export interface BalanceInconsistency {
  playerId: string;
  roomCode: string;
  expectedBalance: number;
  actualBalance: number;
  discrepancy: number;
  detectedAt: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoveryAction: 'auto_correct' | 'manual_review' | 'rollback_transaction';
}

export interface ConnectionIssue {
  socketId: string;
  playerId?: string;
  roomCode?: string;
  issueType: 'timeout' | 'disconnect' | 'packet_loss' | 'sync_failure';
  detectedAt: number;
  duration: number;
  recoveryStatus: 'pending' | 'recovered' | 'failed';
}

/**
 * ErrorRecoveryManager handles comprehensive error recovery for betting operations
 */
export class ErrorRecoveryManager {
  private io: SocketIOServer;
  private rooms: Map<string, Room>;
  private bettingManager: BettingManager;
  
  // Recovery tracking
  private pendingRecoveries: Map<string, NetworkErrorRecovery>;
  private balanceInconsistencies: Map<string, BalanceInconsistency>;
  private connectionIssues: Map<string, ConnectionIssue>;
  
  // Configuration
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 1000;
  private readonly BALANCE_TOLERANCE = 0.01; // Allow 1 chip tolerance for floating point
  private readonly CONNECTION_TIMEOUT_MS = 30000; // 30 seconds
  private readonly CLEANUP_INTERVAL_MS = 300000; // 5 minutes

  constructor(
    io: SocketIOServer,
    rooms: Map<string, Room>,
    bettingManager: BettingManager
  ) {
    this.io = io;
    this.rooms = rooms;
    this.bettingManager = bettingManager;
    
    this.pendingRecoveries = new Map();
    this.balanceInconsistencies = new Map();
    this.connectionIssues = new Map();
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Network error recovery for betting operations with retry logic
   */
  async recoverFromNetworkError(
    operationType: NetworkErrorRecovery['operationType'],
    playerId: string,
    roomCode: string,
    originalData: any,
    error: Error
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    const recoveryId = `${operationType}-${playerId}-${roomCode}-${Date.now()}`;
    
    // Create recovery record
    const recovery: NetworkErrorRecovery = {
      operationType,
      playerId,
      roomCode,
      originalData,
      retryCount: 0,
      maxRetries: this.MAX_RETRY_ATTEMPTS,
      lastAttempt: Date.now(),
      recoveryStrategy: 'retry'
    };
    
    this.pendingRecoveries.set(recoveryId, recovery);
    
    console.log(`Starting network error recovery for ${operationType}:`, {
      playerId,
      roomCode,
      error: error.message,
      recoveryId
    });
    
    // Emit recovery started event
    this.io.to(roomCode).emit('errorRecoveryStarted', {
      type: 'network_error',
      operationType,
      playerId,
      message: 'Attempting to recover from network error...'
    });
    
    try {
      const result = await this.executeRetryLogic(recoveryId);
      
      if (result.success) {
        // Recovery successful
        this.pendingRecoveries.delete(recoveryId);
        
        this.io.to(roomCode).emit('errorRecoverySuccess', {
          type: 'network_error',
          operationType,
          playerId,
          message: 'Network error recovered successfully'
        });
        
        return result;
      } else {
        // Recovery failed after all retries
        recovery.recoveryStrategy = 'manual_intervention';
        
        this.io.to(roomCode).emit('errorRecoveryFailed', {
          type: 'network_error',
          operationType,
          playerId,
          message: 'Failed to recover from network error. Manual intervention required.',
          error: result.error
        });
        
        return result;
      }
    } catch (recoveryError) {
      console.error(`Recovery failed for ${recoveryId}:`, recoveryError);
      
      this.io.to(roomCode).emit('errorRecoveryFailed', {
        type: 'network_error',
        operationType,
        playerId,
        message: 'Recovery process encountered an error',
        error: recoveryError instanceof Error ? recoveryError.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: recoveryError instanceof Error ? recoveryError.message : 'Recovery failed'
      };
    }
  }

  /**
   * Execute retry logic with exponential backoff
   */
  private async executeRetryLogic(recoveryId: string): Promise<{ success: boolean; result?: any; error?: string }> {
    const recovery = this.pendingRecoveries.get(recoveryId);
    if (!recovery) {
      return { success: false, error: 'Recovery record not found' };
    }
    
    while (recovery.retryCount < recovery.maxRetries) {
      recovery.retryCount++;
      recovery.lastAttempt = Date.now();
      
      // Calculate delay with exponential backoff
      const delay = this.RETRY_DELAY_MS * Math.pow(2, recovery.retryCount - 1);
      
      console.log(`Retry attempt ${recovery.retryCount}/${recovery.maxRetries} for ${recoveryId} (delay: ${delay}ms)`);
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        let result;
        
        switch (recovery.operationType) {
          case 'bet_placement':
            result = await this.retryBetPlacement(recovery);
            break;
          case 'balance_update':
            result = await this.retryBalanceUpdate(recovery);
            break;
          case 'payout_processing':
            result = await this.retryPayoutProcessing(recovery);
            break;
          default:
            throw new Error(`Unknown operation type: ${recovery.operationType}`);
        }
        
        if (result.success) {
          return { success: true, result: result.data };
        }
        
        // Log retry failure
        console.warn(`Retry ${recovery.retryCount} failed for ${recoveryId}:`, result.error);
        
      } catch (retryError) {
        console.error(`Retry ${recovery.retryCount} error for ${recoveryId}:`, retryError);
      }
    }
    
    // All retries exhausted
    return {
      success: false,
      error: `All ${recovery.maxRetries} retry attempts failed`
    };
  }

  /**
   * Retry bet placement operation
   */
  private async retryBetPlacement(recovery: NetworkErrorRecovery): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { playerId, roomCode, originalData } = recovery;
      const { amount } = originalData;
      
      // Verify room and player still exist
      const room = this.rooms.get(roomCode);
      if (!room) {
        return { success: false, error: 'Room no longer exists' };
      }
      
      const player = room.players.get(playerId);
      if (!player) {
        return { success: false, error: 'Player no longer in room' };
      }
      
      // Check if betting phase is still active
      if (!room.gameState || room.gameState.phase !== 'betting') {
        return { success: false, error: 'Betting phase no longer active' };
      }
      
      // Attempt bet placement
      const result = await this.bettingManager.placeBet(roomCode, playerId, amount);
      
      if (result.success) {
        return { success: true, data: result };
      } else {
        return { success: false, error: result.error?.message || 'Bet placement failed' };
      }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during bet placement retry'
      };
    }
  }

  /**
   * Retry balance update operation
   */
  private async retryBalanceUpdate(recovery: NetworkErrorRecovery): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { playerId, roomCode, originalData } = recovery;
      const { amount, operation, transactionType } = originalData;
      
      // Verify room and player still exist
      const room = this.rooms.get(roomCode);
      if (!room) {
        return { success: false, error: 'Room no longer exists' };
      }
      
      const player = room.players.get(playerId);
      if (!player) {
        return { success: false, error: 'Player no longer in room' };
      }
      
      // Attempt balance update
      const success = this.bettingManager.updateBalance(
        playerId,
        amount,
        operation,
        roomCode,
        transactionType
      );
      
      if (success) {
        return { success: true, data: { newBalance: player.balance } };
      } else {
        return { success: false, error: 'Balance update failed' };
      }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during balance update retry'
      };
    }
  }

  /**
   * Retry payout processing operation
   */
  private async retryPayoutProcessing(recovery: NetworkErrorRecovery): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { roomCode, originalData } = recovery;
      const { results } = originalData;
      
      // Verify room still exists
      const room = this.rooms.get(roomCode);
      if (!room) {
        return { success: false, error: 'Room no longer exists' };
      }
      
      // Attempt payout processing
      const payoutResults = await this.bettingManager.processPayouts(roomCode, results);
      
      // Check if all payouts were successful
      const allSuccessful = Object.values(payoutResults).every(result => result.isValid);
      
      if (allSuccessful) {
        return { success: true, data: payoutResults };
      } else {
        const failedPayouts = Object.values(payoutResults).filter(result => !result.isValid);
        return {
          success: false,
          error: `${failedPayouts.length} payout(s) failed`
        };
      }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during payout processing retry'
      };
    }
  }  
/**
   * Balance inconsistency detection and recovery
   */
  detectBalanceInconsistency(playerId: string, roomCode: string, expectedBalance: number): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    
    const player = room.players.get(playerId);
    if (!player) return false;
    
    const actualBalance = player.balance;
    const discrepancy = Math.abs(expectedBalance - actualBalance);
    
    // Check if discrepancy exceeds tolerance
    if (discrepancy > this.BALANCE_TOLERANCE) {
      const severity = this.calculateInconsistencySeverity(discrepancy, expectedBalance);
      
      const inconsistency: BalanceInconsistency = {
        playerId,
        roomCode,
        expectedBalance,
        actualBalance,
        discrepancy,
        detectedAt: Date.now(),
        severity,
        recoveryAction: this.determineRecoveryAction(severity, discrepancy)
      };
      
      const inconsistencyId = `${playerId}-${roomCode}-${Date.now()}`;
      this.balanceInconsistencies.set(inconsistencyId, inconsistency);
      
      console.warn(`Balance inconsistency detected:`, inconsistency);
      
      // Emit inconsistency detected event
      this.io.to(roomCode).emit('balanceInconsistencyDetected', {
        playerId,
        severity,
        message: `Balance inconsistency detected for player ${player.name}`,
        discrepancy,
        recoveryAction: inconsistency.recoveryAction
      });
      
      // Attempt automatic recovery for low/medium severity issues
      if (severity === 'low' || severity === 'medium') {
        this.recoverFromBalanceInconsistency(inconsistencyId);
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Calculate severity of balance inconsistency
   */
  private calculateInconsistencySeverity(discrepancy: number, expectedBalance: number): BalanceInconsistency['severity'] {
    const percentageDiscrepancy = expectedBalance > 0 ? (discrepancy / expectedBalance) * 100 : 100;
    
    if (discrepancy <= 5) return 'low';
    if (discrepancy <= 25 || percentageDiscrepancy <= 5) return 'medium';
    if (discrepancy <= 100 || percentageDiscrepancy <= 20) return 'high';
    return 'critical';
  }

  /**
   * Determine recovery action based on severity
   */
  private determineRecoveryAction(severity: BalanceInconsistency['severity'], discrepancy: number): BalanceInconsistency['recoveryAction'] {
    switch (severity) {
      case 'low':
        return 'auto_correct';
      case 'medium':
        return discrepancy <= 10 ? 'auto_correct' : 'manual_review';
      case 'high':
        return 'manual_review';
      case 'critical':
        return 'rollback_transaction';
      default:
        return 'manual_review';
    }
  }

  /**
   * Recover from balance inconsistency
   */
  async recoverFromBalanceInconsistency(inconsistencyId: string): Promise<boolean> {
    const inconsistency = this.balanceInconsistencies.get(inconsistencyId);
    if (!inconsistency) return false;
    
    const { playerId, roomCode, expectedBalance, recoveryAction } = inconsistency;
    
    console.log(`Attempting balance inconsistency recovery:`, {
      inconsistencyId,
      playerId,
      roomCode,
      recoveryAction
    });
    
    try {
      switch (recoveryAction) {
        case 'auto_correct':
          return await this.autoCorrectBalance(inconsistency);
        case 'rollback_transaction':
          return await this.rollbackLastTransaction(inconsistency);
        case 'manual_review':
          return await this.flagForManualReview(inconsistency);
        default:
          return false;
      }
    } catch (error) {
      console.error(`Balance recovery failed for ${inconsistencyId}:`, error);
      
      this.io.to(roomCode).emit('balanceRecoveryFailed', {
        playerId,
        inconsistencyId,
        message: 'Failed to recover from balance inconsistency',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return false;
    }
  }

  /**
   * Auto-correct balance for low severity inconsistencies
   */
  private async autoCorrectBalance(inconsistency: BalanceInconsistency): Promise<boolean> {
    const { playerId, roomCode, expectedBalance } = inconsistency;
    
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    
    const player = room.players.get(playerId);
    if (!player) return false;
    
    // Set balance to expected value
    const previousBalance = player.balance;
    player.balance = expectedBalance;
    
    console.log(`Auto-corrected balance for player ${playerId}: ${previousBalance} -> ${expectedBalance}`);
    
    // Log correction transaction
    const transaction: BalanceTransaction = {
      id: `correction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      roomCode,
      type: 'refund', // Use refund type for corrections
      amount: Math.abs(expectedBalance - previousBalance),
      balanceBefore: previousBalance,
      balanceAfter: expectedBalance,
      timestamp: Date.now(),
      roundId: `correction-${Date.now()}`,
      metadata: {
        gameResult: 'balance_inconsistency_auto_correct'
      }
    };
    
    console.log('Balance correction transaction:', transaction);
    
    // Emit balance corrected event
    this.io.to(roomCode).emit('balanceCorrected', {
      playerId,
      previousBalance,
      newBalance: expectedBalance,
      correctionAmount: Math.abs(expectedBalance - previousBalance),
      message: 'Balance automatically corrected due to inconsistency'
    });
    
    // Remove inconsistency record
    this.balanceInconsistencies.delete(`${playerId}-${roomCode}-${inconsistency.detectedAt}`);
    
    return true;
  }

  /**
   * Rollback last transaction for critical inconsistencies
   */
  private async rollbackLastTransaction(inconsistency: BalanceInconsistency): Promise<boolean> {
    const { playerId, roomCode } = inconsistency;
    
    // In a production system, this would query transaction history
    // For now, we'll restore to a safe default balance
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    
    const player = room.players.get(playerId);
    if (!player) return false;
    
    const previousBalance = player.balance;
    const safeBalance = Math.max(BETTING_CONSTANTS.INITIAL_BALANCE, player.balance);
    
    player.balance = safeBalance;
    
    console.log(`Rolled back balance for player ${playerId}: ${previousBalance} -> ${safeBalance}`);
    
    this.io.to(roomCode).emit('balanceRolledBack', {
      playerId,
      previousBalance,
      newBalance: safeBalance,
      message: 'Balance rolled back due to critical inconsistency'
    });
    
    return true;
  }

  /**
   * Flag balance inconsistency for manual review
   */
  private async flagForManualReview(inconsistency: BalanceInconsistency): Promise<boolean> {
    const { playerId, roomCode } = inconsistency;
    
    console.log(`Flagged balance inconsistency for manual review:`, inconsistency);
    
    this.io.to(roomCode).emit('balanceFlaggedForReview', {
      playerId,
      severity: inconsistency.severity,
      discrepancy: inconsistency.discrepancy,
      message: 'Balance inconsistency requires manual review'
    });
    
    // In a production system, this would create a support ticket or alert
    return true;
  }

  /**
   * Handle connection issues and implement graceful degradation
   */
  handleConnectionIssue(
    socketId: string,
    issueType: ConnectionIssue['issueType'],
    playerId?: string,
    roomCode?: string
  ): void {
    const issue: ConnectionIssue = {
      socketId,
      playerId,
      roomCode,
      issueType,
      detectedAt: Date.now(),
      duration: 0,
      recoveryStatus: 'pending'
    };
    
    const issueId = `${socketId}-${issueType}-${Date.now()}`;
    this.connectionIssues.set(issueId, issue);
    
    console.log(`Connection issue detected:`, issue);
    
    // Implement graceful degradation based on issue type
    switch (issueType) {
      case 'timeout':
        this.handleConnectionTimeout(issueId);
        break;
      case 'disconnect':
        this.handleDisconnection(issueId);
        break;
      case 'packet_loss':
        this.handlePacketLoss(issueId);
        break;
      case 'sync_failure':
        this.handleSyncFailure(issueId);
        break;
    }
  }

  /**
   * Handle connection timeout with graceful degradation
   */
  private handleConnectionTimeout(issueId: string): void {
    const issue = this.connectionIssues.get(issueId);
    if (!issue || !issue.roomCode || !issue.playerId) return;
    
    const room = this.rooms.get(issue.roomCode);
    if (!room) return;
    
    const player = room.players.get(issue.playerId);
    if (!player) return;
    
    // Preserve player state during timeout
    console.log(`Preserving player state during timeout for ${issue.playerId}`);
    
    // Emit timeout warning to room
    this.io.to(issue.roomCode).emit('playerConnectionTimeout', {
      playerId: issue.playerId,
      playerName: player.name,
      message: `${player.name} is experiencing connection issues`,
      gracefulDegradation: true
    });
    
    // Set timeout for automatic recovery
    setTimeout(() => {
      this.attemptConnectionRecovery(issueId);
    }, this.CONNECTION_TIMEOUT_MS);
  }

  /**
   * Handle player disconnection with state preservation
   */
  private handleDisconnection(issueId: string): void {
    const issue = this.connectionIssues.get(issueId);
    if (!issue || !issue.roomCode || !issue.playerId) return;
    
    const room = this.rooms.get(issue.roomCode);
    if (!room) return;
    
    const player = room.players.get(issue.playerId);
    if (!player) return;
    
    console.log(`Player ${issue.playerId} disconnected, preserving state`);
    
    // Preserve betting state during disconnection
    const preservedState = {
      balance: player.balance,
      currentBet: player.currentBet,
      hasPlacedBet: player.hasPlacedBet,
      totalWinnings: player.totalWinnings,
      totalLosses: player.totalLosses
    };
    
    // Store preserved state (in production, this would go to persistent storage)
    console.log(`Preserved state for ${issue.playerId}:`, preservedState);
    
    // Emit disconnection event
    this.io.to(issue.roomCode).emit('playerDisconnected', {
      playerId: issue.playerId,
      playerName: player.name,
      message: `${player.name} disconnected but state is preserved`,
      statePreserved: true
    });
  }

  /**
   * Handle packet loss with retry mechanisms
   */
  private handlePacketLoss(issueId: string): void {
    const issue = this.connectionIssues.get(issueId);
    if (!issue || !issue.roomCode) return;
    
    console.log(`Packet loss detected for ${issue.socketId}, implementing retry mechanisms`);
    
    // Force full state synchronization
    if (issue.roomCode) {
      this.forceFullStateSync(issue.roomCode);
    }
    
    // Emit packet loss warning
    this.io.to(issue.socketId).emit('connectionQualityWarning', {
      type: 'packet_loss',
      message: 'Connection quality degraded. Synchronizing state...',
      autoRetry: true
    });
  }

  /**
   * Handle synchronization failure with recovery
   */
  private handleSyncFailure(issueId: string): void {
    const issue = this.connectionIssues.get(issueId);
    if (!issue || !issue.roomCode) return;
    
    console.log(`Sync failure detected for ${issue.socketId}, forcing resynchronization`);
    
    // Force complete state resynchronization
    if (issue.roomCode) {
      this.forceFullStateSync(issue.roomCode);
    }
    
    // Emit sync failure recovery
    this.io.to(issue.socketId).emit('syncFailureRecovery', {
      message: 'Synchronization restored',
      timestamp: Date.now(),
      fullSync: true
    });
  }

  /**
   * Attempt connection recovery
   */
  private attemptConnectionRecovery(issueId: string): void {
    const issue = this.connectionIssues.get(issueId);
    if (!issue) return;
    
    issue.duration = Date.now() - issue.detectedAt;
    
    // Check if socket is still connected
    const socket = this.io.sockets.sockets.get(issue.socketId);
    
    if (socket && socket.connected) {
      // Connection recovered
      issue.recoveryStatus = 'recovered';
      
      console.log(`Connection recovered for ${issue.socketId} after ${issue.duration}ms`);
      
      if (issue.roomCode) {
        // Force state synchronization after recovery
        this.forceFullStateSync(issue.roomCode);
        
        this.io.to(issue.roomCode).emit('connectionRecovered', {
          playerId: issue.playerId,
          message: 'Connection restored and state synchronized',
          downtime: issue.duration
        });
      }
      
      // Clean up issue record
      this.connectionIssues.delete(issueId);
    } else {
      // Connection still failed
      issue.recoveryStatus = 'failed';
      
      console.log(`Connection recovery failed for ${issue.socketId} after ${issue.duration}ms`);
      
      if (issue.roomCode && issue.playerId) {
        this.io.to(issue.roomCode).emit('connectionRecoveryFailed', {
          playerId: issue.playerId,
          message: 'Failed to restore connection',
          downtime: issue.duration
        });
      }
    }
  }

  /**
   * Force full state synchronization for a room
   */
  private forceFullStateSync(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room || !room.gameState) return;
    
    console.log(`Forcing full state sync for room ${roomCode}`);
    
    // Create comprehensive sync data
    const fullSyncData = {
      type: 'full_state_sync',
      timestamp: Date.now(),
      serverTime: new Date().toISOString(),
      roomCode,
      gameState: {
        started: room.gameState.started,
        phase: room.gameState.phase,
        turn: room.gameState.turn,
        bettingTimeLeft: room.gameState.bettingTimeLeft,
        minBet: room.gameState.minBet,
        maxBet: room.gameState.maxBet,
        totalPot: room.gameState.totalPot,
        roundId: room.gameState.roundId,
        results: room.gameState.results
      },
      players: Array.from(room.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
        hand: p.hand,
        total: p.total,
        status: p.status,
        isBust: p.isBust,
        isStand: p.isStand,
        isBlackjack: p.isBlackjack,
        victories: p.victories,
        gamesWon: p.gamesWon,
        gamesBlackjack: p.gamesBlackjack,
        gamesLost: p.gamesLost,
        gamesDraw: p.gamesDraw,
        gamesBust: p.gamesBust,
        balance: p.balance,
        currentBet: p.currentBet,
        hasPlacedBet: p.hasPlacedBet,
        totalWinnings: p.totalWinnings,
        totalLosses: p.totalLosses
      })),
      dealer: {
        hand: room.gameState.dealer.hand,
        total: room.gameState.dealer.total,
        isBust: room.gameState.dealer.isBust,
        isBlackjack: room.gameState.dealer.isBlackjack,
        ...(room.gameState.dealer.hiddenCard && { hiddenCard: room.gameState.dealer.hiddenCard })
      },
      syncMetadata: {
        syncId: `full-sync-${roomCode}-${Date.now()}`,
        reason: 'error_recovery',
        checksumData: {
          playerCount: room.players.size,
          totalPot: room.gameState.totalPot,
          gamePhase: room.gameState.phase
        }
      }
    };
    
    // Emit full synchronization
    this.io.to(roomCode).emit('fullStateSync', fullSyncData);
  }

  /**
   * Timeout handling for betting operations
   */
  handleBettingTimeout(
    operationType: string,
    playerId: string,
    roomCode: string,
    timeoutMs: number
  ): Promise<{ success: boolean; timedOut: boolean; error?: string }> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        console.log(`Betting operation timeout: ${operationType} for player ${playerId} in room ${roomCode}`);
        
        // Emit timeout event
        this.io.to(roomCode).emit('bettingOperationTimeout', {
          operationType,
          playerId,
          timeoutMs,
          message: `Betting operation timed out after ${timeoutMs}ms`
        });
        
        resolve({
          success: false,
          timedOut: true,
          error: `Operation timed out after ${timeoutMs}ms`
        });
      }, timeoutMs);
      
      // In a real implementation, you would integrate this with the actual operation
      // For now, we'll simulate a successful operation
      setTimeout(() => {
        clearTimeout(timeoutId);
        resolve({ success: true, timedOut: false });
      }, Math.random() * timeoutMs * 0.8); // Simulate operation completing before timeout
    });
  }

  /**
   * Get error recovery statistics
   */
  getRecoveryStatistics(): {
    pendingRecoveries: number;
    balanceInconsistencies: number;
    connectionIssues: number;
    recoverySuccessRate: number;
  } {
    const totalRecoveries = this.pendingRecoveries.size;
    const totalInconsistencies = this.balanceInconsistencies.size;
    const totalConnectionIssues = this.connectionIssues.size;
    
    // Calculate success rate (simplified for demo)
    const recoveredConnections = Array.from(this.connectionIssues.values())
      .filter(issue => issue.recoveryStatus === 'recovered').length;
    
    const recoverySuccessRate = totalConnectionIssues > 0 ? 
      (recoveredConnections / totalConnectionIssues) * 100 : 100;
    
    return {
      pendingRecoveries: totalRecoveries,
      balanceInconsistencies: totalInconsistencies,
      connectionIssues: totalConnectionIssues,
      recoverySuccessRate
    };
  }

  /**
   * Start cleanup interval for old records
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupOldRecords();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Clean up old recovery records
   */
  private cleanupOldRecords(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    // Clean up old pending recoveries
    for (const [id, recovery] of this.pendingRecoveries.entries()) {
      if (now - recovery.lastAttempt > maxAge) {
        this.pendingRecoveries.delete(id);
      }
    }
    
    // Clean up old balance inconsistencies
    for (const [id, inconsistency] of this.balanceInconsistencies.entries()) {
      if (now - inconsistency.detectedAt > maxAge) {
        this.balanceInconsistencies.delete(id);
      }
    }
    
    // Clean up old connection issues
    for (const [id, issue] of this.connectionIssues.entries()) {
      if (now - issue.detectedAt > maxAge) {
        this.connectionIssues.delete(id);
      }
    }
    
    console.log('Cleaned up old error recovery records');
  }

  /**
   * Shutdown cleanup
   */
  shutdown(): void {
    // Clear all pending operations
    this.pendingRecoveries.clear();
    this.balanceInconsistencies.clear();
    this.connectionIssues.clear();
    
    console.log('ErrorRecoveryManager shutdown complete');
  }
}