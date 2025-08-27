// Unit Tests para funciones específicas del backend
const assert = require('assert');

// Simulamos las funciones del backend para testing
class GameLogic {
  static calculateHand(cards) {
    let total = 0;
    let aces = 0;
    for (const card of cards) {
      if (card.value === 'A') {
        aces++;
        total += 11;
      } else if (['K', 'Q', 'J'].includes(card.value)) {
        total += 10;
      } else {
        total += parseInt(card.value);
      }
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return {
      total,
      isBlackjack: cards.length === 2 && total === 21,
      isBust: total > 21,
    };
  }

  static validateBet(balance, currentBet, newBet) {
    if (newBet < 0) {
      return { valid: false, error: 'Bet amount cannot be negative' };
    }
    
    if (newBet === 0) {
      return { valid: false, error: 'Bet amount must be greater than zero' };
    }
    
    if (newBet > balance + currentBet) {
      return { valid: false, error: 'Insufficient balance for this bet' };
    }
    
    return { valid: true };
  }

  static calculatePayout(playerTotal, dealerTotal, bet, isPlayerBlackjack, isDealerBlackjack, isPlayerBust) {
    if (isPlayerBust) {
      return { status: 'bust', payout: 0 };
    }
    
    if (isPlayerBlackjack && !isDealerBlackjack) {
      return { status: 'blackjack', payout: Math.floor(bet * 2.5) };
    }
    
    if (!isPlayerBlackjack && isDealerBlackjack) {
      return { status: 'lose', payout: 0 };
    }
    
    if (dealerTotal > 21) {
      return { status: 'win', payout: bet * 2 };
    }
    
    if (playerTotal > dealerTotal) {
      return { status: 'win', payout: bet * 2 };
    } else if (playerTotal < dealerTotal) {
      return { status: 'lose', payout: 0 };
    } else {
      return { status: 'draw', payout: bet };
    }
  }
}

class UnitTester {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, testFunction) {
    try {
      testFunction();
      this.passed++;
      console.log(`✅ ${name}`);
    } catch (error) {
      this.failed++;
      console.log(`❌ ${name}: ${error.message}`);
    }
  }

  runAllTests() {
    console.log('🧪 Running Unit Tests...\n');

    // Test 1: Hand calculation
    this.test('Calculate simple hand', () => {
      const result = GameLogic.calculateHand([
        { value: '7', suit: 'hearts' },
        { value: '5', suit: 'spades' }
      ]);
      assert.strictEqual(result.total, 12);
      assert.strictEqual(result.isBlackjack, false);
      assert.strictEqual(result.isBust, false);
    });

    this.test('Calculate blackjack', () => {
      const result = GameLogic.calculateHand([
        { value: 'A', suit: 'hearts' },
        { value: 'K', suit: 'spades' }
      ]);
      assert.strictEqual(result.total, 21);
      assert.strictEqual(result.isBlackjack, true);
      assert.strictEqual(result.isBust, false);
    });

    this.test('Calculate bust', () => {
      const result = GameLogic.calculateHand([
        { value: '10', suit: 'hearts' },
        { value: '7', suit: 'spades' },
        { value: '8', suit: 'clubs' }
      ]);
      assert.strictEqual(result.total, 25);
      assert.strictEqual(result.isBlackjack, false);
      assert.strictEqual(result.isBust, true);
    });

    this.test('Calculate soft ace', () => {
      const result = GameLogic.calculateHand([
        { value: 'A', suit: 'hearts' },
        { value: '7', suit: 'spades' },
        { value: '5', suit: 'clubs' }
      ]);
      assert.strictEqual(result.total, 13); // Ace becomes 1
      assert.strictEqual(result.isBust, false);
    });

    // Test 2: Bet validation
    this.test('Valid bet within balance', () => {
      const result = GameLogic.validateBet(1000, 0, 500);
      assert.strictEqual(result.valid, true);
    });

    this.test('Invalid negative bet', () => {
      const result = GameLogic.validateBet(1000, 0, -100);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.error, 'Bet amount cannot be negative');
    });

    this.test('Invalid zero bet', () => {
      const result = GameLogic.validateBet(1000, 0, 0);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.error, 'Bet amount must be greater than zero');
    });

    this.test('Invalid bet exceeds balance', () => {
      const result = GameLogic.validateBet(500, 200, 800); // 800 > 500 + 200 = 700
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.error, 'Insufficient balance for this bet');
    });

    this.test('Valid bet with existing bet', () => {
      const result = GameLogic.validateBet(800, 200, 1000);
      assert.strictEqual(result.valid, true);
    });

    // Test 3: Payout calculation
    this.test('Player wins normal hand', () => {
      const result = GameLogic.calculatePayout(20, 18, 100, false, false, false);
      assert.strictEqual(result.status, 'win');
      assert.strictEqual(result.payout, 200);
    });

    this.test('Player blackjack payout', () => {
      const result = GameLogic.calculatePayout(21, 20, 100, true, false, false);
      assert.strictEqual(result.status, 'blackjack');
      assert.strictEqual(result.payout, 250); // 2.5x bet
    });

    this.test('Player bust loses', () => {
      const result = GameLogic.calculatePayout(25, 20, 100, false, false, true);
      assert.strictEqual(result.status, 'bust');
      assert.strictEqual(result.payout, 0);
    });

    this.test('Draw returns bet', () => {
      const result = GameLogic.calculatePayout(20, 20, 100, false, false, false);
      assert.strictEqual(result.status, 'draw');
      assert.strictEqual(result.payout, 100);
    });

    this.test('Dealer bust, player wins', () => {
      const result = GameLogic.calculatePayout(18, 25, 100, false, false, false);
      assert.strictEqual(result.status, 'win');
      assert.strictEqual(result.payout, 200);
    });

    // Summary
    console.log('\n📊 Unit Test Results:');
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
    
    if (this.failed === 0) {
      console.log('\n🎉 All unit tests passed!');
    } else {
      console.log('\n⚠️ Some unit tests failed. Check the logic.');
    }
  }
}

// Run unit tests
if (require.main === module) {
  const tester = new UnitTester();
  tester.runAllTests();
}

module.exports = UnitTester;