#!/usr/bin/env node

/**
 * Web Standards Testing Runner
 * Automated script to run all web standards compliance tests
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class WebStandardsRunner {
    constructor() {
        this.testServer = null;
        this.results = {
            lighthouse: null,
            webVitals: null,
            accessibility: null,
            security: null,
            performance: null
        };
        this.reportsDir = path.join(__dirname, '../reports');
    }

    async init() {
        // Ensure reports directory exists
        if (!fs.existsSync(this.reportsDir)) {
            fs.mkdirSync(this.reportsDir, { recursive: true });
        }

        console.log('🚀 Web Standards Testing Suite');
        console.log('================================');
    }

    async buildProject() {
        console.log('📦 Building project...');
        
        return new Promise((resolve, reject) => {
            const buildProcess = spawn('npm', ['run', 'build:production'], {
                stdio: 'inherit',
                shell: true
            });

            buildProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Build completed successfully');
                    resolve();
                } else {
                    console.error('❌ Build failed');
                    reject(new Error(`Build failed with code ${code}`));
                }
            });
        });
    }

    async startTestServer() {
        console.log('🌐 Starting test server...');
        
        return new Promise((resolve, reject) => {
            this.testServer = spawn('node', ['test/test-server.js'], {
                stdio: 'pipe',
                shell: true
            });

            this.testServer.stdout.on('data', (data) => {
                const output = data.toString();
                if (output.includes('Test server running')) {
                    console.log('✅ Test server started');
                    setTimeout(resolve, 2000); // Give server time to fully start
                }
            });

            this.testServer.stderr.on('data', (data) => {
                console.error('Server error:', data.toString());
            });

            this.testServer.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Server failed with code ${code}`));
                }
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                reject(new Error('Server start timeout'));
            }, 10000);
        });
    }

    async stopTestServer() {
        if (this.testServer) {
            console.log('🛑 Stopping test server...');
            this.testServer.kill('SIGTERM');
            
            return new Promise((resolve) => {
                this.testServer.on('close', () => {
                    console.log('✅ Test server stopped');
                    resolve();
                });
                
                // Force kill after 5 seconds
                setTimeout(() => {
                    this.testServer.kill('SIGKILL');
                    resolve();
                }, 5000);
            });
        }
    }

    async runTest(testName, testFile) {
        console.log(`\n🧪 Running ${testName} tests...`);
        
        return new Promise((resolve, reject) => {
            const testProcess = spawn('npx', ['jest', testFile, '--verbose'], {
                stdio: 'inherit',
                shell: true
            });

            testProcess.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ ${testName} tests passed`);
                    this.results[testName.toLowerCase().replace(' ', '')] = 'PASSED';
                    resolve();
                } else {
                    console.error(`❌ ${testName} tests failed`);
                    this.results[testName.toLowerCase().replace(' ', '')] = 'FAILED';
                    // Don't reject - continue with other tests
                    resolve();
                }
            });
        });
    }

    async runAllTests() {
        const tests = [
            { name: 'Lighthouse', file: 'test/lighthouse-audit.test.js' },
            { name: 'Web Vitals', file: 'test/web-vitals.test.js' },
            { name: 'Accessibility', file: 'test/accessibility-compliance.test.js' },
            { name: 'Security', file: 'test/security-audit.test.js' },
            { name: 'Performance', file: 'test/performance-benchmarks.test.js' }
        ];

        for (const test of tests) {
            await this.runTest(test.name, test.file);
        }
    }

    generateSummaryReport() {
        console.log('\n📊 Test Results Summary');
        console.log('========================');
        
        const passed = Object.values(this.results).filter(r => r === 'PASSED').length;
        const failed = Object.values(this.results).filter(r => r === 'FAILED').length;
        
        Object.entries(this.results).forEach(([test, result]) => {
            const icon = result === 'PASSED' ? '✅' : '❌';
            console.log(`${icon} ${test}: ${result}`);
        });
        
        console.log(`\n📈 Overall: ${passed}/${passed + failed} tests passed`);
        
        // Generate HTML report
        this.generateHTMLReport();
        
        return failed === 0;
    }

    generateHTMLReport() {
        const reportPath = path.join(this.reportsDir, 'web-standards-summary.html');
        const timestamp = new Date().toISOString();
        
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Web Standards Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
        .results { margin: 20px 0; }
        .test-result { display: flex; align-items: center; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .passed { background: #d4edda; color: #155724; }
        .failed { background: #f8d7da; color: #721c24; }
        .icon { margin-right: 10px; font-size: 18px; }
        .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .timestamp { color: #6c757d; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 3D Model Viewer Pro - Web Standards Report</h1>
        <p class="timestamp">Generated: ${timestamp}</p>
    </div>
    
    <div class="summary">
        <h2>📊 Test Summary</h2>
        <p><strong>Total Tests:</strong> ${Object.keys(this.results).length}</p>
        <p><strong>Passed:</strong> ${Object.values(this.results).filter(r => r === 'PASSED').length}</p>
        <p><strong>Failed:</strong> ${Object.values(this.results).filter(r => r === 'FAILED').length}</p>
    </div>
    
    <div class="results">
        <h2>🧪 Test Results</h2>
        ${Object.entries(this.results).map(([test, result]) => `
            <div class="test-result ${result.toLowerCase()}">
                <span class="icon">${result === 'PASSED' ? '✅' : '❌'}</span>
                <strong>${test.charAt(0).toUpperCase() + test.slice(1)}:</strong> ${result}
            </div>
        `).join('')}
    </div>
    
    <div class="summary">
        <h2>📋 Recommendations</h2>
        <ul>
            <li>Review detailed reports in the reports/ directory</li>
            <li>Address any failed tests before production deployment</li>
            <li>Run tests regularly as part of CI/CD pipeline</li>
            <li>Monitor performance metrics in production</li>
        </ul>
    </div>
</body>
</html>`;
        
        fs.writeFileSync(reportPath, html);
        console.log(`📄 HTML report generated: ${reportPath}`);
    }

    async run() {
        try {
            await this.init();
            await this.buildProject();
            await this.startTestServer();
            await this.runAllTests();
            
            const allPassed = this.generateSummaryReport();
            
            if (allPassed) {
                console.log('\n🎉 All web standards tests passed!');
                process.exit(0);
            } else {
                console.log('\n⚠️  Some tests failed. Check the reports for details.');
                process.exit(1);
            }
            
        } catch (error) {
            console.error('\n💥 Test runner failed:', error.message);
            process.exit(1);
        } finally {
            await this.stopTestServer();
        }
    }
}

// Run if called directly
if (require.main === module) {
    const runner = new WebStandardsRunner();
    runner.run().catch(console.error);
}

module.exports = WebStandardsRunner;