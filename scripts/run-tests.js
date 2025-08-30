#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const TESTS = {
  unit: {
    file: 'tests/unit/unit.js',
    description: 'Unit tests for individual functions'
  },
  balance: {
    file: 'tests/integration/balance-validation.js',
    description: 'Basic balance and betting validation tests'
  },
  'balance-comprehensive': {
    file: 'tests/integration/balance-comprehensive.js',
    description: 'Comprehensive balance testing with edge cases'
  },
  quick: {
    file: 'tests/integration/quick.js',
    description: 'Quick smoke test for basic functionality'
  },
  comprehensive: {
    file: 'tests/e2e/multiplayer-comprehensive.js',
    description: 'Full multiplayer game simulation tests'
  },
  'performance': {
    file: 'tests/performance/multiplayer-balance-robust.js',
    description: 'Performance tests for multiplayer balance'
  },
  all: {
    description: 'Run all tests sequentially'
  }
};

function showHelp() {
  console.log('\n🎮 Blackjack Multiplayer Test Suite 🎮\n');
  console.log('Usage: node run-tests.js [test-type]\n');
  console.log('Available tests:');
  Object.entries(TESTS).forEach(([key, test]) => {
    console.log(`  ${key.padEnd(15)} - ${test.description}`);
  });
  console.log('\nExamples:');
  console.log('  node run-tests.js balance      # Run balance validation tests');
  console.log('  node run-tests.js comprehensive # Run full multiplayer tests');
  console.log('  node run-tests.js all          # Run all tests');
  console.log('  node run-tests.js              # Show this help\n');
}

function runTest(testFile) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Starting ${testFile}...\n`);
    
    const child = spawn('node', [testFile], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${testFile} completed successfully\n`);
        resolve();
      } else {
        console.log(`\n❌ ${testFile} failed with exit code ${code}\n`);
        reject(new Error(`Test failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      console.error(`\n❌ Failed to start ${testFile}:`, error.message);
      reject(error);
    });
  });
}

async function runAllTests() {
  console.log('\n🎯 Running all tests sequentially...\n');
  
  try {
    // Run unit tests first
    await runTest('tests/unit/unit.js');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Pause between tests
    
    // Run integration tests
    await runTest('tests/integration/balance-validation.js');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await runTest('tests/integration/quick.js');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Run e2e tests
    await runTest('tests/e2e/multiplayer-comprehensive.js');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('🎉 All tests completed successfully! 🎉');
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

async function main() {
  const testType = process.argv[2];

  if (!testType) {
    showHelp();
    return;
  }

  if (testType === 'all') {
    await runAllTests();
    return;
  }

  const test = TESTS[testType];
  if (!test || !test.file) {
    console.error(`❌ Unknown test type: ${testType}`);
    showHelp();
    process.exit(1);
  }

  try {
    await runTest(test.file);
  } catch (error) {
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n🛑 Tests interrupted by user');
  process.exit(0);
});

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});