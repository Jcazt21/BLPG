#!/usr/bin/env node

/**
 * Integration test runner for Help Assistant with real API calls
 * ⚠️ WARNING: This will consume API tokens and cost money!
 * Only run when necessary for full integration testing
 */

const { execSync } = require('child_process');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  INTEGRATION TEST WARNING ⚠️');
console.log('');
console.log('This will run tests that make REAL API calls to Gemini.');
console.log('This WILL consume API tokens and cost money!');
console.log('');
console.log('Estimated cost: ~$0.01-0.05 per test run');
console.log('Estimated tokens: ~500-2000 tokens');
console.log('');

rl.question('Are you sure you want to proceed? (yes/no): ', (answer) => {
  if (answer.toLowerCase() !== 'yes') {
    console.log('❌ Integration tests cancelled. Use npm run test:help:minimal for safe testing.');
    rl.close();
    process.exit(0);
  }

  console.log('\n🧪 Running Help Assistant integration tests with REAL API calls...\n');

  // Set environment for integration testing
  process.env.NODE_ENV = 'test';
  process.env.HELP_ASSISTANT_PROVIDER = 'gemini';
  
  // Check for API key
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in environment variables.');
    console.error('   Please set your API key before running integration tests.');
    rl.close();
    process.exit(1);
  }

  const integrationTests = [
    'src/services/helpAssistant/integration.test.ts',
    // Add other integration tests here as needed
  ];

  const testPattern = integrationTests.join('|');

  try {
    console.log('📋 Integration test files:');
    integrationTests.forEach(file => console.log(`   - ${file}`));
    console.log('');
    
    // Run Jest with integration tests
    const jestCommand = `npx jest --testPathPattern="(${testPattern})" --verbose --no-coverage --maxWorkers=1 --testTimeout=30000`;
    
    console.log('🚀 Executing integration tests...\n');
    console.log('💰 API calls starting - tokens will be consumed!\n');
    
    execSync(jestCommand, { 
      stdio: 'inherit', 
      cwd: path.join(__dirname, '..'),
      env: { ...process.env }
    });
    
    console.log('\n✅ Integration tests completed!');
    console.log('\n💰 Check your Gemini API usage dashboard for token consumption.');
    
  } catch (error) {
    console.error('\n❌ Integration tests failed:');
    console.error(error.message);
    console.log('\n💰 Some API tokens may have been consumed even with failures.');
    rl.close();
    process.exit(1);
  }

  rl.close();
});