import { Socket } from 'socket.io';
import { generateRoomCode } from '../../utils/roomUtils';
import { RoomModel, Room, Crazy8Room, BlackjackRoom } from '../../models/roomModel';
import { GameType } from '../../types/gameTypes';

/**
 * Service for managing multiplayer rooms
 */
export class RoomService {
  private rooms: Map<string, Room> = new Map();
  
  /**
   * Creates a new room with specified game type
   */
  createRoom(creatorId: string, gameType: GameType = 'blackjack'): string {
    let code: string;
    
    // Generate a unique room code
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code));
    
    // Create the room based on game type
    let room: Room;
    
    if (gameType === 'crazy8') {
      room = {
        code,
        creatorId,
        playerIds: [creatorId],
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        gameType: 'crazy8',
        gameState: null,
        maxPlayers: 6,
        minPlayers: 2
      } as Crazy8Room;
    } else {
      room = {
        code,
        creatorId,
        playerIds: [creatorId],
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        gameType: 'blackjack',
        gameState: null,
        maxPlayers: 4,
        minPlayers: 1
      } as BlackjackRoom;
    }
    
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
    
    // Check if room is full
    if (room.playerIds.length >= room.maxPlayers) {
      return false;
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
  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }
  
  /**
   * Gets a Crazy 8 room by code (with type safety)
   */
  getCrazy8Room(code: string): Crazy8Room | undefined {
    const room = this.rooms.get(code);
    return room && room.gameType === 'crazy8' ? room as Crazy8Room : undefined;
  }
  
  /**
   * Gets a Blackjack room by code (with type safety)
   */
  getBlackjackRoom(code: string): BlackjackRoom | undefined {
    const room = this.rooms.get(code);
    return room && room.gameType === 'blackjack' ? room as BlackjackRoom : undefined;
  }
  
  /**
   * Checks if a room can start a game (has minimum players)
   */
  canStartGame(code: string): boolean {
    const room = this.rooms.get(code);
    return room ? room.playerIds.length >= room.minPlayers : false;
  }
  
  /**
   * Checks if a player is the creator of a room
   */
  isRoomCreator(code: string, playerId: string): boolean {
    const room = this.rooms.get(code);
    return room ? room.creatorId === playerId : false;
  }
}