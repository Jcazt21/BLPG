import express from 'express';
import { startGame, hit, stand, restartGame, getGameState, doubleDown, split } from '../controllers/gameController';

const router = express.Router();

// Start a new game
router.post('/start', startGame);

// Player hits
router.post('/hit', hit);

// Player stands
router.post('/stand', stand);

// Restart game
router.post('/restart', restartGame);

// Get current game state (optional)
router.get('/state', getGameState);

// Double down
router.post('/double-down', doubleDown);

// Split
router.post('/split', split);

export default router; 