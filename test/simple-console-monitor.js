#!/usr/bin/env node

/**
 * Simple Console Monitor
 * Lightweight alternative for console monitoring without puppeteer
 */

const { spawn } = require('child_process');
const readline = require('readline');

class SimpleConsoleMonitor {
    constructor() {
        this.server = null;
        this.isRunning = false;
    }

    async start() {
        console.log('🚀 Starting Simple Console Monitor...\n');
        
        try {
            await this.startDevServer();
            this.startInteractiveSession();
        } catch (error) {
            console.error('❌ Failed to start monitor:', error.message);
        }
    }

    async startDevServer() {
        console.log('🌐 Starting development server...');
        
        return new Promise((resolve, reject) => {
            this.server = spawn('npm', ['start'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true
            });

            let serverReady = false;

            this.server.stdout.on('data', (data) => {
                const output = data.toString();
                console.log('📤 SERVER:', output.trim());
                
                if (output.includes('webpack compiled') || output.includes('Server running') || output.includes('Local:')) {
                    if (!serverReady) {
                        serverReady = true;
                        console.log('✅ Development server started');
                        console.log('🌐 Open http://localhost:3000 or http://localhost:8080 in your browser');
                        console.log('📱 Open DevTools to see console output\n');
                        resolve();
                    }
                }
            });

            this.server.stderr.on('data', (data) => {
                console.log('❌ SERVER ERROR:', data.toString().trim());
            });

            this.server.on('error', (error) => {
                console.log('💥 Server failed:', error.message);
                reject(error);
            });

            // Timeout after 30 seconds
            setTimeout(() => {
                if (!serverReady) {
                    console.log('⚠️ Server start timeout, but continuing...');
                    resolve();
                }
            }, 30000);
        });
    }

    startInteractiveSession() {
        console.log('🎮 Simple Console Monitor Started');
        console.log('=====================================');
        console.log('Instructions:');
        console.log('1. Open http://localhost:3000 or http://localhost:8080 in your browser');
        console.log('2. Open DevTools (F12) to see console output');
        console.log('3. Use the commands below to test functionality');
        console.log('');
        console.log('Available Commands:');
        console.log('  open          - Show URL to open');
        console.log('  test-samples  - Show sample button test instructions');
        console.log('  test-loading  - Show model loading test instructions');
        console.log('  test-keyboard - Show keyboard shortcut test instructions');
        console.log('  server-logs   - Toggle server log display');
        console.log('  help          - Show this help');
        console.log('  quit          - Exit monitor');
        console.log('=====================================\n');

        this.isRunning = true;

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const askCommand = () => {
            rl.question('🎮 Enter command: ', (command) => {
                if (!this.isRunning) return;
                
                this.handleCommand(command.trim());
                
                if (this.isRunning) {
                    askCommand();
                }
            });
        };

        askCommand();
    }

    handleCommand(command) {
        switch (command.toLowerCase()) {
            case 'open':
                console.log('\n🌐 Open this URL in your browser:');
                console.log('   http://localhost:3000 or http://localhost:8080');
                console.log('   Then open DevTools (F12) to see console output\n');
                break;
            
            case 'test-samples':
                console.log('\n🧪 Testing Sample Model Buttons:');
                console.log('1. Look for "Quick Samples" section in the sidebar');
                console.log('2. Click on Duck, Helmet, or Avocado buttons');
                console.log('3. Watch console for loading messages');
                console.log('4. Check if model loads in the 3D viewer');
                console.log('5. Verify URL input field updates with model URL\n');
                break;
            
            case 'test-loading':
                console.log('\n🔗 Testing Model Loading:');
                console.log('1. Find the URL input field at the top');
                console.log('2. Enter a model URL (e.g., sample GLB file)');
                console.log('3. Click "Load Model" button');
                console.log('4. Watch console for loading progress');
                console.log('5. Check for any error messages\n');
                break;
            
            case 'test-keyboard':
                console.log('\n⌨️ Testing Keyboard Shortcuts:');
                console.log('1. Press Ctrl+1 (should load Duck)');
                console.log('2. Press Ctrl+2 (should load Avocado)');
                console.log('3. Press Ctrl+3 (should load Helmet)');
                console.log('4. Watch console for sample loading messages');
                console.log('5. Verify models load through unified system\n');
                break;
            
            case 'server-logs':
                console.log('\n📋 Server logs are displayed with "📤 SERVER:" prefix');
                console.log('   Watch for webpack compilation messages and errors\n');
                break;
            
            case 'help':
                this.showHelp();
                break;
            
            case 'quit':
            case 'exit':
                this.quit();
                break;
            
            default:
                console.log(`❓ Unknown command: ${command}. Type 'help' for available commands.`);
        }
    }

    showHelp() {
        console.log('\n🎮 Available Commands:');
        console.log('  open          - Show URL to open');
        console.log('  test-samples  - Show sample button test instructions');
        console.log('  test-loading  - Show model loading test instructions');
        console.log('  test-keyboard - Show keyboard shortcut test instructions');
        console.log('  server-logs   - Show server log info');
        console.log('  help          - Show this help');
        console.log('  quit          - Exit monitor\n');
    }

    quit() {
        console.log('👋 Exiting console monitor...');
        this.isRunning = false;
        
        if (this.server) {
            console.log('🛑 Stopping development server...');
            this.server.kill('SIGTERM');
            
            // Force kill if not stopped after 5 seconds
            setTimeout(() => {
                if (this.server && !this.server.killed) {
                    this.server.kill('SIGKILL');
                }
            }, 5000);
        }
        
        process.exit(0);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Received interrupt signal, shutting down...');
    process.exit(0);
});

// Run if called directly
if (require.main === module) {
    const monitor = new SimpleConsoleMonitor();
    monitor.start().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = SimpleConsoleMonitor;