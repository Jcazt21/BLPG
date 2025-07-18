import { DealingSequence, MultiplayerPlayer, MultiplayerDealer } from './dealingSequence';
import { Card, Deck } from '../types/gameTypes';

// Helper function to create a test deck
function createTestDeck(): Deck {
  const cards: Card[] = [
    { suit: 'hearts', value: 'A' },
    { suit: 'diamonds', value: 'K' },
    { suit: 'clubs', value: 'Q' },
    { suit: 'spades', value: 'J' },
    { suit: 'hearts', value: '10' },
    { suit: 'diamonds', value: '9' },
    { suit: 'clubs', value: '8' },
    { suit: 'spades', value: '7' },
    { suit: 'hearts', value: '6' },
    { suit: 'diamonds', value: '5' },
    { suit: 'clubs', value: '4' },
    { suit: 'spades', value: '3' },
    { suit: 'hearts', value: '2' },
  ];
  return cards;
}

// Helper function to create test players
function createTestPlayers(): MultiplayerPlayer[] {
  return [
    {
      id: 'player1',
      name: 'Alice',
      position: 0,
      hand: [],
      total: 0,
      bet: 100,
      balance: 900,
      status: 'playing',
      hasPlacedBet: true
    },
    {
      id: 'player2',
      name: 'Bob',
      position: 1,
      hand: [],
      total: 0,
      bet: 50,
      balance: 950,
      status: 'playing',
      hasPlacedBet: true
    },
    {
      id: 'player3',
      name: 'Charlie',
      position: 2,
      hand: [],
      total: 0,
      bet: 200,
      balance: 800,
      status: 'playing',
      hasPlacedBet: true
    }
  ];
}

// Helper function to create test dealer
function createTestDealer(): MultiplayerDealer {
  return {
    visibleCards: [],
    holeCard: undefined,
    total: 0,
    isBust: false,
    isBlackjack: false
  };
}

describe('DealingSequence', () => {
  let dealingSequence: DealingSequence;
  let testDeck: Deck;
  let testPlayers: MultiplayerPlayer[];
  let testDealer: MultiplayerDealer;

  beforeEach(() => {
    testDeck = createTestDeck();
    dealingSequence = new DealingSequence(testDeck);
    testPlayers = createTestPlayers();
    testDealer = createTestDealer();
  });

  describe('generateDealingSequence', () => {
    it('should generate correct dealing sequence for 3 players', () => {
      const steps = dealingSequence.generateDealingSequence(testPlayers);
      
      // Should have 8 steps total: 3 players × 2 cards + 2 dealer cards
      expect(steps).toHaveLength(8);
      
      // Validate sequence order
      expect(steps[0]).toMatchObject({ type: 'player', playerId: 'player1', round: 1 });
      expect(steps[1]).toMatchObject({ type: 'player', playerId: 'player2', round: 1 });
      expect(steps[2]).toMatchObject({ type: 'player', playerId: 'player3', round: 1 });
      expect(steps[3]).toMatchObject({ type: 'dealer', round: 1, isHoleCard: false });
      expect(steps[4]).toMatchObject({ type: 'player', playerId: 'player1', round: 2 });
      expect(steps[5]).toMatchObject({ type: 'player', playerId: 'player2', round: 2 });
      expect(steps[6]).toMatchObject({ type: 'player', playerId: 'player3', round: 2 });
      expect(steps[7]).toMatchObject({ type: 'dealer', round: 2, isHoleCard: true });
    });

    it('should respect player position order', () => {
      // Create players with mixed positions
      const mixedPlayers = [
        { ...testPlayers[0], position: 2 },
        { ...testPlayers[1], position: 0 },
        { ...testPlayers[2], position: 1 }
      ];

      const steps = dealingSequence.generateDealingSequence(mixedPlayers);
      
      // Should deal in position order: 0, 1, 2
      expect(steps[0].playerId).toBe('player2'); // position 0
      expect(steps[1].playerId).toBe('player3'); // position 1
      expect(steps[2].playerId).toBe('player1'); // position 2
    });

    it('should assign unique cards to each step', () => {
      const steps = dealingSequence.generateDealingSequence(testPlayers);
      const cards = steps.map(step => step.card);
      
      // All cards should be unique
      const uniqueCards = new Set(cards.map(card => `${card.suit}-${card.value}`));
      expect(uniqueCards.size).toBe(cards.length);
    });
  });

  describe('dealInitialCards', () => {
    it('should deal 2 cards to each player', () => {
      const result = dealingSequence.dealInitialCards(testPlayers, testDealer);
      
      result.players.forEach(player => {
        expect(player.hand).toHaveLength(2);
        expect(player.total).toBeGreaterThan(0);
      });
    });

    it('should give dealer 1 visible card and 1 hole card', () => {
      const result = dealingSequence.dealInitialCards(testPlayers, testDealer);
      
      expect(result.dealer.visibleCards).toHaveLength(1);
      expect(result.dealer.holeCard).toBeDefined();
      expect(result.dealer.total).toBeGreaterThan(0);
    });

    it('should calculate hand totals correctly', () => {
      const result = dealingSequence.dealInitialCards(testPlayers, testDealer);
      
      result.players.forEach(player => {
        // Manually calculate expected total
        let expectedTotal = 0;
        let aces = 0;
        
        for (const card of player.hand) {
          if (card.value === 'A') {
            aces++;
            expectedTotal += 11;
          } else if (['K', 'Q', 'J'].includes(card.value)) {
            expectedTotal += 10;
          } else {
            expectedTotal += parseInt(card.value);
          }
        }
        
        while (expectedTotal > 21 && aces > 0) {
          expectedTotal -= 10;
          aces--;
        }
        
        expect(player.total).toBe(expectedTotal);
      });
    });

    it('should detect blackjack correctly', () => {
      // Create a deck that will give blackjack to first player
      const blackjackDeck: Deck = [
        { suit: 'hearts', value: '2' }, // Last card (dealer hole)
        { suit: 'diamonds', value: '3' }, // Second to last
        { suit: 'clubs', value: '4' }, // Third to last
        { suit: 'spades', value: '5' }, // Fourth to last
        { suit: 'hearts', value: '6' }, // Fifth to last
        { suit: 'diamonds', value: '7' }, // Sixth to last
        { suit: 'clubs', value: '8' }, // Seventh to last
        { suit: 'spades', value: 'K' }, // Dealer visible card
        { suit: 'hearts', value: 'A' }, // Player 1 second card (blackjack!)
        { suit: 'diamonds', value: '9' }, // Player 3 first card
        { suit: 'clubs', value: '10' }, // Player 2 first card
        { suit: 'spades', value: 'K' }, // Player 1 first card (blackjack!)
      ];
      
      const blackjackSequence = new DealingSequence(blackjackDeck);
      const result = blackjackSequence.dealInitialCards(testPlayers, testDealer);
      
      expect(result.players[0].total).toBe(21);
      expect(result.players[0].status).toBe('blackjack');
    });
  });

  describe('revealDealerHoleCard', () => {
    it('should reveal hole card and recalculate total', () => {
      const result = dealingSequence.dealInitialCards(testPlayers, testDealer);
      const dealerWithHole = result.dealer;
      
      expect(dealerWithHole.holeCard).toBeDefined();
      const initialVisibleCount = dealerWithHole.visibleCards.length;
      
      const revealedDealer = dealingSequence.revealDealerHoleCard(dealerWithHole);
      
      expect(revealedDealer.visibleCards).toHaveLength(initialVisibleCount + 1);
      expect(revealedDealer.visibleCards).toContain(dealerWithHole.holeCard);
    });

    it('should throw error if no hole card exists', () => {
      const dealerWithoutHole: MultiplayerDealer = {
        visibleCards: [{ suit: 'hearts', value: 'K' }],
        total: 10,
        isBust: false,
        isBlackjack: false
      };
      
      expect(() => {
        dealingSequence.revealDealerHoleCard(dealerWithoutHole);
      }).toThrow('No hole card to reveal');
    });
  });

  describe('validateSequence', () => {
    it('should validate correct dealing sequence', () => {
      const steps = dealingSequence.generateDealingSequence(testPlayers);
      const isValid = dealingSequence.validateSequence(steps);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid sequence with wrong card counts', () => {
      const invalidSteps = [
        { type: 'player' as const, playerId: 'player1', card: { suit: 'hearts' as const, value: 'A' as const }, round: 1, stepNumber: 1 },
        { type: 'dealer' as const, card: { suit: 'diamonds' as const, value: 'K' as const }, round: 1, stepNumber: 2, isHoleCard: false }
        // Missing player cards and hole card
      ];
      
      const isValid = dealingSequence.validateSequence(invalidSteps);
      expect(isValid).toBe(false);
    });

    it('should reject sequence where hole card is not last', () => {
      const invalidSteps = [
        { type: 'player' as const, playerId: 'player1', card: { suit: 'hearts' as const, value: 'A' as const }, round: 1, stepNumber: 1 },
        { type: 'dealer' as const, card: { suit: 'diamonds' as const, value: 'K' as const }, round: 2, stepNumber: 2, isHoleCard: true }, // Hole card too early
        { type: 'player' as const, playerId: 'player1', card: { suit: 'clubs' as const, value: 'Q' as const }, round: 2, stepNumber: 3 },
      ];
      
      const isValid = dealingSequence.validateSequence(invalidSteps);
      expect(isValid).toBe(false);
    });
  });

  describe('sequence navigation', () => {
    it('should allow stepping through dealing sequence', () => {
      dealingSequence.generateDealingSequence(testPlayers);
      
      const firstStep = dealingSequence.getNextDealingStep();
      expect(firstStep).not.toBeNull();
      expect(firstStep?.stepNumber).toBe(1);
      
      const secondStep = dealingSequence.getNextDealingStep();
      expect(secondStep?.stepNumber).toBe(2);
    });

    it('should return null when sequence is complete', () => {
      dealingSequence.generateDealingSequence(testPlayers);
      
      // Step through all cards
      for (let i = 0; i < 8; i++) {
        dealingSequence.getNextDealingStep();
      }
      
      const nextStep = dealingSequence.getNextDealingStep();
      expect(nextStep).toBeNull();
      expect(dealingSequence.isComplete()).toBe(true);
    });
  });

  describe('reset functionality', () => {
    it('should reset sequence with new deck', () => {
      dealingSequence.generateDealingSequence(testPlayers);
      dealingSequence.getNextDealingStep(); // Advance sequence
      
      const newDeck = createTestDeck();
      dealingSequence.reset(newDeck);
      
      expect(dealingSequence.isComplete()).toBe(false);
      expect(dealingSequence.getAllSteps()).toHaveLength(0);
    });
  });
});