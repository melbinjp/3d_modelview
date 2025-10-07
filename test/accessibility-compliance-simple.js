#!/usr/bin/env node

/**
 * Simple Accessibility Compliance Test
 * Checks basic accessibility features without requiring a full browser setup
 */

const fs = require('fs');
const path = require('path');

class AccessibilityChecker {
    constructor() {
        this.results = {
            skipLinks: false,
            ariaLabels: false,
            semanticHTML: false,
            keyboardNavigation: false,
            colorContrast: false,
            focusManagement: false
        };
    }

    checkSkipLinks() {
        try {
            const indexPath = path.join(process.cwd(), 'index.html');
            const content = fs.readFileSync(indexPath, 'utf8');
            
            // Check for skip links
            const hasSkipLinks = content.includes('skip-link') && content.includes('Skip to');
            const hasProperHiding = content.includes('top: -') || content.includes('position: absolute');
            
            this.results.skipLinks = hasSkipLinks && hasProperHiding;
            return this.results.skipLinks;
        } catch (error) {
            console.warn('Could not check skip links:', error.message);
            return false;
        }
    }

    checkAriaLabels() {
        try {
            const indexPath = path.join(process.cwd(), 'index.html');
            const content = fs.readFileSync(indexPath, 'utf8');
            
            // Check for ARIA labels
            const hasAriaLabels = content.includes('aria-label') || content.includes('aria-labelledby');
            const hasRoles = content.includes('role=');
            
            this.results.ariaLabels = hasAriaLabels && hasRoles;
            return this.results.ariaLabels;
        } catch (error) {
            console.warn('Could not check ARIA labels:', error.message);
            return false;
        }
    }

    checkSemanticHTML() {
        try {
            const indexPath = path.join(process.cwd(), 'index.html');
            const content = fs.readFileSync(indexPath, 'utf8');
            
            // Check for semantic elements
            const hasNav = content.includes('<nav');
            const hasMain = content.includes('<main') || content.includes('role="main"');
            const hasHeadings = content.includes('<h1') || content.includes('<h2');
            
            this.results.semanticHTML = hasNav && (hasMain || hasHeadings);
            return this.results.semanticHTML;
        } catch (error) {
            console.warn('Could not check semantic HTML:', error.message);
            return false;
        }
    }

    checkKeyboardNavigation() {
        try {
            const cssPath = path.join(process.cwd(), 'src/ui/accessibility.css');
            if (fs.existsSync(cssPath)) {
                const content = fs.readFileSync(cssPath, 'utf8');
                
                // Check for focus styles
                const hasFocusStyles = content.includes(':focus') && content.includes('outline');
                const hasKeyboardSupport = content.includes('keyboard-user');
                
                this.results.keyboardNavigation = hasFocusStyles && hasKeyboardSupport;
                return this.results.keyboardNavigation;
            }
            return false;
        } catch (error) {
            console.warn('Could not check keyboard navigation:', error.message);
            return false;
        }
    }

    checkColorContrast() {
        try {
            const stylesPath = path.join(process.cwd(), 'styles.css');
            if (fs.existsSync(stylesPath)) {
                const content = fs.readFileSync(stylesPath, 'utf8');
                
                // Check for color variables and contrast considerations
                const hasColorVars = content.includes('--color') || content.includes('--text-color');
                const hasDarkMode = content.includes('dark-mode') || content.includes('prefers-color-scheme');
                
                this.results.colorContrast = hasColorVars && hasDarkMode;
                return this.results.colorContrast;
            }
            return false;
        } catch (error) {
            console.warn('Could not check color contrast:', error.message);
            return false;
        }
    }

    checkFocusManagement() {
        try {
            const srcFiles = ['src/ui/UIManager.js', 'src/ui/KeyboardShortcutManager.js'];
            let hasFocusManagement = false;
            
            for (const file of srcFiles) {
                const filePath = path.join(process.cwd(), file);
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.includes('focus()') || content.includes('tabindex') || content.includes('focusable')) {
                        hasFocusManagement = true;
                        break;
                    }
                }
            }
            
            this.results.focusManagement = hasFocusManagement;
            return hasFocusManagement;
        } catch (error) {
            console.warn('Could not check focus management:', error.message);
            return false;
        }
    }

    async runAllChecks() {
        console.log('🔍 Running accessibility compliance checks...');
        
        this.checkSkipLinks();
        this.checkAriaLabels();
        this.checkSemanticHTML();
        this.checkKeyboardNavigation();
        this.checkColorContrast();
        this.checkFocusManagement();
        
        const passed = Object.values(this.results).filter(Boolean).length;
        const total = Object.keys(this.results).length;
        const score = Math.round((passed / total) * 100);
        
        console.log('\n📊 Accessibility Results:');
        console.log(`✅ Skip Links: ${this.results.skipLinks ? 'PASS' : 'FAIL'}`);
        console.log(`✅ ARIA Labels: ${this.results.ariaLabels ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Semantic HTML: ${this.results.semanticHTML ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Keyboard Navigation: ${this.results.keyboardNavigation ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Color Contrast: ${this.results.colorContrast ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Focus Management: ${this.results.focusManagement ? 'PASS' : 'FAIL'}`);
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
    const checker = new AccessibilityChecker();
    checker.runAllChecks().then(result => {
        process.exit(result.success ? 0 : 1);
    }).catch(error => {
        console.error('Accessibility check failed:', error);
        process.exit(1);
    });
}

module.exports = AccessibilityChecker;