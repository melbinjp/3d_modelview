#!/usr/bin/env node

/**
 * Automated Console Debug Tool
 * Uses Puppeteer to automatically test functionality and capture console output
 */

const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const path = require('path');

class AutomatedConsoleDebug {
    constructor() {
        this.server = null;
        this.browser = null;
        this.page = null;
        this.consoleMessages = [];
        this.errors = [];
        this.networkRequests = [];
    }

    async start() {
        console.log('🚀 Starting Automated Console Debug Tool...\n');
        
        try {
            await this.startServer();
            await this.setupBrowser();
            await this.runTests();
            await this.analyzeResults();
        } catch (error) {
            console.error('❌ Fatal error:', error);
        } finally {
            await this.cleanup();
        }
    }

    async startServer() {
        console.log('🌐 Starting development server...');
        
        return new Promise((resolve, reject) => {
            // First build the project
            const buildProcess = spawn('npm', ['run', 'build'], {
                stdio: 'pipe',
                shell: true
            });

            buildProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Build failed with code ${code}`));
                    return;
                }

                // Then start the server
                this.server = spawn('npm', ['start'], {
                    stdio: 'pipe',
                    shell: true
                });

                let serverReady = false;

                this.server.stdout.on('data', (data) => {
                    const output = data.toString();
                    console.log('📤 SERVER:', output.trim());
                    
                    if (output.includes('Local:') || output.includes('localhost') || output.includes('serving')) {
                        if (!serverReady) {
                            serverReady = true;
                            console.log('✅ Server started successfully');
                            setTimeout(resolve, 2000); // Wait 2 seconds for server to be fully ready
                        }
                    }
                });

                this.server.stderr.on('data', (data) => {
                    console.log('❌ SERVER ERROR:', data.toString().trim());
                });

                // Timeout after 30 seconds
                setTimeout(() => {
                    if (!serverReady) {
                        console.log('⚠️ Server timeout, trying to continue...');
                        resolve();
                    }
                }, 30000);
            });
        });
    }

    async setupBrowser() {
        console.log('🌐 Setting up browser...');
        
        this.browser = await puppeteer.launch({
            headless: false, // Show browser for debugging
            devtools: true,  // Open DevTools
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.page = await this.browser.newPage();

        // Capture console messages
        this.page.on('console', (msg) => {
            const message = {
                type: msg.type(),
                text: msg.text(),
                timestamp: new Date().toISOString()
            };
            this.consoleMessages.push(message);
            console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
        });

        // Capture errors
        this.page.on('pageerror', (error) => {
            const errorInfo = {
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            };
            this.errors.push(errorInfo);
            console.log('❌ PAGE ERROR:', error.message);
        });

        // Capture network requests
        this.page.on('request', (request) => {
            this.networkRequests.push({
                url: request.url(),
                method: request.method(),
                timestamp: new Date().toISOString()
            });
        });

        // Navigate to the page
        console.log('📱 Navigating to http://localhost:3000...');
        try {
            await this.page.goto('http://localhost:3000', { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });
        } catch (error) {
            console.log('⚠️ Port 3000 failed, trying 8080...');
            await this.page.goto('http://localhost:8080', { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });
        }

        console.log('✅ Browser setup complete\n');
    }

    async runTests() {
        console.log('🧪 Running automated tests...\n');

        // Wait for page to load
        await this.page.waitForTimeout(3000);

        // Test 1: Check if sample buttons exist
        await this.testSampleButtonsExist();

        // Test 2: Click sample buttons
        await this.testSampleButtonClicks();

        // Test 3: Test keyboard shortcuts
        await this.testKeyboardShortcuts();

        // Test 4: Test URL loading
        await this.testURLLoading();

        console.log('✅ All tests completed\n');
    }

    async testSampleButtonsExist() {
        console.log('🔍 Test 1: Checking if sample buttons exist...');

        try {
            const buttons = await this.page.$$('[data-sample-id]');
            console.log(`   Found ${buttons.length} sample buttons with data-sample-id`);

            const oldButtons = await this.page.$$('[data-url]');
            console.log(`   Found ${oldButtons.length} buttons with old data-url attribute`);

            // Check specific sample buttons
            const duckButton = await this.page.$('[data-sample-id="duck"]');
            const helmetButton = await this.page.$('[data-sample-id="helmet"]');
            const avocadoButton = await this.page.$('[data-sample-id="avocado"]');

            console.log(`   Duck button: ${duckButton ? '✅ Found' : '❌ Missing'}`);
            console.log(`   Helmet button: ${helmetButton ? '✅ Found' : '❌ Missing'}`);
            console.log(`   Avocado button: ${avocadoButton ? '✅ Found' : '❌ Missing'}`);

        } catch (error) {
            console.log('   ❌ Error checking buttons:', error.message);
        }
        console.log('');
    }

    async testSampleButtonClicks() {
        console.log('🖱️ Test 2: Testing sample button clicks...');

        const samples = ['duck', 'helmet', 'avocado'];

        for (const sampleId of samples) {
            try {
                console.log(`   Clicking ${sampleId} button...`);
                
                const button = await this.page.$(`[data-sample-id="${sampleId}"]`);
                if (button) {
                    await button.click();
                    await this.page.waitForTimeout(2000); // Wait for loading
                    console.log(`   ✅ Clicked ${sampleId} button successfully`);
                } else {
                    console.log(`   ❌ ${sampleId} button not found`);
                }
            } catch (error) {
                console.log(`   ❌ Error clicking ${sampleId}:`, error.message);
            }
        }
        console.log('');
    }

    async testKeyboardShortcuts() {
        console.log('⌨️ Test 3: Testing keyboard shortcuts...');

        try {
            // Test Ctrl+1 (Duck)
            console.log('   Testing Ctrl+1 (Duck)...');
            await this.page.keyboard.down('Control');
            await this.page.keyboard.press('Digit1');
            await this.page.keyboard.up('Control');
            await this.page.waitForTimeout(2000);

            // Test Ctrl+2 (Avocado)
            console.log('   Testing Ctrl+2 (Avocado)...');
            await this.page.keyboard.down('Control');
            await this.page.keyboard.press('Digit2');
            await this.page.keyboard.up('Control');
            await this.page.waitForTimeout(2000);

            // Test Ctrl+3 (Helmet)
            console.log('   Testing Ctrl+3 (Helmet)...');
            await this.page.keyboard.down('Control');
            await this.page.keyboard.press('Digit3');
            await this.page.keyboard.up('Control');
            await this.page.waitForTimeout(2000);

            console.log('   ✅ Keyboard shortcuts tested');
        } catch (error) {
            console.log('   ❌ Error testing keyboard shortcuts:', error.message);
        }
        console.log('');
    }

    async testURLLoading() {
        console.log('🔗 Test 4: Testing URL loading...');

        try {
            const urlInput = await this.page.$('#modelUrl, input[type="url"], input[placeholder*="URL"]');
            if (urlInput) {
                console.log('   Found URL input field');
                
                // Clear and enter a test URL
                await urlInput.click({ clickCount: 3 }); // Select all
                await urlInput.type('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb');
                
                // Look for load button
                const loadButton = await this.page.$('button:contains("Load"), input[type="submit"], button[type="submit"]');
                if (loadButton) {
                    await loadButton.click();
                    await this.page.waitForTimeout(3000);
                    console.log('   ✅ URL loading tested');
                } else {
                    console.log('   ⚠️ Load button not found');
                }
            } else {
                console.log('   ❌ URL input field not found');
            }
        } catch (error) {
            console.log('   ❌ Error testing URL loading:', error.message);
        }
        console.log('');
    }

    async analyzeResults() {
        console.log('📊 ANALYSIS RESULTS');
        console.log('==========================================\n');

        // Console Messages Analysis
        console.log('📋 Console Messages Summary:');
        const messageTypes = {};
        this.consoleMessages.forEach(msg => {
            messageTypes[msg.type] = (messageTypes[msg.type] || 0) + 1;
        });

        Object.entries(messageTypes).forEach(([type, count]) => {
            console.log(`   ${type.toUpperCase()}: ${count} messages`);
        });

        // Show recent important messages
        console.log('\n🔍 Recent Important Messages:');
        this.consoleMessages.slice(-10).forEach(msg => {
            if (msg.type === 'error' || msg.text.includes('sample') || msg.text.includes('load')) {
                console.log(`   [${msg.type.toUpperCase()}] ${msg.text}`);
            }
        });

        // Errors Analysis
        if (this.errors.length > 0) {
            console.log('\n❌ JavaScript Errors Found:');
            this.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error.message}`);
            });
        } else {
            console.log('\n✅ No JavaScript errors detected');
        }

        // Network Requests Analysis
        console.log('\n🌐 Network Requests:');
        const modelRequests = this.networkRequests.filter(req => 
            req.url.includes('.glb') || req.url.includes('.gltf') || req.url.includes('model')
        );
        
        if (modelRequests.length > 0) {
            console.log('   Model loading requests detected:');
            modelRequests.forEach(req => {
                console.log(`   - ${req.method} ${req.url}`);
            });
        } else {
            console.log('   ⚠️ No model loading requests detected');
        }

        // Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        
        if (this.errors.length > 0) {
            console.log('   🔧 Fix JavaScript errors first');
        }
        
        if (modelRequests.length === 0) {
            console.log('   🔧 Sample model loading may not be working');
        }
        
        const sampleMessages = this.consoleMessages.filter(msg => 
            msg.text.includes('sample') || msg.text.includes('Loading')
        );
        
        if (sampleMessages.length === 0) {
            console.log('   🔧 No sample loading messages detected - check unified loading system');
        }

        console.log('\n==========================================');
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        
        if (this.browser) {
            await this.browser.close();
        }
        
        if (this.server) {
            this.server.kill('SIGTERM');
            setTimeout(() => {
                if (this.server && !this.server.killed) {
                    this.server.kill('SIGKILL');
                }
            }, 5000);
        }
        
        console.log('✅ Cleanup complete');
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Received interrupt signal, shutting down...');
    process.exit(0);
});

// Run if called directly
if (require.main === module) {
    const debugTool = new AutomatedConsoleDebug();
    debugTool.start().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = AutomatedConsoleDebug;