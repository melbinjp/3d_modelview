/**
 * Systematic UI Testing - Step by step testing with console error detection
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

describe('Systematic UI Testing', () => {
    let browser;
    let page;
    let testResults = [];
    let screenshotCounter = 0;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: false, // Show browser for visual inspection
            devtools: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        page = await browser.newPage();
        
        // Set viewport for consistent screenshots
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Listen for console messages
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            console.log(`[${type.toUpperCase()}] ${text}`);
            
            if (type === 'error') {
                testResults.push({
                    step: `Console Error`,
                    error: text,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Listen for page errors
        page.on('pageerror', error => {
            console.error('Page Error:', error.message);
            testResults.push({
                step: 'Page Error',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        });

        // Listen for failed requests
        page.on('requestfailed', request => {
            console.error('Request Failed:', request.url(), request.failure().errorText);
            testResults.push({
                step: 'Request Failed',
                error: `${request.url()} - ${request.failure().errorText}`,
                timestamp: new Date().toISOString()
            });
        });
    });

    afterAll(async () => {
        // Generate test report
        const report = {
            timestamp: new Date().toISOString(),
            totalTests: testResults.length,
            results: testResults
        };
        
        fs.writeFileSync('test-results-systematic.json', JSON.stringify(report, null, 2));
        
        if (browser) {
            await browser.close();
        }
    });

    async function takeScreenshot(stepName) {
        screenshotCounter++;
        const filename = `screenshot-${screenshotCounter.toString().padStart(3, '0')}-${stepName.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
        await page.screenshot({ 
            path: `test-screenshots/${filename}`,
            fullPage: true 
        });
        console.log(`📸 Screenshot saved: ${filename}`);
        return filename;
    }

    async function waitForNoErrors(timeout = 3000) {
        const initialErrorCount = testResults.filter(r => r.step.includes('Error')).length;
        await page.waitForTimeout(timeout);
        const finalErrorCount = testResults.filter(r => r.step.includes('Error')).length;
        return finalErrorCount === initialErrorCount;
    }

    async function checkConsoleErrors() {
        const errors = await page.evaluate(() => {
            const errors = [];
            const originalError = console.error;
            const originalWarn = console.warn;
            
            console.error = function(...args) {
                errors.push({ type: 'error', message: args.join(' ') });
                originalError.apply(console, args);
            };
            
            console.warn = function(...args) {
                errors.push({ type: 'warning', message: args.join(' ') });
                originalWarn.apply(console, args);
            };
            
            return errors;
        });
        
        return errors;
    }

    test('Step 1: Load Main Page and Check Console', async () => {
        console.log('\n🔍 Step 1: Loading main page...');
        
        // Create screenshots directory
        if (!fs.existsSync('test-screenshots')) {
            fs.mkdirSync('test-screenshots');
        }
        
        const initialErrorCount = testResults.length;
        
        try {
            await page.goto('http://localhost:8080', { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });
            
            await takeScreenshot('01-main-page-loaded');
            
            // Wait for any async operations to complete
            await page.waitForTimeout(2000);
            
            // Check if there are any console errors
            const consoleErrors = await page.evaluate(() => {
                return window.console._errors || [];
            });
            
            const newErrors = testResults.slice(initialErrorCount);
            
            if (newErrors.length > 0) {
                console.log('❌ Console errors detected on main page:');
                newErrors.forEach(error => console.log(`  - ${error.error}`));
                
                // Take screenshot of error state
                await takeScreenshot('01-main-page-errors');
            } else {
                console.log('✅ Main page loaded without console errors');
            }
            
            // Check if main elements are present
            const mainElements = await page.evaluate(() => {
                return {
                    canvas: !!document.querySelector('canvas'),
                    controls: !!document.querySelector('.controls'),
                    loadButton: !!document.querySelector('#loadModel'),
                    sampleModels: !!document.querySelector('.sample-models')
                };
            });
            
            console.log('Main elements check:', mainElements);
            
        } catch (error) {
            console.error('❌ Failed to load main page:', error.message);
            await takeScreenshot('01-main-page-failed');
            throw error;
        }
    }, 60000);

    test('Step 2: Test Sample Model Loading - Helmet', async () => {
        console.log('\n🔍 Step 2: Testing helmet model loading...');
        
        const initialErrorCount = testResults.length;
        
        try {
            // Look for helmet sample button
            const helmetButton = await page.$('button[data-model*="helmet"], button:contains("Helmet"), .sample-models button:first-child');
            
            if (helmetButton) {
                await takeScreenshot('02-before-helmet-load');
                
                console.log('Clicking helmet model button...');
                await helmetButton.click();
                
                // Wait for model to load
                await page.waitForTimeout(5000);
                
                await takeScreenshot('02-after-helmet-load');
                
                // Check if model loaded successfully
                const modelLoaded = await page.evaluate(() => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return false;
                    
                    // Check if there's a scene with objects
                    return window.modelViewer && window.modelViewer.scene && 
                           window.modelViewer.scene.children.length > 0;
                });
                
                console.log('Helmet model loaded:', modelLoaded);
                
                const newErrors = testResults.slice(initialErrorCount);
                if (newErrors.length > 0) {
                    console.log('❌ Errors during helmet loading:');
                    newErrors.forEach(error => console.log(`  - ${error.error}`));
                    await takeScreenshot('02-helmet-errors');
                }
                
            } else {
                console.log('❌ Helmet button not found');
                await takeScreenshot('02-helmet-button-not-found');
            }
            
        } catch (error) {
            console.error('❌ Error testing helmet model:', error.message);
            await takeScreenshot('02-helmet-test-failed');
        }
    }, 60000);

    test('Step 3: Test Sample Model Loading - Duck', async () => {
        console.log('\n🔍 Step 3: Testing duck model loading...');
        
        const initialErrorCount = testResults.length;
        
        try {
            // Look for duck sample button
            const duckButton = await page.$('button[data-model*="duck"], button:contains("Duck")');
            
            if (duckButton) {
                await takeScreenshot('03-before-duck-load');
                
                console.log('Clicking duck model button...');
                await duckButton.click();
                
                // Wait for model to load
                await page.waitForTimeout(5000);
                
                await takeScreenshot('03-after-duck-load');
                
                // Test resize behavior (duck only visible on resize issue)
                console.log('Testing resize behavior...');
                await page.setViewport({ width: 1800, height: 1000 });
                await page.waitForTimeout(1000);
                await takeScreenshot('03-duck-after-resize');
                
                // Resize back
                await page.setViewport({ width: 1920, height: 1080 });
                await page.waitForTimeout(1000);
                await takeScreenshot('03-duck-resize-back');
                
                const newErrors = testResults.slice(initialErrorCount);
                if (newErrors.length > 0) {
                    console.log('❌ Errors during duck loading:');
                    newErrors.forEach(error => console.log(`  - ${error.error}`));
                }
                
            } else {
                console.log('❌ Duck button not found');
                await takeScreenshot('03-duck-button-not-found');
            }
            
        } catch (error) {
            console.error('❌ Error testing duck model:', error.message);
            await takeScreenshot('03-duck-test-failed');
        }
    }, 60000);

    test('Step 4: Test Sample Model Loading - Avocado', async () => {
        console.log('\n🔍 Step 4: Testing avocado model loading...');
        
        const initialErrorCount = testResults.length;
        
        try {
            // Look for avocado sample button
            const avocadoButton = await page.$('button[data-model*="avocado"], button:contains("Avocado")');
            
            if (avocadoButton) {
                await takeScreenshot('04-before-avocado-load');
                
                console.log('Clicking avocado model button...');
                await avocadoButton.click();
                
                // Wait for model to load
                await page.waitForTimeout(5000);
                
                await takeScreenshot('04-after-avocado-load');
                
                const newErrors = testResults.slice(initialErrorCount);
                if (newErrors.length > 0) {
                    console.log('❌ Errors during avocado loading:');
                    newErrors.forEach(error => console.log(`  - ${error.error}`));
                }
                
            } else {
                console.log('❌ Avocado button not found');
                await takeScreenshot('04-avocado-button-not-found');
            }
            
        } catch (error) {
            console.error('❌ Error testing avocado model:', error.message);
            await takeScreenshot('04-avocado-test-failed');
        }
    }, 60000);

    test('Step 5: Test URL Loading', async () => {
        console.log('\n🔍 Step 5: Testing URL model loading...');
        
        const initialErrorCount = testResults.length;
        
        try {
            await takeScreenshot('05-before-url-load');
            
            // Find URL input and load button
            const urlInput = await page.$('#modelUrl, input[type="url"], input[placeholder*="URL"]');
            const loadButton = await page.$('#loadModel, button:contains("Load"), .load-button');
            
            if (urlInput && loadButton) {
                // Test with a valid glTF model URL
                const testUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF/Duck.gltf';
                
                await urlInput.clear();
                await urlInput.type(testUrl);
                await takeScreenshot('05-url-entered');
                
                await loadButton.click();
                console.log('Loading model from URL...');
                
                // Wait for loading
                await page.waitForTimeout(10000);
                await takeScreenshot('05-after-url-load');
                
                const newErrors = testResults.slice(initialErrorCount);
                if (newErrors.length > 0) {
                    console.log('❌ Errors during URL loading:');
                    newErrors.forEach(error => console.log(`  - ${error.error}`));
                }
                
            } else {
                console.log('❌ URL input or load button not found');
                await takeScreenshot('05-url-elements-not-found');
            }
            
        } catch (error) {
            console.error('❌ Error testing URL loading:', error.message);
            await takeScreenshot('05-url-test-failed');
        }
    }, 60000);

    test('Step 6: Test File Upload', async () => {
        console.log('\n🔍 Step 6: Testing file upload...');
        
        const initialErrorCount = testResults.length;
        
        try {
            await takeScreenshot('06-before-file-upload');
            
            // Look for file input
            const fileInput = await page.$('input[type="file"]');
            
            if (fileInput) {
                console.log('File input found, testing drag and drop area...');
                
                // Test drag and drop area
                const dropArea = await page.$('.drop-area, .file-drop, #dropArea');
                if (dropArea) {
                    await takeScreenshot('06-drop-area-found');
                    
                    // Simulate drag over
                    await dropArea.hover();
                    await takeScreenshot('06-drop-area-hover');
                }
                
                const newErrors = testResults.slice(initialErrorCount);
                if (newErrors.length > 0) {
                    console.log('❌ Errors during file upload test:');
                    newErrors.forEach(error => console.log(`  - ${error.error}`));
                }
                
            } else {
                console.log('❌ File input not found');
                await takeScreenshot('06-file-input-not-found');
            }
            
        } catch (error) {
            console.error('❌ Error testing file upload:', error.message);
            await takeScreenshot('06-file-upload-test-failed');
        }
    }, 60000);

    test('Step 7: Test Controls and UI Elements', async () => {
        console.log('\n🔍 Step 7: Testing controls and UI elements...');
        
        const initialErrorCount = testResults.length;
        
        try {
            await takeScreenshot('07-before-controls-test');
            
            // Test various controls
            const controls = await page.evaluate(() => {
                const elements = {
                    autoRotate: document.querySelector('#autoRotate, input[type="checkbox"]'),
                    wireframe: document.querySelector('#wireframe'),
                    lighting: document.querySelector('#lighting'),
                    shadows: document.querySelector('#shadows'),
                    superheroMode: document.querySelector('#superheroMode, .superhero-button')
                };
                
                return Object.keys(elements).reduce((acc, key) => {
                    acc[key] = !!elements[key];
                    return acc;
                }, {});
            });
            
            console.log('Controls found:', controls);
            
            // Test auto-rotate if available
            if (controls.autoRotate) {
                const autoRotateCheckbox = await page.$('#autoRotate, input[type="checkbox"]');
                if (autoRotateCheckbox) {
                    await autoRotateCheckbox.click();
                    await page.waitForTimeout(1000);
                    await takeScreenshot('07-auto-rotate-enabled');
                    
                    await autoRotateCheckbox.click();
                    await page.waitForTimeout(1000);
                    await takeScreenshot('07-auto-rotate-disabled');
                }
            }
            
            // Test superhero mode if available
            if (controls.superheroMode) {
                const superheroButton = await page.$('#superheroMode, .superhero-button');
                if (superheroButton) {
                    await superheroButton.click();
                    await page.waitForTimeout(2000);
                    await takeScreenshot('07-superhero-mode-activated');
                }
            }
            
            const newErrors = testResults.slice(initialErrorCount);
            if (newErrors.length > 0) {
                console.log('❌ Errors during controls test:');
                newErrors.forEach(error => console.log(`  - ${error.error}`));
            }
            
        } catch (error) {
            console.error('❌ Error testing controls:', error.message);
            await takeScreenshot('07-controls-test-failed');
        }
    }, 60000);

    test('Step 8: Final UI State and Summary', async () => {
        console.log('\n🔍 Step 8: Final UI state and summary...');
        
        try {
            await takeScreenshot('08-final-ui-state');
            
            // Get final page state
            const finalState = await page.evaluate(() => {
                return {
                    title: document.title,
                    canvasPresent: !!document.querySelector('canvas'),
                    controlsPresent: !!document.querySelector('.controls'),
                    errorsInConsole: window.console._errors ? window.console._errors.length : 0,
                    modelLoaded: window.modelViewer ? !!window.modelViewer.currentModel : false
                };
            });
            
            console.log('Final page state:', finalState);
            
            // Summary of all errors found
            const allErrors = testResults.filter(r => r.step.includes('Error'));
            console.log(`\n📊 Test Summary:`);
            console.log(`Total errors found: ${allErrors.length}`);
            console.log(`Screenshots taken: ${screenshotCounter}`);
            
            if (allErrors.length > 0) {
                console.log('\n❌ Errors that need to be fixed:');
                allErrors.forEach((error, index) => {
                    console.log(`${index + 1}. ${error.error}`);
                });
            } else {
                console.log('\n✅ No errors found during testing!');
            }
            
        } catch (error) {
            console.error('❌ Error in final summary:', error.message);
            await takeScreenshot('08-final-summary-failed');
        }
    }, 30000);
});