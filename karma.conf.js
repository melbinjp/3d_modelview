const webpackConfig = require('./webpack.config.js')({}, { mode: 'development' });
delete webpackConfig.entry;
delete webpackConfig.output;
process.env.CHROME_BIN = require('puppeteer').executablePath();

module.exports = function(config) {
  const files = config.files || [
    'https://unpkg.com/three@0.164.1/build/three.min.js',
    'spec/ModelViewerSpec.js',
    'test/error-handling.test.js',
    'test/onboarding-manager.test.js',
    'test/mobile-gesture-manager.test.js',
    'test/feature-discovery-engine.test.js',
    'test/ux-enhancements-integration.test.js'
  ];

  // Add comprehensive test files if not specified
  if (!config.files) {
    files.push(
      'test/comprehensive-unit-tests.test.js',
      'test/integration-tests.test.js',
      'test/performance-tests.test.js',
      'test/browser-compatibility-tests.test.js'
    );
  }

  config.set({
    basePath: '',
    frameworks: ['jasmine', 'webpack'],
    files: files,
    preprocessors: {
      'spec/ModelViewerSpec.js': ['webpack'],
      'test/error-handling.test.js': ['webpack'],
      'test/onboarding-manager.test.js': ['webpack'],
      'test/mobile-gesture-manager.test.js': ['webpack'],
      'test/feature-discovery-engine.test.js': ['webpack'],
      'test/ux-enhancements-integration.test.js': ['webpack'],
      'test/comprehensive-unit-tests.test.js': ['webpack'],
      'test/integration-tests.test.js': ['webpack'],
      'test/performance-tests.test.js': ['webpack'],
      'test/browser-compatibility-tests.test.js': ['webpack']
    },
    webpack: webpackConfig,
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ['ChromeHeadless'],
    singleRun: true,
    concurrency: Infinity,
    customLaunchers: {
      ChromeHeadless: {
        base: 'Chrome',
        flags: [
          '--headless',
          '--disable-gpu',
          '--no-sandbox',
          '--remote-debugging-port=9222',
          '--use-gl=swiftshader'
        ]
      }
    },
  })
}
