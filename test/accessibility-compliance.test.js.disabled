/**
 * Accessibility Compliance Testing
 * Tests WCAG 2.1 AA compliance and accessibility standards
 */

const puppeteer = require('puppeteer');
const axeCore = require('axe-core');

describe('Accessibility Compliance', () => {
    let browser;
    let page;
    const testUrl = 'http://localhost:8080';

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    describe('WCAG 2.1 AA Compliance', () => {
        it('should pass axe-core accessibility audit', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Inject axe-core
            await page.addScriptTag({ content: axeCore.source });

            // Run axe audit
            const results = await page.evaluate(() => {
                return axe.run({
                    tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
                    rules: {
                        'color-contrast': { enabled: true },
                        'keyboard-navigation': { enabled: true },
                        'focus-management': { enabled: true }
                    }
                });
            });

            // Check for violations
            expect(results.violations).toHaveLength(0);

            // Log any violations for debugging
            if (results.violations.length > 0) {
                console.log('Accessibility violations:', JSON.stringify(results.violations, null, 2));
            }

            // Ensure we have some passes (tests actually ran)
            expect(results.passes.length).toBeGreaterThan(0);
        }, 30000);

        it('should have proper heading hierarchy', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            const headingStructure = await page.evaluate(() => {
                const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
                return headings.map(h => ({
                    level: parseInt(h.tagName.charAt(1)),
                    text: h.textContent.trim()
                }));
            });

            // Should have at least one h1
            const h1Count = headingStructure.filter(h => h.level === 1).length;
            expect(h1Count).toBeGreaterThanOrEqual(1);

            // Check heading hierarchy (no skipping levels)
            for (let i = 1; i < headingStructure.length; i++) {
                const current = headingStructure[i];
                const previous = headingStructure[i - 1];
                
                if (current.level > previous.level) {
                    expect(current.level - previous.level).toBeLessThanOrEqual(1);
                }
            }
        }, 30000);

        it('should have proper ARIA landmarks', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            const landmarks = await page.evaluate(() => {
                const landmarkSelectors = [
                    '[role="main"], main',
                    '[role="navigation"], nav',
                    '[role="banner"], header',
                    '[role="contentinfo"], footer',
                    '[role="complementary"], aside'
                ];

                return landmarkSelectors.map(selector => ({
                    selector,
                    count: document.querySelectorAll(selector).length
                }));
            });

            // Should have at least a main landmark
            const mainLandmarks = landmarks.find(l => l.selector.includes('main'));
            expect(mainLandmarks.count).toBeGreaterThanOrEqual(1);
        }, 30000);
    });

    describe('Keyboard Navigation', () => {
        it('should support full keyboard navigation', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Get all focusable elements
            const focusableElements = await page.evaluate(() => {
                const focusableSelectors = [
                    'button:not([disabled])',
                    'input:not([disabled])',
                    'select:not([disabled])',
                    'textarea:not([disabled])',
                    'a[href]',
                    '[tabindex]:not([tabindex="-1"])'
                ];

                return Array.from(document.querySelectorAll(focusableSelectors.join(', ')))
                    .map(el => ({
                        tagName: el.tagName,
                        id: el.id,
                        className: el.className,
                        tabIndex: el.tabIndex
                    }));
            });

            expect(focusableElements.length).toBeGreaterThan(0);

            // Test Tab navigation
            await page.keyboard.press('Tab');
            const firstFocused = await page.evaluate(() => document.activeElement.tagName);
            expect(['BUTTON', 'INPUT', 'A', 'SELECT'].includes(firstFocused)).toBe(true);
        }, 30000);

        it('should have visible focus indicators', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Focus on first interactive element
            await page.keyboard.press('Tab');

            // Check if focused element has visible focus indicator
            const focusStyles = await page.evaluate(() => {
                const focused = document.activeElement;
                const styles = window.getComputedStyle(focused, ':focus');
                return {
                    outline: styles.outline,
                    outlineWidth: styles.outlineWidth,
                    outlineStyle: styles.outlineStyle,
                    outlineColor: styles.outlineColor,
                    boxShadow: styles.boxShadow
                };
            });

            // Should have some form of focus indicator
            const hasFocusIndicator = 
                focusStyles.outline !== 'none' ||
                focusStyles.outlineWidth !== '0px' ||
                focusStyles.boxShadow !== 'none';

            expect(hasFocusIndicator).toBe(true);
        }, 30000);

        it('should support Escape key for modal dismissal', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Try to open keyboard shortcuts (H key)
            await page.keyboard.press('KeyH');

            // Wait a bit for modal to appear
            await page.waitForTimeout(500);

            // Check if modal is visible
            const modalVisible = await page.evaluate(() => {
                const modal = document.getElementById('shortcutHelpPanel');
                return modal && modal.classList.contains('show');
            });

            if (modalVisible) {
                // Press Escape to close
                await page.keyboard.press('Escape');

                // Check if modal is hidden
                const modalHidden = await page.evaluate(() => {
                    const modal = document.getElementById('shortcutHelpPanel');
                    return modal && modal.classList.contains('hidden');
                });

                expect(modalHidden).toBe(true);
            }
        }, 30000);
    });

    describe('Screen Reader Support', () => {
        it('should have proper ARIA labels', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            const ariaElements = await page.evaluate(() => {
                const elementsWithAria = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]');
                return Array.from(elementsWithAria).map(el => ({
                    tagName: el.tagName,
                    ariaLabel: el.getAttribute('aria-label'),
                    ariaLabelledby: el.getAttribute('aria-labelledby'),
                    ariaDescribedby: el.getAttribute('aria-describedby')
                }));
            });

            expect(ariaElements.length).toBeGreaterThan(0);
        }, 30000);

        it('should have ARIA live regions', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            const liveRegions = await page.evaluate(() => {
                const regions = document.querySelectorAll('[aria-live]');
                return Array.from(regions).map(region => ({
                    ariaLive: region.getAttribute('aria-live'),
                    id: region.id,
                    className: region.className
                }));
            });

            expect(liveRegions.length).toBeGreaterThan(0);
        }, 30000);

        it('should have proper form labels', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            const formInputs = await page.evaluate(() => {
                const inputs = document.querySelectorAll('input, select, textarea');
                return Array.from(inputs).map(input => {
                    const label = document.querySelector(`label[for="${input.id}"]`);
                    return {
                        id: input.id,
                        type: input.type,
                        hasLabel: !!label,
                        ariaLabel: input.getAttribute('aria-label'),
                        placeholder: input.placeholder
                    };
                });
            });

            // Each input should have either a label, aria-label, or meaningful placeholder
            formInputs.forEach(input => {
                const hasAccessibleName = input.hasLabel || input.ariaLabel || input.placeholder;
                expect(hasAccessibleName).toBe(true);
            });
        }, 30000);
    });

    describe('Color and Contrast', () => {
        it('should have sufficient color contrast ratios', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Inject axe-core for color contrast testing
            await page.addScriptTag({ content: axeCore.source });

            const contrastResults = await page.evaluate(() => {
                return axe.run({
                    rules: {
                        'color-contrast': { enabled: true }
                    }
                });
            });

            expect(contrastResults.violations.filter(v => v.id === 'color-contrast')).toHaveLength(0);
        }, 30000);

        it('should not rely solely on color for information', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Check for elements that might rely only on color
            const colorOnlyElements = await page.evaluate(() => {
                // Look for elements with only color differences (simplified check)
                const buttons = document.querySelectorAll('button');
                const links = document.querySelectorAll('a');
                
                return {
                    buttonsWithOnlyColorDifferences: Array.from(buttons).filter(btn => {
                        const styles = window.getComputedStyle(btn);
                        return styles.backgroundColor !== 'rgba(0, 0, 0, 0)' && !btn.textContent.trim();
                    }).length,
                    linksWithOnlyColorDifferences: Array.from(links).filter(link => {
                        return !link.textContent.trim() && !link.querySelector('img, svg');
                    }).length
                };
            });

            // This is a basic check - in practice, manual review is needed
            expect(colorOnlyElements.buttonsWithOnlyColorDifferences).toBe(0);
            expect(colorOnlyElements.linksWithOnlyColorDifferences).toBe(0);
        }, 30000);
    });

    describe('Mobile Accessibility', () => {
        it('should be accessible on mobile devices', async () => {
            // Set mobile viewport
            await page.setViewport({ width: 375, height: 667 });
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Check touch target sizes
            const touchTargets = await page.evaluate(() => {
                const interactiveElements = document.querySelectorAll('button, a, input, select');
                return Array.from(interactiveElements).map(el => {
                    const rect = el.getBoundingClientRect();
                    return {
                        width: rect.width,
                        height: rect.height,
                        area: rect.width * rect.height
                    };
                });
            });

            // Touch targets should be at least 44x44px (WCAG guideline)
            touchTargets.forEach(target => {
                expect(target.width).toBeGreaterThanOrEqual(44);
                expect(target.height).toBeGreaterThanOrEqual(44);
            });

            // Reset viewport
            await page.setViewport({ width: 1920, height: 1080 });
        }, 30000);
    });
});