const webpackConfig = require('./webpack.config.js');

module.exports = function(config) {
  const files = config.files || [
    'https://unpkg.com/three@0.164.1/build/three.min.js',
    'spec/ModelViewerSpec.js',
    'test/asset-loading-enhancement.test.js',
    'test/enhanced-unit-tests.test.js',
    'test/model-editing.test.js'
  ];

  // Add comprehensive test files if not specified
  if (!config.files) {
    files.push(
      'test/comprehensive-unit-tests.test.js',
      'test/integration-tests.test.js',
      'test/performance-tests.test.js',
      'test/browser-compatibility-tests.test.js',
      'test/model-editing.test.js'
    );
  }

  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    files: files,
    preprocessors: {
      'spec/ModelViewerSpec.js': ['webpack'],
      'test/asset-loading-enhancement.test.js': ['webpack'],
      'test/enhanced-unit-tests.test.js': ['webpack'],
      'test/comprehensive-unit-tests.test.js': ['webpack'],
      'test/integration-tests.test.js': ['webpack'],
      'test/performance-tests.test.js': ['webpack'],
      'test/browser-compatibility-tests.test.js': ['webpack'],
      'test/model-editing.test.js': ['webpack']
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
