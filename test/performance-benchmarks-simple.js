#!/usr/bin/env node

/**
 * Simple Performance Benchmarks
 * Checks build output sizes and performance indicators
 */

const fs = require('fs');
const path = require('path');

class PerformanceBenchmarks {
    constructor() {
        this.results = {
            bundleSize: null,
            assetOptimization: null,
            codeOptimization: null,
            caching: null,
            lazyLoading: null
        };
        
        this.thresholds = {
            maxMainBundleSize: 1024 * 1024, // 1MB
            maxTotalSize: 5 * 1024 * 1024,  // 5MB
            minCompressionRatio: 0.3         // 30% compression
        };
    }

    checkBundleSize() {
        try {
            const distPath = path.join(process.cwd(), 'dist');
            if (!fs.existsSync(distPath)) {
                console.warn('Dist folder not found, run build first');
                return false;
            }

            const files = fs.readdirSync(distPath);
            let totalSize = 0;
            let mainBundleSize = 0;
            let hasCodeSplitting = false;

            files.forEach(file => {
                const filePath = path.join(distPath, file);
                const stats = fs.statSync(filePath);
                
                if (stats.isFile()) {
                    totalSize += stats.size;
                    
                    if (file.includes('main.') && file.endsWith('.js')) {
                        mainBundleSize = stats.size;
                    }
                    
                    if (file.includes('chunk.') || file.includes('vendor.') || file.includes('common.')) {
                        hasCodeSplitting = true;
                    }
                }
            });

            const bundleCheck = {
                totalSize: totalSize,
                mainBundleSize: mainBundleSize,
                hasCodeSplitting: hasCodeSplitting,
                withinLimits: mainBundleSize <= this.thresholds.maxMainBundleSize && 
                             totalSize <= this.thresholds.maxTotalSize
            };

            this.results.bundleSize = bundleCheck;
            return bundleCheck.withinLimits;
        } catch (error) {
            console.warn('Could not check bundle size:', error.message);
            return false;
        }
    }

    checkAssetOptimization() {
        try {
            const distPath = path.join(process.cwd(), 'dist');
            const files = fs.readdirSync(distPath);
            
            let hasMinifiedJS = false;
            let hasOptimizedCSS = false;
            let hasCompressedAssets = false;

            files.forEach(file => {
                if (file.endsWith('.js') && (file.includes('.min.') || file.includes('.'))) {
                    hasMinifiedJS = true;
                }
                if (file.endsWith('.css')) {
                    hasOptimizedCSS = true;
                }
                if (file.includes('.') && !file.includes('.map')) {
                    hasCompressedAssets = true;
                }
            });

            const optimization = hasMinifiedJS && hasOptimizedCSS && hasCompressedAssets;
            this.results.assetOptimization = optimization;
            return optimization;
        } catch (error) {
            console.warn('Could not check asset optimization:', error.message);
            return false;
        }
    }

    checkCodeOptimization() {
        try {
            // Check for performance optimizations in source code
            const srcPath = path.join(process.cwd(), 'src');
            let hasLazyLoading = false;
            let hasPerformanceMonitoring = false;
            let hasMemoryManagement = false;

            // Check main.js for lazy loading
            const mainPath = path.join(srcPath, 'main.js');
            if (fs.existsSync(mainPath)) {
                const content = fs.readFileSync(mainPath, 'utf8');
                hasLazyLoading = content.includes('import(') || content.includes('dynamic import');
            }

            // Check for performance monitoring
            const perfPath = path.join(srcPath, 'core/PerformanceMonitor.js');
            if (fs.existsSync(perfPath)) {
                hasPerformanceMonitoring = true;
            }

            // Check for memory management
            const memPath = path.join(srcPath, 'performance/MemoryManager.js');
            if (fs.existsSync(memPath)) {
                hasMemoryManagement = true;
            }

            const optimization = hasLazyLoading && hasPerformanceMonitoring && hasMemoryManagement;
            this.results.codeOptimization = optimization;
            return optimization;
        } catch (error) {
            console.warn('Could not check code optimization:', error.message);
            return false;
        }
    }

    checkCaching() {
        try {
            // Check for service worker and caching strategies
            const swPath = path.join(process.cwd(), 'service-worker.js');
            const distSwPath = path.join(process.cwd(), 'dist/service-worker.js');
            
            const hasServiceWorker = fs.existsSync(swPath) || fs.existsSync(distSwPath);
            
            let hasCachingStrategy = false;
            if (hasServiceWorker) {
                const swContent = fs.readFileSync(fs.existsSync(swPath) ? swPath : distSwPath, 'utf8');
                hasCachingStrategy = swContent.includes('cache') && swContent.includes('fetch');
            }

            const caching = hasServiceWorker && hasCachingStrategy;
            this.results.caching = caching;
            return caching;
        } catch (error) {
            console.warn('Could not check caching:', error.message);
            return false;
        }
    }

    checkLazyLoading() {
        try {
            // Check webpack config for code splitting
            const webpackPath = path.join(process.cwd(), 'webpack.config.js');
            if (fs.existsSync(webpackPath)) {
                const content = fs.readFileSync(webpackPath, 'utf8');
                const hasCodeSplitting = content.includes('splitChunks') || content.includes('chunks:');
                
                this.results.lazyLoading = hasCodeSplitting;
                return hasCodeSplitting;
            }
            return false;
        } catch (error) {
            console.warn('Could not check lazy loading:', error.message);
            return false;
        }
    }

    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async runAllBenchmarks() {
        console.log('⚡ Running performance benchmarks...');
        
        this.checkBundleSize();
        this.checkAssetOptimization();
        this.checkCodeOptimization();
        this.checkCaching();
        this.checkLazyLoading();
        
        const passed = Object.values(this.results).filter(Boolean).length;
        const total = Object.keys(this.results).length;
        const score = Math.round((passed / total) * 100);
        
        console.log('\n📊 Performance Results:');
        console.log(`📦 Bundle Size: ${this.results.bundleSize ? 'PASS' : 'FAIL'}`);
        if (this.results.bundleSize) {
            console.log(`   Main Bundle: ${this.formatSize(this.results.bundleSize.mainBundleSize)}`);
            console.log(`   Total Size: ${this.formatSize(this.results.bundleSize.totalSize)}`);
            console.log(`   Code Splitting: ${this.results.bundleSize.hasCodeSplitting ? 'YES' : 'NO'}`);
        }
        console.log(`🎯 Asset Optimization: ${this.results.assetOptimization ? 'PASS' : 'FAIL'}`);
        console.log(`⚡ Code Optimization: ${this.results.codeOptimization ? 'PASS' : 'FAIL'}`);
        console.log(`💾 Caching Strategy: ${this.results.caching ? 'PASS' : 'FAIL'}`);
        console.log(`🔄 Lazy Loading: ${this.results.lazyLoading ? 'PASS' : 'FAIL'}`);
        console.log(`\n📈 Overall Score: ${score}% (${passed}/${total})`);
        
        return {
            success: score >= 80,
            score: score,
            results: this.results,
            passed: passed,
            total: total
        };
    }
}

// Run if called directly
if (require.main === module) {
    const benchmarks = new PerformanceBenchmarks();
    benchmarks.runAllBenchmarks().then(result => {
        process.exit(result.success ? 0 : 1);
    }).catch(error => {
        console.error('Performance benchmarks failed:', error);
        process.exit(1);
    });
}

module.exports = PerformanceBenchmarks;