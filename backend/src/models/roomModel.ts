/**
 * Room model representing a multiplayer game room
 */
export interface RoomModel {
  code: string;
  creatorId: string;
  playerIds: string[];
  gameId?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}