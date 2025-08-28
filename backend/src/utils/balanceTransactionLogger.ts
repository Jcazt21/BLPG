import { bettingLogger, BettingEventType } from './bettingLogger';

export enum TransactionType {
  INITIAL_BALANCE = 'initial_balance',
  BET_PLACED = 'bet_placed',
  BET_REFUND = 'bet_refund',
  PAYOUT_WIN = 'payout_win',
  PAYOUT_BLACKJACK = 'payout_blackjack',
  PAYOUT_PUSH = 'payout_push',
  BALANCE_CORRECTION = 'balance_correction',
  ADMIN_ADJUSTMENT = 'admin_adjustment'
}

export interface BalanceTransaction {
  id: string;
  playerId: string;
  playerName: string;
  roomCode: string;
  roundId?: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  timestamp: number;
  description: string;
  metadata?: {
    betAmount?: number;
    gameResult?: string;
    payoutMultiplier?: number;
    originalBet?: number;
    reason?: string;
  };
  isValid: boolean;
  auditTrail?: string[];
}

class BalanceTransactionLogger {
  private transactions: Map<string, BalanceTransaction[]> = new Map();
  private maxTransactionsPerPlayer = 1000;
  private transactionCounter = 0;

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${++this.transactionCounter}`;
  }

  private getPlayerTransactions(playerId: string): BalanceTransaction[] {
    if (!this.transactions.has(playerId)) {
      this.transactions.set(playerId, []);
    }
    return this.transactions.get(playerId)!;
  }

  private addTransaction(transaction: BalanceTransaction): void {
    const playerTransactions = this.getPlayerTransactions(transaction.playerId);
    playerTransactions.push(transaction);

    // Maintain max transactions per player
    if (playerTransactions.length > this.maxTransactionsPerPlayer) {
      playerTransactions.shift();
    }

    // Log to betting logger
    bettingLogger.logBetPlaced(
      transaction.roomCode,
      transaction.playerId,
      transaction.playerName,
      Math.abs(transaction.amount),
      transaction.balanceAfter,
      transaction.roundId
    );
  }

  logInitialBalance(
    playerId: string,
    playerName: string,
    roomCode: string,
    initialAmount: number
  ): BalanceTransaction {
    const transaction: BalanceTransaction = {
      id: this.generateTransactionId(),
      playerId,
      playerName,
      roomCode,
      type: TransactionType.INITIAL_BALANCE,
      amount: initialAmount,
      balanceBefore: 0,
      balanceAfter: initialAmount,
      timestamp: Date.now(),
      description: `Initial balance assigned: ${initialAmount} chips`,
      isValid: true
    };

    this.addTransaction(transaction);
    return transaction;
  }

  logBetPlaced(
    playerId: string,
    playerName: string,
    roomCode: string,
    betAmount: number,
    balanceBefore: number,
    balanceAfter: number,
    roundId?: string
  ): BalanceTransaction {
    const transaction: BalanceTransaction = {
      id: this.generateTransactionId(),
      playerId,
      playerName,
      roomCode,
      roundId,
      type: TransactionType.BET_PLACED,
      amount: -betAmount,
      balanceBefore,
      balanceAfter,
      timestamp: Date.now(),
      description: `Bet placed: ${betAmount} chips`,
      metadata: {
        betAmount
      },
      isValid: balanceAfter === balanceBefore - betAmount
    };

    this.addTransaction(transaction);
    return transaction;
  }

  logBetRefund(
    playerId: string,
    playerName: string,
    roomCode: string,
    refundAmount: number,
    balanceBefore: number,
    balanceAfter: number,
    reason: string,
    roundId?: string
  ): BalanceTransaction {
    const transaction: BalanceTransaction = {
      id: this.generateTransactionId(),
      playerId,
      playerName,
      roomCode,
      roundId,
      type: TransactionType.BET_REFUND,
      amount: refundAmount,
      balanceBefore,
      balanceAfter,
      timestamp: Date.now(),
      description: `Bet refunded: ${refundAmount} chips - ${reason}`,
      metadata: {
        reason,
        originalBet: refundAmount
      },
      isValid: balanceAfter === balanceBefore + refundAmount
    };

    this.addTransaction(transaction);
    return transaction;
  }

  logPayout(
    playerId: string,
    playerName: string,
    roomCode: string,
    payoutAmount: number,
    balanceBefore: number,
    balanceAfter: number,
    gameResult: string,
    betAmount: number,
    payoutMultiplier: number,
    roundId?: string
  ): BalanceTransaction {
    let type: TransactionType;
    switch (gameResult) {
      case 'blackjack':
        type = TransactionType.PAYOUT_BLACKJACK;
        break;
      case 'push':
      case 'draw':
        type = TransactionType.PAYOUT_PUSH;
        break;
      default:
        type = TransactionType.PAYOUT_WIN;
    }

    const transaction: BalanceTransaction = {
      id: this.generateTransactionId(),
      playerId,
      playerName,
      roomCode,
      roundId,
      type,
      amount: payoutAmount,
      balanceBefore,
      balanceAfter,
      timestamp: Date.now(),
      description: `Payout received: ${payoutAmount} chips (${gameResult}, ${payoutMultiplier}x multiplier)`,
      metadata: {
        betAmount,
        gameResult,
        payoutMultiplier
      },
      isValid: balanceAfter === balanceBefore + payoutAmount
    };

    this.addTransaction(transaction);
    return transaction;
  }

  logBalanceCorrection(
    playerId: string,
    playerName: string,
    roomCode: string,
    correctionAmount: number,
    balanceBefore: number,
    balanceAfter: number,
    reason: string
  ): BalanceTransaction {
    const transaction: BalanceTransaction = {
      id: this.generateTransactionId(),
      playerId,
      playerName,
      roomCode,
      type: TransactionType.BALANCE_CORRECTION,
      amount: correctionAmount,
      balanceBefore,
      balanceAfter,
      timestamp: Date.now(),
      description: `Balance corrected: ${correctionAmount > 0 ? '+' : ''}${correctionAmount} chips - ${reason}`,
      metadata: {
        reason
      },
      isValid: balanceAfter === balanceBefore + correctionAmount,
      auditTrail: [`Correction applied by system at ${new Date().toISOString()}`]
    };

    this.addTransaction(transaction);
    return transaction;
  }

  // Query methods
  getPlayerTransactionHistory(playerId: string, limit?: number): BalanceTransaction[] {
    const transactions = this.getPlayerTransactions(playerId);
    return limit ? transactions.slice(-limit) : [...transactions];
  }

  getTransactionsByRoom(roomCode: string, limit?: number): BalanceTransaction[] {
    const allTransactions: BalanceTransaction[] = [];
    
    for (const playerTransactions of this.transactions.values()) {
      allTransactions.push(...playerTransactions.filter(t => t.roomCode === roomCode));
    }
    
    allTransactions.sort((a, b) => a.timestamp - b.timestamp);
    return limit ? allTransactions.slice(-limit) : allTransactions;
  }

  getTransactionsByType(type: TransactionType, limit?: number): BalanceTransaction[] {
    const allTransactions: BalanceTransaction[] = [];
    
    for (const playerTransactions of this.transactions.values()) {
      allTransactions.push(...playerTransactions.filter(t => t.type === type));
    }
    
    allTransactions.sort((a, b) => a.timestamp - b.timestamp);
    return limit ? allTransactions.slice(-limit) : allTransactions;
  }

  getInvalidTransactions(): BalanceTransaction[] {
    const invalidTransactions: BalanceTransaction[] = [];
    
    for (const playerTransactions of this.transactions.values()) {
      invalidTransactions.push(...playerTransactions.filter(t => !t.isValid));
    }
    
    return invalidTransactions.sort((a, b) => a.timestamp - b.timestamp);
  }

  // Audit and validation
  validatePlayerBalance(playerId: string): {
    isValid: boolean;
    expectedBalance: number;
    actualBalance: number;
    discrepancy: number;
    invalidTransactions: BalanceTransaction[];
  } {
    const transactions = this.getPlayerTransactions(playerId);
    
    if (transactions.length === 0) {
      return {
        isValid: true,
        expectedBalance: 0,
        actualBalance: 0,
        discrepancy: 0,
        invalidTransactions: []
      };
    }

    let expectedBalance = 0;
    const invalidTransactions: BalanceTransaction[] = [];

    transactions.forEach(transaction => {
      expectedBalance += transaction.amount;
      
      if (!transaction.isValid) {
        invalidTransactions.push(transaction);
      }
    });

    const lastTransaction = transactions[transactions.length - 1];
    const actualBalance = lastTransaction.balanceAfter;
    const discrepancy = actualBalance - expectedBalance;

    return {
      isValid: discrepancy === 0 && invalidTransactions.length === 0,
      expectedBalance,
      actualBalance,
      discrepancy,
      invalidTransactions
    };
  }

  generateBalanceReport(playerId: string): {
    playerId: string;
    playerName: string;
    currentBalance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    totalBets: number;
    totalPayouts: number;
    netGainLoss: number;
    transactionCount: number;
    firstTransaction: Date;
    lastTransaction: Date;
    validationStatus: 'valid' | 'invalid' | 'warning';
  } {
    const transactions = this.getPlayerTransactions(playerId);
    
    if (transactions.length === 0) {
      throw new Error(`No transactions found for player ${playerId}`);
    }

    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalBets = 0;
    let totalPayouts = 0;

    transactions.forEach(transaction => {
      switch (transaction.type) {
        case TransactionType.INITIAL_BALANCE:
          totalDeposits += transaction.amount;
          break;
        case TransactionType.BET_PLACED:
          totalBets += Math.abs(transaction.amount);
          break;
        case TransactionType.PAYOUT_WIN:
        case TransactionType.PAYOUT_BLACKJACK:
        case TransactionType.PAYOUT_PUSH:
          totalPayouts += transaction.amount;
          break;
        case TransactionType.BET_REFUND:
          totalPayouts += transaction.amount;
          break;
      }
    });

    const validation = this.validatePlayerBalance(playerId);
    const firstTransaction = transactions[0];
    const lastTransaction = transactions[transactions.length - 1];

    return {
      playerId,
      playerName: firstTransaction.playerName,
      currentBalance: lastTransaction.balanceAfter,
      totalDeposits,
      totalWithdrawals,
      totalBets,
      totalPayouts,
      netGainLoss: totalPayouts - totalBets,
      transactionCount: transactions.length,
      firstTransaction: new Date(firstTransaction.timestamp),
      lastTransaction: new Date(lastTransaction.timestamp),
      validationStatus: validation.isValid ? 'valid' : (validation.invalidTransactions.length > 0 ? 'invalid' : 'warning')
    };
  }

  // Export functionality
  exportTransactions(playerId?: string, format: 'json' | 'csv' = 'json'): string {
    let transactions: BalanceTransaction[];
    
    if (playerId) {
      transactions = this.getPlayerTransactions(playerId);
    } else {
      transactions = [];
      for (const playerTransactions of this.transactions.values()) {
        transactions.push(...playerTransactions);
      }
      transactions.sort((a, b) => a.timestamp - b.timestamp);
    }

    if (format === 'json') {
      return JSON.stringify(transactions, null, 2);
    } else {
      // CSV format
      const headers = [
        'id', 'timestamp', 'playerId', 'playerName', 'roomCode', 'roundId',
        'type', 'amount', 'balanceBefore', 'balanceAfter', 'description', 'isValid'
      ];
      const csvRows = [headers.join(',')];
      
      transactions.forEach(transaction => {
        const row = [
          transaction.id,
          new Date(transaction.timestamp).toISOString(),
          transaction.playerId,
          transaction.playerName,
          transaction.roomCode,
          transaction.roundId || '',
          transaction.type,
          transaction.amount,
          transaction.balanceBefore,
          transaction.balanceAfter,
          `"${transaction.description.replace(/"/g, '""')}"`,
          transaction.isValid
        ];
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    }
  }

  // Statistics
  getTransactionStatistics(): {
    totalTransactions: number;
    transactionsByType: Record<TransactionType, number>;
    totalVolume: number;
    averageTransactionAmount: number;
    invalidTransactionCount: number;
    playersWithTransactions: number;
  } {
    let totalTransactions = 0;
    let totalVolume = 0;
    let invalidTransactionCount = 0;
    const transactionsByType = {} as Record<TransactionType, number>;

    for (const playerTransactions of this.transactions.values()) {
      totalTransactions += playerTransactions.length;
      
      playerTransactions.forEach(transaction => {
        totalVolume += Math.abs(transaction.amount);
        transactionsByType[transaction.type] = (transactionsByType[transaction.type] || 0) + 1;
        
        if (!transaction.isValid) {
          invalidTransactionCount++;
        }
      });
    }

    return {
      totalTransactions,
      transactionsByType,
      totalVolume,
      averageTransactionAmount: totalTransactions > 0 ? totalVolume / totalTransactions : 0,
      invalidTransactionCount,
      playersWithTransactions: this.transactions.size
    };
  }

  // Clear transactions
  clearPlayerTransactions(playerId: string): void {
    this.transactions.delete(playerId);
  }

  clearAllTransactions(): void {
    this.transactions.clear();
  }
}

// Singleton instance
export const balanceTransactionLogger = new BalanceTransactionLogger();

export default BalanceTransactionLogger;