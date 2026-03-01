/**
 * Live Console Testing - Automated testing with real server and console monitoring
 * 
 * This module provides comprehensive end-to-end testing for the 3D Model Viewer Pro
 * application using Puppeteer to control a real browser instance and monitor console
 * output for errors and warnings.
 * 
 * Features:
 * - Automated server startup and management
 * - Real browser testing with visual screenshots
 * - Console error detection and reporting
 * - Comprehensive UI interaction testing
 * - HTML and JSON report generation
 * 
 * @author 3D Model Viewer Pro Team
 * @version 1.0.0
 */

const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * LiveConsoleTester - Main testing class for automated browser testing
 * 
 * Manages the complete testing lifecycle including server startup, browser
 * automation, test execution, and report generation.
 */
class LiveConsoleTester {
    /**
     * Initialize the LiveConsoleTester with default values
     */
    constructor() {
        this.browser = null;
        this.page = null;
        this.server = null;
        this.consoleErrors = [];
        this.screenshots = [];
        this.testResults = [];
        this.screenshotCounter = 0;
        this.serverReady = false;
    }

    async startServer() {
        return new Promise((resolve, reject) => {
            console.log('🚀 Starting development server...');
            
            // Check if server is already running
            if (this.server && !this.server.killed) {
                console.log('Server already running');
                resolve();
                return;
            }
            
            // Start the development server
            this.server = spawn('npm', ['start'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true,
                env: { ...process.env, NODE_ENV: 'test' }
            });

            let serverOutput = '';

            this.server.stdout.on('data', (data) => {
                const output = data.toString();
                serverOutput += output;
                console.log(`[SERVER] ${output.trim()}`);
                
                // Check if server is ready
                if (output.includes('localhost:8080') || output.includes('Server running') || output.includes('webpack compiled')) {
                    if (!this.serverReady) {
                        this.serverReady = true;
                        console.log('✅ Development server is ready!');
                        setTimeout(resolve, 2000); // Wait a bit more for full startup
                    }
                }
            });

            this.server.stderr.on('data', (data) => {
                const error = data.toString();
                console.error(`[SERVER ERROR] ${error.trim()}`);
            });

            this.server.on('error', (error) => {
                console.error('Failed to start server:', error);
                reject(error);
            });

            // Timeout after 30 seconds
            setTimeout(() => {
                if (!this.serverReady) {
                    reject(new Error('Server failed to start within 30 seconds'));
                }
            }, 30000);
        });
    }

    async startBrowser() {
        console.log('🌐 Starting browser...');
        
        this.browser = await puppeteer.launch({
            headless: false, // Show browser for visual inspection
            devtools: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--allow-running-insecure-content'
            ],
            defaultViewport: { width: 1920, height: 1080 }
        });

        this.page = await this.browser.newPage();
        
        // Enable console API
        await this.page.evaluateOnNewDocument(() => {
            window.consoleErrors = [];
            window.consoleWarnings = [];
            window.consoleLogs = [];
            
            const originalError = console.error;
            const originalWarn = console.warn;
            const originalLog = console.log;
            
            console.error = function(...args) {
                window.consoleErrors.push({
                    message: args.join(' '),
                    timestamp: new Date().toISOString(),
                    stack: new Error().stack
                });
                originalError.apply(console, args);
            };
            
            console.warn = function(...args) {
                window.consoleWarnings.push({
                    message: args.join(' '),
                    timestamp: new Date().toISOString()
                });
                originalWarn.apply(console, args);
            };
            
            console.log = function(...args) {
                window.consoleLogs.push({
                    message: args.join(' '),
                    timestamp: new Date().toISOString()
                });
                originalLog.apply(console, args);
            };
        });

        // Listen for console messages
        this.page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            const timestamp = new Date().toISOString();
            
            console.log(`[CONSOLE ${type.toUpperCase()}] ${text}`);
            
            if (type === 'error') {
                this.consoleErrors.push({
                    type,
                    message: text,
                    timestamp,
                    url: this.page.url()
                });
            }
        });

        // Listen for page errors
        this.page.on('pageerror', error => {
            console.error('❌ PAGE ERROR:', error.message);
            this.consoleErrors.push({
                type: 'pageerror',
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                url: this.page.url()
            });
        });

        // Listen for failed requests
        this.page.on('requestfailed', request => {
            const error = `Request failed: ${request.url()} - ${request.failure().errorText}`;
            console.error('❌ REQUEST FAILED:', error);
            this.consoleErrors.push({
                type: 'requestfailed',
                message: error,
                timestamp: new Date().toISOString(),
                url: this.page.url()
            });
        });

        console.log('✅ Browser started successfully');
    }

    async takeScreenshot(stepName, description = '') {
        this.screenshotCounter++;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${this.screenshotCounter.toString().padStart(3, '0')}-${stepName}-${timestamp}.png`;
        const filepath = path.join('test-screenshots', filename);
        
        // Ensure directory exists
        if (!fs.existsSync('test-screenshots')) {
            fs.mkdirSync('test-screenshots', { recursive: true });
        }
        
        await this.page.screenshot({ 
            path: filepath,
            fullPage: true 
        });
        
        this.screenshots.push({
            step: stepName,
            filename,
            description,
            timestamp: new Date().toISOString(),
            errorCount: this.consoleErrors.length
        });
        
        console.log(`📸 Screenshot: ${filename} - ${description}`);
        return filename;
    }

    async getConsoleState() {
        return await this.page.evaluate(() => {
            return {
                errors: window.consoleErrors || [],
                warnings: window.consoleWarnings || [],
                logs: window.consoleLogs || []
            };
        });
    }

    async waitForElement(selector, timeout = 10000) {
        try {
            await this.page.waitForSelector(selector, { timeout });
            return true;
        } catch (error) {
            console.warn(`⚠️ Element not found: ${selector}`);
            return false;
        }
    }

    async testStep(stepName, testFunction) {
        console.log(`\n🔍 ${stepName}`);
        console.log('='.repeat(50));
        
        const startTime = Date.now();
        const initialErrorCount = this.consoleErrors.length;
        
        try {
            // Add timeout wrapper for test functions
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Test step "${stepName}" timed out after 60 seconds`)), 60000)
            );
            
            await Promise.race([testFunction(), timeoutPromise]);
            
            const endTime = Date.now();
            const newErrors = this.consoleErrors.slice(initialErrorCount);
            
            const result = {
                step: stepName,
                success: true,
                duration: endTime - startTime,
                newErrors: newErrors.length,
                errors: newErrors,
                timestamp: new Date().toISOString()
            };
            
            this.testResults.push(result);
            
            if (newErrors.length > 0) {
                console.log(`❌ ${newErrors.length} new errors in this step:`);
                newErrors.forEach((error, index) => {
                    console.log(`   ${index + 1}. ${error.message}`);
                });
            } else {
                console.log('✅ No new errors in this step');
            }
            
            return result;
            
        } catch (error) {
            const endTime = Date.now();
            const result = {
                step: stepName,
                success: false,
                duration: endTime - startTime,
                error: error.message,
                timestamp: new Date().toISOString()
            };
            
            this.testResults.push(result);
            console.error(`❌ Test step failed: ${error.message}`);
            
            await this.takeScreenshot(`error-${stepName.replace(/\s+/g, '-')}`, `Error in ${stepName}`);
            
            return result;
        }
    }

    async runAllTests() {
        try {
            // Step 1: Load main page
            await this.testStep('Load Main Page', async () => {
                await this.page.goto('http://localhost:8080', { 
                    waitUntil: 'networkidle0',
                    timeout: 30000 
                });
                
                await this.takeScreenshot('main-page-loaded', 'Initial page load');
                
                // Wait for any async initialization
                await this.page.waitForTimeout(3000);
                
                // Check basic elements
                const elements = await this.page.evaluate(() => {
                    return {
                        canvas: !!document.querySelector('canvas'),
                        title: document.title,
                        bodyClass: document.body.className,
                        scripts: document.querySelectorAll('script').length,
                        stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length
                    };
                });
                
                console.log('Page elements:', elements);
            });

            // Step 2: Test sample models
            await this.testStep('Test Sample Models', async () => {
                // Look for sample model buttons
                const sampleButtons = await this.page.$$('.sample-models button, button[data-model], .sample-btn');
                console.log(`Found ${sampleButtons.length} sample model buttons`);
                
                if (sampleButtons.length > 0) {
                    // Test each sample model
                    for (let i = 0; i < Math.min(sampleButtons.length, 3); i++) {
                        const button = sampleButtons[i];
                        const buttonText = await button.evaluate(el => el.textContent.trim());
                        
                        console.log(`Testing sample model: ${buttonText}`);
                        await this.takeScreenshot(`before-${buttonText.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, `Before loading ${buttonText}`);
                        
                        await button.click();
                        await this.page.waitForTimeout(5000); // Wait for model to load
                        
                        await this.takeScreenshot(`after-${buttonText.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, `After loading ${buttonText}`);
                        
                        // Test resize behavior (for duck visibility issue)
                        if (buttonText.toLowerCase().includes('duck')) {
                            console.log('Testing resize behavior for duck model...');
                            await this.page.setViewport({ width: 1800, height: 1000 });
                            await this.page.waitForTimeout(1000);
                            await this.takeScreenshot('duck-resized', 'Duck model after resize');
                            
                            await this.page.setViewport({ width: 1920, height: 1080 });
                            await this.page.waitForTimeout(1000);
                        }
                    }
                } else {
                    console.log('No sample model buttons found');
                }
            });

            // Step 3: Test URL loading
            await this.testStep('Test URL Loading', async () => {
                // Try multiple selector strategies for URL input
                let urlInput = await this.page.$('#modelUrl');
                if (!urlInput) {
                    urlInput = await this.page.$('input[type="url"]');
                }
                if (!urlInput) {
                    urlInput = await this.page.$('input[placeholder*="URL"]');
                }
                if (!urlInput) {
                    urlInput = await this.page.$('#urlInput');
                }
                
                // Try multiple selector strategies for load button
                let loadButton = await this.page.$('#loadUrlBtn');
                if (!loadButton) {
                    loadButton = await this.page.$('#loadModel');
                }
                if (!loadButton) {
                    loadButton = await this.page.$('button[onclick*="load"]');
                }
                
                if (urlInput && loadButton) {
                    const testUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF/Duck.gltf';
                    
                    await urlInput.click({ clickCount: 3 }); // Select all text
                    await urlInput.type(testUrl);
                    await this.takeScreenshot('url-entered', 'URL entered for loading');
                    
                    await loadButton.click();
                    console.log('Loading model from URL...');
                    
                    // Wait for loading to complete with better detection
                    try {
                        await this.page.waitForFunction(
                            () => !document.querySelector('.loading, #loadingScreen')?.classList.contains('visible') &&
                                  !document.querySelector('.loading, #loadingScreen')?.style.display !== 'none',
                            { timeout: 15000 }
                        );
                    } catch (error) {
                        console.log('Loading detection timeout, continuing...');
                    }
                    
                    await this.page.waitForTimeout(2000); // Additional buffer
                    await this.takeScreenshot('url-loaded', 'Model loaded from URL');
                } else {
                    console.log(`URL input found: ${!!urlInput}, Load button found: ${!!loadButton}`);
                    await this.takeScreenshot('url-elements-missing', 'URL loading elements not found');
                }
            });

            // Step 4: Test file upload interface
            await this.testStep('Test File Upload Interface', async () => {
                // Test multiple file input selectors
                let fileInput = await this.page.$('input[type="file"]');
                if (!fileInput) {
                    fileInput = await this.page.$('#fileInput');
                }
                
                // Test multiple drop area selectors
                let dropArea = await this.page.$('#fileDrop');
                if (!dropArea) {
                    dropArea = await this.page.$('.drop-area');
                }
                if (!dropArea) {
                    dropArea = await this.page.$('.file-drop');
                }
                if (!dropArea) {
                    dropArea = await this.page.$('#dropArea');
                }
                
                console.log(`File input found: ${!!fileInput}, Drop area found: ${!!dropArea}`);
                
                if (fileInput) {
                    await this.takeScreenshot('file-input-found', 'File input interface');
                    
                    // Test if file input is accessible
                    const isVisible = await fileInput.isIntersectingViewport();
                    console.log(`File input visible: ${isVisible}`);
                }
                
                if (dropArea) {
                    await dropArea.hover();
                    await this.takeScreenshot('drop-area-hover', 'Drop area on hover');
                    
                    // Test drag and drop simulation
                    const boundingBox = await dropArea.boundingBox();
                    if (boundingBox) {
                        await this.page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
                        await this.takeScreenshot('drop-area-mouse-over', 'Mouse over drop area');
                    }
                }
                
                if (!fileInput && !dropArea) {
                    await this.takeScreenshot('file-upload-missing', 'File upload interface not found');
                }
            });

            // Step 5: Test controls
            await this.testStep('Test UI Controls', async () => {
                const controls = await this.page.evaluate(() => {
                    const controlElements = {
                        autoRotate: document.querySelector('#autoRotate, input[name="autoRotate"]'),
                        wireframe: document.querySelector('#wireframe'),
                        lighting: document.querySelector('#lighting'),
                        shadows: document.querySelector('#shadows'),
                        superheroMode: document.querySelector('#superheroMode, .superhero-button, #superheroBtn'),
                        sidebar: document.querySelector('#sidebar'),
                        sidebarToggle: document.querySelector('#sidebarToggleBtn')
                    };
                    
                    return Object.keys(controlElements).reduce((acc, key) => {
                        acc[key] = !!controlElements[key];
                        return acc;
                    }, {});
                });
                
                console.log('Available controls:', controls);
                
                // Test sidebar toggle first
                if (controls.sidebarToggle) {
                    try {
                        const sidebarToggle = await this.page.$('#sidebarToggleBtn');
                        await sidebarToggle.click();
                        await this.page.waitForTimeout(500);
                        await this.takeScreenshot('sidebar-opened', 'Sidebar opened');
                    } catch (error) {
                        console.log('Sidebar toggle failed:', error.message);
                    }
                }
                
                // Test auto-rotate
                if (controls.autoRotate) {
                    try {
                        const autoRotateEl = await this.page.$('#autoRotate, input[name="autoRotate"]');
                        if (autoRotateEl) {
                            await autoRotateEl.click();
                            await this.page.waitForTimeout(2000);
                            await this.takeScreenshot('auto-rotate-on', 'Auto-rotate enabled');
                            
                            await autoRotateEl.click();
                            await this.takeScreenshot('auto-rotate-off', 'Auto-rotate disabled');
                        }
                    } catch (error) {
                        console.log('Auto-rotate test failed:', error.message);
                    }
                }
                
                // Test superhero mode
                if (controls.superheroMode) {
                    try {
                        const superheroEl = await this.page.$('#superheroMode, .superhero-button, #superheroBtn');
                        if (superheroEl) {
                            await superheroEl.click();
                            await this.page.waitForTimeout(3000);
                            await this.takeScreenshot('superhero-mode', 'Superhero mode activated');
                            
                            // Try to exit superhero mode
                            const exitBtn = await this.page.$('.exit-superhero, #exitSuperhero');
                            if (exitBtn) {
                                await exitBtn.click();
                                await this.page.waitForTimeout(1000);
                                await this.takeScreenshot('superhero-mode-exit', 'Superhero mode exited');
                            }
                        }
                    } catch (error) {
                        console.log('Superhero mode test failed:', error.message);
                    }
                }
            });

            // Step 6: Final state
            await this.testStep('Final State Check', async () => {
                const finalState = await this.page.evaluate(() => {
                    return {
                        title: document.title,
                        url: window.location.href,
                        canvasPresent: !!document.querySelector('canvas'),
                        modelViewerExists: !!window.modelViewer,
                        threeJsLoaded: !!window.THREE,
                        totalElements: document.querySelectorAll('*').length
                    };
                });
                
                console.log('Final page state:', finalState);
                await this.takeScreenshot('final-state', 'Final application state');
            });

        } catch (error) {
            console.error('❌ Critical error during testing:', error);
            await this.takeScreenshot('critical-error', 'Critical error occurred');
        }
    }

    async generateReport() {
        const consoleState = await this.getConsoleState();
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalSteps: this.testResults.length,
                successfulSteps: this.testResults.filter(r => r.success).length,
                failedSteps: this.testResults.filter(r => !r.success).length,
                totalErrors: this.consoleErrors.length,
                totalScreenshots: this.screenshots.length
            },
            consoleErrors: this.consoleErrors,
            consoleState: consoleState,
            testResults: this.testResults,
            screenshots: this.screenshots
        };
        
        // Save detailed report
        fs.writeFileSync('test-report-live.json', JSON.stringify(report, null, 2));
        
        // Generate HTML report
        const htmlReport = this.generateHTMLReport(report);
        fs.writeFileSync('test-report-live.html', htmlReport);
        
        console.log('\n📊 TEST SUMMARY');
        console.log('='.repeat(50));
        console.log(`✅ Successful steps: ${report.summary.successfulSteps}`);
        console.log(`❌ Failed steps: ${report.summary.failedSteps}`);
        console.log(`🐛 Console errors: ${report.summary.totalErrors}`);
        console.log(`📸 Screenshots: ${report.summary.totalScreenshots}`);
        console.log(`📄 Report saved: test-report-live.html`);
        
        if (this.consoleErrors.length > 0) {
            console.log('\n🐛 CONSOLE ERRORS TO FIX:');
            this.consoleErrors.forEach((error, index) => {
                console.log(`${index + 1}. [${error.type}] ${error.message}`);
            });
        }
        
        return report;
    }

    generateHTMLReport(report) {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>3D Model Viewer - Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .error { background: #ffebee; border-left: 4px solid #f44336; padding: 10px; margin: 10px 0; }
        .success { background: #e8f5e8; border-left: 4px solid #4caf50; padding: 10px; margin: 10px 0; }
        .screenshot { margin: 10px 0; }
        .screenshot img { max-width: 300px; border: 1px solid #ddd; }
        pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>3D Model Viewer Pro - Live Test Report</h1>
    <p>Generated: ${report.timestamp}</p>
    
    <div class="summary">
        <h2>Summary</h2>
        <p>Total Steps: ${report.summary.totalSteps}</p>
        <p>Successful: ${report.summary.successfulSteps}</p>
        <p>Failed: ${report.summary.failedSteps}</p>
        <p>Console Errors: ${report.summary.totalErrors}</p>
        <p>Screenshots: ${report.summary.totalScreenshots}</p>
    </div>
    
    <h2>Console Errors</h2>
    ${report.consoleErrors.map(error => `
        <div class="error">
            <strong>[${error.type}]</strong> ${error.message}
            <br><small>${error.timestamp}</small>
        </div>
    `).join('')}
    
    <h2>Test Steps</h2>
    ${report.testResults.map(result => `
        <div class="${result.success ? 'success' : 'error'}">
            <h3>${result.step}</h3>
            <p>Duration: ${result.duration}ms</p>
            ${result.newErrors ? `<p>New Errors: ${result.newErrors}</p>` : ''}
            ${result.error ? `<p>Error: ${result.error}</p>` : ''}
        </div>
    `).join('')}
    
    <h2>Screenshots</h2>
    ${report.screenshots.map(screenshot => `
        <div class="screenshot">
            <h4>${screenshot.step}</h4>
            <p>${screenshot.description}</p>
            <img src="test-screenshots/${screenshot.filename}" alt="${screenshot.description}">
        </div>
    `).join('')}
</body>
</html>`;
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        
        try {
            if (this.page && !this.page.isClosed()) {
                await this.page.close();
            }
        } catch (error) {
            console.warn('Error closing page:', error.message);
        }
        
        try {
            if (this.browser) {
                await this.browser.close();
            }
        } catch (error) {
            console.warn('Error closing browser:', error.message);
        }
        
        try {
            if (this.server && !this.server.killed) {
                this.server.kill('SIGTERM');
                
                // Force kill if not terminated within 5 seconds
                setTimeout(() => {
                    if (!this.server.killed) {
                        this.server.kill('SIGKILL');
                    }
                }, 5000);
            }
        } catch (error) {
            console.warn('Error killing server:', error.message);
        }
        
        console.log('✅ Cleanup completed');
    }
}

// Main execution
async function runLiveTest() {
    const tester = new LiveConsoleTester();
    let exitCode = 0;
    
    try {
        console.log('🚀 Starting Live Console Testing...');
        
        await tester.startServer();
        console.log('✅ Server started successfully');
        
        await tester.startBrowser();
        console.log('✅ Browser started successfully');
        
        await tester.runAllTests();
        console.log('✅ Tests completed');
        
        const report = await tester.generateReport();
        console.log('✅ Report generated');
        
        // Set exit code based on test results
        if (report.summary.failedSteps > 0 || report.summary.totalErrors > 0) {
            exitCode = 1;
            console.log('❌ Tests completed with failures');
        } else {
            console.log('✅ All tests passed successfully');
        }
        
        return report;
        
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        console.error('Stack trace:', error.stack);
        exitCode = 1;
        
        // Try to generate a partial report
        try {
            await tester.generateReport();
        } catch (reportError) {
            console.error('Failed to generate error report:', reportError.message);
        }
        
        throw error;
    } finally {
        await tester.cleanup();
        
        // Exit with appropriate code when run directly
        if (require.main === module) {
            process.exit(exitCode);
        }
    }
}

// Export for use as module or run directly
if (require.main === module) {
    runLiveTest().catch(console.error);
}

module.exports = { LiveConsoleTester, runLiveTest };