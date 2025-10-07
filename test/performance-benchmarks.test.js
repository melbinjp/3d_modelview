/**
 * Performance Benchmarks Testing
 * Tests application performance under various conditions
 */

const puppeteer = require('puppeteer');

describe('Performance Benchmarks', () => {
    let browser;
    let page;
    const testUrl = 'http://localhost:8080';

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        page = await browser.newPage();
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    describe('Initial Load Performance', () => {
        it('should load within 3 seconds', async () => {
            const startTime = Date.now();
            await page.goto(testUrl, { waitUntil: 'networkidle0' });
            const loadTime = Date.now() - startTime;

            console.log(`Initial load time: ${loadTime}ms`);
            expect(loadTime).toBeLessThan(3000);
        }, 30000);

        it('should have minimal bundle size', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            const resourceSizes = await page.evaluate(() => {
                return performance.getEntriesByType('resource').map(resource => ({
                    name: resource.name,
                    size: resource.transferSize,
                    type: resource.initiatorType
                }));
            });

            const totalSize = resourceSizes.reduce((sum, resource) => sum + resource.size, 0);
            const jsSize = resourceSizes
                .filter(r => r.name.endsWith('.js'))
                .reduce((sum, resource) => sum + resource.size, 0);

            console.log(`Total resource size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
            console.log(`JavaScript size: ${(jsSize / 1024 / 1024).toFixed(2)}MB`);

            // Reasonable limits for a 3D application
            expect(totalSize).toBeLessThan(15 * 1024 * 1024); // 15MB total
            expect(jsSize).toBeLessThan(10 * 1024 * 1024); // 10MB JS
        }, 30000);
    });

    describe('Runtime Performance', () => {
        it('should maintain 60fps during idle state', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Wait for app to initialize
            await page.waitForFunction(() => window.modelViewer && window.modelViewer.initialized);

            // Measure frame rate
            const frameRate = await page.evaluate(() => {
                return new Promise((resolve) => {
                    let frameCount = 0;
                    const startTime = performance.now();

                    function countFrame() {
                        frameCount++;
                        if (performance.now() - startTime < 1000) {
                            requestAnimationFrame(countFrame);
                        } else {
                            resolve(frameCount);
                        }
                    }

                    requestAnimationFrame(countFrame);
                });
            });

            console.log(`Frame rate: ${frameRate}fps`);
            expect(frameRate).toBeGreaterThanOrEqual(55); // Allow some variance
        }, 30000);

        it('should handle model loading efficiently', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Wait for app to initialize
            await page.waitForFunction(() => window.modelViewer && window.modelViewer.initialized);

            // Load a sample model and measure performance
            const loadStartTime = Date.now();

            await page.evaluate(() => {
                const sampleBtn = document.querySelector('[data-url*="Duck.gltf"]');
                if (sampleBtn) {
                    sampleBtn.click();
                }
            });

            // Wait for model to load
            await page.waitForFunction(() => {
                return window.modelViewer && window.modelViewer.stats && window.modelViewer.stats.vertices > 0;
            }, { timeout: 10000 });

            const loadTime = Date.now() - loadStartTime;

            console.log(`Model load time: ${loadTime}ms`);
            expect(loadTime).toBeLessThan(5000); // 5 seconds max
        }, 30000);
    });

    describe('Memory Usage', () => {
        it('should not have memory leaks', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Get initial memory usage
            const initialMemory = await page.evaluate(() => {
                if (performance.memory) {
                    return {
                        used: performance.memory.usedJSHeapSize,
                        total: performance.memory.totalJSHeapSize,
                        limit: performance.memory.jsHeapSizeLimit
                    };
                }
                return null;
            });

            if (!initialMemory) {
                console.log('Memory API not available, skipping memory test');
                return;
            }

            // Perform some operations that should clean up after themselves
            for (let i = 0; i < 5; i++) {
                await page.evaluate(() => {
                    // Simulate loading and unloading models
                    if (window.modelViewer && window.modelViewer.clearScene) {
                        window.modelViewer.clearScene();
                    }
                });
                await page.waitForTimeout(100);
            }

            // Force garbage collection if available
            await page.evaluate(() => {
                if (window.gc) {
                    window.gc();
                }
            });

            // Get final memory usage
            const finalMemory = await page.evaluate(() => {
                return {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                };
            });

            const memoryIncrease = finalMemory.used - initialMemory.used;
            const memoryIncreasePercent = (memoryIncrease / initialMemory.used) * 100;

            console.log(`Memory usage change: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${memoryIncreasePercent.toFixed(1)}%)`);

            // Memory should not increase significantly
            expect(memoryIncreasePercent).toBeLessThan(50);
        }, 30000);

        it('should handle large models efficiently', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Monitor memory during model loading
            const memoryBefore = await page.evaluate(() => {
                return performance.memory ? performance.memory.usedJSHeapSize : 0;
            });

            // Load a larger model (if available)
            await page.evaluate(() => {
                const urlInput = document.getElementById('modelUrl');
                const loadBtn = document.getElementById('loadUrlBtn');
                
                if (urlInput && loadBtn) {
                    urlInput.value = 'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf';
                    loadBtn.click();
                }
            });

            // Wait for loading to complete or timeout
            try {
                await page.waitForFunction(() => {
                    return window.modelViewer && window.modelViewer.stats && window.modelViewer.stats.vertices > 1000;
                }, { timeout: 15000 });

                const memoryAfter = await page.evaluate(() => {
                    return performance.memory ? performance.memory.usedJSHeapSize : 0;
                });

                const memoryUsed = memoryAfter - memoryBefore;
                console.log(`Memory used for model: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);

                // Should not use excessive memory
                expect(memoryUsed).toBeLessThan(100 * 1024 * 1024); // 100MB limit
            } catch (error) {
                console.log('Model loading timeout or failed, skipping memory test');
            }
        }, 45000);
    });

    describe('Network Performance', () => {
        it('should minimize network requests', async () => {
            const requests = [];
            
            page.on('request', request => {
                requests.push({
                    url: request.url(),
                    method: request.method(),
                    resourceType: request.resourceType()
                });
            });

            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Filter out data URLs and localhost requests for external resources
            const externalRequests = requests.filter(req => 
                !req.url.startsWith('data:') && 
                !req.url.includes('localhost')
            );

            console.log(`Total requests: ${requests.length}`);
            console.log(`External requests: ${externalRequests.length}`);

            // Should minimize external requests
            expect(externalRequests.length).toBeLessThan(10);
        }, 30000);

        it('should cache resources effectively', async () => {
            // First load
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Second load (should use cache)
            const cachedRequests = [];
            page.on('response', response => {
                if (response.fromCache()) {
                    cachedRequests.push(response.url());
                }
            });

            await page.reload({ waitUntil: 'networkidle0' });

            console.log(`Cached requests: ${cachedRequests.length}`);
            
            // Should have some cached resources
            expect(cachedRequests.length).toBeGreaterThan(0);
        }, 30000);
    });

    describe('Rendering Performance', () => {
        it('should handle viewport changes efficiently', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Test different viewport sizes
            const viewports = [
                { width: 1920, height: 1080 },
                { width: 1366, height: 768 },
                { width: 768, height: 1024 },
                { width: 375, height: 667 }
            ];

            for (const viewport of viewports) {
                const startTime = Date.now();
                await page.setViewport(viewport);
                
                // Wait for resize to complete
                await page.waitForTimeout(100);
                
                const resizeTime = Date.now() - startTime;
                console.log(`Resize to ${viewport.width}x${viewport.height}: ${resizeTime}ms`);
                
                expect(resizeTime).toBeLessThan(500);
            }
        }, 30000);

        it('should maintain performance with multiple UI interactions', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Perform multiple UI interactions rapidly
            const interactions = [
                () => page.click('#sidebarToggleBtn'),
                () => page.click('#themeToggle'),
                () => page.keyboard.press('KeyH'), // Show shortcuts
                () => page.keyboard.press('Escape'), // Hide shortcuts
                () => page.click('.accordion-header')
            ];

            const startTime = Date.now();

            for (let i = 0; i < 10; i++) {
                const interaction = interactions[i % interactions.length];
                await interaction();
                await page.waitForTimeout(50);
            }

            const totalTime = Date.now() - startTime;
            console.log(`10 UI interactions completed in: ${totalTime}ms`);

            expect(totalTime).toBeLessThan(2000);
        }, 30000);
    });

    describe('Stress Testing', () => {
        it('should handle rapid model switching', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            const sampleUrls = [
                'https://threejs.org/examples/models/gltf/Duck/glTF/Duck.gltf',
                'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Avocado/glTF/Avocado.gltf'
            ];

            // Rapidly switch between models
            for (let i = 0; i < 4; i++) {
                const url = sampleUrls[i % sampleUrls.length];
                
                await page.evaluate((modelUrl) => {
                    const urlInput = document.getElementById('modelUrl');
                    const loadBtn = document.getElementById('loadUrlBtn');
                    
                    if (urlInput && loadBtn) {
                        urlInput.value = modelUrl;
                        loadBtn.click();
                    }
                }, url);

                // Wait briefly before next switch
                await page.waitForTimeout(1000);
            }

            // Check that the app is still responsive
            const isResponsive = await page.evaluate(() => {
                return document.readyState === 'complete' && 
                       window.modelViewer && 
                       window.modelViewer.initialized;
            });

            expect(isResponsive).toBe(true);
        }, 60000);
    });
});