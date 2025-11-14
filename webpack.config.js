const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: {
      main: './src/main.js',
      // Code splitting for major modules
      cinematic: './src/cinematic/CinematicEngine.js',
      physics: './src/physics/PhysicsEngine.js',
      xr: './src/xr/WebXRManager.js'
    },
    output: {
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      chunkFilename: isProduction ? '[name].[contenthash].chunk.js' : '[name].chunk.js',
      path: path.resolve(__dirname, 'dist'),
      clean: true,
      publicPath: './',
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 20
          },
          three: {
            test: /[\\/]node_modules[\\/]three[\\/]/,
            name: 'three',
            chunks: 'all',
            priority: 30
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true
          }
        }
      },
      runtimeChunk: 'single',
      minimize: isProduction,
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
              cacheDirectory: true
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg|webp|avif)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/images/[name].[hash][ext]'
          }
        },
        {
          test: /\.(mp3|wav|ogg|m4a)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/audio/[name].[hash][ext]'
          }
        },
        {
          test: /\.(glb|gltf|fbx|obj|dae|stl|ply)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/models/[name].[hash][ext]'
          }
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './index.html',
        inject: 'body',
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true,
        } : false
      }),
      new CopyPlugin({
        patterns: [
          { 
            from: 'styles.css', 
            to: 'styles.css',
            transform: isProduction ? (content) => {
              // Basic CSS minification
              return content.toString()
                .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
                .replace(/\s+/g, ' ') // Collapse whitespace
                .replace(/;\s*}/g, '}') // Remove last semicolon in blocks
                .trim();
            } : undefined
          },
          { 
            from: 'src/analysis/analysis.css', 
            to: 'analysis.css'
          },
          { 
            from: 'src/ui/file-manager.css', 
            to: 'file-manager.css'
          },
          { 
            from: 'src/ui/accessibility.css', 
            to: 'accessibility.css'
          },
          { 
            from: 'src/ui/ux-enhancements.css', 
            to: 'src/ui/ux-enhancements.css'
          },
          { from: 'superhero-theme.mp3', to: 'superhero-theme.mp3' },
          { from: 'superhero-mode.js', to: 'superhero-mode.js' },
          { 
            from: 'manifest.json', 
            to: 'manifest.json',
            transform: isProduction ? (content) => {
              return JSON.stringify(JSON.parse(content.toString()));
            } : undefined
          },
          { from: 'service-worker.js', to: 'service-worker.js' },
          { from: 'CNAME' },
        ],
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@core': path.resolve(__dirname, 'src/core'),
        '@rendering': path.resolve(__dirname, 'src/rendering'),
        '@assets': path.resolve(__dirname, 'src/assets'),
        '@ui': path.resolve(__dirname, 'src/ui'),
        '@cinematic': path.resolve(__dirname, 'src/cinematic'),
        '@physics': path.resolve(__dirname, 'src/physics'),
        '@xr': path.resolve(__dirname, 'src/xr'),
        '@performance': path.resolve(__dirname, 'src/performance'),
        '@analysis': path.resolve(__dirname, 'src/analysis'),
        '@export': path.resolve(__dirname, 'src/export')
      }
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
    },
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      compress: true,
      port: 8080,
      hot: true,
      historyApiFallback: true,
      headers: {
        "Content-Security-Policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https://*.githubusercontent.com https://*.polyhaven.com https://*.sketchfab.com https://*.google-analytics.com https://*.googletagmanager.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.google-analytics.com https://*.googletagmanager.com; connect-src 'self' ws: https://*.githubusercontent.com https://*.polyhaven.com https://*.sketchfab.com https://*.google-analytics.com https://*.googletagmanager.com;",
      },
    },
  };
};
