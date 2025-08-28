import { RequestQueue } from './requestQueue';

describe('RequestQueue', () => {
  let queue: RequestQueue<string>;
  let mockProcessor: jest.Mock;

  beforeEach(() => {
    mockProcessor = jest.fn();
    queue = new RequestQueue(mockProcessor, {
      maxRetries: 2,
      baseDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2,
      jitter: false
    });
  });

  describe('enqueue', () => {
    it('should process requests successfully', async () => {
      mockProcessor.mockResolvedValue('success');
      
      const result = await queue.enqueue('test-payload');
      
      expect(result).toBe('success');
      expect(mockProcessor).toHaveBeenCalledWith('test-payload');
    });

    it('should handle priority ordering', async () => {
      const results: string[] = [];
      mockProcessor.mockImplementation((payload: string) => {
        results.push(payload);
        return Promise.resolve(payload);
      });

      // Enqueue with different priorities
      const promises = [
        queue.enqueue('low', 1),
        queue.enqueue('high', 10),
        queue.enqueue('medium', 5)
      ];

      await Promise.all(promises);
      
      // Should process in priority order: high, medium, low
      expect(results).toEqual(['high', 'medium', 'low']);
    });

    it('should retry on failures', async () => {
      mockProcessor
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce('success');

      const result = await queue.enqueue('test-payload');
      
      expect(result).toBe('success');
      expect(mockProcessor).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      mockProcessor.mockRejectedValue(new Error('Persistent failure'));

      await expect(queue.enqueue('test-payload')).rejects.toThrow('Persistent failure');
      expect(mockProcessor).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('getQueueStats', () => {
    it('should return correct queue statistics', () => {
      const stats = queue.getQueueStats();
      
      expect(stats.queueSize).toBe(0);
      expect(stats.processing).toBe(false);
      expect(stats.oldestRequest).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should clear all pending requests', async () => {
      // Add a slow processor to keep requests in queue
      mockProcessor.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      // Enqueue multiple requests
      const promises = [
        queue.enqueue('request1'),
        queue.enqueue('request2'),
        queue.enqueue('request3')
      ];

      // Clear the queue
      queue.clear();

      // All promises should be rejected
      await Promise.allSettled(promises).then(results => {
        results.forEach(result => {
          expect(result.status).toBe('rejected');
        });
      });
    });
  });
});