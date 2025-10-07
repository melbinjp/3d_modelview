#!/usr/bin/env node

/**
 * Comprehensive Test Report Generator
 * Combines all test results into a single comprehensive report
 */

const fs = require('fs');
const path = require('path');

const ARTIFACTS_PATH = process.env.ARTIFACTS_PATH || 'test-artifacts/';
const REPORT_PATH = process.env.REPORT_PATH || 'comprehensive-report/';

class TestReportGenerator {
    constructor() {
        this.testResults = {
            unit: { passed: 0, failed: 0, total: 0, duration: 0 },
            integration: { passed: 0, failed: 0, total: 0, duration: 0 },
            performance: { passed: 0, failed: 0, total: 0, duration: 0 },
            browser: { passed: 0, failed: 0, total: 0, duration: 0 },
            visual: { passed: 0, failed: 0, total: 0, duration: 0 },
            accessibility: { passed: 0, failed: 0, total: 0, duration: 0 },
            security: { passed: 0, failed: 0, total: 0, duration: 0 },
            lighthouse: { passed: 0, failed: 0, total: 0, duration: 0 }
        };
        
        this.summary = {
            totalTests: 0,
            totalPassed: 0,
            totalFailed: 0,
            totalDuration: 0,
            successRate: 0,
            timestamp: new Date().toISOString()
        };
    }

    async generateReport() {
        console.log('🔄 Generating comprehensive test report...');
        
        try {
            // Create report directory
            if (!fs.existsSync(REPORT_PATH)) {
                fs.mkdirSync(REPORT_PATH, { recursive: true });
            }

            // Process test artifacts
            await this.processTestArtifacts();
            
            // Calculate summary
            this.calculateSummary();
            
            // Generate HTML report
            await this.generateHTMLReport();
            
            // Generate JSON report
            await this.generateJSONReport();
            
            // Generate markdown summary
            await this.generateMarkdownSummary();
            
            console.log('✅ Test report generated successfully!');
            console.log(`📊 Total Tests: ${this.summary.totalTests}`);
            console.log(`✅ Passed: ${this.summary.totalPassed}`);
            console.log(`❌ Failed: ${this.summary.totalFailed}`);
            console.log(`📈 Success Rate: ${this.summary.successRate.toFixed(2)}%`);
            
        } catch (error) {
            console.error('❌ Error generating test report:', error);
            process.exit(1);
        }
    }

    async processTestArtifacts() {
        if (!fs.existsSync(ARTIFACTS_PATH)) {
            console.warn('⚠️ No test artifacts found');
            return;
        }

        const artifactDirs = fs.readdirSync(ARTIFACTS_PATH);
        
        for (const dir of artifactDirs) {
            const artifactPath = path.join(ARTIFACTS_PATH, dir);
            
            if (fs.statSync(artifactPath).isDirectory()) {
                await this.processArtifactDirectory(dir, artifactPath);
            }
        }
    }

    async processArtifactDirectory(dirName, dirPath) {
        console.log(`📁 Processing ${dirName}...`);
        
        // Look for test result files
        const files = fs.readdirSync(dirPath);
        
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            
            if (file.endsWith('.json') && file.includes('test')) {
                await this.processTestResultFile(dirName, filePath);
            }
        }
    }

    async processTestResultFile(category, filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            
            // Extract test results based on common formats
            if (data.testResults) {
                // Jest format
                this.processJestResults(category, data);
            } else if (data.tests) {
                // Karma format
                this.processKarmaResults(category, data);
            } else if (data.suites) {
                // Mocha format
                this.processMochaResults(category, data);
            }
        } catch (error) {
            console.warn(`⚠️ Could not process ${filePath}:`, error.message);
        }
    }

    processJestResults(category, data) {
        const testCategory = this.getCategoryKey(category);
        
        data.testResults.forEach(testFile => {
            this.testResults[testCategory].total += testFile.numPassingTests + testFile.numFailingTests;
            this.testResults[testCategory].passed += testFile.numPassingTests;
            this.testResults[testCategory].failed += testFile.numFailingTests;
        });
        
        this.testResults[testCategory].duration += data.runTime || 0;
    }

    processKarmaResults(category, data) {
        const testCategory = this.getCategoryKey(category);
        
        this.testResults[testCategory].total += data.tests.length;
        this.testResults[testCategory].passed += data.tests.filter(t => t.success).length;
        this.testResults[testCategory].failed += data.tests.filter(t => !t.success).length;
        this.testResults[testCategory].duration += data.runTime || 0;
    }

    processMochaResults(category, data) {
        const testCategory = this.getCategoryKey(category);
        
        data.suites.forEach(suite => {
            suite.tests.forEach(test => {
                this.testResults[testCategory].total++;
                if (test.state === 'passed') {
                    this.testResults[testCategory].passed++;
                } else {
                    this.testResults[testCategory].failed++;
                }
            });
        });
        
        this.testResults[testCategory].duration += data.stats?.duration || 0;
    }

    getCategoryKey(category) {
        if (category.includes('unit')) return 'unit';
        if (category.includes('integration')) return 'integration';
        if (category.includes('performance')) return 'performance';
        if (category.includes('browser')) return 'browser';
        if (category.includes('visual')) return 'visual';
        if (category.includes('accessibility')) return 'accessibility';
        if (category.includes('security')) return 'security';
        if (category.includes('lighthouse')) return 'lighthouse';
        return 'unit'; // default
    }

    calculateSummary() {
        Object.values(this.testResults).forEach(category => {
            this.summary.totalTests += category.total;
            this.summary.totalPassed += category.passed;
            this.summary.totalFailed += category.failed;
            this.summary.totalDuration += category.duration;
        });
        
        this.summary.successRate = this.summary.totalTests > 0 
            ? (this.summary.totalPassed / this.summary.totalTests) * 100 
            : 0;
    }

    async generateHTMLReport() {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3D Model Viewer Pro - Test Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; border-radius: 10px; margin-bottom: 30px; text-align: center; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.2em; opacity: 0.9; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        .summary-card h3 { color: #666; font-size: 0.9em; text-transform: uppercase; margin-bottom: 10px; }
        .summary-card .value { font-size: 2.5em; font-weight: bold; margin-bottom: 5px; }
        .summary-card .label { color: #888; font-size: 0.9em; }
        .success { color: #27ae60; }
        .error { color: #e74c3c; }
        .warning { color: #f39c12; }
        .info { color: #3498db; }
        .test-categories { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .category-card { background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .category-header { padding: 20px; background: #f8f9fa; border-bottom: 1px solid #e9ecef; }
        .category-header h3 { color: #495057; margin-bottom: 5px; }
        .category-stats { padding: 20px; }
        .stat-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .progress-bar { width: 100%; height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; margin-top: 10px; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #27ae60, #2ecc71); transition: width 0.3s ease; }
        .timestamp { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        @media (max-width: 768px) {
            .summary { grid-template-columns: repeat(2, 1fr); }
            .test-categories { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Test Report</h1>
            <p>3D Model Viewer Pro - Comprehensive Testing Suite</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <div class="value info">${this.summary.totalTests}</div>
                <div class="label">Test Cases</div>
            </div>
            <div class="summary-card">
                <h3>Passed</h3>
                <div class="value success">${this.summary.totalPassed}</div>
                <div class="label">Successful</div>
            </div>
            <div class="summary-card">
                <h3>Failed</h3>
                <div class="value error">${this.summary.totalFailed}</div>
                <div class="label">Failed</div>
            </div>
            <div class="summary-card">
                <h3>Success Rate</h3>
                <div class="value ${this.summary.successRate >= 90 ? 'success' : this.summary.successRate >= 70 ? 'warning' : 'error'}">${this.summary.successRate.toFixed(1)}%</div>
                <div class="label">Overall</div>
            </div>
        </div>
        
        <div class="test-categories">
            ${Object.entries(this.testResults).map(([category, results]) => this.generateCategoryCard(category, results)).join('')}
        </div>
        
        <div class="timestamp">
            Generated on ${new Date(this.summary.timestamp).toLocaleString()}
        </div>
    </div>
</body>
</html>`;

        fs.writeFileSync(path.join(REPORT_PATH, 'index.html'), html);
    }

    generateCategoryCard(category, results) {
        const successRate = results.total > 0 ? (results.passed / results.total) * 100 : 0;
        const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
        
        return `
            <div class="category-card">
                <div class="category-header">
                    <h3>${categoryName} Tests</h3>
                </div>
                <div class="category-stats">
                    <div class="stat-row">
                        <span>Total:</span>
                        <span><strong>${results.total}</strong></span>
                    </div>
                    <div class="stat-row">
                        <span>Passed:</span>
                        <span class="success"><strong>${results.passed}</strong></span>
                    </div>
                    <div class="stat-row">
                        <span>Failed:</span>
                        <span class="error"><strong>${results.failed}</strong></span>
                    </div>
                    <div class="stat-row">
                        <span>Duration:</span>
                        <span><strong>${(results.duration / 1000).toFixed(2)}s</strong></span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${successRate}%"></div>
                    </div>
                </div>
            </div>`;
    }

    async generateJSONReport() {
        const report = {
            summary: this.summary,
            results: this.testResults,
            metadata: {
                generator: 'comprehensive-test-report-generator',
                version: '1.0.0',
                node_version: process.version,
                platform: process.platform
            }
        };

        fs.writeFileSync(
            path.join(REPORT_PATH, 'test-report.json'), 
            JSON.stringify(report, null, 2)
        );
    }

    async generateMarkdownSummary() {
        const markdown = `# 🧪 Test Report Summary

## Overview
- **Total Tests:** ${this.summary.totalTests}
- **Passed:** ${this.summary.totalPassed} ✅
- **Failed:** ${this.summary.totalFailed} ❌
- **Success Rate:** ${this.summary.successRate.toFixed(2)}%
- **Total Duration:** ${(this.summary.totalDuration / 1000).toFixed(2)}s

## Test Categories

${Object.entries(this.testResults).map(([category, results]) => {
    const successRate = results.total > 0 ? (results.passed / results.total) * 100 : 0;
    const status = successRate >= 90 ? '✅' : successRate >= 70 ? '⚠️' : '❌';
    
    return `### ${category.charAt(0).toUpperCase() + category.slice(1)} Tests ${status}
- **Total:** ${results.total}
- **Passed:** ${results.passed}
- **Failed:** ${results.failed}
- **Success Rate:** ${successRate.toFixed(1)}%
- **Duration:** ${(results.duration / 1000).toFixed(2)}s`;
}).join('\n\n')}

## Status
${this.summary.successRate >= 90 ? '🎉 All tests are passing!' : 
  this.summary.successRate >= 70 ? '⚠️ Some tests need attention.' : 
  '🚨 Critical test failures detected.'}

---
*Generated on ${new Date(this.summary.timestamp).toLocaleString()}*`;

        fs.writeFileSync(path.join(REPORT_PATH, 'README.md'), markdown);
    }
}

// Run the report generator
const generator = new TestReportGenerator();
generator.generateReport().catch(console.error);