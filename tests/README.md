# Blackjack Multiplayer Test Suite

This directory contains all tests for the Blackjack Multiplayer application, organized by test type.

## Test Directory Structure

- `unit/`: Unit tests for individual functions and components
- `integration/`: Integration tests that verify interactions between components
- `e2e/`: End-to-end tests that simulate complete user flows
- `performance/`: Tests that evaluate system performance under various conditions

## Running Tests

You can run tests using the npm scripts defined in the root package.json:

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e

# Run performance tests
npm run test:performance

# Run balance-specific tests
npm run test:balance
```

## Test Files

### Unit Tests
- `test-unit.js`: Tests for individual game logic functions

### Integration Tests
- `test-balance-validation.js`: Tests for balance and betting validation
- `test-balance-comprehensive.js`: Comprehensive balance testing with edge cases
- `test-balance-between-rounds.js`: Tests for balance tracking between game rounds
- `test-reward-tracking.js`: Tests for reward calculation and tracking
- `test-multiplayer.js`: Basic multiplayer functionality tests
- `test-quick.js`: Quick smoke test for basic functionality

### End-to-End Tests
- `test-8-players-comprehensive.js`: Comprehensive test with 8 players
- `test-multiplayer-comprehensive.js`: Full multiplayer game simulation

### Performance Tests
- `test-multiplayer-balance-robust.js`: Performance tests for multiplayer balance

## Adding New Tests

When adding new tests:

1. Place the test file in the appropriate directory based on test type
2. Follow the naming convention: `test-[feature]-[description].js`
3. Update `run-tests.js` if you want to add the test to the test runner
4. Consider adding a new npm script for running the test directly