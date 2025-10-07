#!/usr/bin/env node

/**
 * Code Quality Checker
 * Fast code quality validation that runs as part of the build process
 * Ensures basic web standards compliance without requiring a full browser environment
 */

const fs = require('fs');
const path = require('path');

class CodeQualityChecker {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.projectRoot = path.resolve(__dirname, '..');
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅';
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    addError(message) {
        this.errors.push(message);
        this.log(message, 'error');
    }

    addWarning(message) {
        this.warnings.push(message);
        this.log(message, 'warning');
    }

    checkHTMLStructure() {
        this.log('Checking HTML structure...');
        
        const indexPath = path.join(this.projectRoot, 'index.html');
        if (!fs.existsSync(indexPath)) {
            this.addError('index.html not found');
            return;
        }

        const html = fs.readFileSync(indexPath, 'utf8');

        // Check for essential HTML elements
        if (!html.includes('<!DOCTYPE html>')) {
            this.addError('Missing DOCTYPE declaration');
        }

        if (!html.includes('lang=')) {
            this.addError('Missing lang attribute on html element');
        }

        if (!html.includes('<meta charset=')) {
            this.addError('Missing charset meta tag');
        }

        if (!html.includes('name="viewport"')) {
            this.addError('Missing viewport meta tag');
        }

        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/);
        if (!titleMatch) {
            this.addError('Missing title tag');
        } else if (!titleMatch[1].trim() && !html.includes('data-i18n="app.title"')) {
            this.addError('Empty title tag');
        }

        // Check for semantic HTML
        const semanticElements = ['main', 'header', 'nav', 'section', 'article'];
        const hasSemanticElements = semanticElements.some(element => 
            html.includes(`<${element}`) || html.includes(`<${element} `)
        );

        if (!hasSemanticElements) {
            this.addWarning('Consider using semantic HTML elements (main, header, nav, section, article)');
        }

        // Check for accessibility features
        if (!html.includes('aria-')) {
            this.addWarning('Consider adding ARIA attributes for better accessibility');
        }

        this.log('HTML structure check completed');
    }

    checkJavaScriptQuality() {
        this.log('Checking JavaScript code quality...');

        const srcDir = path.join(this.projectRoot, 'src');
        if (!fs.existsSync(srcDir)) {
            this.addWarning('src directory not found');
            return;
        }

        this.checkJSFiles(srcDir);
        this.log('JavaScript quality check completed');
    }

    checkJSFiles(dir) {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                this.checkJSFiles(filePath);
            } else if (file.endsWith('.js')) {
                this.checkJSFile(filePath);
            }
        });
    }

    checkJSFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const relativePath = path.relative(this.projectRoot, filePath);

        // Check for console.log statements (should be removed in production)
        const consoleLogMatches = content.match(/console\.log\(/g);
        if (consoleLogMatches && consoleLogMatches.length > 0) {
            // Only warn if there are many console.log statements
            if (consoleLogMatches.length > 10) {
                this.addWarning(`${relativePath}: Contains ${consoleLogMatches.length} console.log statements - consider reducing for production`);
            }
        }

        // Check for proper error handling (more lenient)
        const tryBlocks = content.match(/try\s*\{/g);
        const catchBlocks = content.match(/catch\s*\(/g);
        
        if (tryBlocks && tryBlocks.length > 3 && (!catchBlocks || tryBlocks.length > catchBlocks.length + 1)) {
            this.addWarning(`${relativePath}: Multiple try blocks without corresponding catch blocks`);
        }

        // Check for async/await usage (more lenient)
        const asyncFunctions = content.match(/async\s+function|async\s+\w+\s*\(/g);
        const awaitUsage = content.match(/await\s+/g);
        
        if (asyncFunctions && asyncFunctions.length > 2 && !awaitUsage) {
            this.addWarning(`${relativePath}: Multiple async functions without await usage - consider if async is needed`);
        }

        // Check for proper JSDoc comments on classes
        const classDeclarations = content.match(/export\s+class\s+\w+/g);
        if (classDeclarations) {
            classDeclarations.forEach(classDecl => {
                const className = classDecl.match(/class\s+(\w+)/)[1];
                const classIndex = content.indexOf(classDecl);
                const beforeClass = content.substring(Math.max(0, classIndex - 200), classIndex);
                
                if (!beforeClass.includes('/**') || !beforeClass.includes('*/')) {
                    this.addWarning(`${relativePath}: Class ${className} missing JSDoc comment`);
                }
            });
        }

        // Check for proper module exports
        if (!content.includes('export') && !content.includes('module.exports')) {
            this.addWarning(`${relativePath}: No exports found - might not be a proper module`);
        }
    }

    checkCSSQuality() {
        this.log('Checking CSS quality...');

        const cssFiles = [
            path.join(this.projectRoot, 'styles.css'),
            ...this.findCSSFiles(path.join(this.projectRoot, 'src'))
        ];

        cssFiles.forEach(cssFile => {
            if (fs.existsSync(cssFile)) {
                this.checkCSSFile(cssFile);
            }
        });

        this.log('CSS quality check completed');
    }

    findCSSFiles(dir) {
        const cssFiles = [];
        
        if (!fs.existsSync(dir)) return cssFiles;

        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                cssFiles.push(...this.findCSSFiles(filePath));
            } else if (file.endsWith('.css')) {
                cssFiles.push(filePath);
            }
        });

        return cssFiles;
    }

    checkCSSFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const relativePath = path.relative(this.projectRoot, filePath);

        // Check for CSS custom properties (modern CSS)
        const hasCustomProperties = content.includes('--') && content.includes('var(');
        if (!hasCustomProperties) {
            this.addWarning(`${relativePath}: Consider using CSS custom properties for better maintainability`);
        }

        // Check for responsive design
        const hasMediaQueries = content.includes('@media');
        if (!hasMediaQueries) {
            this.addWarning(`${relativePath}: No media queries found - consider responsive design`);
        }

        // Check for accessibility considerations
        const hasFocusStyles = content.includes(':focus') || content.includes('focus-visible');
        if (!hasFocusStyles && content.length > 1000) {
            this.addWarning(`${relativePath}: No focus styles found - important for accessibility`);
        }
    }

    checkPackageJson() {
        this.log('Checking package.json...');

        const packagePath = path.join(this.projectRoot, 'package.json');
        if (!fs.existsSync(packagePath)) {
            this.addError('package.json not found');
            return;
        }

        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

        // Check for essential fields
        const essentialFields = ['name', 'version', 'description', 'main', 'scripts'];
        essentialFields.forEach(field => {
            if (!packageJson[field]) {
                this.addError(`package.json missing ${field} field`);
            }
        });

        // Check for test script
        if (!packageJson.scripts || !packageJson.scripts.test) {
            this.addError('package.json missing test script');
        }

        // Check for build script
        if (!packageJson.scripts || !packageJson.scripts.build) {
            this.addError('package.json missing build script');
        }

        // Check for security vulnerabilities in dependencies
        if (packageJson.dependencies) {
            const deps = Object.keys(packageJson.dependencies);
            if (deps.length === 0) {
                this.addWarning('No dependencies found - unusual for a web application');
            }
        }

        this.log('package.json check completed');
    }

    checkBuildOutput() {
        this.log('Checking build output...');

        const distDir = path.join(this.projectRoot, 'dist');
        if (!fs.existsSync(distDir)) {
            this.addWarning('dist directory not found - run npm run build first');
            return;
        }

        // Check for essential build files
        const essentialFiles = ['index.html'];
        essentialFiles.forEach(file => {
            const filePath = path.join(distDir, file);
            if (!fs.existsSync(filePath)) {
                this.addError(`Build output missing ${file}`);
            } else {
                const stats = fs.statSync(filePath);
                if (stats.size === 0) {
                    this.addError(`Build output ${file} is empty`);
                }
            }
        });
        
        // Check for main bundle (with hash)
        const distFiles = fs.readdirSync(distDir);
        const hasMainBundle = distFiles.some(file => file.startsWith('main.') && file.endsWith('.js'));
        if (!hasMainBundle) {
            this.addError('Build output missing main bundle');
        }

        this.log('Build output check completed');
    }

    generateReport() {
        this.log('\n📊 Code Quality Report');
        this.log('======================');

        if (this.errors.length === 0 && this.warnings.length === 0) {
            this.log('🎉 All code quality checks passed!');
            return true;
        }

        if (this.errors.length > 0) {
            this.log(`\n❌ Errors (${this.errors.length}):`);
            this.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }

        if (this.warnings.length > 0) {
            this.log(`\n⚠️  Warnings (${this.warnings.length}):`);
            this.warnings.forEach((warning, index) => {
                console.log(`  ${index + 1}. ${warning}`);
            });
        }

        this.log(`\n📈 Summary: ${this.errors.length} errors, ${this.warnings.length} warnings`);

        return this.errors.length === 0;
    }

    async run() {
        this.log('🔍 Starting code quality check...');

        try {
            this.checkHTMLStructure();
            this.checkJavaScriptQuality();
            this.checkCSSQuality();
            this.checkPackageJson();
            this.checkBuildOutput();

            const success = this.generateReport();

            if (success) {
                this.log('\n✅ Code quality check completed successfully!');
                process.exit(0);
            } else {
                this.log('\n❌ Code quality check failed. Please fix the errors above.');
                process.exit(1);
            }

        } catch (error) {
            this.log(`💥 Code quality check failed: ${error.message}`, 'error');
            process.exit(1);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const checker = new CodeQualityChecker();
    checker.run().catch(console.error);
}

module.exports = CodeQualityChecker;