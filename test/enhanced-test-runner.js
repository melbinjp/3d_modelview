#!/usr/bin/env node

/**
 * Enhanced Test Runner
 * Comprehensive test execution with detailed reporting and performance metrics
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class EnhancedTestRunner {
    constructor() {
        this.results = {
            codeQuality: null,
            unitTests: null,
            buildTest: null,
            performance: {
                startTime: null,
                endTime: null,
                duration: null
            }
        };
        this.reportsDir = path.join(__dirname, '../reports');
    }

    async init() {
        console.log('🚀 Enhanced Test Runner');
        console.log('=======================');
        
        // Ensure reports directory exists
        if (!fs.existsSync(this.reportsDir)) {
            fs.mkdirSync(this.reportsDir, { recursive: true });
        }

        this.results.performance.startTime = Date.now();
    }

    async runCodeQualityCheck() {
        console.log('\n📋 Running Code Quality Check...');
        
        return new Promise((resolve) => {
            const startTime = Date.now();
            const process = spawn('node', ['test/code-quality-check.js'], {
                stdio: 'inherit',
                shell: true
            });

            process.on('close', (code) => {
                const duration = Date.now() - startTime;
                this.results.codeQuality = {
                    passed: code === 0,
                    duration: duration,
                    exitCode: code
                };
                
                if (code === 0) {
                    console.log(`✅ Code Quality Check passed (${duration}ms)`);
                } else {
                    console.log(`❌ Code Quality Check failed (${duration}ms)`);
                }
                resolve();
            });
        });
    }

    async runUnitTests() {
        console.log('\n🧪 Running Unit Tests...');
        
        return new Promise((resolve) => {
            const startTime = Date.now();
            const process = spawn('npx', ['karma', 'start', '--single-run'], {
                stdio: 'inherit',
                shell: true
            });

            process.on('close', (code) => {
                const duration = Date.now() - startTime;
                this.results.unitTests = {
                    passed: code === 0,
                    duration: duration,
                    exitCode: code
                };
                
                if (code === 0) {
                    console.log(`✅ Unit Tests passed (${duration}ms)`);
                } else {
                    console.log(`❌ Unit Tests failed (${duration}ms)`);
                }
                resolve();
            });
        });
    }

    async runBuildTest() {
        console.log('\n🔨 Running Build Test...');
        
        return new Promise((resolve) => {
            const startTime = Date.now();
            const process = spawn('npm', ['run', 'build'], {
                stdio: 'inherit',
                shell: true
            });

            process.on('close', (code) => {
                const duration = Date.now() - startTime;
                this.results.buildTest = {
                    passed: code === 0,
                    duration: duration,
                    exitCode: code
                };
                
                if (code === 0) {
                    console.log(`✅ Build Test passed (${duration}ms)`);
                } else {
                    console.log(`❌ Build Test failed (${duration}ms)`);
                }
                resolve();
            });
        });
    }

    generateDetailedReport() {
        this.results.performance.endTime = Date.now();
        this.results.performance.duration = this.results.performance.endTime - this.results.performance.startTime;

        console.log('\n📊 Enhanced Test Results');
        console.log('=========================');

        // Test Results Summary
        const tests = [
            { name: 'Code Quality', result: this.results.codeQuality },
            { name: 'Unit Tests', result: this.results.unitTests },
            { name: 'Build Test', result: this.results.buildTest }
        ];

        let totalPassed = 0;
        let totalFailed = 0;

        tests.forEach(test => {
            if (test.result) {
                const icon = test.result.passed ? '✅' : '❌';
                const duration = `${test.result.duration}ms`;
                console.log(`${icon} ${test.name}: ${test.result.passed ? 'PASSED' : 'FAILED'} (${duration})`);
                
                if (test.result.passed) {
                    totalPassed++;
                } else {
                    totalFailed++;
                }
            }
        });

        // Performance Metrics
        console.log('\n⚡ Performance Metrics');
        console.log('======================');
        console.log(`Total Duration: ${this.results.performance.duration}ms`);
        console.log(`Code Quality: ${this.results.codeQuality?.duration || 0}ms`);
        console.log(`Unit Tests: ${this.results.unitTests?.duration || 0}ms`);
        console.log(`Build Test: ${this.results.buildTest?.duration || 0}ms`);

        // Overall Summary
        console.log('\n📈 Overall Summary');
        console.log('==================');
        console.log(`Tests Passed: ${totalPassed}`);
        console.log(`Tests Failed: ${totalFailed}`);
        console.log(`Success Rate: ${totalPassed > 0 ? Math.round((totalPassed / (totalPassed + totalFailed)) * 100) : 0}%`);

        // Generate HTML Report
        this.generateHTMLReport();

        return totalFailed === 0;
    }

    generateHTMLReport() {
        const reportPath = path.join(this.reportsDir, 'enhanced-test-report.html');
        const timestamp = new Date().toISOString();
        
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced Test Report</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 40px; 
            background: #f8f9fa;
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px; 
            border-radius: 12px; 
            margin-bottom: 30px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .test-result { 
            display: flex; 
            align-items: center; 
            padding: 15px; 
            margin: 10px 0; 
            border-radius: 8px; 
            background: white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .passed { border-left: 4px solid #28a745; }
        .failed { border-left: 4px solid #dc3545; }
        .icon { margin-right: 15px; font-size: 20px; }
        .duration { 
            margin-left: auto; 
            background: #e9ecef; 
            padding: 4px 8px; 
            border-radius: 4px; 
            font-size: 12px;
        }
        .performance-chart {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .bar {
            height: 20px;
            background: linear-gradient(90deg, #667eea, #764ba2);
            margin: 10px 0;
            border-radius: 10px;
            position: relative;
        }
        .bar-label {
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            color: white;
            font-size: 12px;
            font-weight: bold;
        }
        .summary {
            background: white;
            padding: 25px;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .success-rate {
            font-size: 2em;
            font-weight: bold;
            color: #28a745;
            text-align: center;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Enhanced Test Report</h1>
        <p>3D Model Viewer Pro - Comprehensive Testing Results</p>
        <p style="opacity: 0.8; font-size: 14px;">Generated: ${timestamp}</p>
    </div>
    
    <div class="metrics-grid">
        <div class="metric-card">
            <h3>⚡ Performance</h3>
            <p><strong>Total Duration:</strong> ${this.results.performance.duration}ms</p>
            <p><strong>Average per Test:</strong> ${Math.round(this.results.performance.duration / 3)}ms</p>
        </div>
        <div class="metric-card">
            <h3>📊 Test Coverage</h3>
            <p><strong>Test Suites:</strong> 3</p>
            <p><strong>Enhanced Tests:</strong> Added comprehensive unit tests</p>
        </div>
        <div class="metric-card">
            <h3>🎯 Quality Score</h3>
            <p><strong>Code Quality:</strong> ${this.results.codeQuality?.passed ? 'PASSED' : 'FAILED'}</p>
            <p><strong>Build Status:</strong> ${this.results.buildTest?.passed ? 'SUCCESS' : 'FAILED'}</p>
        </div>
    </div>
    
    <div class="performance-chart">
        <h2>⏱️ Test Duration Breakdown</h2>
        <div>
            <p>Code Quality Check</p>
            <div class="bar" style="width: ${(this.results.codeQuality?.duration || 0) / 100}%">
                <span class="bar-label">${this.results.codeQuality?.duration || 0}ms</span>
            </div>
        </div>
        <div>
            <p>Unit Tests</p>
            <div class="bar" style="width: ${(this.results.unitTests?.duration || 0) / 100}%">
                <span class="bar-label">${this.results.unitTests?.duration || 0}ms</span>
            </div>
        </div>
        <div>
            <p>Build Test</p>
            <div class="bar" style="width: ${(this.results.buildTest?.duration || 0) / 100}%">
                <span class="bar-label">${this.results.buildTest?.duration || 0}ms</span>
            </div>
        </div>
    </div>
    
    <div class="summary">
        <h2>🧪 Test Results</h2>
        ${[
            { name: 'Code Quality Check', result: this.results.codeQuality },
            { name: 'Unit Tests', result: this.results.unitTests },
            { name: 'Build Test', result: this.results.buildTest }
        ].map(test => `
            <div class="test-result ${test.result?.passed ? 'passed' : 'failed'}">
                <span class="icon">${test.result?.passed ? '✅' : '❌'}</span>
                <strong>${test.name}</strong>
                <span class="duration">${test.result?.duration || 0}ms</span>
            </div>
        `).join('')}
        
        <div class="success-rate">
            ${this.calculateSuccessRate()}% Success Rate
        </div>
    </div>
    
    <div class="summary">
        <h2>🎯 Recommendations</h2>
        <ul>
            <li>All tests are now running with enhanced coverage</li>
            <li>Code quality checks are integrated into the development workflow</li>
            <li>Performance metrics are being tracked for optimization</li>
            <li>Consider running web standards tests before deployment</li>
        </ul>
    </div>
</body>
</html>`;
        
        fs.writeFileSync(reportPath, html);
        console.log(`📄 Enhanced HTML report generated: ${reportPath}`);
    }

    calculateSuccessRate() {
        const tests = [this.results.codeQuality, this.results.unitTests, this.results.buildTest];
        const passed = tests.filter(test => test && test.passed).length;
        const total = tests.filter(test => test).length;
        return total > 0 ? Math.round((passed / total) * 100) : 0;
    }

    async run() {
        try {
            await this.init();
            
            // Run all test suites
            await this.runCodeQualityCheck();
            await this.runUnitTests();
            await this.runBuildTest();
            
            const allPassed = this.generateDetailedReport();
            
            if (allPassed) {
                console.log('\n🎉 All tests passed! Ready for deployment.');
                process.exit(0);
            } else {
                console.log('\n⚠️  Some tests failed. Please review and fix issues.');
                process.exit(1);
            }
            
        } catch (error) {
            console.error('\n💥 Test runner failed:', error.message);
            process.exit(1);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const runner = new EnhancedTestRunner();
    runner.run().catch(console.error);
}

module.exports = EnhancedTestRunner;