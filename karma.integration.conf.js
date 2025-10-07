const webpackConfig = require('./webpack.config.js');

module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    files: [
      'https://unpkg.com/three@0.164.1/build/three.min.js',
      'test/integration-tests.test.js'
    ],
    preprocessors: {
      'test/integration-tests.test.js': ['webpack']
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
          '--use-gl=swiftshader',
          '--disable-web-security',
          '--allow-running-insecure-content'
        ]
      }
    },
    client: {
      jasmine: {
        random: false,
        timeout: 60000
      }
    },
    browserNoActivityTimeout: 120000,
    captureTimeout: 120000
  })
}