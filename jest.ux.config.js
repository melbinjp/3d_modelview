/**
 * Jest Configuration for UX Enhancement Tests
 */

module.exports = {
    displayName: 'UX Enhancements',
    testEnvironment: 'jsdom',
    testMatch: [
        '**/test/onboarding-manager.test.js',
        '**/test/mobile-gesture-manager.test.js',
        '**/test/feature-discovery-engine.test.js',
        '**/test/ux-enhancements-integration.test.js'
    ],
    setupFilesAfterEnv: ['<rootDir>/test/jest.setup.js'],
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': '<rootDir>/test/mocks/styleMock.js',
        '^three$': '<rootDir>/test/mocks/three.js'
    },
    transform: {
        '^.+\\.js$': ['babel-jest', {
            presets: [
                ['@babel/preset-env', {
                    targets: { node: 'current' }
                }]
            ],
            plugins: ['babel-plugin-transform-import-meta']
        }]
    },
    collectCoverageFrom: [
        'src/ui/OnboardingManager.js',
        'src/ui/MobileGestureManager.js',
        'src/ui/FeatureDiscoveryEngine.js',
        'src/ui/UXEnhancementsIntegration.js'
    ],
    coverageThreshold: {
        global: {
            branches: 90,
            functions: 95,
            lines: 95,
            statements: 95
        }
    },
    coverageReporters: ['text', 'lcov', 'html'],
    verbose: true,
    testTimeout: 10000,
    globals: {
        'ts-jest': {
            useESM: true
        }
    }
};
