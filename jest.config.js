module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/test/lighthouse-audit.test.js',
    '**/test/web-vitals.test.js',
    '**/test/accessibility-compliance.test.js',
    '**/test/security-audit.test.js',
    '**/test/performance-benchmarks.test.js'
  ],
  testTimeout: 120000,
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.js'],
  collectCoverage: false,
  verbose: true,
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './reports',
      filename: 'web-standards-report.html',
      expand: true
    }]
  ]
};