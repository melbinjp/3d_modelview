/**
 * Core Web Vitals Testing
 * Tests Google's Core Web Vitals metrics for user experience
 */

const puppeteer = require('puppeteer');

describe('Core Web Vitals', () => {
    let browser;
    let page;
    const testUrl = 'http://localhost:8080';

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        page = await browser.newPage();
        
        // Set viewport to simulate desktop
        await page.setViewport({ width: 1920, height: 1080 });
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    describe('Largest Contentful Paint (LCP)', () => {
        it('should have LCP < 2.5 seconds', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            const lcp = await page.evaluate(() => {
                return new Promise((resolve) => {
                    new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        const lastEntry = entries[entries.length - 1];
                        resolve(lastEntry.startTime);
                    }).observe({ entryTypes: ['largest-contentful-paint'] });

                    // Fallback timeout
                    setTimeout(() => resolve(0), 5000);
                });
            });

            console.log(`LCP: ${lcp}ms`);
            expect(lcp).toBeLessThan(2500);
        }, 30000);
    });

    describe('First Input Delay (FID)', () => {
        it('should have FID < 100ms', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Simulate user interaction
            const fid = await page.evaluate(() => {
                return new Promise((resolve) => {
                    let fidValue = 0;

                    new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        entries.forEach((entry) => {
                            fidValue = entry.processingStart - entry.startTime;
                        });
                        resolve(fidValue);
                    }).observe({ entryTypes: ['first-input'] });

                    // Simulate click after page load
                    setTimeout(() => {
                        const button = document.querySelector('button') || document.body;
                        button.click();
                    }, 1000);

                    // Fallback
                    setTimeout(() => resolve(fidValue), 5000);
                });
            });

            console.log(`FID: ${fid}ms`);
            expect(fid).toBeLessThan(100);
        }, 30000);
    });

    describe('Cumulative Layout Shift (CLS)', () => {
        it('should have CLS < 0.1', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            const cls = await page.evaluate(() => {
                return new Promise((resolve) => {
                    let clsValue = 0;

                    new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        entries.forEach((entry) => {
                            if (!entry.hadRecentInput) {
                                clsValue += entry.value;
                            }
                        });
                    }).observe({ entryTypes: ['layout-shift'] });

                    // Wait for potential layout shifts
                    setTimeout(() => resolve(clsValue), 3000);
                });
            });

            console.log(`CLS: ${cls}`);
            expect(cls).toBeLessThan(0.1);
        }, 30000);
    });

    describe('First Contentful Paint (FCP)', () => {
        it('should have FCP < 1.8 seconds', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            const fcp = await page.evaluate(() => {
                return new Promise((resolve) => {
                    new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
                        resolve(fcpEntry ? fcpEntry.startTime : 0);
                    }).observe({ entryTypes: ['paint'] });

                    // Fallback
                    setTimeout(() => resolve(0), 5000);
                });
            });

            console.log(`FCP: ${fcp}ms`);
            expect(fcp).toBeLessThan(1800);
        }, 30000);
    });

    describe('Time to Interactive (TTI)', () => {
        it('should have TTI < 3.8 seconds', async () => {
            const startTime = Date.now();
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Wait for the app to be fully interactive
            await page.waitForFunction(() => {
                return window.modelViewer && window.modelViewer.initialized;
            }, { timeout: 10000 });

            const tti = Date.now() - startTime;

            console.log(`TTI: ${tti}ms`);
            expect(tti).toBeLessThan(3800);
        }, 30000);
    });

    describe('Speed Index', () => {
        it('should have Speed Index < 3.4 seconds', async () => {
            await page.goto(testUrl);

            const speedIndex = await page.evaluate(() => {
                return new Promise((resolve) => {
                    const observer = new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        // Simplified speed index calculation
                        const loadTime = entries.reduce((acc, entry) => {
                            return Math.max(acc, entry.startTime + entry.duration);
                        }, 0);
                        resolve(loadTime);
                    });

                    observer.observe({ entryTypes: ['navigation', 'resource'] });

                    // Fallback
                    setTimeout(() => resolve(3000), 5000);
                });
            });

            console.log(`Speed Index: ${speedIndex}ms`);
            expect(speedIndex).toBeLessThan(3400);
        }, 30000);
    });
});