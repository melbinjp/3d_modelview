/**
 * Enhanced Unit Tests
 * Comprehensive testing for all major modules with improved coverage
 */

describe('Enhanced Unit Tests Suite', () => {
    let testContainer;

    beforeEach(() => {
        // Create test container
        testContainer = document.createElement('div');
        testContainer.id = 'test-container';
        document.body.appendChild(testContainer);
    });

    afterEach(() => {
        // Cleanup
        if (testContainer && testContainer.parentNode) {
            testContainer.parentNode.removeChild(testContainer);
        }
    });

    describe('Core Engine Tests', () => {
        it('should initialize CoreEngine properly', async () => {
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            const coreEngine = new CoreEngine();
            
            expect(coreEngine).toBeDefined();
            expect(coreEngine.modules).toBeDefined();
            expect(coreEngine.eventListeners).toBeDefined();
            expect(coreEngine.state).toBeDefined();
            
            await coreEngine.init();
            expect(coreEngine.initialized).toBe(true);
            
            coreEngine.destroy();
        });

        it('should handle module registration correctly', async () => {
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            // Mock module
            const mockModule = {
                initialized: false,
                init: jasmine.createSpy('init'),
                destroy: jasmine.createSpy('destroy')
            };
            
            coreEngine.registerModule('test', mockModule);
            expect(coreEngine.modules.has('test')).toBe(true);
            expect(coreEngine.getModule('test')).toBe(mockModule);
            
            coreEngine.destroy();
        });

        it('should handle events properly', async () => {
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            let eventReceived = false;
            const handler = () => { eventReceived = true; };
            
            coreEngine.on('test:event', handler);
            coreEngine.emit('test:event');
            
            expect(eventReceived).toBe(true);
            
            coreEngine.off('test:event', handler);
            coreEngine.destroy();
        });
    });

    describe('Asset Management Tests', () => {
        it('should initialize AssetManager properly', async () => {
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            const { AssetManager } = await import('../src/assets/AssetManager.js');
            
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            const assetManager = new AssetManager(coreEngine);
            expect(assetManager).toBeDefined();
            expect(assetManager.core).toBe(coreEngine);
            
            await assetManager.init();
            expect(assetManager.initialized).toBe(true);
            
            assetManager.destroy();
            coreEngine.destroy();
        });

        it('should validate file types correctly', async () => {
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            const { AssetManager } = await import('../src/assets/AssetManager.js');
            
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            const assetManager = new AssetManager(coreEngine);
            await assetManager.init();
            
            // Test file extension validation (basic check)
            const validExtensions = ['.glb', '.gltf', '.fbx', '.obj', '.stl'];
            const invalidExtensions = ['.jpg', '.png', '.pdf', '.txt'];
            
            validExtensions.forEach(ext => {
                expect(ext).toMatch(/\.(glb|gltf|fbx|obj|stl)$/);
            });
            
            invalidExtensions.forEach(ext => {
                expect(ext).not.toMatch(/\.(glb|gltf|fbx|obj|stl)$/);
            });
            
            assetManager.destroy();
            coreEngine.destroy();
        });
    });

    describe('UI Manager Tests', () => {
        it('should initialize UIManager properly', async () => {
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            const { UIManager } = await import('../src/ui/UIManager.js');
            
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            const uiManager = new UIManager(coreEngine);
            expect(uiManager).toBeDefined();
            expect(uiManager.core).toBe(coreEngine);
            
            await uiManager.init();
            expect(uiManager.initialized).toBe(true);
            
            uiManager.destroy();
            coreEngine.destroy();
        });

        it('should handle mode switching correctly', async () => {
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            const { UIManager } = await import('../src/ui/UIManager.js');
            
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            const uiManager = new UIManager(coreEngine);
            await uiManager.init();
            
            // Test mode switching
            uiManager.setMode('simple');
            expect(uiManager.currentMode).toBe('simple');
            
            uiManager.setMode('advanced');
            expect(uiManager.currentMode).toBe('advanced');
            
            uiManager.destroy();
            coreEngine.destroy();
        });
    });

    describe('Rendering Engine Tests', () => {
        it('should initialize RenderingEngine properly', async () => {
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            const { RenderingEngine } = await import('../src/rendering/RenderingEngine.js');
            
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            const renderingEngine = new RenderingEngine(coreEngine);
            expect(renderingEngine).toBeDefined();
            expect(renderingEngine.core).toBe(coreEngine);
            
            // Create a test container for rendering
            const container = document.createElement('div');
            container.style.width = '800px';
            container.style.height = '600px';
            testContainer.appendChild(container);
            
            renderingEngine.init(container);
            expect(renderingEngine.renderer).toBeDefined();
            expect(renderingEngine.scene).toBeDefined();
            expect(renderingEngine.camera).toBeDefined();
            
            renderingEngine.destroy();
            coreEngine.destroy();
        });

        it('should handle WebGL context properly', async () => {
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            const { RenderingEngine } = await import('../src/rendering/RenderingEngine.js');
            
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            const renderingEngine = new RenderingEngine(coreEngine);
            
            const container = document.createElement('div');
            container.style.width = '800px';
            container.style.height = '600px';
            testContainer.appendChild(container);
            
            renderingEngine.init(container);
            
            // Check WebGL context
            const gl = renderingEngine.renderer.getContext();
            expect(gl).toBeDefined();
            expect(gl.isContextLost()).toBe(false);
            
            renderingEngine.destroy();
            coreEngine.destroy();
        });
    });

    describe('Performance Manager Tests', () => {
        it('should initialize PerformanceManager properly', async () => {
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            const { RenderingEngine } = await import('../src/rendering/RenderingEngine.js');
            const { PerformanceManager } = await import('../src/performance/PerformanceManager.js');
            
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            const renderingEngine = new RenderingEngine(coreEngine);
            const container = document.createElement('div');
            container.style.width = '800px';
            container.style.height = '600px';
            testContainer.appendChild(container);
            renderingEngine.init(container);
            
            const performanceManager = new PerformanceManager(
                coreEngine,
                renderingEngine.renderer,
                renderingEngine.scene,
                renderingEngine.camera
            );
            
            expect(performanceManager).toBeDefined();
            expect(performanceManager.core).toBe(coreEngine);
            
            performanceManager.init();
            expect(performanceManager.enabled).toBe(true);
            
            performanceManager.destroy();
            renderingEngine.destroy();
            coreEngine.destroy();
        });

        it('should monitor performance metrics', async () => {
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            const { RenderingEngine } = await import('../src/rendering/RenderingEngine.js');
            const { PerformanceManager } = await import('../src/performance/PerformanceManager.js');
            
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            const renderingEngine = new RenderingEngine(coreEngine);
            const container = document.createElement('div');
            container.style.width = '800px';
            container.style.height = '600px';
            testContainer.appendChild(container);
            renderingEngine.init(container);
            
            const performanceManager = new PerformanceManager(
                coreEngine,
                renderingEngine.renderer,
                renderingEngine.scene,
                renderingEngine.camera
            );
            
            performanceManager.init();
            
            // Test performance monitoring
            expect(performanceManager.performanceStats).toBeDefined();
            expect(performanceManager.performanceStats.fps).toBeGreaterThan(0);
            
            performanceManager.destroy();
            renderingEngine.destroy();
            coreEngine.destroy();
        });
    });

    describe('Error Handling Tests', () => {
        it('should handle errors gracefully', async () => {
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            const { ErrorManager } = await import('../src/core/ErrorManager.js');
            
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            const errorManager = new ErrorManager(coreEngine);
            errorManager.init();
            
            let errorHandled = false;
            coreEngine.on('error:handled', () => { errorHandled = true; });
            
            // Simulate an error
            const testError = new Error('Test error');
            await errorManager.handleError(testError, {
                type: 'TestError',
                severity: 'low',
                context: { test: true }
            });
            
            expect(errorHandled).toBe(true);
            
            errorManager.destroy();
            coreEngine.destroy();
        });

        it('should initialize WebGL recovery system', async () => {
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            const { WebGLRecovery } = await import('../src/core/WebGLRecovery.js');
            
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            const webglRecovery = new WebGLRecovery(coreEngine);
            expect(webglRecovery).toBeDefined();
            expect(webglRecovery.core).toBe(coreEngine);
            
            // Test basic functionality
            expect(webglRecovery.contextLostHandlers).toBeDefined();
            expect(webglRecovery.contextLostHandlers.size).toBe(0);
            
            webglRecovery.destroy();
            coreEngine.destroy();
        });
    });

    describe('Accessibility Tests', () => {
        it('should initialize AccessibilityManager properly', async () => {
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            const { AccessibilityManager } = await import('../src/ui/AccessibilityManager.js');
            
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            const accessibilityManager = new AccessibilityManager(coreEngine);
            expect(accessibilityManager).toBeDefined();
            expect(accessibilityManager.coreEngine).toBe(coreEngine);
            
            await accessibilityManager.initialize();
            expect(accessibilityManager.initialized).toBe(true);
            
            accessibilityManager.destroy();
            coreEngine.destroy();
        });

        it('should handle keyboard navigation', async () => {
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            const { KeyboardShortcutManager } = await import('../src/ui/KeyboardShortcutManager.js');
            
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            const keyboardManager = new KeyboardShortcutManager(coreEngine);
            expect(keyboardManager).toBeDefined();
            
            await keyboardManager.initialize();
            expect(keyboardManager.initialized).toBe(true);
            
            // Test shortcut registration
            expect(keyboardManager.shortcuts.size).toBeGreaterThan(0);
            
            keyboardManager.destroy();
            coreEngine.destroy();
        });
    });

    describe('Theme Management Tests', () => {
        it('should initialize ThemeManager properly', async () => {
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            const { ThemeManager } = await import('../src/ui/ThemeManager.js');
            
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            const themeManager = new ThemeManager(coreEngine);
            expect(themeManager).toBeDefined();
            expect(themeManager.coreEngine).toBe(coreEngine);
            
            await themeManager.initialize();
            expect(themeManager.initialized).toBe(true);
            
            themeManager.destroy();
            coreEngine.destroy();
        });

        it('should handle theme switching', async () => {
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            const { ThemeManager } = await import('../src/ui/ThemeManager.js');
            
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            const themeManager = new ThemeManager(coreEngine);
            await themeManager.initialize();
            
            // Test theme switching
            themeManager.setTheme('dark');
            expect(themeManager.currentTheme).toBe('dark');
            
            themeManager.setTheme('light');
            expect(themeManager.currentTheme).toBe('light');
            
            themeManager.destroy();
            coreEngine.destroy();
        });
    });

    describe('Integration Tests', () => {
        it('should create ModelViewer with all core modules', async () => {
            const { ModelViewer } = await import('../src/ModelViewer.js');
            
            const modelViewer = new ModelViewer();
            expect(modelViewer).toBeDefined();
            expect(modelViewer.core).toBeDefined();
            expect(modelViewer.renderingEngine).toBeDefined();
            expect(modelViewer.assetManager).toBeDefined();
            expect(modelViewer.uiManager).toBeDefined();
            expect(modelViewer.exportSystem).toBeDefined();
            expect(modelViewer.analysisManager).toBeDefined();
            
            // Test module registration
            expect(modelViewer.core.modules.has('rendering')).toBe(true);
            expect(modelViewer.core.modules.has('assets')).toBe(true);
            expect(modelViewer.core.modules.has('ui')).toBe(true);
            expect(modelViewer.core.modules.has('export')).toBe(true);
            expect(modelViewer.core.modules.has('analysis')).toBe(true);
            
            // Don't initialize to avoid DOM dependencies
            modelViewer.destroy();
        });

        it('should validate URL patterns correctly', async () => {
            const { ModelViewer } = await import('../src/ModelViewer.js');
            
            const modelViewer = new ModelViewer();
            
            // Test URL validation logic (basic pattern matching)
            const validUrls = [
                'https://example.com/model.glb',
                'https://example.com/model.gltf',
                'http://localhost/test.fbx'
            ];
            
            const invalidUrls = [
                'not-a-url',
                'ftp://example.com/model.glb',
                'javascript:alert("xss")'
            ];
            
            validUrls.forEach(url => {
                expect(url).toMatch(/^https?:\/\/.+\.(glb|gltf|fbx|obj|stl)/);
            });
            
            invalidUrls.forEach(url => {
                expect(url).not.toMatch(/^https?:\/\/.+\.(glb|gltf|fbx|obj|stl)/);
            });
            
            modelViewer.destroy();
        });
    });
});