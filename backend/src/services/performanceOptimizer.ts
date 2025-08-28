import { Server as SocketIOServer } from 'socket.io';
import {
    MultiplayerPlayer,
    MultiplayerGameState,
    Room,
    BalanceTransaction,
    BETTING_CONSTANTS
} from '../types/bettingTypes';

// Type definitions for performance optimization
interface PerformanceMetrics {
    balanceUpdates: number;
    broadcasts: number;
    memoryUsage: number;
    lastOptimization: number;
}

interface BalanceUpdateBatch {
    updates: Array<{
        playerId: string;
        roomCode: string;
        newBalance: number;
        timestamp: number;
    }>;
    timeout?: NodeJS.Timeout;
}

interface BroadcastBatch {
    roomCode: string;
    events: Array<{
        event: string;
        data: any;
        timestamp: number;
    }>;
    timeout?: NodeJS.Timeout;
}

interface ConnectionInfo {
    socketId: string;
    lastActivity: number;
    roomCode?: string;
}

/**
 * PerformanceOptimizer handles efficient balance updates, optimized broadcasting,
 * memory-efficient data structures, and performance monitoring for betting operations
 */
export class PerformanceOptimizer {
    private io: SocketIOServer;
    private rooms: Map<string, Room>;

    // Performance monitoring
    private performanceMetrics: Map<string, PerformanceMetrics>;
    private balanceUpdateQueue: Map<string, BalanceUpdateBatch>;
    private broadcastQueue: Map<string, BroadcastBatch>;

    // Connection pooling optimization
    private connectionPool: Map<string, ConnectionInfo>;
    private readonly BATCH_SIZE = 10;
    private readonly BATCH_TIMEOUT = 50; // 50ms
    private readonly CONNECTION_TIMEOUT = 300000; // 5 minutes

    constructor(io: SocketIOServer, rooms: Map<string, Room>) {
        this.io = io;
        this.rooms = rooms;
        this.performanceMetrics = new Map();
        this.balanceUpdateQueue = new Map();
        this.broadcastQueue = new Map();
        this.connectionPool = new Map();

        // Start cleanup interval
        setInterval(() => this.cleanupConnections(), 60000); // Every minute
    }

    /**
     * Optimize balance updates by batching them
     */
    optimizeBalanceUpdate(playerId: string, roomCode: string, newBalance: number): void {
        const batchKey = `${roomCode}_balance`;
        
        if (!this.balanceUpdateQueue.has(batchKey)) {
            this.balanceUpdateQueue.set(batchKey, {
                updates: [],
                timeout: setTimeout(() => this.flushBalanceUpdates(batchKey), this.BATCH_TIMEOUT)
            });
        }

        const batch = this.balanceUpdateQueue.get(batchKey)!;
        batch.updates.push({
            playerId,
            roomCode,
            newBalance,
            timestamp: Date.now()
        });

        // Flush immediately if batch is full
        if (batch.updates.length >= this.BATCH_SIZE) {
            this.flushBalanceUpdates(batchKey);
        }
    }

    /**
     * Optimize broadcasts by batching them
     */
    optimizeBroadcast(roomCode: string, event: string, data: any): void {
        const batchKey = roomCode;
        
        if (!this.broadcastQueue.has(batchKey)) {
            this.broadcastQueue.set(batchKey, {
                roomCode,
                events: [],
                timeout: setTimeout(() => this.flushBroadcasts(batchKey), this.BATCH_TIMEOUT)
            });
        }

        const batch = this.broadcastQueue.get(batchKey)!;
        batch.events.push({
            event,
            data,
            timestamp: Date.now()
        });

        // Flush immediately if batch is full
        if (batch.events.length >= this.BATCH_SIZE) {
            this.flushBroadcasts(batchKey);
        }
    }

    /**
     * Track connection for optimization
     */
    trackConnection(socketId: string, roomCode?: string): void {
        this.connectionPool.set(socketId, {
            socketId,
            lastActivity: Date.now(),
            roomCode
        });
    }

    /**
     * Get performance metrics for a room
     */
    getPerformanceMetrics(roomCode: string): PerformanceMetrics {
        return this.performanceMetrics.get(roomCode) || {
            balanceUpdates: 0,
            broadcasts: 0,
            memoryUsage: 0,
            lastOptimization: Date.now()
        };
    }

    /**
     * Flush balance updates
     */
    private flushBalanceUpdates(batchKey: string): void {
        const batch = this.balanceUpdateQueue.get(batchKey);
        if (!batch || batch.updates.length === 0) return;

        // Clear timeout
        if (batch.timeout) {
            clearTimeout(batch.timeout);
        }

        // Process updates
        const roomCode = batch.updates[0].roomCode;
        const room = this.rooms.get(roomCode);
        
        if (room) {
            // Update metrics
            this.updateMetrics(roomCode, 'balanceUpdates', batch.updates.length);
            
            // Emit batch update
            this.io.to(roomCode).emit('batchBalanceUpdate', {
                updates: batch.updates,
                timestamp: Date.now()
            });
        }

        // Clear batch
        this.balanceUpdateQueue.delete(batchKey);
    }

    /**
     * Flush broadcast events
     */
    private flushBroadcasts(batchKey: string): void {
        const batch = this.broadcastQueue.get(batchKey);
        if (!batch || batch.events.length === 0) return;

        // Clear timeout
        if (batch.timeout) {
            clearTimeout(batch.timeout);
        }

        // Process broadcasts
        const roomCode = batch.roomCode;
        
        // Update metrics
        this.updateMetrics(roomCode, 'broadcasts', batch.events.length);
        
        // Emit events
        batch.events.forEach(({ event, data }) => {
            this.io.to(roomCode).emit(event, data);
        });

        // Clear batch
        this.broadcastQueue.delete(batchKey);
    }

    /**
     * Update performance metrics
     */
    private updateMetrics(roomCode: string, metric: keyof PerformanceMetrics, value: number): void {
        const current = this.performanceMetrics.get(roomCode) || {
            balanceUpdates: 0,
            broadcasts: 0,
            memoryUsage: 0,
            lastOptimization: Date.now()
        };

        if (metric === 'balanceUpdates' || metric === 'broadcasts') {
            (current[metric] as number) += value;
        } else {
            (current[metric] as number) = value;
        }

        this.performanceMetrics.set(roomCode, current);
    }

    /**
     * Clean up inactive connections
     */
    private cleanupConnections(): void {
        const now = Date.now();
        const toDelete: string[] = [];

        this.connectionPool.forEach((info, socketId) => {
            if (now - info.lastActivity > this.CONNECTION_TIMEOUT) {
                toDelete.push(socketId);
            }
        });

        toDelete.forEach(socketId => {
            this.connectionPool.delete(socketId);
        });
    }

    /**
     * Get memory usage statistics
     */
    getMemoryStats(): { [key: string]: number } {
        return {
            performanceMetrics: this.performanceMetrics.size,
            balanceUpdateQueue: this.balanceUpdateQueue.size,
            broadcastQueue: this.broadcastQueue.size,
            connectionPool: this.connectionPool.size
        };
    }

    /**
     * Clear all optimization data for a room
     */
    clearRoomData(roomCode: string): void {
        this.performanceMetrics.delete(roomCode);
        
        // Clear any pending batches for this room
        const balanceBatchKey = `${roomCode}_balance`;
        const balanceBatch = this.balanceUpdateQueue.get(balanceBatchKey);
        if (balanceBatch?.timeout) {
            clearTimeout(balanceBatch.timeout);
        }
        this.balanceUpdateQueue.delete(balanceBatchKey);

        const broadcastBatch = this.broadcastQueue.get(roomCode);
        if (broadcastBatch?.timeout) {
            clearTimeout(broadcastBatch.timeout);
        }
        this.broadcastQueue.delete(roomCode);
    }
}
