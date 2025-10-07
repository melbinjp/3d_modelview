#!/usr/bin/env node

/**
 * Simple Web Vitals Assessment
 * Checks for Web Vitals optimization indicators in the codebase
 */

const fs = require('fs');
const path = require('path');

class WebVitalsChecker {
    constructor() {
        this.results = {
            criticalCSS: false,
            resourceHints: false,
            imageOptimization: false,
            fontOptimization: false,
            jsOptimization: false
        };
    }

    checkCriticalCSS() {
        try {
            const indexPath = path.join(process.cwd(), 'index.html');
            const content = fs.readFileSync(indexPath, 'utf8');
            
            // Check for inlined critical CSS
            const hasInlineCSS = content.includes('<style>') && content.includes('critical');
            const hasAsyncCSS = content.includes('rel="preload"') && content.includes('as="style"');
            
            this.results.criticalCSS = hasInlineCSS || hasAsyncCSS;
            return this.results.criticalCSS;
        } catch (error) {
            console.warn('Could not check critical CSS:', error.message);
            return false;
        }
    }

    checkResourceHints() {
        try {
            const indexPath = path.join(process.cwd(), 'index.html');
            const content = fs.readFileSync(indexPath, 'utf8');
            
            // Check for resource hints
            const hasPreload = content.includes('rel="preload"');
            const hasPrefetch = content.includes('rel="prefetch"') || content.includes('rel="dns-prefetch"');
            const hasPreconnect = content.includes('rel="preconnect"');
            
            this.results.resourceHints = hasPreload && (hasPrefetch || hasPreconnect);
            return this.results.resourceHints;
        } catch (error) {
            console.warn('Could not check resource hints:', error.message);
            return false;
        }
    }

    checkImageOptimization() {
        try {
            // Check for image optimization in webpack config
            const webpackPath = path.join(process.cwd(), 'webpack.config.js');
            if (fs.existsSync(webpackPath)) {
                const content = fs.readFileSync(webpackPath, 'utf8');
                
                const hasImageOptimization = content.includes('asset/resource') && 
                                           (content.includes('.png') || content.includes('.jpg') || content.includes('.webp'));
                
                this.results.imageOptimization = hasImageOptimization;
                return hasImageOptimization;
            }
            return false;
        } catch (error) {
            console.warn('Could not check image optimization:', error.message);
            return false;
        }
    }

    checkFontOptimization() {
        try {
            const indexPath = path.join(process.cwd(), 'index.html');
            const content = fs.readFileSync(indexPath, 'utf8');
            
            // Check for font optimization
            const hasFontDisplay = content.includes('font-display') || content.includes('swap');
            const hasFontPreload = content.includes('preload') && content.includes('font');
            
            // Check CSS for font optimization
            const stylesPath = path.join(process.cwd(), 'styles.css');
            let hasFontOptimizationCSS = false;
            if (fs.existsSync(stylesPath)) {
                const cssContent = fs.readFileSync(stylesPath, 'utf8');
                hasFontOptimizationCSS = cssContent.includes('font-display') || 
                                       cssContent.includes('system-ui') ||
                                       cssContent.includes('-apple-system');
            }
            
            this.results.fontOptimization = hasFontDisplay || hasFontPreload || hasFontOptimizationCSS;
            return this.results.fontOptimization;
        } catch (error) {
            console.warn('Could not check font optimization:', error.message);
            return false;
        }
    }

    checkJSOptimization() {
        try {
            // Check for JS optimization techniques
            const mainPath = path.join(process.cwd(), 'src/main.js');
            let hasLazyLoading = false;
            let hasCodeSplitting = false;
            
            if (fs.existsSync(mainPath)) {
                const content = fs.readFileSync(mainPath, 'utf8');
                hasLazyLoading = content.includes('import(') || content.includes('dynamic import');
            }
            
            const webpackPath = path.join(process.cwd(), 'webpack.config.js');
            if (fs.existsSync(webpackPath)) {
                const content = fs.readFileSync(webpackPath, 'utf8');
                hasCodeSplitting = content.includes('splitChunks') || content.includes('optimization');
            }
            
            this.results.jsOptimization = hasLazyLoading && hasCodeSplitting;
            return this.results.jsOptimization;
        } catch (error) {
            console.warn('Could not check JS optimization:', error.message);
            return false;
        }
    }

    async runAllChecks() {
        console.log('📈 Running Web Vitals assessment...');
        
        this.checkCriticalCSS();
        this.checkResourceHints();
        this.checkImageOptimization();
        this.checkFontOptimization();
        this.checkJSOptimization();
        
        const passed = Object.values(this.results).filter(Boolean).length;
        const total = Object.keys(this.results).length;
        const score = Math.round((passed / total) * 100);
        
        console.log('\n📊 Web Vitals Results:');
        console.log(`🎨 Critical CSS: ${this.results.criticalCSS ? 'PASS' : 'FAIL'}`);
        console.log(`🔗 Resource Hints: ${this.results.resourceHints ? 'PASS' : 'FAIL'}`);
        console.log(`🖼️  Image Optimization: ${this.results.imageOptimization ? 'PASS' : 'FAIL'}`);
        console.log(`🔤 Font Optimization: ${this.results.fontOptimization ? 'PASS' : 'FAIL'}`);
        console.log(`⚡ JS Optimization: ${this.results.jsOptimization ? 'PASS' : 'FAIL'}`);
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
    const checker = new WebVitalsChecker();
    checker.runAllChecks().then(result => {
        process.exit(result.success ? 0 : 1);
    }).catch(error => {
        console.error('Web Vitals check failed:', error);
        process.exit(1);
    });
}

module.exports = WebVitalsChecker;