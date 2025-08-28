import { helpLogger } from '../../utils/helpLogger';

export interface QueuedRequest<T> {
  id: string;
  payload: T;
  priority: number;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitter: boolean;
}

export class RequestQueue<T> {
  private queue: QueuedRequest<T>[] = [];
  private processing = false;
  private retryConfig: RetryConfig;
  private processingFunction: (payload: T) => Promise<any>;

  constructor(
    processingFunction: (payload: T) => Promise<any>,
    retryConfig: RetryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true
    }
  ) {
    this.processingFunction = processingFunction;
    this.retryConfig = retryConfig;
  }

  async enqueue(payload: T, priority: number = 0, maxRetries?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: this.generateId(),
        payload,
        priority,
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: maxRetries ?? this.retryConfig.maxRetries,
        resolve,
        reject
      };

      this.queue.push(request);
      this.sortQueue();
      
      helpLogger.debug('Request enqueued', {
        requestId: request.id,
        priority,
        queueSize: this.queue.length
      });

      this.processQueue();
    });
  }

  private sortQueue(): void {
    // Sort by priority (higher first), then by timestamp (older first)
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp.getTime() - b.timestamp.getTime();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      
      try {
        helpLogger.debug('Processing request', {
          requestId: request.id,
          retryCount: request.retryCount,
          queueSize: this.queue.length
        });

        const result = await this.processingFunction(request.payload);
        request.resolve(result);
        
        helpLogger.debug('Request processed successfully', {
          requestId: request.id
        });

      } catch (error) {
        await this.handleError(request, error as Error);
      }
    }

    this.processing = false;
  }

  private async handleError(request: QueuedRequest<T>, error: Error): Promise<void> {
    request.retryCount++;
    
    helpLogger.warn('Request failed', {
      requestId: request.id,
      retryCount: request.retryCount,
      maxRetries: request.maxRetries,
      error: error
    });

    if (request.retryCount >= request.maxRetries) {
      helpLogger.error('Request failed permanently', {
        requestId: request.id,
        finalError: error.message
      });
      request.reject(error);
      return;
    }

    // Calculate delay with exponential backoff
    const delay = this.calculateRetryDelay(request.retryCount);
    
    helpLogger.debug('Scheduling retry', {
      requestId: request.id,
      retryCount: request.retryCount,
      delay
    });

    // Schedule retry
    setTimeout(() => {
      this.queue.unshift(request); // Add back to front of queue
      this.sortQueue();
      this.processQueue();
    }, delay);
  }

  private calculateRetryDelay(retryCount: number): number {
    let delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, retryCount - 1);
    
    // Cap at max delay
    delay = Math.min(delay, this.retryConfig.maxDelay);
    
    // Add jitter if enabled
    if (this.retryConfig.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }
    
    return Math.max(0, Math.floor(delay));
  }

  private generateId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getQueueStats(): {
    queueSize: number;
    processing: boolean;
    oldestRequest?: Date;
  } {
    return {
      queueSize: this.queue.length,
      processing: this.processing,
      oldestRequest: this.queue.length > 0 ? this.queue[this.queue.length - 1].timestamp : undefined
    };
  }

  clear(): void {
    const rejectedCount = this.queue.length;
    
    // Reject all pending requests
    for (const request of this.queue) {
      request.reject(new Error('Queue cleared'));
    }
    
    this.queue = [];
    
    helpLogger.info('Queue cleared', { rejectedRequests: rejectedCount });
  }
}