/**
 * Client-side error recovery utilities for betting operations
 */

export class ErrorRecoveryClient {
  constructor(socket, onError, onRecovery) {
    this.socket = socket;
    this.onError = onError;
    this.onRecovery = onRecovery;
    
    // Recovery state
    this.pendingOperations = new Map();
    this.connectionQuality = 'good';
    this.lastSyncTime = Date.now();
    this.retryQueue = [];
    
    // Configuration
    this.MAX_RETRY_ATTEMPTS = 3;
    this.RETRY_DELAY_MS = 1000;
    this.CONNECTION_TIMEOUT_MS = 10000;
    this.SYNC_TIMEOUT_MS = 5000;
    
    this.setupErrorHandlers();
    this.startConnectionMonitoring();
  }

  /**
   * Setup error event handlers
   */
  setupErrorHandlers() {
    // Network error recovery events
    this.socket.on('errorRecoveryStarted', (data) => {
      console.log('Error recovery started:', data);
      if (this.onRecovery) {
        this.onRecovery('started', data);
      }
    });

    this.socket.on('errorRecoverySuccess', (data) => {
      console.log('Error recovery successful:', data);
      this.handleRecoverySuccess(data);
    });

    this.socket.on('errorRecoveryFailed', (data) => {
      console.error('Error recovery failed:', data);
      this.handleRecoveryFailure(data);
    });

    // Balance inconsistency events
    this.socket.on('balanceInconsistencyDetected', (data) => {
      console.warn('Balance inconsistency detected:', data);
      this.handleBalanceInconsistency(data);
    });

    this.socket.on('balanceCorrected', (data) => {
      console.log('Balance corrected:', data);
      this.handleBalanceCorrection(data);
    });

    // Connection quality events
    this.socket.on('connectionQualityWarning', (data) => {
      console.warn('Connection quality warning:', data);
      this.handleConnectionQualityWarning(data);
    });

    this.socket.on('fullStateSync', (data) => {
      console.log('Full state sync received:', data);
      this.handleFullStateSync(data);
    });

    // Betting operation timeouts
    this.socket.on('bettingOperationTimeout', (data) => {
      console.warn('Betting operation timeout:', data);
      this.handleOperationTimeout(data);
    });

    // Socket connection events
    this.socket.on('disconnect', () => {
      this.handleDisconnection();
    });

    this.socket.on('reconnect', () => {
      this.handleReconnection();
    });

    this.socket.on('connect_error', (error) => {
      this.handleConnectionError(error);
    });
  }

  /**
   * Execute betting operation with error recovery
   */
  async executeBettingOperation(operationType, data, timeoutMs = this.CONNECTION_TIMEOUT_MS) {
    const operationId = `${operationType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`Executing betting operation: ${operationType}`, { operationId, data });
    
    // Store operation for potential retry
    this.pendingOperations.set(operationId, {
      type: operationType,
      data,
      attempts: 0,
      maxAttempts: this.MAX_RETRY_ATTEMPTS,
      startTime: Date.now()
    });
    
    try {
      const result = await this.executeWithTimeout(operationType, data, timeoutMs);
      
      // Operation successful, remove from pending
      this.pendingOperations.delete(operationId);
      
      return { success: true, result };
      
    } catch (error) {
      console.error(`Betting operation failed: ${operationType}`, error);
      
      // Attempt recovery
      const recoveryResult = await this.attemptOperationRecovery(operationId, error);
      
      if (recoveryResult.success) {
        this.pendingOperations.delete(operationId);
        return recoveryResult;
      } else {
        // Add to retry queue for later
        this.addToRetryQueue(operationId);
        return { success: false, error: error.message, recoverable: true };
      }
    }
  }

  /**
   * Execute operation with timeout
   */
  executeWithTimeout(operationType, data, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation ${operationType} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      
      // Set up response handler
      const responseHandler = (response) => {
        clearTimeout(timeoutId);
        
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Operation failed'));
        }
      };
      
      // Emit operation and wait for response
      switch (operationType) {
        case 'placeBet':
          this.socket.emit('placeBet', data);
          this.socket.once('betResult', responseHandler);
          break;
        case 'updateBet':
          this.socket.emit('updateBet', data);
          this.socket.once('betUpdateResult', responseHandler);
          break;
        case 'clearBet':
          this.socket.emit('clearBet', data);
          this.socket.once('betClearResult', responseHandler);
          break;
        case 'allIn':
          this.socket.emit('allIn', data);
          this.socket.once('allInResult', responseHandler);
          break;
        default:
          clearTimeout(timeoutId);
          reject(new Error(`Unknown operation type: ${operationType}`));
      }
    });
  }

  /**
   * Attempt operation recovery with retry logic
   */
  async attemptOperationRecovery(operationId, originalError) {
    const operation = this.pendingOperations.get(operationId);
    if (!operation) {
      return { success: false, error: 'Operation not found' };
    }
    
    operation.attempts++;
    
    console.log(`Attempting recovery for ${operation.type}, attempt ${operation.attempts}/${operation.maxAttempts}`);
    
    if (operation.attempts >= operation.maxAttempts) {
      return { 
        success: false, 
        error: `Max retry attempts (${operation.maxAttempts}) exceeded`,
        originalError: originalError.message
      };
    }
    
    // Wait before retry with exponential backoff
    const delay = this.RETRY_DELAY_MS * Math.pow(2, operation.attempts - 1);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      // Check connection quality before retry
      if (this.connectionQuality === 'poor') {
        throw new Error('Connection quality too poor for retry');
      }
      
      const result = await this.executeWithTimeout(
        operation.type, 
        operation.data, 
        this.CONNECTION_TIMEOUT_MS
      );
      
      console.log(`Recovery successful for ${operation.type} after ${operation.attempts} attempts`);
      
      if (this.onRecovery) {
        this.onRecovery('success', {
          operationType: operation.type,
          attempts: operation.attempts,
          result
        });
      }
      
      return { success: true, result, recovered: true };
      
    } catch (retryError) {
      console.warn(`Recovery attempt ${operation.attempts} failed:`, retryError);
      
      // Try again if we haven't exceeded max attempts
      if (operation.attempts < operation.maxAttempts) {
        return await this.attemptOperationRecovery(operationId, originalError);
      } else {
        return { 
          success: false, 
          error: retryError.message,
          originalError: originalError.message,
          attempts: operation.attempts
        };
      }
    }
  }

  /**
   * Add failed operation to retry queue
   */
  addToRetryQueue(operationId) {
    const operation = this.pendingOperations.get(operationId);
    if (operation) {
      this.retryQueue.push({
        operationId,
        queuedAt: Date.now()
      });
      
      console.log(`Added operation ${operationId} to retry queue`);
    }
  }

  /**
   * Process retry queue when connection improves
   */
  async processRetryQueue() {
    if (this.retryQueue.length === 0 || this.connectionQuality === 'poor') {
      return;
    }
    
    console.log(`Processing retry queue with ${this.retryQueue.length} operations`);
    
    const queueCopy = [...this.retryQueue];
    this.retryQueue = [];
    
    for (const queueItem of queueCopy) {
      const operation = this.pendingOperations.get(queueItem.operationId);
      if (operation) {
        try {
          const result = await this.attemptOperationRecovery(queueItem.operationId, new Error('Queued retry'));
          
          if (result.success) {
            console.log(`Retry queue operation ${queueItem.operationId} succeeded`);
          } else {
            console.warn(`Retry queue operation ${queueItem.operationId} failed:`, result.error);
          }
        } catch (error) {
          console.error(`Error processing retry queue item ${queueItem.operationId}:`, error);
        }
      }
    }
  }