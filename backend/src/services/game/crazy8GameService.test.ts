import { Server } from 'socket.io';
import { Crazy8GameService } from './crazy8GameService';
import { Crazy8Player, Card, Suit, Value } from '../../types/gameTypes';

// Mock Socket.IO server
const mockIo = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn()
} as unknown as Server;

describe('Crazy8GameService', () => {
  let service: Crazy8GameService;

  beforeEach(() => {
    service = new Crazy8GameService(mockIo);
    jest.clearAllMocks();
  });

  describe('createRoom', () => {
    it('should create a new room with valid room code', () => {
      const creatorId = 'player1';
      const creatorName = 'Player 1';

      const roomCode = service.createRoom(creatorId, creatorName);

      expect(roomCode).toBeDefined();
      expect(roomCode).toHaveLength(6);
      expect(typeof roomCode).toBe('string');

      const room = service.getRoom(roomCode);
      expect(room).toBeDefined();
      expect(room?.creatorId).toBe(creatorId);
      expect(room?.gameType).toBe('crazy8');
      expect(room?.maxPlayers).toBe(6);
      expect(room?.minPlayers).toBe(2);
    });

    it('should emit room-created event', () => {
      const creatorId = 'player1';
      const creatorName = 'Player 1';

      service.createRoom(creatorId, creatorName);

      expect(mockIo.to).toHaveBeenCalledWith(creatorId);
      expect(mockIo.emit).toHaveBeenCalledWith('crazy8:room-created', expect.objectContaining({
        roomCode: expect.any(String)
      }));
    });
  });

  describe('startGame', () => {
    it('should initialize game state correctly', () => {
      const creatorId = 'player1';
      const roomCode = service.createRoom(creatorId, 'Player 1');

      const players: Crazy8Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          hand: [],
          cardCount: 0,
          isCurrentTurn: false,
          hasWon: false,
          score: 0,
          isConnected: true
        },
        {
          id: 'player2',
          name: 'Player 2',
          hand: [],
          cardCount: 0,
          isCurrentTurn: false,
          hasWon: false,
          score: 0,
          isConnected: true
        }
      ];

      service.startGame(roomCode, players);

      const gameState = service.getGameState(roomCode);
      expect(gameState).toBeDefined();
      expect(gameState?.players).toHaveLength(2);
      expect(gameState?.phase).toBe('playing');
      expect(gameState?.gameType).toBe('crazy8');
      
      // Check that each player has 7 cards
      gameState?.players.forEach(player => {
        expect(player.hand).toHaveLength(7);
        expect(player.cardCount).toBe(7);
      });

      // Check that one player has their turn
      const playersWithTurn = gameState?.players.filter(p => p.isCurrentTurn);
      expect(playersWithTurn).toHaveLength(1);

      // Check discard pile setup
      expect(gameState?.discardPile).toHaveLength(1);
      expect(gameState?.topCard).toBeDefined();
      expect(gameState?.topCard.value).not.toBe('8'); // Starting card should not be an 8
    });

    it('should throw error for invalid player count', () => {
      const creatorId = 'player1';
      const roomCode = service.createRoom(creatorId, 'Player 1');

      // Test with too few players
      expect(() => {
        service.startGame(roomCode, []);
      }).toThrow('Invalid player count');

      // Test with too many players
      const tooManyPlayers = Array.from({ length: 7 }, (_, i) => ({
        id: `player${i + 1}`,
        name: `Player ${i + 1}`,
        hand: [],
        cardCount: 0,
        isCurrentTurn: false,
        hasWon: false,
        score: 0,
        isConnected: true
      }));

      expect(() => {
        service.startGame(roomCode, tooManyPlayers);
      }).toThrow('Invalid player count');
    });

    it('should throw error for non-existent room', () => {
      const players: Crazy8Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          hand: [],
          cardCount: 0,
          isCurrentTurn: false,
          hasWon: false,
          score: 0,
          isConnected: true
        }
      ];

      expect(() => {
        service.startGame('INVALID', players);
      }).toThrow('Room not found');
    });
  });

  describe('getGameState', () => {
    it('should return null for non-existent room', () => {
      const gameState = service.getGameState('INVALID');
      expect(gameState).toBeNull();
    });

    it('should return null for room without game state', () => {
      const creatorId = 'player1';
      const roomCode = service.createRoom(creatorId, 'Player 1');

      const gameState = service.getGameState(roomCode);
      expect(gameState).toBeNull();
    });
  });

  describe('getRoom', () => {
    it('should return null for non-existent room', () => {
      const room = service.getRoom('INVALID');
      expect(room).toBeNull();
    });

    it('should return room for valid room code', () => {
      const creatorId = 'player1';
      const roomCode = service.createRoom(creatorId, 'Player 1');

      const room = service.getRoom(roomCode);
      expect(room).toBeDefined();
      expect(room?.code).toBe(roomCode);
    });
  });

  describe('Card Validation System', () => {
    describe('isValidPlay', () => {
      it('should allow 8s to be played anytime (wild cards)', () => {
        const eightCard = { suit: 'hearts', value: '8' } as const;
        const topCard = { suit: 'spades', value: 'K' } as const;
        const activeSuit = 'clubs' as const;

        const result = service.isValidPlay(eightCard, topCard, activeSuit);
        expect(result).toBe(true);
      });

      it('should allow cards matching the active suit', () => {
        const playCard = { suit: 'hearts', value: '5' } as const;
        const topCard = { suit: 'spades', value: 'K' } as const;
        const activeSuit = 'hearts' as const;

        const result = service.isValidPlay(playCard, topCard, activeSuit);
        expect(result).toBe(true);
      });

      it('should allow cards matching the top card rank', () => {
        const playCard = { suit: 'clubs', value: 'K' } as const;
        const topCard = { suit: 'spades', value: 'K' } as const;
        const activeSuit = 'hearts' as const;

        const result = service.isValidPlay(playCard, topCard, activeSuit);
        expect(result).toBe(true);
      });

      it('should reject cards that match neither suit nor rank', () => {
        const playCard = { suit: 'clubs', value: '5' } as const;
        const topCard = { suit: 'spades', value: 'K' } as const;
        const activeSuit = 'hearts' as const;

        const result = service.isValidPlay(playCard, topCard, activeSuit);
        expect(result).toBe(false);
      });

      it('should handle ace cards correctly', () => {
        const aceCard = { suit: 'diamonds', value: 'A' } as const;
        const topCard = { suit: 'hearts', value: 'A' } as const;
        const activeSuit = 'spades' as const;

        const result = service.isValidPlay(aceCard, topCard, activeSuit);
        expect(result).toBe(true);
      });

      it('should handle face cards correctly', () => {
        const jackCard = { suit: 'clubs', value: 'J' } as const;
        const topCard = { suit: 'hearts', value: 'Q' } as const;
        const activeSuit = 'clubs' as const;

        const result = service.isValidPlay(jackCard, topCard, activeSuit);
        expect(result).toBe(true);
      });
    });

    describe('getPlayableCards', () => {
      it('should return all 8s as playable', () => {
        const hand: Card[] = [
          { suit: 'hearts', value: '8' },
          { suit: 'spades', value: '8' },
          { suit: 'clubs', value: '5' },
          { suit: 'diamonds', value: 'K' }
        ];
        const topCard: Card = { suit: 'hearts', value: '2' };
        const activeSuit: Suit = 'spades';

        const playableCards = service.getPlayableCards(hand, topCard, activeSuit);
        
        expect(playableCards).toHaveLength(2);
        expect(playableCards.every(card => card.value === '8')).toBe(true);
      });

      it('should return cards matching active suit', () => {
        const hand: Card[] = [
          { suit: 'hearts', value: '5' },
          { suit: 'hearts', value: 'K' },
          { suit: 'spades', value: '5' },
          { suit: 'clubs', value: 'A' }
        ];
        const topCard: Card = { suit: 'diamonds', value: '2' };
        const activeSuit: Suit = 'hearts';

        const playableCards = service.getPlayableCards(hand, topCard, activeSuit);
        
        expect(playableCards).toHaveLength(2);
        expect(playableCards.every(card => card.suit === 'hearts')).toBe(true);
      });

      it('should return cards matching top card rank', () => {
        const hand: Card[] = [
          { suit: 'hearts', value: '5' },
          { suit: 'spades', value: '5' },
          { suit: 'clubs', value: 'K' },
          { suit: 'diamonds', value: 'A' }
        ];
        const topCard: Card = { suit: 'diamonds', value: '5' };
        const activeSuit: Suit = 'clubs';

        const playableCards = service.getPlayableCards(hand, topCard, activeSuit);
        
        expect(playableCards).toHaveLength(3); // Two 5s + one K (matching active suit)
        const fives = playableCards.filter(card => card.value === '5');
        const kings = playableCards.filter(card => card.value === 'K');
        expect(fives).toHaveLength(2);
        expect(kings).toHaveLength(1);
      });

      it('should return empty array when no cards are playable', () => {
        const hand: Card[] = [
          { suit: 'hearts', value: '2' },
          { suit: 'spades', value: '3' },
          { suit: 'clubs', value: '4' }
        ];
        const topCard: Card = { suit: 'diamonds', value: '7' };
        const activeSuit: Suit = 'diamonds';

        const playableCards = service.getPlayableCards(hand, topCard, activeSuit);
        
        expect(playableCards).toHaveLength(0);
      });

      it('should handle mixed playable cards correctly', () => {
        const hand: Card[] = [
          { suit: 'hearts', value: '8' },  // Wild card
          { suit: 'spades', value: '5' },  // Matches rank
          { suit: 'diamonds', value: '3' }, // Matches suit
          { suit: 'clubs', value: 'K' }    // No match
        ];
        const topCard: Card = { suit: 'hearts', value: '5' };
        const activeSuit: Suit = 'diamonds';

        const playableCards = service.getPlayableCards(hand, topCard, activeSuit);
        
        expect(playableCards).toHaveLength(3);
        
        // Should include the 8 (wild), the 5 (rank match), and the 3 (suit match)
        const hasEight = playableCards.some(card => card.value === '8');
        const hasFive = playableCards.some(card => card.value === '5' && card.suit === 'spades');
        const hasThree = playableCards.some(card => card.value === '3' && card.suit === 'diamonds');
        
        expect(hasEight).toBe(true);
        expect(hasFive).toBe(true);
        expect(hasThree).toBe(true);
      });

      it('should handle empty hand', () => {
        const hand: Card[] = [];
        const topCard: Card = { suit: 'hearts', value: '5' };
        const activeSuit: Suit = 'hearts';

        const playableCards = service.getPlayableCards(hand, topCard, activeSuit);
        
        expect(playableCards).toHaveLength(0);
      });
    });

    describe('Server-side move validation', () => {
      let roomCode: string;
      let players: Crazy8Player[];

      beforeEach(() => {
        const creatorId = 'player1';
        roomCode = service.createRoom(creatorId, 'Player 1');

        players = [
          {
            id: 'player1',
            name: 'Player 1',
            hand: [
              { suit: 'hearts', value: '5' },
              { suit: 'spades', value: '8' },
              { suit: 'clubs', value: 'K' }
            ],
            cardCount: 3,
            isCurrentTurn: true,
            hasWon: false,
            score: 0,
            isConnected: true
          },
          {
            id: 'player2',
            name: 'Player 2',
            hand: [
              { suit: 'diamonds', value: '2' },
              { suit: 'hearts', value: 'A' }
            ],
            cardCount: 2,
            isCurrentTurn: false,
            hasWon: false,
            score: 0,
            isConnected: true
          }
        ];

        service.startGame(roomCode, players);
      });

      it('should accept valid card play', () => {
        const gameState = service.getGameState(roomCode);
        if (!gameState) throw new Error('Game state not found');

        // Find the current player
        const currentPlayer = gameState.players.find(p => p.isCurrentTurn);
        if (!currentPlayer) throw new Error('No current player found');

        // Find a playable card from the current player's hand
        const playableCards = service.getPlayableCards(currentPlayer.hand, gameState.topCard, gameState.activeSuit);
        
        if (playableCards.length === 0) {
          // If no cards are playable, manually add one for testing
          const testCard: Card = { suit: gameState.activeSuit, value: '5' };
          currentPlayer.hand.push(testCard);
          currentPlayer.cardCount = currentPlayer.hand.length;
        }

        const validCard = playableCards.length > 0 ? playableCards[0] : { suit: gameState.activeSuit, value: '5' as Value };
        const result = service.playCard(roomCode, currentPlayer.id, validCard);

        expect(result).toBe(true);
      });

      it('should reject invalid card play', () => {
        const gameState = service.getGameState(roomCode);
        if (!gameState) throw new Error('Game state not found');

        // Find the current player
        const currentPlayer = gameState.players.find(p => p.isCurrentTurn);
        if (!currentPlayer) throw new Error('No current player found');

        // Set up game state where no cards in hand are playable
        gameState.topCard = { suit: 'hearts', value: '2' };
        gameState.activeSuit = 'diamonds';
        gameState.phase = 'playing';

        // Add a card that won't be playable
        const invalidCard: Card = { suit: 'clubs', value: 'K' };
        currentPlayer.hand.push(invalidCard);
        currentPlayer.cardCount = currentPlayer.hand.length;

        const result = service.playCard(roomCode, currentPlayer.id, invalidCard);

        expect(result).toBe(false);
        expect(mockIo.emit).toHaveBeenCalledWith('crazy8:error', expect.objectContaining({
          message: 'Card cannot be played'
        }));
      });

      it('should reject play when not player turn', () => {
        const gameState = service.getGameState(roomCode);
        if (!gameState) throw new Error('Game state not found');

        // Find the player who is NOT the current turn
        const nonCurrentPlayer = gameState.players.find(p => !p.isCurrentTurn);
        if (!nonCurrentPlayer) throw new Error('No non-current player found');

        gameState.topCard = { suit: 'hearts', value: '2' };
        gameState.activeSuit = 'hearts';
        gameState.phase = 'playing';

        // Add a valid card to the non-current player's hand
        const validCard: Card = { suit: 'hearts', value: 'A' };
        nonCurrentPlayer.hand.push(validCard);
        nonCurrentPlayer.cardCount = nonCurrentPlayer.hand.length;

        const result = service.playCard(roomCode, nonCurrentPlayer.id, validCard);

        expect(result).toBe(false);
        expect(mockIo.emit).toHaveBeenCalledWith('crazy8:error', expect.objectContaining({
          message: 'Not your turn'
        }));
      });

      it('should reject play when card not in hand', () => {
        const gameState = service.getGameState(roomCode);
        if (!gameState) throw new Error('Game state not found');

        // Find the current player
        const currentPlayer = gameState.players.find(p => p.isCurrentTurn);
        if (!currentPlayer) throw new Error('No current player found');

        gameState.topCard = { suit: 'hearts', value: '2' };
        gameState.activeSuit = 'hearts';
        gameState.phase = 'playing';

        // Try to play a card that's not in the player's hand
        const cardNotInHand: Card = { suit: 'hearts', value: '7' };
        
        // Make sure this card is NOT in the player's hand
        const cardIndex = currentPlayer.hand.findIndex(c => c.suit === cardNotInHand.suit && c.value === cardNotInHand.value);
        if (cardIndex !== -1) {
          currentPlayer.hand.splice(cardIndex, 1);
          currentPlayer.cardCount = currentPlayer.hand.length;
        }

        const result = service.playCard(roomCode, currentPlayer.id, cardNotInHand);

        expect(result).toBe(false);
        expect(mockIo.emit).toHaveBeenCalledWith('crazy8:error', expect.objectContaining({
          message: 'Card not in hand'
        }));
      });

      it('should handle 8s correctly and trigger suit selection', () => {
        const gameState = service.getGameState(roomCode);
        if (!gameState) throw new Error('Game state not found');

        // Find the current player
        const currentPlayer = gameState.players.find(p => p.isCurrentTurn);
        if (!currentPlayer) throw new Error('No current player found');

        gameState.topCard = { suit: 'hearts', value: '2' };
        gameState.activeSuit = 'diamonds';
        gameState.phase = 'playing';

        // Add an 8 to the current player's hand
        const eightCard: Card = { suit: 'spades', value: '8' };
        currentPlayer.hand.push(eightCard);
        currentPlayer.cardCount = currentPlayer.hand.length;

        const result = service.playCard(roomCode, currentPlayer.id, eightCard);

        expect(result).toBe(true);
        expect(gameState.phase).toBe('suit-selection');
        expect(mockIo.emit).toHaveBeenCalledWith('crazy8:suit-selection-required', expect.objectContaining({
          playerId: currentPlayer.id
        }));
      });
    });
  });

  describe('Turn Management System', () => {
    let roomCode: string;
    let players: Crazy8Player[];

    beforeEach(() => {
      const creatorId = 'player1';
      roomCode = service.createRoom(creatorId, 'Player 1');

      players = [
        {
          id: 'player1',
          name: 'Player 1',
          hand: [],
          cardCount: 0,
          isCurrentTurn: false,
          hasWon: false,
          score: 0,
          isConnected: true
        },
        {
          id: 'player2',
          name: 'Player 2',
          hand: [],
          cardCount: 0,
          isCurrentTurn: false,
          hasWon: false,
          score: 0,
          isConnected: true
        },
        {
          id: 'player3',
          name: 'Player 3',
          hand: [],
          cardCount: 0,
          isCurrentTurn: false,
          hasWon: false,
          score: 0,
          isConnected: true
        }
      ];

      service.startGame(roomCode, players);
    });

    describe('Turn Initialization', () => {
      it('should randomly select first player (Requirement 3.1)', () => {
        const gameState = service.getGameState(roomCode);
        expect(gameState).toBeDefined();

        // Verify exactly one player has their turn
        const playersWithTurn = gameState!.players.filter(p => p.isCurrentTurn);
        expect(playersWithTurn).toHaveLength(1);

        // Verify currentPlayerIndex matches the player with isCurrentTurn
        const currentPlayer = gameState!.players[gameState!.currentPlayerIndex];
        expect(currentPlayer.isCurrentTurn).toBe(true);
      });

      it('should start turn timer when game begins (Requirement 3.3)', () => {
        // Verify turn timer started event was emitted
        expect(mockIo.emit).toHaveBeenCalledWith('crazy8:turn-timer-started', expect.objectContaining({
          playerId: expect.any(String),
          timeoutSeconds: 60
        }));
      });
    });

    describe('Turn Advancement', () => {
      it('should advance to next player clockwise (Requirement 3.2)', () => {
        const gameState = service.getGameState(roomCode);
        if (!gameState) throw new Error('Game state not found');

        const initialPlayerIndex = gameState.currentPlayerIndex;
        const initialCurrentPlayer = gameState.players[initialPlayerIndex];

        // Set up a valid card play to trigger turn advancement
        gameState.topCard = { suit: 'hearts', value: '5' };
        gameState.activeSuit = 'hearts';
        const validCard: Card = { suit: 'hearts', value: '7' };
        initialCurrentPlayer.hand.push(validCard);
        initialCurrentPlayer.cardCount = initialCurrentPlayer.hand.length;

        // Play the card
        service.playCard(roomCode, initialCurrentPlayer.id, validCard);

        // Verify turn advanced
        const updatedGameState = service.getGameState(roomCode);
        expect(updatedGameState!.currentPlayerIndex).toBe((initialPlayerIndex + 1) % players.length);

        // Verify previous player no longer has turn
        expect(updatedGameState!.players[initialPlayerIndex].isCurrentTurn).toBe(false);

        // Verify new current player has turn
        const newCurrentPlayerIndex = updatedGameState!.currentPlayerIndex;
        expect(updatedGameState!.players[newCurrentPlayerIndex].isCurrentTurn).toBe(true);
      });

      it('should wrap around to first player after last player', () => {
        const gameState = service.getGameState(roomCode);
        if (!gameState) throw new Error('Game state not found');

        // Set current player to last player
        gameState.currentPlayerIndex = players.length - 1;
        gameState.players.forEach((p, i) => {
          p.isCurrentTurn = i === players.length - 1;
        });

        const lastPlayer = gameState.players[players.length - 1];

        // Set up a valid card play
        gameState.topCard = { suit: 'hearts', value: '5' };
        gameState.activeSuit = 'hearts';
        const validCard: Card = { suit: 'hearts', value: '7' };
        lastPlayer.hand.push(validCard);
        lastPlayer.cardCount = lastPlayer.hand.length;

        // Play the card
        service.playCard(roomCode, lastPlayer.id, validCard);

        // Verify turn wrapped around to first player
        const updatedGameState = service.getGameState(roomCode);
        expect(updatedGameState!.currentPlayerIndex).toBe(0);
        expect(updatedGameState!.players[0].isCurrentTurn).toBe(true);
      });
    });

    describe('Turn Validation', () => {
      it('should reject actions from non-current players', () => {
        const gameState = service.getGameState(roomCode);
        if (!gameState) throw new Error('Game state not found');

        const nonCurrentPlayer = gameState.players.find(p => !p.isCurrentTurn);
        if (!nonCurrentPlayer) throw new Error('No non-current player found');

        // Try to draw a card when it's not their turn
        service.drawCard(roomCode, nonCurrentPlayer.id);

        expect(mockIo.emit).toHaveBeenCalledWith('crazy8:error', expect.objectContaining({
          message: 'Not your turn'
        }));
      });

      it('should validate turn order consistency', () => {
        const gameState = service.getGameState(roomCode);
        if (!gameState) throw new Error('Game state not found');

        const currentPlayer = gameState.players.find(p => p.isCurrentTurn);
        if (!currentPlayer) throw new Error('No current player found');

        // Manually corrupt the turn order for testing
        const wrongPlayerIndex = (gameState.currentPlayerIndex + 1) % players.length;
        const wrongPlayer = gameState.players[wrongPlayerIndex];

        // Try to play a card with wrong player but claim it's their turn
        wrongPlayer.isCurrentTurn = true; // This creates inconsistency

        gameState.topCard = { suit: 'hearts', value: '5' };
        gameState.activeSuit = 'hearts';
        const validCard: Card = { suit: 'hearts', value: '7' };
        wrongPlayer.hand.push(validCard);

        const result = service.playCard(roomCode, wrongPlayer.id, validCard);

        expect(result).toBe(false);
        expect(mockIo.emit).toHaveBeenCalledWith('crazy8:error', expect.objectContaining({
          message: 'Turn order validation failed'
        }));
      });
    });

    describe('Turn Timeout Mechanism', () => {
      beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllTimers();
      });

      afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
      });

      it('should automatically draw card after 60 seconds (Requirement 3.3)', () => {
        // Create a fresh service instance for this test
        const testService = new Crazy8GameService(mockIo);
        const testRoomCode = testService.createRoom('testPlayer', 'Test Player');
        
        const testPlayers: Crazy8Player[] = [
          {
            id: 'testPlayer1',
            name: 'Test Player 1',
            hand: [],
            cardCount: 0,
            isCurrentTurn: false,
            hasWon: false,
            score: 0,
            isConnected: true
          },
          {
            id: 'testPlayer2',
            name: 'Test Player 2',
            hand: [],
            cardCount: 0,
            isCurrentTurn: false,
            hasWon: false,
            score: 0,
            isConnected: true
          }
        ];

        // Clear mocks before starting the game
        jest.clearAllMocks();

        // Start the game which should create a timer
        testService.startGame(testRoomCode, testPlayers);

        const gameState = testService.getGameState(testRoomCode);
        if (!gameState) throw new Error('Game state not found');

        const currentPlayer = gameState.players.find(p => p.isCurrentTurn);
        if (!currentPlayer) throw new Error('No current player found');

        const initialHandSize = currentPlayer.hand.length;

        // Verify timer was started
        expect(mockIo.emit).toHaveBeenCalledWith('crazy8:turn-timer-started', expect.objectContaining({
          playerId: currentPlayer.id,
          timeoutSeconds: 60
        }));

        // Clear previous mock calls to focus on timeout events
        jest.clearAllMocks();

        // Check that we have pending timers
        expect(jest.getTimerCount()).toBeGreaterThan(0);

        // Fast-forward time by 60 seconds
        jest.advanceTimersByTime(60000);

        // Check if any timers are still pending (should be 1 for the next player)
        expect(jest.getTimerCount()).toBe(1);

        // Verify timeout event was emitted
        expect(mockIo.emit).toHaveBeenCalledWith('crazy8:turn-timeout', expect.objectContaining({
          playerId: currentPlayer.id,
          playerName: currentPlayer.name
        }));

        // Verify game state was updated
        expect(mockIo.emit).toHaveBeenCalledWith('crazy8:game-state-update', expect.any(Object));

        // Verify player drew a card (hand size increased)
        const updatedGameState = testService.getGameState(testRoomCode);
        const updatedPlayer = updatedGameState!.players.find(p => p.id === currentPlayer.id);
        expect(updatedPlayer!.hand.length).toBe(initialHandSize + 1);
      });

      it('should clear timer when player makes a move', () => {
        const gameState = service.getGameState(roomCode);
        if (!gameState) throw new Error('Game state not found');

        const currentPlayer = gameState.players.find(p => p.isCurrentTurn);
        if (!currentPlayer) throw new Error('No current player found');

        // Set up a valid card play
        gameState.topCard = { suit: 'hearts', value: '5' };
        gameState.activeSuit = 'hearts';
        const validCard: Card = { suit: 'hearts', value: '7' };
        currentPlayer.hand.push(validCard);
        currentPlayer.cardCount = currentPlayer.hand.length;

        // Play the card before timeout
        jest.advanceTimersByTime(30000); // 30 seconds
        service.playCard(roomCode, currentPlayer.id, validCard);

        // Fast-forward past original timeout
        jest.advanceTimersByTime(40000); // Total 70 seconds

        // Verify no timeout occurred for the original player
        const timeoutCalls = (mockIo.emit as jest.Mock).mock.calls.filter(
          call => call[0] === 'crazy8:turn-timeout'
        );
        expect(timeoutCalls).toHaveLength(0);
      });

      it('should start new timer for next player after turn advance', () => {
        const gameState = service.getGameState(roomCode);
        if (!gameState) throw new Error('Game state not found');

        const initialPlayer = gameState.players.find(p => p.isCurrentTurn);
        if (!initialPlayer) throw new Error('No current player found');

        // Set up a valid card play
        gameState.topCard = { suit: 'hearts', value: '5' };
        gameState.activeSuit = 'hearts';
        const validCard: Card = { suit: 'hearts', value: '7' };
        initialPlayer.hand.push(validCard);
        initialPlayer.cardCount = initialPlayer.hand.length;

        // Clear previous mock calls
        jest.clearAllMocks();

        // Play the card to advance turn
        service.playCard(roomCode, initialPlayer.id, validCard);

        // Verify new timer started for next player
        expect(mockIo.emit).toHaveBeenCalledWith('crazy8:turn-timer-started', expect.objectContaining({
          playerId: expect.any(String),
          timeoutSeconds: 60
        }));

        // Verify it's for the next player
        const updatedGameState = service.getGameState(roomCode);
        const newCurrentPlayer = updatedGameState!.players[updatedGameState!.currentPlayerIndex];
        expect(mockIo.emit).toHaveBeenCalledWith('crazy8:turn-timer-started', expect.objectContaining({
          playerId: newCurrentPlayer.id
        }));
      });

      it('should clear timer when game ends', () => {
        const gameState = service.getGameState(roomCode);
        if (!gameState) throw new Error('Game state not found');

        const currentPlayer = gameState.players.find(p => p.isCurrentTurn);
        if (!currentPlayer) throw new Error('No current player found');

        // Set up winning condition (player has only one card)
        currentPlayer.hand = [{ suit: 'hearts', value: '7' }];
        currentPlayer.cardCount = 1;

        gameState.topCard = { suit: 'hearts', value: '5' };
        gameState.activeSuit = 'hearts';

        // Play the last card to win
        service.playCard(roomCode, currentPlayer.id, currentPlayer.hand[0]);

        // Fast-forward past timeout period
        jest.advanceTimersByTime(70000);

        // Verify no timeout occurred (game ended)
        const timeoutCalls = (mockIo.emit as jest.Mock).mock.calls.filter(
          call => call[0] === 'crazy8:turn-timeout'
        );
        expect(timeoutCalls).toHaveLength(0);
      });
    });

    describe('Resource Cleanup', () => {
      it('should clean up timers when room is destroyed', () => {
        // Verify timer exists
        expect(mockIo.emit).toHaveBeenCalledWith('crazy8:turn-timer-started', expect.any(Object));

        // Destroy the room
        service.destroyRoom(roomCode);

        // Verify room is gone
        const room = service.getRoom(roomCode);
        expect(room).toBeNull();
      });
    });
  });
});