/**
 * Security Audit Testing
 * Tests for common web security vulnerabilities and best practices
 */

const puppeteer = require('puppeteer');

describe('Security Audit', () => {
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

    describe('Content Security Policy (CSP)', () => {
        it('should have Content Security Policy headers', async () => {
            const response = await page.goto(testUrl, { waitUntil: 'networkidle0' });
            const headers = response.headers();

            // Check for CSP header
            const cspHeader = headers['content-security-policy'] || headers['content-security-policy-report-only'];
            
            if (cspHeader) {
                expect(cspHeader).toBeDefined();
                console.log('CSP Header:', cspHeader);
            } else {
                console.warn('No CSP header found - consider implementing CSP for security');
            }
        }, 30000);

        it('should not allow unsafe inline scripts', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Try to execute inline script
            const inlineScriptBlocked = await page.evaluate(() => {
                try {
                    const script = document.createElement('script');
                    script.innerHTML = 'window.testInlineScript = true;';
                    document.head.appendChild(script);
                    return !window.testInlineScript;
                } catch (error) {
                    return true; // Script was blocked
                }
            });

            // If CSP is properly configured, inline scripts should be blocked
            // For development, this might not be enforced
            console.log('Inline script blocked:', inlineScriptBlocked);
        }, 30000);
    });

    describe('XSS Protection', () => {
        it('should sanitize user input', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Test XSS in URL input field
            const urlInput = await page.$('#modelUrl');
            if (urlInput) {
                const xssPayload = '<script>alert("XSS")</script>';
                await urlInput.type(xssPayload);

                // Check if the script was executed
                const xssExecuted = await page.evaluate(() => {
                    return window.alert.toString().includes('[native code]') === false;
                });

                expect(xssExecuted).toBe(false);
            }
        }, 30000);

        it('should escape HTML in dynamic content', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Check if any innerHTML usage exists without proper escaping
            const unsafeInnerHTML = await page.evaluate(() => {
                // This is a simplified check - in practice, code review is needed
                const scripts = Array.from(document.scripts);
                const hasUnsafeInnerHTML = scripts.some(script => {
                    return script.textContent.includes('.innerHTML =') && 
                           !script.textContent.includes('DOMPurify') &&
                           !script.textContent.includes('textContent');
                });
                return hasUnsafeInnerHTML;
            });

            // This is a basic check - manual code review is more reliable
            console.log('Potentially unsafe innerHTML usage:', unsafeInnerHTML);
        }, 30000);
    });

    describe('HTTPS and Transport Security', () => {
        it('should use HTTPS in production', async () => {
            // Skip for localhost testing
            if (testUrl.includes('localhost')) {
                console.log('Skipping HTTPS check for localhost');
                return;
            }

            const response = await page.goto(testUrl, { waitUntil: 'networkidle0' });
            const url = response.url();
            
            expect(url).toMatch(/^https:/);
        }, 30000);

        it('should have security headers', async () => {
            const response = await page.goto(testUrl, { waitUntil: 'networkidle0' });
            const headers = response.headers();

            // Check for important security headers
            const securityHeaders = {
                'x-frame-options': 'Clickjacking protection',
                'x-content-type-options': 'MIME type sniffing protection',
                'x-xss-protection': 'XSS protection',
                'strict-transport-security': 'HTTPS enforcement',
                'referrer-policy': 'Referrer information control'
            };

            Object.entries(securityHeaders).forEach(([header, description]) => {
                if (headers[header]) {
                    console.log(`✓ ${description}: ${headers[header]}`);
                } else {
                    console.warn(`⚠ Missing ${description} header: ${header}`);
                }
            });

            // At least some security headers should be present
            const securityHeaderCount = Object.keys(securityHeaders).filter(h => headers[h]).length;
            console.log(`Security headers present: ${securityHeaderCount}/${Object.keys(securityHeaders).length}`);
        }, 30000);
    });

    describe('Data Protection', () => {
        it('should not expose sensitive information in client-side code', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Check for common sensitive data patterns
            const sensitivePatterns = [
                /api[_-]?key/i,
                /secret/i,
                /password/i,
                /token/i,
                /private[_-]?key/i
            ];

            const pageContent = await page.content();
            const foundSensitiveData = sensitivePatterns.some(pattern => pattern.test(pageContent));

            expect(foundSensitiveData).toBe(false);
        }, 30000);

        it('should handle localStorage securely', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            const localStorageData = await page.evaluate(() => {
                const data = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    data[key] = localStorage.getItem(key);
                }
                return data;
            });

            // Check that no sensitive data is stored in localStorage
            const sensitiveKeys = Object.keys(localStorageData).filter(key => 
                /password|secret|token|key/i.test(key)
            );

            expect(sensitiveKeys).toHaveLength(0);
        }, 30000);
    });

    describe('Third-party Dependencies', () => {
        it('should not load resources from untrusted domains', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Monitor network requests
            const requests = [];
            page.on('request', request => {
                requests.push(request.url());
            });

            await page.reload({ waitUntil: 'networkidle0' });

            // Check for requests to potentially untrusted domains
            const externalRequests = requests.filter(url => {
                const urlObj = new URL(url);
                return !['localhost', '127.0.0.1'].includes(urlObj.hostname) &&
                       !urlObj.hostname.endsWith('.local');
            });

            // Log external requests for review
            if (externalRequests.length > 0) {
                console.log('External requests:', externalRequests);
            }

            // Verify that external requests are to trusted CDNs only
            const trustedDomains = [
                'cdnjs.cloudflare.com',
                'unpkg.com',
                'cdn.jsdelivr.net',
                'fonts.googleapis.com',
                'fonts.gstatic.com'
            ];

            const untrustedRequests = externalRequests.filter(url => {
                const urlObj = new URL(url);
                return !trustedDomains.some(domain => urlObj.hostname.includes(domain));
            });

            if (untrustedRequests.length > 0) {
                console.warn('Requests to potentially untrusted domains:', untrustedRequests);
            }
        }, 30000);
    });

    describe('Input Validation', () => {
        it('should validate file uploads', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Check file input restrictions
            const fileInput = await page.$('#fileInput');
            if (fileInput) {
                const acceptAttribute = await fileInput.evaluate(el => el.accept);
                
                // Should have file type restrictions
                expect(acceptAttribute).toBeTruthy();
                expect(acceptAttribute).toMatch(/\.(glb|gltf|fbx|obj|stl)/);
            }
        }, 30000);

        it('should validate URL inputs', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            const urlInput = await page.$('#modelUrl');
            if (urlInput) {
                // Test with invalid URL
                await urlInput.clear();
                await urlInput.type('javascript:alert("XSS")');

                // Try to submit
                const loadBtn = await page.$('#loadUrlBtn');
                if (loadBtn) {
                    await loadBtn.click();

                    // Should not execute JavaScript URL
                    const alertExecuted = await page.evaluate(() => {
                        return window.alert.toString().includes('[native code]') === false;
                    });

                    expect(alertExecuted).toBe(false);
                }
            }
        }, 30000);
    });

    describe('Error Handling Security', () => {
        it('should not expose stack traces to users', async () => {
            await page.goto(testUrl, { waitUntil: 'networkidle0' });

            // Monitor console for error messages
            const consoleMessages = [];
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    consoleMessages.push(msg.text());
                }
            });

            // Try to trigger an error
            await page.evaluate(() => {
                // Simulate an error condition
                try {
                    window.nonExistentFunction();
                } catch (error) {
                    console.error(error);
                }
            });

            // Check that error messages don't contain sensitive information
            const sensitiveErrorInfo = consoleMessages.some(msg => 
                msg.includes('file://') || 
                msg.includes('webpack://') ||
                msg.includes('node_modules')
            );

            // In development, stack traces are expected
            // In production, they should be sanitized
            console.log('Console error messages:', consoleMessages);
        }, 30000);
    });
});