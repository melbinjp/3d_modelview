#!/usr/bin/env node

/**
 * Interactive Console Test
 * Temporary test for real-time interaction and console monitoring
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class InteractiveConsoleTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.consoleMessages = [];
        this.errors = [];
        this.networkRequests = [];
        this.isRunning = false;
    }

    async start() {
        console.log('🚀 Starting Interactive Console Test...\n');
        
        try {
            // Launch browser with visible window for interaction
            this.browser = await puppeteer.launch({
                headless: false, // Show browser window
                devtools: true,  // Open DevTools
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            });

            this.page = await this.browser.newPage();
            await this.setupEventListeners();
            
            // Navigate to the application
            const url = 'http://localhost:8080';
            console.log(`📱 Navigating to: ${url}`);
            
            try {
                await this.page.goto(url, { 
                    waitUntil: 'networkidle0',
                    timeout: 30000 
                });
                console.log('✅ Page loaded successfully\n');
            } catch (error) {
                console.log('⚠️ Page load timeout, but continuing...\n');
            }

            this.isRunning = true;
            await this.startInteractiveSession();

        } catch (error) {
            console.error('❌ Failed to start interactive test:', error.message);
            await this.cleanup();
        }
    }

    async setupEventListeners() {
        // Capture console messages
        this.page.on('console', (msg) => {
            const timestamp = new Date().toISOString();
            const type = msg.type();
            const text = msg.text();
            
            const message = {
                timestamp,
                type,
                text,
                location: msg.location()
            };
            
            this.consoleMessages.push(message);
            
            // Color-code console output
            const colors = {
                log: '\x1b[36m',      // Cyan
                warn: '\x1b[33m',     // Yellow
                error: '\x1b[31m',    // Red
                info: '\x1b[34m',     // Blue
                debug: '\x1b[90m',    // Gray
                reset: '\x1b[0m'      // Reset
            };
            
            const color = colors[type] || colors.log;
            console.log(`${color}[${type.toUpperCase()}]${colors.reset} ${text}`);
        });

        // Capture page errors
        this.page.on('pageerror', (error) => {
            const errorInfo = {
                timestamp: new Date().toISOString(),
                message: error.message,
                stack: error.stack
            };
            
            this.errors.push(errorInfo);
            console.log(`\x1b[31m[ERROR]\x1b[0m ${error.message}`);
        });

        // Capture network requests
        this.page.on('request', (request) => {
            const requestInfo = {
                timestamp: new Date().toISOString(),
                url: request.url(),
                method: request.method(),
                resourceType: request.resourceType()
            };
            
            this.networkRequests.push(requestInfo);
            
            if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
                console.log(`\x1b[35m[NETWORK]\x1b[0m ${request.method()} ${request.url()}`);
            }
        });

        // Capture failed requests
        this.page.on('requestfailed', (request) => {
            console.log(`\x1b[31m[NETWORK FAILED]\x1b[0m ${request.url()} - ${request.failure().errorText}`);
        });
    }

    async startInteractiveSession() {
        console.log('🎮 Interactive Session Started');
        console.log('=====================================');
        console.log('Available Commands:');
        console.log('  click-duck     - Click the duck sample button');
        console.log('  click-helmet   - Click the helmet sample button');
        console.log('  click-avocado  - Click the avocado sample button');
        console.log('  load-url       - Load model from URL input');
        console.log('  console        - Show recent console messages');
        console.log('  errors         - Show captured errors');
        console.log('  network        - Show network requests');
        console.log('  screenshot     - Take a screenshot');
        console.log('  evaluate       - Run JavaScript in browser');
        console.log('  clear          - Clear console history');
        console.log('  help           - Show this help');
        console.log('  quit           - Exit interactive session');
        console.log('=====================================\n');

        // Start command input loop
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const askCommand = () => {
            rl.question('🎮 Enter command: ', async (command) => {
                if (!this.isRunning) return;
                
                await this.handleCommand(command.trim());
                
                if (this.isRunning) {
                    askCommand();
                }
            });
        };

        askCommand();
    }

    async handleCommand(command) {
        try {
            switch (command.toLowerCase()) {
                case 'click-duck':
                    await this.clickSampleButton('duck');
                    break;
                
                case 'click-helmet':
                    await this.clickSampleButton('damaged-helmet');
                    break;
                
                case 'click-avocado':
                    await this.clickSampleButton('avocado');
                    break;
                
                case 'load-url':
                    await this.testUrlLoading();
                    break;
                
                case 'console':
                    this.showConsoleMessages();
                    break;
                
                case 'errors':
                    this.showErrors();
                    break;
                
                case 'network':
                    this.showNetworkRequests();
                    break;
                
                case 'screenshot':
                    await this.takeScreenshot();
                    break;
                
                case 'evaluate':
                    await this.evaluateJavaScript();
                    break;
                
                case 'clear':
                    this.clearHistory();
                    break;
                
                case 'help':
                    this.showHelp();
                    break;
                
                case 'quit':
                case 'exit':
                    await this.quit();
                    break;
                
                default:
                    console.log(`❓ Unknown command: ${command}. Type 'help' for available commands.`);
            }
        } catch (error) {
            console.log(`❌ Command failed: ${error.message}`);
        }
    }

    async clickSampleButton(sampleId) {
        console.log(`🖱️ Clicking ${sampleId} sample button...`);
        
        try {
            const selector = `button[data-sample-id="${sampleId}"]`;
            
            // Wait for button to be available
            await this.page.waitForSelector(selector, { timeout: 5000 });
            
            // Click the button
            await this.page.click(selector);
            
            console.log(`✅ Clicked ${sampleId} button successfully`);
            
            // Wait a moment for any async operations
            await this.page.waitForTimeout(2000);
            
        } catch (error) {
            console.log(`❌ Failed to click ${sampleId} button: ${error.message}`);
        }
    }

    async testUrlLoading() {
        console.log('🔗 Testing URL loading...');
        
        try {
            const testUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb';
            
            // Fill URL input
            await this.page.waitForSelector('#modelUrl', { timeout: 5000 });
            await this.page.evaluate((url) => {
                document.getElementById('modelUrl').value = url;
            }, testUrl);
            
            // Click load button
            await this.page.click('#loadUrlBtn');
            
            console.log('✅ URL loading initiated');
            
            // Wait for loading to complete
            await this.page.waitForTimeout(5000);
            
        } catch (error) {
            console.log(`❌ URL loading failed: ${error.message}`);
        }
    }

    showConsoleMessages(count = 10) {
        console.log(`\n📋 Recent Console Messages (last ${count}):`);
        console.log('='.repeat(50));
        
        const recent = this.consoleMessages.slice(-count);
        recent.forEach(msg => {
            const time = new Date(msg.timestamp).toLocaleTimeString();
            console.log(`[${time}] [${msg.type.toUpperCase()}] ${msg.text}`);
        });
        
        console.log('='.repeat(50) + '\n');
    }

    showErrors() {
        console.log('\n❌ Captured Errors:');
        console.log('='.repeat(50));
        
        if (this.errors.length === 0) {
            console.log('No errors captured.');
        } else {
            this.errors.forEach((error, index) => {
                const time = new Date(error.timestamp).toLocaleTimeString();
                console.log(`${index + 1}. [${time}] ${error.message}`);
            });
        }
        
        console.log('='.repeat(50) + '\n');
    }

    showNetworkRequests(count = 10) {
        console.log(`\n🌐 Recent Network Requests (last ${count}):`);
        console.log('='.repeat(50));
        
        const recent = this.networkRequests.slice(-count);
        recent.forEach(req => {
            const time = new Date(req.timestamp).toLocaleTimeString();
            console.log(`[${time}] ${req.method} ${req.url}`);
        });
        
        console.log('='.repeat(50) + '\n');
    }

    async takeScreenshot() {
        const filename = `screenshot-${Date.now()}.png`;
        await this.page.screenshot({ path: filename, fullPage: true });
        console.log(`📸 Screenshot saved: ${filename}`);
    }

    async evaluateJavaScript() {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question('💻 Enter JavaScript to evaluate: ', async (code) => {
            try {
                const result = await this.page.evaluate(code);
                console.log('✅ Result:', result);
            } catch (error) {
                console.log('❌ Evaluation error:', error.message);
            }
            rl.close();
        });
    }

    clearHistory() {
        this.consoleMessages = [];
        this.errors = [];
        this.networkRequests = [];
        console.log('🧹 History cleared');
    }

    showHelp() {
        console.log('\n🎮 Available Commands:');
        console.log('  click-duck     - Click the duck sample button');
        console.log('  click-helmet   - Click the helmet sample button');
        console.log('  click-avocado  - Click the avocado sample button');
        console.log('  load-url       - Load model from URL input');
        console.log('  console        - Show recent console messages');
        console.log('  errors         - Show captured errors');
        console.log('  network        - Show network requests');
        console.log('  screenshot     - Take a screenshot');
        console.log('  evaluate       - Run JavaScript in browser');
        console.log('  clear          - Clear console history');
        console.log('  help           - Show this help');
        console.log('  quit           - Exit interactive session\n');
    }

    async quit() {
        console.log('👋 Exiting interactive session...');
        this.isRunning = false;
        await this.cleanup();
        process.exit(0);
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    // Generate summary report
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                consoleMessages: this.consoleMessages.length,
                errors: this.errors.length,
                networkRequests: this.networkRequests.length
            },
            consoleMessages: this.consoleMessages,
            errors: this.errors,
            networkRequests: this.networkRequests
        };

        fs.writeFileSync('interactive-test-report.json', JSON.stringify(report, null, 2));
        console.log('📄 Report saved to: interactive-test-report.json');
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Received interrupt signal, shutting down...');
    process.exit(0);
});

// Run if called directly
if (require.main === module) {
    const test = new InteractiveConsoleTest();
    test.start().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = InteractiveConsoleTest;