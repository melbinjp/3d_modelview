/**
 * Step-by-step console debugging tool for each part of the application
 * Run this to manually test and debug console errors
 */

const puppeteer = require('puppeteer');
const readline = require('readline');

class StepByStepDebugger {
    constructor() {
        this.browser = null;
        this.page = null;
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async init() {
        console.log('🚀 Starting Step-by-Step Debugging');
        console.log('Make sure your server is running with: npm start');
        
        this.browser = await puppeteer.launch({
            headless: false,
            devtools: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.page = await this.browser.newPage();
        
        // Monitor console
        this.page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            console.log(`[CONSOLE ${type.toUpperCase()}] ${text}`);
        });

        this.page.on('pageerror', error => {
            console.error('❌ PAGE ERROR:', error.message);
        });

        this.page.on('requestfailed', request => {
            const error = `Request failed: ${request.url()} - ${request.failure().errorText}`;
            console.error('❌ REQUEST FAILED:', error);
        });
    }

    async askUser(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer.trim());
            });
        });
    }

    async run() {
        try {
            await this.init();
            
            console.log('\n🎯 Starting Step-by-Step Testing');
            console.log('This will help you identify and fix console errors step by step\n');
            
            await this.step1_LoadPage();
            await this.step2_CheckElements();
            await this.step3_TestSampleModels();
            await this.step4_TestURLLoading();
            await this.step5_TestControls();
            await this.step6_FinalCheck();
            
            console.log('\n✅ Step-by-step testing completed!');
            
        } catch (error) {
            console.error('❌ Error during testing:', error);
        } finally {
            if (this.rl) {
                this.rl.close();
            }
            if (this.browser) {
                await this.browser.close();
            }
        }
    }

    async step1_LoadPage() {
        console.log('\n📋 STEP 1: Loading Main Page');
        console.log('='.repeat(40));
        
        const url = await this.askUser('Enter URL (default: http://localhost:8080): ');
        const finalUrl = url || 'http://localhost:8080';
        
        await this.page.goto(finalUrl, { 
            waitUntil: 'networkidle0' 
        });
        
        const title = await this.page.title();
        console.log(`✅ Page loaded: ${title}`);
        
        // Check console errors
        const errors = await this.page.evaluate(() => {
            return window.consoleErrors || [];
        });
        
        if (errors.length > 0) {
            console.log(`❌ Found ${errors.length} console errors:`);
            errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error.message || error}`);
            });
        } else {
            console.log('✅ No console errors detected');
        }
        
        await this.askUser('Press Enter to continue to next step...');
    }

    async step2_CheckElements() {
        console.log('\n📋 STEP 2: Checking Page Elements');
        console.log('='.repeat(40));
        
        const elements = await this.page.evaluate(() => {
            return {
                canvas: !!document.querySelector('canvas'),
                loadButton: !!document.querySelector('#loadModel, .load-button'),
                urlInput: !!document.querySelector('#modelUrl, input[type="url"]'),
                fileInput: !!document.querySelector('input[type="file"]'),
                sampleButtons: document.querySelectorAll('.sample-btn, button[data-model]').length,
                controls: !!document.querySelector('.controls'),
                title: document.title,
                scripts: document.querySelectorAll('script').length,
                stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length
            };
        });
        
        console.log('Page Elements:');
        Object.entries(elements).forEach(([key, value]) => {
            const status = value ? '✅' : '❌';
            console.log(`  ${key}: ${value} ${status}`);
        });
        
        await this.askUser('Press Enter to continue...');
    }

    async step3_TestSampleModels() {
        console.log('\n📋 STEP 3: Testing Sample Models');
        console.log('='.repeat(40));
        
        const sampleButtons = await this.page.$$('.sample-btn, button[data-model]');
        console.log(`Found ${sampleButtons.length} sample model buttons`);
        
        if (sampleButtons.length === 0) {
            console.log('❌ No sample model buttons found');
            await this.askUser('Press Enter to continue...');
            return;
        }
        
        for (let i = 0; i < Math.min(sampleButtons.length, 3); i++) {
            const button = sampleButtons[i];
            const buttonText = await button.evaluate(el => el.textContent.trim());
            
            console.log(`\nTesting: ${buttonText}`);
            const testModel = await this.askUser(`Test ${buttonText} model? (y/n/skip): `);
            
            if (testModel.toLowerCase() === 'y') {
                console.log(`Clicking ${buttonText}...`);
                
                // Clear previous console errors
                await this.page.evaluate(() => {
                    window.consoleErrors = [];
                });
                
                await button.click();
                
                // Wait a bit and check for errors
                await this.page.waitForTimeout(3000);
                
                const errors = await this.page.evaluate(() => {
                    return window.consoleErrors || [];
                });
                
                if (errors.length > 0) {
                    console.log(`❌ ${errors.length} errors after loading ${buttonText}:`);
                    errors.forEach((error, index) => {
                        console.log(`   - ${error.message || error}`);
                    });
                } else {
                    console.log(`✅ ${buttonText} loaded without errors`);
                }
                
                // Check if model is visible
                const modelVisible = await this.page.evaluate(() => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return false;
                    
                    // Basic visibility check
                    const rect = canvas.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                });
                
                console.log(`Model visible: ${modelVisible ? '✅' : '❌'}`);
                
                // Test resize behavior (for duck visibility issue)
                if (buttonText.toLowerCase().includes('duck')) {
                    console.log('Testing resize behavior...');
                    await this.page.setViewport({ width: 1800, height: 1000 });
                    await this.page.waitForTimeout(1000);
                    
                    const visibleAfterResize = await this.page.evaluate(() => {
                        const canvas = document.querySelector('canvas');
                        const rect = canvas.getBoundingClientRect();
                        return rect.width > 0 && rect.height > 0;
                    });
                    
                    console.log(`Visible after resize: ${visibleAfterResize ? '✅' : '❌'}`);
                    
                    // Resize back
                    await this.page.setViewport({ width: 1920, height: 1080 });
                    await this.page.waitForTimeout(1000);
                }
                
            } else if (testModel.toLowerCase() === 'skip') {
                break;
            }
        }
        
        await this.askUser('Press Enter to continue...');
    }

    async step4_TestURLLoading() {
        console.log('\n📋 STEP 4: Testing URL Loading');
        console.log('='.repeat(40));
        
        const urlInput = await this.page.$('#modelUrl, input[type="url"]');
        const loadButton = await this.page.$('#loadModel, .load-button');
        
        console.log(`URL input found: ${!!urlInput}, Load button found: ${!!loadButton}`);
        
        if (!urlInput || !loadButton) {
            console.log('❌ URL input or load button not found');
            await this.askUser('Press Enter to continue...');
            return;
        }
        
        const testURL = await this.askUser('Enter test URL (or press Enter to skip): ');
        if (!testURL) {
            await this.askUser('Press Enter to continue...');
            return;
        }
        
        console.log('Clearing input and entering URL...');
        await urlInput.click({ clickCount: 3 }); // Select all
        await urlInput.type(testURL);
        
        console.log('Clicking load button...');
        await loadButton.click();
        
        console.log('Waiting for model to load...');
        await this.page.waitForTimeout(8000);
        
        const errors = await this.page.evaluate(() => {
            return window.consoleErrors || [];
        });
        
        if (errors.length > 0) {
            console.log(`❌ ${errors.length} errors during URL loading:`);
            errors.forEach((error, index) => {
                console.log(`   - ${error.message || error}`);
            });
        } else {
            console.log('✅ URL loading completed without errors');
        }
        
        await this.askUser('Press Enter to continue...');
    }

    async step5_TestControls() {
        console.log('\n📋 STEP 5: Testing Controls');
        console.log('='.repeat(40));
        
        const controls = await this.page.evaluate(() => {
            const elements = {
                autoRotate: document.querySelector('#autoRotate, input[name="autoRotate"]'),
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
        
        console.log('Available controls:');
        Object.entries(controls).forEach(([key, available]) => {
            console.log(`  ${key}: ${available ? '✅' : '❌'}`);
        });
        
        // Test auto-rotate if available
        if (controls.autoRotate) {
            const testAutoRotate = await this.askUser('Test auto-rotate? (y/n): ');
            if (testAutoRotate.toLowerCase() === 'y') {
                console.log('Toggling auto-rotate...');
                const autoRotateEl = await this.page.$('#autoRotate, input[name="autoRotate"]');
                await autoRotateEl.click();
                await this.page.waitForTimeout(2000);
                console.log('Auto-rotate toggled');
            }
        }
        
        // Test superhero mode if available
        if (controls.superheroMode) {
            const testSuperhero = await this.askUser('Test superhero mode? (y/n): ');
            if (testSuperhero.toLowerCase() === 'y') {
                console.log('Activating superhero mode...');
                const superheroEl = await this.page.$('#superheroMode, .superhero-button');
                await superheroEl.click();
                await this.page.waitForTimeout(3000);
                console.log('Superhero mode activated');
            }
        }
        
        await this.askUser('Press Enter to continue...');
    }

    async step6_FinalCheck() {
        console.log('\n📋 STEP 6: Final Console Check');
        console.log('='.repeat(40));
        
        const finalState = await this.page.evaluate(() => {
            return {
                errors: window.consoleErrors || [],
                warnings: window.consoleWarnings || [],
                logs: window.consoleLogs || [],
                canvasPresent: !!document.querySelector('canvas'),
                modelViewerExists: !!window.modelViewer,
                threeJSLoaded: !!window.THREE
            };
        });
        
        console.log('Final State:');
        console.log(`Canvas present: ${finalState.canvasPresent ? '✅' : '❌'}`);
        console.log(`ModelViewer exists: ${finalState.modelViewerExists ? '✅' : '❌'}`);
        console.log(`Three.js loaded: ${finalState.threeJSLoaded ? '✅' : '❌'}`);
        console.log(`Console errors: ${finalState.errors.length}`);
        console.log(`Console warnings: ${finalState.warnings.length}`);
        
        if (finalState.errors.length > 0) {
            console.log('\n❌ Console errors during testing:');
            finalState.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error.message || error}`);
            });
        } else {
            console.log('\n✅ No console errors detected');
        }
        
        const keepOpen = await this.askUser('Keep browser open for manual inspection? (y/n): ');
        if (keepOpen.toLowerCase() !== 'y') {
            await this.browser.close();
        }
        
        await this.askUser('Testing complete. Press Enter to finish...');
    }
}

// Run if called directly
if (require.main === module) {
    const stepDebugger = new StepByStepDebugger();
    stepDebugger.run().catch(console.error);
}

module.exports = StepByStepDebugger;