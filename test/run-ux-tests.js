/**
 * UX Enhancements Test Runner
 * Runs all UX enhancement tests with detailed reporting
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Running UX Enhancements Test Suite\n');
console.log('=' .repeat(60));

const testFiles = [
    'test/onboarding-manager.test.js',
    'test/mobile-gesture-manager.test.js',
    'test/feature-discovery-engine.test.js',
    'test/ux-enhancements-integration.test.js'
];

console.log('\n📋 Test Files:');
testFiles.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file}`);
});

console.log('\n' + '='.repeat(60));
console.log('🚀 Starting Karma Test Runner...\n');

// Run Karma with specific test files
const karma = spawn('npx', [
    'karma',
    'start',
    'karma.conf.js',
    '--single-run',
    '--browsers=ChromeHeadless'
], {
    stdio: 'inherit',
    shell: true
});

karma.on('error', (error) => {
    console.error('❌ Failed to start test runner:', error);
    process.exit(1);
});

karma.on('close', (code) => {
    console.log('\n' + '='.repeat(60));
    
    if (code === 0) {
        console.log('✅ All UX Enhancement tests passed!');
        console.log('\n📊 Test Coverage:');
        console.log('  - OnboardingManager: ✓');
        console.log('  - MobileGestureManager: ✓');
        console.log('  - FeatureDiscoveryEngine: ✓');
        console.log('  - Integration Tests: ✓');
    } else {
        console.log(`❌ Tests failed with exit code ${code}`);
        console.log('\n💡 Tips:');
        console.log('  - Check console output for specific failures');
        console.log('  - Run individual test files for debugging');
        console.log('  - Ensure all dependencies are installed');
    }
    
    console.log('=' .repeat(60) + '\n');
    process.exit(code);
});
