import { Request, Response, NextFunction } from 'express';
import gameService, { split as splitService } from '../services/gameService';

// Start a new game
export const startGame = (req: Request, res: Response, next: NextFunction): void => {
  const { name, bet, balance } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Player name is required' });
    return;
  }
  if (typeof bet !== 'number' || bet <= 0) {
    res.status(400).json({ error: 'A valid bet is required' });
    return;
  }
  if (typeof balance !== 'number' || balance < bet) {
    res.status(400).json({ error: 'Insufficient balance' });
    return;
  }
  try {
    const state = gameService.startGame(name, bet, balance);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: 'Failed to start game' });
  }
};

// Player hits
export const hit = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const state = gameService.hit();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: 'Failed to hit' });
  }
};

// Player stands
export const stand = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const state = gameService.stand();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: 'Failed to stand' });
  }
};

// Restart game
export const restartGame = (req: Request, res: Response, next: NextFunction): void => {
  const { bet } = req.body;
  if (typeof bet !== 'number' || bet <= 0) {
    res.status(400).json({ error: 'A valid bet is required' });
    return;
  }
  try {
    const state = gameService.restartGame(bet);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: 'Failed to restart game' });
  }
};

// Get current game state
export const getGameState = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const state = gameService.getGameState();
    res.json(state);
  } catch (err) {
    res.status(404).json({ error: 'No game in progress' });
  }
};

// Double down
export const doubleDown = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const state = gameService.doubleDown();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: 'Failed to double down' });
  }
};

// Add /split endpoint
export const split = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const gameState = splitService(req.body);
    res.json(gameState);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}; 