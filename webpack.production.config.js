const path = require('path');
const { merge } = require('webpack-merge');
const baseConfig = require('./webpack.config.js');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = (env, argv) => {
  const baseConfiguration = baseConfig(env, argv);
  
  return merge(baseConfiguration, {
    optimization: {
      ...baseConfiguration.optimization,
      usedExports: true,
      sideEffects: false,
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
    },
    plugins: [
      ...baseConfiguration.plugins,
      // Add bundle analyzer only when explicitly requested
      ...(process.env.ANALYZE ? [new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false,
        reportFilename: 'bundle-report.html'
      })] : [])
    ],
    resolve: {
      ...baseConfiguration.resolve,
      // Add fallbacks for Node.js modules if needed
      fallback: {
        "path": false,
        "fs": false
      }
    }
  });
};