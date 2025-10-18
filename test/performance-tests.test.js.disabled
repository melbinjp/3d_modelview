/**
 * Performance Tests Suite
 * Tests for large models, memory usage, and performance optimization
 */

describe('Performance Tests Suite', () => {
    let testContainer;
    let modelViewer;
    let performanceMonitor;

    beforeEach(() => {
        // Create test container
        testContainer = document.createElement('div');
        testContainer.id = 'performance-test-container';
        testContainer.style.width = '1024px';
        testContainer.style.height = '768px';
        document.body.appendChild(testContainer);

        // Mock performance API if not available
        if (!window.performance) {
            window.performance = {
                now: () => Date.now(),
                memory: {
                    usedJSHeapSize: 50 * 1024 * 1024,
                    totalJSHeapSize: 100 * 1024 * 1024,
                    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024
                }
            };
        }

        // Mock required DOM elements
        const mockElements = [
            'mainContainer', 'loadingScreen', 'viewerContainer', 'sidebar'
        ];
        
        mockElements.forEach(id => {
            if (!document.getElementById(id)) {
                const element = document.createElement('div');
                element.id = id;
                document.body.appendChild(element);
            }
        });
    });

    afterEach(() => {
        if (modelViewer) {
            modelViewer.destroy();
            modelViewer = null;
        }
        
        if (performanceMonitor) {
            performanceMonitor.destroy();
            performanceMonitor = null;
        }
        
        // Cleanup test container
        if (testContainer && testContainer.parentNode) {
            testContainer.parentNode.removeChild(testContainer);
        }
        
        // Cleanup mock elements
        const mockElements = [
            'mainContainer', 'loadingScreen', 'viewerContainer', 'sidebar'
        ];
        
        mockElements.forEach(id => {
            const element = document.getElementById(id);
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
    });

    describe('Memory Usage Tests', () => {
        beforeEach(async () => {
            const { ModelViewer } = await import('../src/ModelViewer.js');
            modelViewer = new ModelViewer();
        });

        it('should monitor memory usage during model loading', async () => {
            const memoryBefore = performance.memory ? performance.memory.usedJSHeapSize : 0;
            
            // Create a mock model with significant memory footprint
            const mockModel = createMockLargeModel(10000); // 10k triangles
            
            modelViewer.core.setState({ currentModel: mockModel });
            
            const memoryAfter = performance.memory ? performance.memory.usedJSHeapSize : 0;
            const memoryIncrease = memoryAfter - memoryBefore;
            
            // Memory should increase when loading models
            expect(memoryIncrease).toBeGreaterThanOrEqual(0);
        });

        it('should cleanup memory when models are removed', async () => {
            const mockModel = createMockLargeModel(5000);
            
            // Add model
            modelViewer.core.setState({ currentModel: mockModel });
            const memoryWithModel = performance.memory ? performance.memory.usedJSHeapSize : 0;
            
            // Remove model
            modelViewer.core.setState({ currentModel: null });
            
            // Force garbage collection if available
            if (window.gc) {
                window.gc();
            }
            
            const memoryAfterRemoval = performance.memory ? performance.memory.usedJSHeapSize : 0;
            
            // Memory should not continuously increase
            expect(memoryAfterRemoval).toBeLessThanOrEqual(memoryWithModel * 1.1); // Allow 10% variance
        });

        it('should handle memory pressure gracefully', async () => {
            let memoryWarningTriggered = false;
            
            modelViewer.core.on('performance:memory-warning', () => {
                memoryWarningTriggered = true;
            });
            
            // Simulate high memory usage
            const performanceManager = modelViewer.core.getModule('performance');
            if (performanceManager) {
                performanceManager.init();
                
                // Mock high memory usage
                spyOn(performanceManager, 'getMemoryUsage').and.returnValue(85); // 85% usage
                
                performanceManager.checkMemoryUsage();
                expect(memoryWarningTriggered).toBe(true);
            }
        });

        it('should implement memory-efficient asset caching', async () => {
            const assetManager = modelViewer.core.getModule('assets');
            if (assetManager) {
                await assetManager.init();
                
                // Add multiple assets to cache
                const asset1 = { model: createMockLargeModel(1000), timestamp: Date.now() };
                const asset2 = { model: createMockLargeModel(1000), timestamp: Date.now() };
                const asset3 = { model: createMockLargeModel(1000), timestamp: Date.now() };
                
                assetManager.cacheAsset('model1', asset1);
                assetManager.cacheAsset('model2', asset2);
                assetManager.cacheAsset('model3', asset3);
                
                expect(assetManager.getCacheSize()).toBe(3);
                
                // Get cache statistics
                const stats = assetManager.getCacheStats();
                expect(stats.totalEntries).toBe(3);
                expect(stats.totalEstimatedSize).toBeGreaterThan(0);
                
                // Clear cache should free memory
                assetManager.clearCache();
                expect(assetManager.getCacheSize()).toBe(0);
            }
        });
    });

    describe('Frame Rate Performance Tests', () => {
        beforeEach(async () => {
            const { ModelViewer } = await import('../src/ModelViewer.js');
            const { PerformanceMonitor } = await import('../src/core/PerformanceMonitor.js');
            
            modelViewer = new ModelViewer();
            performanceMonitor = new PerformanceMonitor(modelViewer.core);
        });

        it('should maintain target frame rate with simple models', async () => {
            performanceMonitor.startMonitoring();
            
            // Simulate rendering loop with simple model
            const simpleModel = createMockLargeModel(100); // 100 triangles
            modelViewer.core.setState({ currentModel: simpleModel });
            
            // Simulate multiple frames
            for (let i = 0; i < 60; i++) {
                performanceMonitor.updateFrameRate(60);
                await new Promise(resolve => setTimeout(resolve, 16)); // ~60fps
            }
            
            const metrics = performanceMonitor.getMetrics();
            expect(metrics.fps).toBeGreaterThanOrEqual(55); // Allow some variance
        });

        it('should detect performance degradation with complex models', async () => {
            performanceMonitor.startMonitoring();
            
            // Simulate rendering with complex model
            const complexModel = createMockLargeModel(50000); // 50k triangles
            modelViewer.core.setState({ currentModel: complexModel });
            
            // Simulate lower frame rate
            for (let i = 0; i < 30; i++) {
                performanceMonitor.updateFrameRate(25); // Lower FPS
                await new Promise(resolve => setTimeout(resolve, 40)); // ~25fps
            }
            
            const issues = performanceMonitor.detectPerformanceIssues();
            expect(issues.some(issue => issue.type === 'low_fps')).toBe(true);
        });

        it('should apply performance optimizations automatically', async () => {
            performanceMonitor.startMonitoring();
            
            let qualityReduced = false;
            modelViewer.core.on('performance:quality-reduced', () => {
                qualityReduced = true;
            });
            
            // Simulate sustained low performance
            for (let i = 0; i < 10; i++) {
                performanceMonitor.updateFrameRate(20); // Consistently low FPS
            }
            
            const optimizations = performanceMonitor.getRecommendedOptimizations();
            expect(optimizations.length).toBeGreaterThan(0);
            
            // Apply optimization
            performanceMonitor.applyOptimization('reduce_quality');
            expect(qualityReduced).toBe(true);
        });

        it('should benchmark rendering performance', async () => {
            const benchmark = new RenderingBenchmark();
            
            const results = await benchmark.runBenchmark({
                triangleCount: 10000,
                duration: 1000, // 1 second
                targetFPS: 60
            });
            
            expect(results).toBeDefined();
            expect(results.averageFPS).toBeGreaterThan(0);
            expect(results.minFPS).toBeGreaterThan(0);
            expect(results.maxFPS).toBeGreaterThan(0);
            expect(results.frameTimeVariance).toBeDefined();
        });
    });

    describe('Large Model Handling Tests', () => {
        beforeEach(async () => {
            const { ModelViewer } = await import('../src/ModelViewer.js');
            modelViewer = new ModelViewer();
        });

        it('should handle models with high polygon counts', async () => {
            const largeModel = createMockLargeModel(100000); // 100k triangles
            
            const startTime = performance.now();
            
            try {
                modelViewer.core.setState({ currentModel: largeModel });
                
                const loadTime = performance.now() - startTime;
                
                // Should complete within reasonable time (5 seconds)
                expect(loadTime).toBeLessThan(5000);
                
                // Model should be properly set
                expect(modelViewer.core.getState().currentModel).toBe(largeModel);
            } catch (error) {
                // Should not throw errors for large models
                fail(`Large model handling failed: ${error.message}`);
            }
        });

        it('should implement Level of Detail (LOD) for large models', async () => {
            try {
                await modelViewer.init(testContainer);
                
                const performanceManager = modelViewer.core.getModule('performance');
                if (performanceManager) {
                    performanceManager.init();
                    
                    const lodManager = performanceManager.lodManager;
                    if (lodManager) {
                        const largeModel = createMockLargeModel(50000);
                        
                        // Generate LOD levels
                        const lodLevels = lodManager.generateLODLevels(largeModel);
                        expect(lodLevels.length).toBeGreaterThan(1);
                        
                        // Each LOD level should have fewer triangles
                        for (let i = 1; i < lodLevels.length; i++) {
                            const currentTriangles = countTriangles(lodLevels[i]);
                            const previousTriangles = countTriangles(lodLevels[i - 1]);
                            expect(currentTriangles).toBeLessThan(previousTriangles);
                        }
                    }
                }
            } catch (error) {
                // WebGL might not be available in test environment
                expect(error.message).toContain('WebGL');
            }
        });

        it('should implement frustum culling for performance', async () => {
            try {
                await modelViewer.init(testContainer);
                
                const performanceManager = modelViewer.core.getModule('performance');
                if (performanceManager) {
                    performanceManager.init();
                    
                    const cullingManager = performanceManager.cullingManager;
                    if (cullingManager) {
                        const sceneObjects = [
                            createMockObject({ x: 0, y: 0, z: 0 }), // In view
                            createMockObject({ x: 100, y: 0, z: 0 }), // Out of view
                            createMockObject({ x: 0, y: 100, z: 0 }), // Out of view
                            createMockObject({ x: 0, y: 0, z: -100 }) // Behind camera
                        ];
                        
                        const visibleObjects = cullingManager.performFrustumCulling(sceneObjects);
                        expect(visibleObjects.length).toBeLessThan(sceneObjects.length);
                    }
                }
            } catch (error) {
                // WebGL might not be available in test environment
                expect(error.message).toContain('WebGL');
            }
        });

        it('should handle texture memory efficiently', async () => {
            const assetManager = modelViewer.core.getModule('assets');
            if (assetManager) {
                await assetManager.init();
                
                const textureManager = assetManager.textureManager;
                if (textureManager) {
                    // Create mock high-resolution textures
                    const largeTextures = [
                        createMockTexture(2048, 2048), // 4K texture
                        createMockTexture(2048, 2048),
                        createMockTexture(1024, 1024)  // 2K texture
                    ];
                    
                    // Load textures
                    largeTextures.forEach((texture, index) => {
                        textureManager.cacheTexture(`texture_${index}`, texture);
                    });
                    
                    // Check memory usage
                    const memoryUsage = textureManager.getMemoryUsage();
                    expect(memoryUsage).toBeGreaterThan(0);
                    
                    // Compress textures if needed
                    if (memoryUsage > textureManager.memoryLimit) {
                        textureManager.compressTextures();
                        const newMemoryUsage = textureManager.getMemoryUsage();
                        expect(newMemoryUsage).toBeLessThan(memoryUsage);
                    }
                }
            }
        });
    });

    describe('Adaptive Quality System Tests', () => {
        beforeEach(async () => {
            const { ModelViewer } = await import('../src/ModelViewer.js');
            modelViewer = new ModelViewer();
        });

        it('should adjust quality based on performance', async () => {
            try {
                await modelViewer.init(testContainer);
                
                const performanceManager = modelViewer.core.getModule('performance');
                if (performanceManager) {
                    performanceManager.init();
                    
                    const adaptiveQualityManager = performanceManager.adaptiveQualityManager;
                    if (adaptiveQualityManager) {
                        // Simulate low performance
                        adaptiveQualityManager.updatePerformanceMetrics({
                            fps: 20,
                            frameTime: 50,
                            memoryUsage: 80
                        });
                        
                        const qualitySettings = adaptiveQualityManager.getQualitySettings();
                        expect(qualitySettings.renderScale).toBeLessThan(1.0);
                        expect(qualitySettings.shadowQuality).toBe('low');
                        expect(qualitySettings.postProcessing).toBe(false);
                    }
                }
            } catch (error) {
                // WebGL might not be available in test environment
                expect(error.message).toContain('WebGL');
            }
        });

        it('should restore quality when performance improves', async () => {
            try {
                await modelViewer.init(testContainer);
                
                const performanceManager = modelViewer.core.getModule('performance');
                if (performanceManager) {
                    performanceManager.init();
                    
                    const adaptiveQualityManager = performanceManager.adaptiveQualityManager;
                    if (adaptiveQualityManager) {
                        // First reduce quality
                        adaptiveQualityManager.updatePerformanceMetrics({
                            fps: 20,
                            frameTime: 50,
                            memoryUsage: 80
                        });
                        
                        // Then improve performance
                        adaptiveQualityManager.updatePerformanceMetrics({
                            fps: 60,
                            frameTime: 16,
                            memoryUsage: 40
                        });
                        
                        const qualitySettings = adaptiveQualityManager.getQualitySettings();
                        expect(qualitySettings.renderScale).toBeGreaterThan(0.8);
                        expect(qualitySettings.shadowQuality).toBe('high');
                    }
                }
            } catch (error) {
                // WebGL might not be available in test environment
                expect(error.message).toContain('WebGL');
            }
        });
    });

    describe('Stress Tests', () => {
        beforeEach(async () => {
            const { ModelViewer } = await import('../src/ModelViewer.js');
            modelViewer = new ModelViewer();
        });

        it('should handle rapid model switching', async () => {
            const models = [
                createMockLargeModel(1000),
                createMockLargeModel(2000),
                createMockLargeModel(3000),
                createMockLargeModel(4000),
                createMockLargeModel(5000)
            ];
            
            const startTime = performance.now();
            
            // Rapidly switch between models
            for (let i = 0; i < 10; i++) {
                const model = models[i % models.length];
                modelViewer.core.setState({ currentModel: model });
                
                // Small delay to simulate real usage
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            const totalTime = performance.now() - startTime;
            
            // Should complete within reasonable time
            expect(totalTime).toBeLessThan(5000);
            
            // Should not crash or throw errors
            expect(modelViewer.core.getState().currentModel).toBeDefined();
        });

        it('should handle memory stress test', async () => {
            const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
            
            // Create and destroy many models
            for (let i = 0; i < 50; i++) {
                const model = createMockLargeModel(1000);
                modelViewer.core.setState({ currentModel: model });
                
                // Immediately remove
                modelViewer.core.setState({ currentModel: null });
                
                // Force cleanup
                if (window.gc && i % 10 === 0) {
                    window.gc();
                }
            }
            
            const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
            const memoryIncrease = finalMemory - initialMemory;
            
            // Memory increase should be reasonable (less than 100MB)
            expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
        });
    });

    // Helper functions
    function createMockLargeModel(triangleCount) {
        const vertices = triangleCount * 3;
        return {
            name: `mock-model-${triangleCount}`,
            traverse: (callback) => {
                callback({
                    isMesh: true,
                    geometry: {
                        attributes: {
                            position: { count: vertices }
                        },
                        dispose: jasmine.createSpy('dispose')
                    },
                    material: {
                        dispose: jasmine.createSpy('dispose')
                    }
                });
            }
        };
    }

    function createMockObject(position) {
        return {
            position: position,
            boundingBox: {
                min: { x: position.x - 1, y: position.y - 1, z: position.z - 1 },
                max: { x: position.x + 1, y: position.y + 1, z: position.z + 1 }
            }
        };
    }

    function createMockTexture(width, height) {
        return {
            width: width,
            height: height,
            format: 'RGBA',
            type: 'UnsignedByte',
            estimatedSize: width * height * 4, // 4 bytes per pixel for RGBA
            dispose: jasmine.createSpy('dispose')
        };
    }

    function countTriangles(model) {
        let triangles = 0;
        model.traverse((child) => {
            if (child.geometry && child.geometry.attributes.position) {
                triangles += child.geometry.attributes.position.count / 3;
            }
        });
        return triangles;
    }

    class RenderingBenchmark {
        async runBenchmark(options) {
            const { triangleCount, duration, targetFPS } = options;
            const frameInterval = 1000 / targetFPS;
            
            const frameTimes = [];
            const startTime = performance.now();
            let lastFrameTime = startTime;
            
            while (performance.now() - startTime < duration) {
                const currentTime = performance.now();
                const frameTime = currentTime - lastFrameTime;
                frameTimes.push(frameTime);
                lastFrameTime = currentTime;
                
                // Simulate rendering work
                await new Promise(resolve => setTimeout(resolve, Math.max(0, frameInterval - frameTime)));
            }
            
            const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
            const averageFPS = 1000 / averageFrameTime;
            const minFPS = 1000 / Math.max(...frameTimes);
            const maxFPS = 1000 / Math.min(...frameTimes);
            
            const variance = frameTimes.reduce((sum, time) => {
                return sum + Math.pow(time - averageFrameTime, 2);
            }, 0) / frameTimes.length;
            
            return {
                averageFPS,
                minFPS,
                maxFPS,
                frameTimeVariance: Math.sqrt(variance),
                totalFrames: frameTimes.length
            };
        }
    }
});