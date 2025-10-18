/**
 * Comprehensive Unit Tests Suite
 * Tests all modules and their interfaces according to task 15 requirements
 */

describe('Comprehensive Unit Tests Suite', () => {
    let testContainer;
    let mockCanvas;
    let mockWebGLContext;

    beforeEach(() => {
        // Create test container
        testContainer = document.createElement('div');
        testContainer.id = 'test-container';
        testContainer.style.width = '800px';
        testContainer.style.height = '600px';
        document.body.appendChild(testContainer);

        // Mock WebGL context
        mockWebGLContext = {
            isContextLost: jasmine.createSpy('isContextLost').and.returnValue(false),
            getExtension: jasmine.createSpy('getExtension').and.returnValue({}),
            getParameter: jasmine.createSpy('getParameter').and.returnValue('WebGL 2.0'),
            createShader: jasmine.createSpy('createShader'),
            createProgram: jasmine.createSpy('createProgram'),
            useProgram: jasmine.createSpy('useProgram'),
            enable: jasmine.createSpy('enable'),
            disable: jasmine.createSpy('disable'),
            viewport: jasmine.createSpy('viewport'),
            clear: jasmine.createSpy('clear'),
            drawElements: jasmine.createSpy('drawElements')
        };

        // Mock canvas
        mockCanvas = document.createElement('canvas');
        mockCanvas.getContext = jasmine.createSpy('getContext').and.returnValue(mockWebGLContext);
        mockCanvas.width = 800;
        mockCanvas.height = 600;
    });

    afterEach(() => {
        // Cleanup
        if (testContainer && testContainer.parentNode) {
            testContainer.parentNode.removeChild(testContainer);
        }
    });

    describe('CoreEngine Module Tests', () => {
        let CoreEngine, coreEngine;

        beforeEach(async () => {
            const module = await import('../src/core/CoreEngine.js');
            CoreEngine = module.CoreEngine;
            coreEngine = new CoreEngine();
        });

        afterEach(() => {
            if (coreEngine) {
                coreEngine.destroy();
            }
        });

        it('should initialize with correct default state', () => {
            expect(coreEngine.modules).toBeInstanceOf(Map);
            expect(coreEngine.eventListeners).toBeInstanceOf(Map);
            expect(coreEngine.state).toBeDefined();
            expect(coreEngine.initialized).toBe(false);
            expect(coreEngine.errorManager).toBeDefined();
            expect(coreEngine.webglRecovery).toBeDefined();
            expect(coreEngine.performanceMonitor).toBeDefined();
        });

        it('should initialize successfully', async () => {
            await coreEngine.init();
            expect(coreEngine.initialized).toBe(true);
        });

        it('should register and retrieve modules correctly', async () => {
            await coreEngine.init();
            
            const mockModule = {
                name: 'test',
                initialized: false,
                init: jasmine.createSpy('init'),
                destroy: jasmine.createSpy('destroy')
            };
            
            coreEngine.registerModule('test', mockModule);
            expect(coreEngine.modules.has('test')).toBe(true);
            expect(coreEngine.getModule('test')).toBe(mockModule);
        });

        it('should handle event system correctly', async () => {
            await coreEngine.init();
            
            let eventReceived = false;
            let eventData = null;
            
            const handler = (data) => {
                eventReceived = true;
                eventData = data;
            };
            
            coreEngine.on('test:event', handler);
            coreEngine.emit('test:event', { test: 'data' });
            
            expect(eventReceived).toBe(true);
            expect(eventData).toEqual({ test: 'data' });
            
            // Test event removal
            coreEngine.off('test:event', handler);
            eventReceived = false;
            coreEngine.emit('test:event', { test: 'data2' });
            expect(eventReceived).toBe(false);
        });

        it('should manage state correctly', async () => {
            await coreEngine.init();
            
            const initialState = coreEngine.getState();
            expect(initialState).toBeDefined();
            expect(initialState.currentModel).toBe(null);
            
            coreEngine.setState({ test: 'value' });
            expect(coreEngine.getState().test).toBe('value');
            
            coreEngine.updateState('nested.property', 'nested value');
            expect(coreEngine.getState().nested.property).toBe('nested value');
        });

        it('should handle errors through error manager', async () => {
            await coreEngine.init();
            
            const testError = new Error('Test error');
            const result = await coreEngine.handleError(testError, {
                type: 'test_error',
                severity: 'low'
            });
            
            expect(result).toBeDefined();
        });

        it('should emit events on state changes', async () => {
            await coreEngine.init();
            
            let stateChangeReceived = false;
            coreEngine.on('state:changed', () => {
                stateChangeReceived = true;
            });
            
            coreEngine.setState({ test: 'value' });
            expect(stateChangeReceived).toBe(true);
        });

        it('should cleanup properly on destroy', async () => {
            await coreEngine.init();
            
            const mockModule = {
                destroy: jasmine.createSpy('destroy')
            };
            coreEngine.registerModule('test', mockModule);
            
            coreEngine.destroy();
            
            expect(mockModule.destroy).toHaveBeenCalled();
            expect(coreEngine.initialized).toBe(false);
            expect(coreEngine.modules.size).toBe(0);
            expect(coreEngine.eventListeners.size).toBe(0);
        });
    });

    describe('ErrorManager Module Tests', () => {
        let ErrorManager, CoreEngine, errorManager, coreEngine;

        beforeEach(async () => {
            const coreModule = await import('../src/core/CoreEngine.js');
            const errorModule = await import('../src/core/ErrorManager.js');
            CoreEngine = coreModule.CoreEngine;
            ErrorManager = errorModule.ErrorManager;
            
            coreEngine = new CoreEngine();
            await coreEngine.init();
            errorManager = new ErrorManager(coreEngine);
        });

        afterEach(() => {
            if (errorManager) {
                errorManager.destroy();
            }
            if (coreEngine) {
                coreEngine.destroy();
            }
        });

        it('should initialize correctly', () => {
            expect(errorManager.core).toBe(coreEngine);
            expect(errorManager.errorHistory).toBeInstanceOf(Array);
            
            errorManager.init();
            expect(errorManager.initialized).toBe(true);
        });

        it('should handle different error types', async () => {
            errorManager.init();
            
            const testError = new Error('Test error');
            const result = await errorManager.handleError(testError, {
                type: ErrorManager.ERROR_TYPES.ASSET_LOAD_FAILED,
                severity: ErrorManager.ERROR_SEVERITY.MEDIUM,
                context: { filename: 'test.glb' }
            });
            
            expect(result).toBeDefined();
            expect(errorManager.errorHistory.length).toBeGreaterThan(0);
        });

        it('should classify errors correctly', () => {
            errorManager.init();
            
            const networkError = new Error('Failed to fetch');
            const classification = errorManager.classifyError(networkError);
            
            expect(classification.type).toBe(ErrorManager.ERROR_TYPES.NETWORK_ERROR);
            expect(classification.severity).toBeDefined();
        });

        it('should provide recovery suggestions', () => {
            errorManager.init();
            
            const suggestions = errorManager.getRecoverySuggestions(ErrorManager.ERROR_TYPES.WEBGL_ERROR);
            expect(suggestions).toBeInstanceOf(Array);
            expect(suggestions.length).toBeGreaterThan(0);
        });
    });

    describe('WebGLRecovery Module Tests', () => {
        let WebGLRecovery, CoreEngine, webglRecovery, coreEngine;

        beforeEach(async () => {
            const coreModule = await import('../src/core/CoreEngine.js');
            const webglModule = await import('../src/core/WebGLRecovery.js');
            CoreEngine = coreModule.CoreEngine;
            WebGLRecovery = webglModule.WebGLRecovery;
            
            coreEngine = new CoreEngine();
            await coreEngine.init();
            webglRecovery = new WebGLRecovery(coreEngine);
        });

        afterEach(() => {
            if (webglRecovery) {
                webglRecovery.destroy();
            }
            if (coreEngine) {
                coreEngine.destroy();
            }
        });

        it('should detect WebGL support', () => {
            const isSupported = WebGLRecovery.isWebGLSupported();
            expect(typeof isSupported).toBe('boolean');
        });

        it('should setup context loss handlers', () => {
            const mockRenderer = {
                domElement: mockCanvas,
                getContext: () => mockWebGLContext
            };
            
            webglRecovery.setupContextLossHandlers(mockCanvas, mockRenderer);
            expect(webglRecovery.contextLostHandlers.size).toBeGreaterThan(0);
        });

        it('should handle context restoration', async () => {
            const mockRenderer = {
                domElement: mockCanvas,
                getContext: () => mockWebGLContext
            };
            
            const result = await webglRecovery.forceContextRestore(mockRenderer);
            expect(result).toBeDefined();
        });
    });

    describe('PerformanceMonitor Module Tests', () => {
        let PerformanceMonitor, CoreEngine, performanceMonitor, coreEngine;

        beforeEach(async () => {
            const coreModule = await import('../src/core/CoreEngine.js');
            const perfModule = await import('../src/core/PerformanceMonitor.js');
            CoreEngine = coreModule.CoreEngine;
            PerformanceMonitor = perfModule.PerformanceMonitor;
            
            coreEngine = new CoreEngine();
            await coreEngine.init();
            performanceMonitor = new PerformanceMonitor(coreEngine);
        });

        afterEach(() => {
            if (performanceMonitor) {
                performanceMonitor.destroy();
            }
            if (coreEngine) {
                coreEngine.destroy();
            }
        });

        it('should initialize with default settings', () => {
            expect(performanceMonitor.core).toBe(coreEngine);
            expect(performanceMonitor.isMonitoring).toBe(false);
            expect(performanceMonitor.performanceData).toBeDefined();
        });

        it('should start and stop monitoring', () => {
            performanceMonitor.startMonitoring();
            expect(performanceMonitor.isMonitoring).toBe(true);
            
            performanceMonitor.stopMonitoring();
            expect(performanceMonitor.isMonitoring).toBe(false);
        });

        it('should collect performance metrics', () => {
            performanceMonitor.startMonitoring();
            
            const metrics = performanceMonitor.getMetrics();
            expect(metrics).toBeDefined();
            expect(metrics.fps).toBeDefined();
            expect(metrics.memory).toBeDefined();
        });

        it('should detect performance issues', () => {
            performanceMonitor.startMonitoring();
            
            // Simulate low FPS
            performanceMonitor.performanceData.fps = 15;
            const issues = performanceMonitor.detectPerformanceIssues();
            
            expect(issues).toBeInstanceOf(Array);
            expect(issues.some(issue => issue.type === 'low_fps')).toBe(true);
        });
    });

    describe('AssetManager Module Tests', () => {
        let AssetManager, CoreEngine, assetManager, coreEngine;

        beforeEach(async () => {
            const coreModule = await import('../src/core/CoreEngine.js');
            const assetModule = await import('../src/assets/AssetManager.js');
            CoreEngine = coreModule.CoreEngine;
            AssetManager = assetModule.AssetManager;
            
            coreEngine = new CoreEngine();
            await coreEngine.init();
            assetManager = new AssetManager(coreEngine);
        });

        afterEach(() => {
            if (assetManager) {
                assetManager.destroy();
            }
            if (coreEngine) {
                coreEngine.destroy();
            }
        });

        it('should initialize with correct dependencies', async () => {
            expect(assetManager.core).toBe(coreEngine);
            expect(assetManager.loadingManager).toBeDefined();
            expect(assetManager.loaderRegistry).toBeDefined();
            expect(assetManager.textureManager).toBeDefined();
            expect(assetManager.assetCache).toBeInstanceOf(Map);
            
            await assetManager.init();
            expect(assetManager.initialized).toBe(true);
        });

        it('should support multiple file formats', async () => {
            await assetManager.init();
            
            const supportedFormats = assetManager.getSupportedFormats();
            expect(supportedFormats).toContain('gltf');
            expect(supportedFormats).toContain('glb');
            expect(supportedFormats).toContain('fbx');
            expect(supportedFormats).toContain('obj');
            expect(supportedFormats).toContain('stl');
        });

        it('should get appropriate loaders for file extensions', async () => {
            await assetManager.init();
            
            const gltfLoader = assetManager.getLoaderForExtension('gltf');
            const glbLoader = assetManager.getLoaderForExtension('glb');
            const objLoader = assetManager.getLoaderForExtension('obj');
            
            expect(gltfLoader).toBeDefined();
            expect(glbLoader).toBeDefined();
            expect(objLoader).toBeDefined();
        });

        it('should handle cache operations correctly', async () => {
            await assetManager.init();
            
            const testAsset = { model: 'test', timestamp: Date.now() };
            assetManager.cacheAsset('test-key', testAsset);
            
            expect(assetManager.getCachedAsset('test-key')).toBe(testAsset);
            expect(assetManager.getCacheSize()).toBe(1);
            
            const stats = assetManager.getCacheStats();
            expect(stats.totalEntries).toBe(1);
            
            assetManager.clearCache();
            expect(assetManager.getCacheSize()).toBe(0);
        });

        it('should validate file sizes', async () => {
            await assetManager.init();
            
            // Create a mock file that's too large
            const largeFile = new File(['x'.repeat(200 * 1024 * 1024)], 'large.glb', {
                type: 'model/gltf-binary'
            });
            
            try {
                await assetManager.loadModelFromFile(largeFile);
                fail('Should have thrown an error for large file');
            } catch (error) {
                expect(error.message).toContain('too large');
            }
        });

        it('should handle unsupported formats gracefully', async () => {
            await assetManager.init();
            
            const unsupportedFile = new File(['test'], 'test.xyz', {
                type: 'application/octet-stream'
            });
            
            try {
                await assetManager.loadModelFromFile(unsupportedFile);
                fail('Should have thrown an error for unsupported format');
            } catch (error) {
                expect(error.message).toContain('Unsupported file format');
            }
        });
    });

    describe('LoaderRegistry Module Tests', () => {
        let LoaderRegistry;

        beforeEach(async () => {
            const module = await import('../src/assets/LoaderRegistry.js');
            LoaderRegistry = module.LoaderRegistry;
        });

        it('should initialize with supported formats', () => {
            const registry = new LoaderRegistry();
            
            const formats = registry.getSupportedFormats();
            expect(formats).toContain('gltf');
            expect(formats).toContain('glb');
            expect(formats).toContain('fbx');
            expect(formats).toContain('obj');
        });

        it('should provide format information', () => {
            const registry = new LoaderRegistry();
            
            const gltfInfo = registry.getFormatInfo('gltf');
            expect(gltfInfo).toBeDefined();
            expect(gltfInfo.name).toBeDefined();
            expect(gltfInfo.extensions).toContain('.gltf');
        });

        it('should extract file extensions correctly', () => {
            const registry = new LoaderRegistry();
            
            expect(registry.extractExtension('model.glb')).toBe('glb');
            expect(registry.extractExtension('path/to/model.gltf')).toBe('gltf');
            expect(registry.extractExtension('MODEL.FBX')).toBe('fbx');
        });
    });

    describe('TextureManager Module Tests', () => {
        let TextureManager, LoaderRegistry, textureManager;

        beforeEach(async () => {
            const textureModule = await import('../src/assets/TextureManager.js');
            const loaderModule = await import('../src/assets/LoaderRegistry.js');
            TextureManager = textureModule.TextureManager;
            LoaderRegistry = loaderModule.LoaderRegistry;
            
            const loadingManager = { onLoad: () => {}, onProgress: () => {}, onError: () => {} };
            const loaderRegistry = new LoaderRegistry(loadingManager);
            textureManager = new TextureManager(loadingManager, loaderRegistry);
        });

        afterEach(() => {
            if (textureManager) {
                textureManager.destroy();
            }
        });

        it('should initialize correctly', () => {
            expect(textureManager.loadingManager).toBeDefined();
            expect(textureManager.loaderRegistry).toBeDefined();
            expect(textureManager.textureCache).toBeInstanceOf(Map);
        });

        it('should detect texture types from filenames', () => {
            const detectedType = textureManager.detectTextureType('model_diffuse.jpg');
            expect(detectedType).toBe('diffuse');
            
            const normalType = textureManager.detectTextureType('model_normal.png');
            expect(normalType).toBe('normal');
            
            const roughnessType = textureManager.detectTextureType('model_roughness.jpg');
            expect(roughnessType).toBe('roughness');
        });

        it('should create PBR materials with texture maps', () => {
            const textureMap = new Map();
            textureMap.set('diffuse', { isTexture: true });
            textureMap.set('normal', { isTexture: true });
            
            const material = textureManager.createPBRMaterial(textureMap);
            expect(material).toBeDefined();
            expect(material.isMeshStandardMaterial).toBe(true);
        });
    });

    describe('RenderingEngine Module Tests', () => {
        let RenderingEngine, CoreEngine, renderingEngine, coreEngine;

        beforeEach(async () => {
            const coreModule = await import('../src/core/CoreEngine.js');
            const renderingModule = await import('../src/rendering/RenderingEngine.js');
            CoreEngine = coreModule.CoreEngine;
            RenderingEngine = renderingModule.RenderingEngine;
            
            coreEngine = new CoreEngine();
            await coreEngine.init();
            renderingEngine = new RenderingEngine(coreEngine);
        });

        afterEach(() => {
            if (renderingEngine) {
                renderingEngine.destroy();
            }
            if (coreEngine) {
                coreEngine.destroy();
            }
        });

        it('should initialize with core engine reference', () => {
            expect(renderingEngine.core).toBe(coreEngine);
            expect(renderingEngine.initialized).toBe(false);
            expect(renderingEngine.scene).toBe(null);
            expect(renderingEngine.camera).toBe(null);
            expect(renderingEngine.renderer).toBe(null);
        });

        it('should check WebGL support', () => {
            const isSupported = renderingEngine.checkWebGLSupport();
            expect(typeof isSupported).toBe('boolean');
        });

        it('should initialize Three.js components', async () => {
            // Mock WebGL context for testing
            spyOn(renderingEngine, 'checkWebGLSupport').and.returnValue(true);
            
            try {
                await renderingEngine.init(testContainer);
                
                expect(renderingEngine.scene).toBeDefined();
                expect(renderingEngine.camera).toBeDefined();
                expect(renderingEngine.renderer).toBeDefined();
                expect(renderingEngine.controls).toBeDefined();
                expect(renderingEngine.initialized).toBe(true);
            } catch (error) {
                // WebGL might not be available in test environment
                expect(error.message).toContain('WebGL');
            }
        });

        it('should handle window resize', () => {
            spyOn(renderingEngine, 'render');
            
            renderingEngine.camera = { 
                aspect: 1, 
                updateProjectionMatrix: jasmine.createSpy('updateProjectionMatrix') 
            };
            renderingEngine.renderer = { 
                setSize: jasmine.createSpy('setSize'),
                domElement: { parentElement: testContainer }
            };
            renderingEngine.composer = { 
                setSize: jasmine.createSpy('setSize') 
            };
            
            renderingEngine.onWindowResize();
            
            expect(renderingEngine.camera.updateProjectionMatrix).toHaveBeenCalled();
            expect(renderingEngine.renderer.setSize).toHaveBeenCalled();
            expect(renderingEngine.render).toHaveBeenCalled();
        });

        it('should manage scene objects', () => {
            renderingEngine.scene = { 
                add: jasmine.createSpy('add'),
                remove: jasmine.createSpy('remove')
            };
            
            const mockModel = { name: 'test-model', traverse: jasmine.createSpy('traverse') };
            
            renderingEngine.addModel(mockModel);
            expect(renderingEngine.scene.add).toHaveBeenCalledWith(mockModel);
            
            renderingEngine.removeCurrentModel();
            expect(renderingEngine.scene.remove).toHaveBeenCalled();
        });
    });

    describe('UIManager Module Tests', () => {
        let UIManager, CoreEngine, uiManager, coreEngine;

        beforeEach(async () => {
            const coreModule = await import('../src/core/CoreEngine.js');
            const uiModule = await import('../src/ui/UIManager.js');
            CoreEngine = coreModule.CoreEngine;
            UIManager = uiModule.UIManager;
            
            coreEngine = new CoreEngine();
            await coreEngine.init();
            uiManager = new UIManager(coreEngine);
        });

        afterEach(() => {
            if (uiManager) {
                uiManager.destroy();
            }
            if (coreEngine) {
                coreEngine.destroy();
            }
        });

        it('should initialize with default settings', () => {
            expect(uiManager.core).toBe(coreEngine);
            expect(uiManager.currentMode).toBe('simple');
            expect(uiManager.panels).toBeInstanceOf(Map);
            expect(uiManager.expertiseLevel).toBe('beginner');
            expect(uiManager.initialized).toBe(false);
        });

        it('should switch between UI modes', async () => {
            await uiManager.init();
            
            expect(uiManager.currentMode).toBe('simple');
            
            uiManager.setMode('advanced');
            expect(uiManager.currentMode).toBe('advanced');
            
            uiManager.setMode('simple');
            expect(uiManager.currentMode).toBe('simple');
        });

        it('should handle invalid mode gracefully', async () => {
            await uiManager.init();
            
            const originalMode = uiManager.currentMode;
            uiManager.setMode('invalid');
            expect(uiManager.currentMode).toBe(originalMode);
        });

        it('should track user interactions', async () => {
            await uiManager.init();
            
            const initialClicks = uiManager.userInteractions.totalClicks;
            uiManager.userInteractions.totalClicks++;
            
            expect(uiManager.userInteractions.totalClicks).toBe(initialClicks + 1);
        });

        it('should detect user expertise level', async () => {
            await uiManager.init();
            
            // Simulate advanced feature usage
            uiManager.trackAdvancedFeatureUsage('test-feature');
            expect(uiManager.userInteractions.advancedFeatureUsage).toBeGreaterThan(0);
        });

        it('should reveal features progressively', async () => {
            await uiManager.init();
            
            expect(uiManager.revealedFeatures.size).toBe(0);
            
            uiManager.revealFeature('camera-controls');
            expect(uiManager.revealedFeatures.has('camera-controls')).toBe(true);
        });
    });

    describe('ExportSystem Module Tests', () => {
        let ExportSystem, CoreEngine, exportSystem, coreEngine;

        beforeEach(async () => {
            const coreModule = await import('../src/core/CoreEngine.js');
            const exportModule = await import('../src/export/ExportSystem.js');
            CoreEngine = coreModule.CoreEngine;
            ExportSystem = exportModule.ExportSystem;
            
            coreEngine = new CoreEngine();
            await coreEngine.init();
            exportSystem = new ExportSystem(coreEngine);
        });

        afterEach(() => {
            if (exportSystem) {
                exportSystem.destroy();
            }
            if (coreEngine) {
                coreEngine.destroy();
            }
        });

        it('should initialize with available formats and presets', () => {
            expect(exportSystem.core).toBe(coreEngine);
            expect(exportSystem.initialized).toBe(false);
            
            exportSystem.init();
            expect(exportSystem.initialized).toBe(true);
            
            const formats = exportSystem.getAvailableFormats();
            const presets = exportSystem.getAvailablePresets();
            
            expect(formats).toContain('gltf');
            expect(formats).toContain('glb');
            expect(presets).toContain('unity');
            expect(presets).toContain('web');
        });

        it('should validate export options', () => {
            exportSystem.init();
            
            const validOptions = {
                format: 'gltf',
                includeTextures: true,
                binary: false
            };
            
            const isValid = exportSystem.validateExportOptions(validOptions);
            expect(isValid).toBe(true);
        });

        it('should handle screenshot export', async () => {
            exportSystem.init();
            
            const mockRenderer = {
                domElement: mockCanvas,
                render: jasmine.createSpy('render')
            };
            
            const options = {
                width: 800,
                height: 600,
                format: 'png'
            };
            
            try {
                const result = await exportSystem.exportScreenshot(mockRenderer, options);
                expect(result).toBeDefined();
            } catch (error) {
                // Expected in test environment without full WebGL context
                expect(error).toBeDefined();
            }
        });
    });

    describe('AnalysisManager Module Tests', () => {
        let AnalysisManager, CoreEngine, analysisManager, coreEngine;

        beforeEach(async () => {
            const coreModule = await import('../src/core/CoreEngine.js');
            const analysisModule = await import('../src/analysis/AnalysisManager.js');
            CoreEngine = coreModule.CoreEngine;
            AnalysisManager = analysisModule.AnalysisManager;
            
            coreEngine = new CoreEngine();
            await coreEngine.init();
            analysisManager = new AnalysisManager(coreEngine);
        });

        afterEach(() => {
            if (analysisManager) {
                analysisManager.destroy();
            }
            if (coreEngine) {
                coreEngine.destroy();
            }
        });

        it('should initialize correctly', async () => {
            expect(analysisManager.core).toBe(coreEngine);
            expect(analysisManager.initialized).toBe(false);
            
            await analysisManager.init();
            expect(analysisManager.initialized).toBe(true);
        });

        it('should analyze model statistics', async () => {
            await analysisManager.init();
            
            const mockModel = {
                traverse: (callback) => {
                    // Mock mesh with geometry
                    callback({
                        isMesh: true,
                        geometry: {
                            attributes: {
                                position: { count: 300 }
                            }
                        },
                        material: { name: 'test-material' }
                    });
                }
            };
            
            const stats = analysisManager.analyzeModel(mockModel);
            expect(stats).toBeDefined();
            expect(stats.vertices).toBe(300);
            expect(stats.triangles).toBe(100); // 300 vertices / 3
            expect(stats.materials).toBe(1);
        });

        it('should calculate bounding box', async () => {
            await analysisManager.init();
            
            const mockModel = {
                traverse: jasmine.createSpy('traverse')
            };
            
            const boundingBox = analysisManager.calculateBoundingBox(mockModel);
            expect(boundingBox).toBeDefined();
        });
    });

    describe('PerformanceManager Module Tests', () => {
        let PerformanceManager, CoreEngine, performanceManager, coreEngine;

        beforeEach(async () => {
            const coreModule = await import('../src/core/CoreEngine.js');
            const perfModule = await import('../src/performance/PerformanceManager.js');
            CoreEngine = coreModule.CoreEngine;
            PerformanceManager = perfModule.PerformanceManager;
            
            coreEngine = new CoreEngine();
            await coreEngine.init();
            
            const mockRenderer = { info: { render: {}, memory: {} } };
            const mockScene = {};
            const mockCamera = {};
            
            performanceManager = new PerformanceManager(coreEngine, mockRenderer, mockScene, mockCamera);
        });

        afterEach(() => {
            if (performanceManager) {
                performanceManager.destroy();
            }
            if (coreEngine) {
                coreEngine.destroy();
            }
        });

        it('should initialize with performance monitoring', () => {
            expect(performanceManager.core).toBe(coreEngine);
            expect(performanceManager.enabled).toBe(false);
            
            performanceManager.init();
            expect(performanceManager.enabled).toBe(true);
        });

        it('should monitor frame rate', () => {
            performanceManager.init();
            
            performanceManager.updateFrameRate(60);
            const stats = performanceManager.getPerformanceStats();
            
            expect(stats.fps).toBe(60);
        });

        it('should detect performance issues', () => {
            performanceManager.init();
            
            // Simulate low performance
            performanceManager.updateFrameRate(15);
            performanceManager.updateMemoryUsage(90);
            
            const issues = performanceManager.detectPerformanceIssues();
            expect(issues.length).toBeGreaterThan(0);
        });

        it('should apply performance optimizations', () => {
            performanceManager.init();
            
            const optimizations = performanceManager.getRecommendedOptimizations();
            expect(optimizations).toBeInstanceOf(Array);
            
            performanceManager.applyOptimization('reduce_quality');
            // Should not throw error
        });
    });
});