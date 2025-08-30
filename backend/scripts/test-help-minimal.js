#!/usr/bin/env node

/**
 * Minimal test runner for Help Assistant that avoids API calls
 * This script runs only the essential tests without consuming API tokens
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Running minimal Help Assistant tests (no API calls)...\n');

// Set environment variables to force mock mode
process.env.NODE_ENV = 'test';
process.env.HELP_ASSISTANT_PROVIDER = 'mock';
process.env.GEMINI_API_KEY = 'mock-key-for-testing';

const testFiles = [
    // Core logic tests (no API calls)
    'src/services/helpAssistant/promptGuardrails.test.ts',
    'src/services/helpAssistant/responseValidator.test.ts',
    'src/services/helpAssistant/contentGuardrails.test.ts',
    'src/services/helpAssistant/requestQueue.test.ts',
    'src/services/helpAssistant/rateLimiter.test.ts',
    'src/services/helpAssistant/usageTracker.test.ts',

    // Mock provider tests only (no real API)
    'src/services/helpAssistant/llmProvider.test.ts',

    // Service tests with mocked API calls
    'src/services/helpAssistant/helpAssistantService.test.ts',

    // Skip integration tests that might call real APIs
    // 'src/services/helpAssistant/integration.test.ts',
];

const testPattern = testFiles.join('|');

try {
    console.log('📋 Test files to run:');
    testFiles.forEach(file => console.log(`   - ${file}`));
    console.log('');

    // Run Jest with specific test files
    const jestCommand = `npx jest --testPathPattern="(${testPattern})" --verbose --no-coverage --maxWorkers=1`;

    console.log('🚀 Executing tests...\n');
    execSync(jestCommand, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
        env: { ...process.env }
    });

    console.log('\n✅ All minimal tests passed! No API tokens consumed.');

} catch (error) {
    console.error('\n❌ Some tests failed:');
    console.error(error.message);
    process.exit(1);
}

console.log('\n📊 Test Summary:');
console.log('   - API calls: 0 (all mocked)');
console.log('   - Tokens used: 0');
console.log('   - Cost: $0.00');
console.log('\n💡 To run integration tests with real API:');
console.log('   npm run test:help:integration');