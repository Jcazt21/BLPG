import { Socket } from 'socket.io';
import { generateRoomCode } from '../../utils/roomUtils';
import { RoomModel } from '../../models/roomModel';

/**
 * Service for managing multiplayer rooms
 */
export class RoomService {
  private rooms: Map<string, RoomModel> = new Map();
  
  /**
   * Creates a new room
   */
  createRoom(creatorId: string): string {
    let code: string;
    
    // Generate a unique room code
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code));
    
    // Create the room
    const room: RoomModel = {
      code,
      creatorId,
      playerIds: [creatorId],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };
    
    this.rooms.set(code, room);
    return code;
  }
  
  /**
   * Adds a player to a room
   */
  addPlayerToRoom(code: string, playerId: string): boolean {
    const room = this.rooms.get(code);
    
    if (!room || !room.isActive) {
      return false;
    }
    
    if (room.playerIds.includes(playerId)) {
      return true; // Player already in room
    }
    
    room.playerIds.push(playerId);
    room.updatedAt = new Date();
    
    return true;
  }
  
  /**
   * Removes a player from a room
   */
  removePlayerFromRoom(code: string, playerId: string): boolean {
    const room = this.rooms.get(code);
    
    if (!room) {
      return false;
    }
    
    room.playerIds = room.playerIds.filter(id => id !== playerId);
    room.updatedAt = new Date();
    
    // If room is empty, mark as inactive
    if (room.playerIds.length === 0) {
      room.isActive = false;
    }
    
    return true;
  }
  
  /**
   * Gets a room by code
   */
  getRoom(code: string): RoomModel | undefined {
    return this.rooms.get(code);
  }
  
  /**
   * Checks if a player is the creator of a room
   */
  isRoomCreator(code: string, playerId: string): boolean {
    const room = this.rooms.get(code);
    return room ? room.creatorId === playerId : false;
  }
}