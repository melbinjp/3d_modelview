#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * Executes all test suites and generates reports
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ComprehensiveTestRunner {
    constructor() {
        this.testSuites = [
            {
                name: 'Unit Tests',
                command: 'npm',
                args: ['run', 'test:unit'],
                timeout: 60000,
                critical: true
            },
            {
                name: 'Comprehensive Unit Tests',
                command: 'npm',
                args: ['run', 'test:comprehensive'],
                timeout: 120000,
                critical: true
            },
            {
                name: 'Integration Tests',
                command: 'npm',
                args: ['run', 'test:integration'],
                timeout: 180000,
                critical: true
            },
            {
                name: 'Performance Tests',
                command: 'npm',
                args: ['run', 'test:performance'],
                timeout: 300000,
                critical: false
            },
            {
                name: 'Browser Compatibility Tests',
                command: 'npm',
                args: ['run', 'test:browser-compatibility'],
                timeout: 240000,
                critical: false
            },
            {
                name: 'Code Quality Tests',
                command: 'npm',
                args: ['run', 'test:quality'],
                timeout: 60000,
                critical: true
            }
        ];
        
        this.results = [];
        this.startTime = Date.now();
    }

    async runAllTests() {
        console.log('🚀 Starting Comprehensive Test Suite...\n');
        
        // Create results directory
        const resultsDir = 'test-results';
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }

        let allPassed = true;
        let criticalFailures = 0;

        for (const suite of this.testSuites) {
            console.log(`📋 Running ${suite.name}...`);
            
            const result = await this.runTestSuite(suite);
            this.results.push(result);
            
            if (!result.passed) {
                allPassed = false;
                if (suite.critical) {
                    criticalFailures++;
                }
            }
            
            this.logResult(result);
            console.log(''); // Empty line for readability
        }

        // Generate summary
        await this.generateSummary(allPassed, criticalFailures);
        
        // Exit with appropriate code
        if (criticalFailures > 0) {
            console.log('❌ Critical test failures detected. Exiting with error code.');
            process.exit(1);
        } else if (!allPassed) {
            console.log('⚠️ Some non-critical tests failed. Check the results.');
            process.exit(0);
        } else {
            console.log('🎉 All tests passed successfully!');
            process.exit(0);
        }
    }

    async runTestSuite(suite) {
        const startTime = Date.now();
        
        return new Promise((resolve) => {
            const child = spawn(suite.command, suite.args, {
                stdio: ['inherit', 'pipe', 'pipe'],
                shell: true
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
                process.stdout.write(data);
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
                process.stderr.write(data);
            });

            const timeout = setTimeout(() => {
                child.kill('SIGTERM');
                resolve({
                    name: suite.name,
                    passed: false,
                    duration: Date.now() - startTime,
                    error: 'Test suite timed out',
                    stdout: stdout,
                    stderr: stderr,
                    critical: suite.critical
                });
            }, suite.timeout);

            child.on('close', (code) => {
                clearTimeout(timeout);
                
                const duration = Date.now() - startTime;
                const passed = code === 0;
                
                resolve({
                    name: suite.name,
                    passed: passed,
                    duration: duration,
                    exitCode: code,
                    stdout: stdout,
                    stderr: stderr,
                    critical: suite.critical
                });
            });

            child.on('error', (error) => {
                clearTimeout(timeout);
                
                resolve({
                    name: suite.name,
                    passed: false,
                    duration: Date.now() - startTime,
                    error: error.message,
                    stdout: stdout,
                    stderr: stderr,
                    critical: suite.critical
                });
            });
        });
    }

    logResult(result) {
        const status = result.passed ? '✅ PASSED' : '❌ FAILED';
        const duration = (result.duration / 1000).toFixed(2);
        const critical = result.critical ? ' (CRITICAL)' : '';
        
        console.log(`${status} - ${result.name}${critical} (${duration}s)`);
        
        if (!result.passed && result.error) {
            console.log(`   Error: ${result.error}`);
        }
    }

    async generateSummary(allPassed, criticalFailures) {
        const totalDuration = Date.now() - this.startTime;
        const passedCount = this.results.filter(r => r.passed).length;
        const failedCount = this.results.filter(r => !r.passed).length;
        const criticalCount = this.results.filter(r => r.critical).length;
        
        const summary = {
            timestamp: new Date().toISOString(),
            totalDuration: totalDuration,
            totalSuites: this.results.length,
            passed: passedCount,
            failed: failedCount,
            criticalSuites: criticalCount,
            criticalFailures: criticalFailures,
            allPassed: allPassed,
            results: this.results
        };

        // Write summary to file
        fs.writeFileSync(
            'test-results/comprehensive-summary.json',
            JSON.stringify(summary, null, 2)
        );

        // Generate console summary
        console.log('📊 Test Suite Summary');
        console.log('═'.repeat(50));
        console.log(`Total Suites: ${this.results.length}`);
        console.log(`Passed: ${passedCount} ✅`);
        console.log(`Failed: ${failedCount} ❌`);
        console.log(`Critical Failures: ${criticalFailures} 🚨`);
        console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
        console.log('═'.repeat(50));

        // Detailed results
        console.log('\n📋 Detailed Results:');
        this.results.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            const critical = result.critical ? ' (CRITICAL)' : '';
            const duration = (result.duration / 1000).toFixed(2);
            
            console.log(`${status} ${result.name}${critical} - ${duration}s`);
        });

        // Generate HTML report
        await this.generateHTMLSummary(summary);
    }

    async generateHTMLSummary(summary) {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprehensive Test Results</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1000px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .summary-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .summary-card h3 { margin: 0 0 10px 0; color: #666; font-size: 0.9em; }
        .summary-card .value { font-size: 2em; font-weight: bold; margin: 0; }
        .success { color: #27ae60; }
        .error { color: #e74c3c; }
        .warning { color: #f39c12; }
        .results { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .result-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee; }
        .result-item:last-child { border-bottom: none; }
        .result-name { font-weight: 500; }
        .result-status { padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
        .passed { background: #d4edda; color: #155724; }
        .failed { background: #f8d7da; color: #721c24; }
        .critical { border-left: 4px solid #e74c3c; padding-left: 10px; }
        .duration { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Comprehensive Test Results</h1>
            <p>Generated on ${new Date(summary.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>Total Suites</h3>
                <p class="value">${summary.totalSuites}</p>
            </div>
            <div class="summary-card">
                <h3>Passed</h3>
                <p class="value success">${summary.passed}</p>
            </div>
            <div class="summary-card">
                <h3>Failed</h3>
                <p class="value error">${summary.failed}</p>
            </div>
            <div class="summary-card">
                <h3>Critical Failures</h3>
                <p class="value ${summary.criticalFailures > 0 ? 'error' : 'success'}">${summary.criticalFailures}</p>
            </div>
            <div class="summary-card">
                <h3>Duration</h3>
                <p class="value">${(summary.totalDuration / 1000).toFixed(1)}s</p>
            </div>
        </div>
        
        <div class="results">
            <h2>Test Suite Results</h2>
            ${summary.results.map(result => `
                <div class="result-item ${result.critical ? 'critical' : ''}">
                    <div>
                        <div class="result-name">${result.name}</div>
                        ${result.critical ? '<small style="color: #e74c3c;">CRITICAL</small>' : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="duration">${(result.duration / 1000).toFixed(2)}s</span>
                        <span class="result-status ${result.passed ? 'passed' : 'failed'}">
                            ${result.passed ? 'PASSED' : 'FAILED'}
                        </span>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

        fs.writeFileSync('test-results/comprehensive-results.html', html);
        console.log('\n📄 HTML report generated: test-results/comprehensive-results.html');
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
const runner = new ComprehensiveTestRunner();

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Comprehensive Test Runner

Usage: node test/comprehensive-test-runner.js [options]

Options:
  --help, -h     Show this help message
  --verbose, -v  Enable verbose output
  --fast         Skip non-critical tests for faster execution

Test Suites:
  - Unit Tests (critical)
  - Comprehensive Unit Tests (critical)
  - Integration Tests (critical)
  - Performance Tests
  - Browser Compatibility Tests
  - Code Quality Tests (critical)

Results are saved to test-results/ directory.
`);
    process.exit(0);
}

if (args.includes('--fast')) {
    runner.testSuites = runner.testSuites.filter(suite => suite.critical);
    console.log('🏃 Fast mode: Running only critical tests\n');
}

// Run the tests
runner.runAllTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
});