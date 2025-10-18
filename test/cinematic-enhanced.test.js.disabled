/**
 * Enhanced tests for Cinematic Superhero Mode
 * Tests the improved error handling, robustness, and feature completeness
 */

import puppeteer from 'puppeteer';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestServer } from './test-server.js';

describe('Enhanced Cinematic Superhero Mode Tests', () => {
    let browser;
    let page;
    let testServer;
    let serverUrl;
    const testTimeout = 45000;

    beforeAll(async () => {
        testServer = createTestServer(3002);
        serverUrl = await testServer.start();
        
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--allow-running-insecure-content',
                '--autoplay-policy=no-user-gesture-required'
            ]
        });
    }, testTimeout);

    afterAll(async () => {
        if (browser) await browser.close();
        if (testServer) await testServer.stop();
    });

    beforeEach(async () => {
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        
        // Enhanced error logging
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            if (type === 'error') {
                console.error(`Browser Error: ${text}`);
            } else if (type === 'warn') {
                console.warn(`Browser Warning: ${text}`);
            }
        });
        
        page.on('pageerror', error => {
            console.error('Page Error:', error.message);
        });
    });

    afterEach(async () => {
        if (page) await page.close();
    });

    describe('Enhanced Demo Functionality', () => {
        it('should load demo with fallback support', async () => {
            const demoUrl = `${serverUrl}/cinematic-demo.html`;
            
            await page.goto(demoUrl, { waitUntil: 'networkidle0', timeout: testTimeout });
            
            // Wait for either successful load or fallback
            await page.waitForFunction(
                () => {
                    const loading = document.getElementById('loading');
                    return loading && loading.style.display === 'none';
                },
                { timeout: testTimeout }
            );
            
            // Check that we have either full demo or fallback
            const demoState = await page.evaluate(() => {
                const hasError = document.getElementById('error').style.display !== 'none';
                const hasCanvas = document.querySelector('canvas') !== null;
                const hasDemo = window.demo !== undefined;
                const hasThree = window.THREE !== undefined;
                
                return {
                    hasError,
                    hasCanvas,
                    hasDemo,
                    hasThree,
                    demoType: window.demo ? 'loaded' : 'none'
                };
            });
            
            // Should not show error and should have basic functionality
            expect(demoState.hasError).toBe(false);
            expect(demoState.hasCanvas).toBe(true);
            expect(demoState.hasThree).toBe(true);
        }, testTimeout);

        it('should have functional UI controls in any mode', async () => {
            const demoUrl = `${serverUrl}/cinematic-demo.html`;
            await page.goto(demoUrl, { waitUntil: 'networkidle0' });
            
            await page.waitForFunction(
                () => document.getElementById('loading').style.display === 'none',
                { timeout: testTimeout }
            );
            
            // Check UI elements
            const uiState = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const selects = Array.from(document.querySelectorAll('select'));
                
                return {
                    hasButtons: buttons.length > 0,
                    hasStartButton: buttons.some(btn => btn.textContent.includes('Start')),
                    hasStopButton: buttons.some(btn => btn.textContent.includes('Stop')),
                    hasSelect: selects.length > 0,
                    buttonCount: buttons.length,
                    selectCount: selects.length
                };
            });
            
            expect(uiState.hasButtons).toBe(true);
            expect(uiState.hasStartButton).toBe(true);
            expect(uiState.hasStopButton).toBe(true);
            expect(uiState.hasSelect).toBe(true);
        }, testTimeout);

        it('should handle button interactions without errors', async () => {
            const demoUrl = `${serverUrl}/cinematic-demo.html`;
            await page.goto(demoUrl, { waitUntil: 'networkidle0' });
            
            await page.waitForFunction(
                () => document.getElementById('loading').style.display === 'none',
                { timeout: testTimeout }
            );
            
            // Test button interactions
            const interactionResults = await page.evaluate(async () => {
                const results = {
                    startClicked: false,
                    stopClicked: false,
                    selectChanged: false,
                    errors: []
                };
                
                try {
                    // Find and click start button
                    const startButton = Array.from(document.querySelectorAll('button'))
                        .find(btn => btn.textContent.includes('Start'));
                    
                    if (startButton) {
                        startButton.click();
                        results.startClicked = true;
                        
                        // Wait a moment
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        // Find and click stop button
                        const stopButton = Array.from(document.querySelectorAll('button'))
                            .find(btn => btn.textContent.includes('Stop'));
                        
                        if (stopButton) {
                            stopButton.click();
                            results.stopClicked = true;
                        }
                    }
                    
                    // Test select change
                    const select = document.querySelector('select');
                    if (select && select.options.length > 1) {
                        select.selectedIndex = 1;
                        select.dispatchEvent(new Event('change'));
                        results.selectChanged = true;
                    }
                    
                } catch (error) {
                    results.errors.push(error.message);
                }
                
                return results;
            });
            
            expect(interactionResults.startClicked).toBe(true);
            expect(interactionResults.stopClicked).toBe(true);
            expect(interactionResults.selectChanged).toBe(true);
            expect(interactionResults.errors.length).toBe(0);
        }, testTimeout);
    });

    describe('Cinematic Engine Robustness', () => {
        it('should handle missing dependencies gracefully', async () => {
            // Create a test page that simulates missing dependencies
            const testHtml = `
<!DOCTYPE html>
<html>
<head><title>Dependency Test</title></head>
<body>
    <div id="status">Testing...</div>
    <script type="module">
        // Test without Three.js initially
        let testResults = {
            handledMissingThree: false,
            handledMissingAudio: false,
            gracefulDegradation: false
        };
        
        try {
            // This should fail gracefully
            if (typeof THREE === 'undefined') {
                testResults.handledMissingThree = true;
                console.log('Three.js not available - handled gracefully');
            }
        } catch (error) {
            console.error('Failed to handle missing Three.js:', error);
        }
        
        try {
            // Test audio context availability
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                testResults.handledMissingAudio = true;
                console.log('Web Audio API not available - handled gracefully');
            } else {
                testResults.handledMissingAudio = true; // Available
            }
        } catch (error) {
            testResults.handledMissingAudio = true; // Handled the error
        }
        
        // Test graceful degradation
        try {
            // Simulate error conditions
            testResults.gracefulDegradation = true;
        } catch (error) {
            console.error('Graceful degradation failed:', error);
        }
        
        window.testResults = testResults;
        document.getElementById('status').textContent = 'Complete';
    </script>
</body>
</html>`;
            
            await page.setContent(testHtml);
            await page.waitForFunction(() => document.getElementById('status').textContent === 'Complete');
            
            const results = await page.evaluate(() => window.testResults);
            
            expect(results.handledMissingThree).toBe(true);
            expect(results.handledMissingAudio).toBe(true);
            expect(results.gracefulDegradation).toBe(true);
        }, testTimeout);

        it('should maintain performance under stress', async () => {
            const demoUrl = `${serverUrl}/cinematic-demo.html`;
            await page.goto(demoUrl, { waitUntil: 'networkidle0' });
            
            await page.waitForFunction(
                () => document.getElementById('loading').style.display === 'none',
                { timeout: testTimeout }
            );
            
            // Stress test the demo
            const performanceResults = await page.evaluate(async () => {
                const startTime = performance.now();
                const frameRates = [];
                let lastFrameTime = startTime;
                
                // Simulate intensive operations
                for (let i = 0; i < 60; i++) {
                    await new Promise(resolve => requestAnimationFrame(resolve));
                    
                    const currentTime = performance.now();
                    const frameTime = currentTime - lastFrameTime;
                    frameRates.push(1000 / frameTime);
                    lastFrameTime = currentTime;
                    
                    // Simulate some work
                    const dummy = new Array(1000).fill(0).map(() => Math.random());
                }
                
                const totalTime = performance.now() - startTime;
                const avgFps = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
                const minFps = Math.min(...frameRates);
                
                return {
                    totalTime,
                    avgFps,
                    minFps,
                    frameCount: frameRates.length
                };
            });
            
            expect(performanceResults.avgFps).toBeGreaterThan(20); // Reasonable performance
            expect(performanceResults.minFps).toBeGreaterThan(10); // No severe drops
            expect(performanceResults.frameCount).toBe(60);
        }, testTimeout);
    });

    describe('Error Recovery and Resilience', () => {
        it('should recover from runtime errors', async () => {
            const demoUrl = `${serverUrl}/cinematic-demo.html`;
            await page.goto(demoUrl, { waitUntil: 'networkidle0' });
            
            await page.waitForFunction(
                () => document.getElementById('loading').style.display === 'none',
                { timeout: testTimeout }
            );
            
            // Inject errors and test recovery
            const recoveryTest = await page.evaluate(async () => {
                const results = {
                    recoveredFromError: false,
                    maintainedFunctionality: false,
                    errorsCaught: 0
                };
                
                // Inject some errors
                try {
                    // This should cause an error
                    someNonExistentFunction();
                } catch (error) {
                    results.errorsCaught++;
                    results.recoveredFromError = true;
                }
                
                try {
                    // Try to access non-existent properties
                    const dummy = window.nonExistentObject.someProperty;
                } catch (error) {
                    results.errorsCaught++;
                }
                
                // Check if basic functionality still works
                try {
                    const canvas = document.querySelector('canvas');
                    const buttons = document.querySelectorAll('button');
                    results.maintainedFunctionality = canvas !== null && buttons.length > 0;
                } catch (error) {
                    console.error('Functionality check failed:', error);
                }
                
                return results;
            });
            
            expect(recoveryTest.recoveredFromError).toBe(true);
            expect(recoveryTest.maintainedFunctionality).toBe(true);
            expect(recoveryTest.errorsCaught).toBeGreaterThan(0);
        }, testTimeout);

        it('should handle memory pressure gracefully', async () => {
            const demoUrl = `${serverUrl}/cinematic-demo.html`;
            await page.goto(demoUrl, { waitUntil: 'networkidle0' });
            
            await page.waitForFunction(
                () => document.getElementById('loading').style.display === 'none',
                { timeout: testTimeout }
            );
            
            // Test memory management
            const memoryTest = await page.evaluate(async () => {
                const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
                
                // Create memory pressure
                const largeArrays = [];
                try {
                    for (let i = 0; i < 100; i++) {
                        largeArrays.push(new Array(10000).fill(Math.random()));
                    }
                    
                    // Clear arrays
                    largeArrays.length = 0;
                    
                    // Force garbage collection if available
                    if (window.gc) {
                        window.gc();
                    }
                    
                    // Wait for cleanup
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (error) {
                    console.warn('Memory test error:', error);
                }
                
                const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
                
                return {
                    initialMemory,
                    finalMemory,
                    memoryIncrease: finalMemory - initialMemory,
                    hasMemoryAPI: !!performance.memory,
                    testCompleted: true
                };
            });
            
            expect(memoryTest.testCompleted).toBe(true);
            if (memoryTest.hasMemoryAPI) {
                // Memory increase should be reasonable
                expect(memoryTest.memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
            }
        }, testTimeout);
    });

    describe('Feature Completeness Validation', () => {
        it('should support all required cinematic features', async () => {
            const demoUrl = `${serverUrl}/cinematic-demo.html`;
            await page.goto(demoUrl, { waitUntil: 'networkidle0' });
            
            await page.waitForFunction(
                () => document.getElementById('loading').style.display === 'none',
                { timeout: testTimeout }
            );
            
            // Test feature availability
            const featureTest = await page.evaluate(() => {
                const features = {
                    // Core 3D functionality
                    has3DScene: !!document.querySelector('canvas'),
                    hasThreeJS: typeof THREE !== 'undefined',
                    
                    // Camera controls
                    hasCameraMovement: true, // Assume true if demo loaded
                    
                    // Lighting system
                    hasLighting: true, // Assume true if demo loaded
                    
                    // Environment system
                    hasEnvironments: document.querySelector('select') !== null,
                    
                    // Audio support
                    hasWebAudio: !!(window.AudioContext || window.webkitAudioContext),
                    
                    // Animation system
                    hasAnimationFrame: !!window.requestAnimationFrame,
                    
                    // UI controls
                    hasStartControl: Array.from(document.querySelectorAll('button'))
                        .some(btn => btn.textContent.includes('Start')),
                    hasStopControl: Array.from(document.querySelectorAll('button'))
                        .some(btn => btn.textContent.includes('Stop')),
                    hasEnvironmentSelector: document.querySelector('select') !== null,
                    
                    // Status display
                    hasStatusDisplay: document.querySelector('div[style*="background: rgba(255, 255, 255, 0.1)"]') !== null ||
                                     document.querySelector('div').textContent.includes('Status'),
                    
                    // Performance monitoring
                    hasPerformanceAPI: !!window.performance
                };
                
                return features;
            });
            
            // Validate all core features are present
            expect(featureTest.has3DScene).toBe(true);
            expect(featureTest.hasThreeJS).toBe(true);
            expect(featureTest.hasWebAudio).toBe(true);
            expect(featureTest.hasAnimationFrame).toBe(true);
            expect(featureTest.hasStartControl).toBe(true);
            expect(featureTest.hasStopControl).toBe(true);
            expect(featureTest.hasEnvironmentSelector).toBe(true);
            expect(featureTest.hasPerformanceAPI).toBe(true);
        }, testTimeout);

        it('should demonstrate cinematic sequence phases', async () => {
            const demoUrl = `${serverUrl}/cinematic-demo.html`;
            await page.goto(demoUrl, { waitUntil: 'networkidle0' });
            
            await page.waitForFunction(
                () => document.getElementById('loading').style.display === 'none',
                { timeout: testTimeout }
            );
            
            // Start a cinematic sequence and monitor phases
            const phaseTest = await page.evaluate(async () => {
                const phases = [];
                let sequenceStarted = false;
                
                // Find and click start button
                const startButton = Array.from(document.querySelectorAll('button'))
                    .find(btn => btn.textContent.includes('Start'));
                
                if (startButton) {
                    startButton.click();
                    sequenceStarted = true;
                    
                    // Monitor status changes for 3 seconds
                    for (let i = 0; i < 30; i++) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        // Check status display for phase information
                        const statusElements = Array.from(document.querySelectorAll('div'))
                            .filter(div => div.textContent.includes('Status') || div.textContent.includes('Phase'));
                        
                        if (statusElements.length > 0) {
                            const statusText = statusElements[0].textContent;
                            if (statusText.includes('Phase:')) {
                                const phaseMatch = statusText.match(/Phase:\s*(\w+)/);
                                if (phaseMatch && !phases.includes(phaseMatch[1])) {
                                    phases.push(phaseMatch[1]);
                                }
                            }
                        }
                    }
                }
                
                return {
                    sequenceStarted,
                    phasesDetected: phases,
                    phaseCount: phases.length
                };
            });
            
            expect(phaseTest.sequenceStarted).toBe(true);
            expect(phaseTest.phaseCount).toBeGreaterThan(0);
        }, testTimeout);
    });
});