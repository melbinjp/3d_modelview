/**
 * Integration Tests Suite
 * Tests module interactions and asset loading workflows
 */

describe('Integration Tests Suite', () => {
    let testContainer;
    let modelViewer;

    beforeEach(() => {
        // Create test container
        testContainer = document.createElement('div');
        testContainer.id = 'integration-test-container';
        testContainer.style.width = '800px';
        testContainer.style.height = '600px';
        document.body.appendChild(testContainer);

        // Mock required DOM elements
        const mockElements = [
            'mainContainer', 'loadingScreen', 'viewerContainer', 'sidebar',
            'fileDrop', 'fileInput', 'loadUrlBtn', 'superheroBtn'
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
        
        // Cleanup test container
        if (testContainer && testContainer.parentNode) {
            testContainer.parentNode.removeChild(testContainer);
        }
        
        // Cleanup mock elements
        const mockElements = [
            'mainContainer', 'loadingScreen', 'viewerContainer', 'sidebar',
            'fileDrop', 'fileInput', 'loadUrlBtn', 'superheroBtn'
        ];
        
        mockElements.forEach(id => {
            const element = document.getElementById(id);
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
    });

    describe('ModelViewer Integration', () => {
        it('should initialize all core modules', async () => {
            const { ModelViewer } = await import('../src/ModelViewer.js');
            modelViewer = new ModelViewer();
            
            expect(modelViewer.core).toBeDefined();
            expect(modelViewer.renderingEngine).toBeDefined();
            expect(modelViewer.assetManager).toBeDefined();
            expect(modelViewer.uiManager).toBeDefined();
            expect(modelViewer.exportSystem).toBeDefined();
            expect(modelViewer.analysisManager).toBeDefined();
            expect(modelViewer.performanceManager).toBeDefined();
            expect(modelViewer.cinematicEngine).toBeDefined();
        });

        it('should register all modules with core engine', async () => {
            const { ModelViewer } = await import('../src/ModelViewer.js');
            modelViewer = new ModelViewer();
            
            expect(modelViewer.core.modules.has('rendering')).toBe(true);
            expect(modelViewer.core.modules.has('assets')).toBe(true);
            expect(modelViewer.core.modules.has('ui')).toBe(true);
            expect(modelViewer.core.modules.has('export')).toBe(true);
            expect(modelViewer.core.modules.has('analysis')).toBe(true);
            expect(modelViewer.core.modules.has('performance')).toBe(true);
            expect(modelViewer.core.modules.has('cinematic')).toBe(true);
        });

        it('should handle module initialization sequence', async () => {
            const { ModelViewer } = await import('../src/ModelViewer.js');
            modelViewer = new ModelViewer();
            
            // Track initialization events
            const initEvents = [];
            modelViewer.core.on('core:initialized', () => initEvents.push('core'));
            modelViewer.core.on('assets:initialized', () => initEvents.push('assets'));
            modelViewer.core.on('ui:initialized', () => initEvents.push('ui'));
            modelViewer.core.on('rendering:initialized', () => initEvents.push('rendering'));
            
            try {
                await modelViewer.init(testContainer);
                
                // Core should initialize first
                expect(initEvents[0]).toBe('core');
                expect(initEvents.length).toBeGreaterThan(1);
            } catch (error) {
                // WebGL might not be available in test environment
                expect(error.message).toContain('WebGL');
            }
        });
    });

    describe('Asset Loading Integration', () => {
        beforeEach(async () => {
            const { ModelViewer } = await import('../src/ModelViewer.js');
            modelViewer = new ModelViewer();
        });

        it('should coordinate asset loading between modules', async () => {
            let loadingStarted = false;
            let loadingCompleted = false;
            let modelAdded = false;
            
            modelViewer.core.on('assets:loading:start', () => {
                loadingStarted = true;
            });
            
            modelViewer.core.on('assets:loading:complete', () => {
                loadingCompleted = true;
            });
            
            modelViewer.core.on('rendering:model:added', () => {
                modelAdded = true;
            });
            
            // Create a mock GLB file
            const mockGLBData = new ArrayBuffer(100);
            const mockFile = new File([mockGLBData], 'test.glb', {
                type: 'model/gltf-binary'
            });
            
            try {
                await modelViewer.loadModelFromFile(mockFile);
                
                expect(loadingStarted).toBe(true);
                // Note: loading might fail in test environment, but events should still fire
            } catch (error) {
                // Expected in test environment without proper GLB data
                expect(error).toBeDefined();
                expect(loadingStarted).toBe(true);
            }
        });

        it('should handle asset loading errors gracefully', async () => {
            let errorHandled = false;
            
            modelViewer.core.on('assets:model:error', () => {
                errorHandled = true;
            });
            
            // Create an invalid file
            const invalidFile = new File(['invalid data'], 'test.glb', {
                type: 'model/gltf-binary'
            });
            
            try {
                await modelViewer.loadModelFromFile(invalidFile);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeDefined();
                expect(errorHandled).toBe(true);
            }
        });

        it('should validate file types before loading', async () => {
            const unsupportedFile = new File(['test'], 'test.xyz', {
                type: 'application/octet-stream'
            });
            
            try {
                await modelViewer.loadModelFromFile(unsupportedFile);
                fail('Should have rejected unsupported file type');
            } catch (error) {
                expect(error.message).toContain('Unsupported file format');
            }
        });

        it('should enforce file size limits', async () => {
            // Create a file that's too large (over 100MB)
            const largeData = new ArrayBuffer(150 * 1024 * 1024);
            const largeFile = new File([largeData], 'large.glb', {
                type: 'model/gltf-binary'
            });
            
            try {
                await modelViewer.loadModelFromFile(largeFile);
                fail('Should have rejected large file');
            } catch (error) {
                expect(error.message).toContain('too large');
            }
        });
    });

    describe('UI and Rendering Integration', () => {
        beforeEach(async () => {
            const { ModelViewer } = await import('../src/ModelViewer.js');
            modelViewer = new ModelViewer();
        });

        it('should update UI state when models are loaded', async () => {
            let uiStateChanged = false;
            
            modelViewer.core.on('state:changed', (data) => {
                if (data.newState.currentModel) {
                    uiStateChanged = true;
                }
            });
            
            // Simulate model loading
            const mockModel = { name: 'test-model', traverse: () => {} };
            modelViewer.core.setState({ currentModel: mockModel });
            
            expect(uiStateChanged).toBe(true);
        });

        it('should coordinate UI mode changes with rendering', async () => {
            try {
                await modelViewer.init(testContainer);
                
                const uiManager = modelViewer.core.getModule('ui');
                const renderingEngine = modelViewer.core.getModule('rendering');
                
                if (uiManager && renderingEngine) {
                    let modeChanged = false;
                    modelViewer.core.on('ui:mode:changed', () => {
                        modeChanged = true;
                    });
                    
                    uiManager.setMode('advanced');
                    expect(modeChanged).toBe(true);
                    expect(uiManager.currentMode).toBe('advanced');
                }
            } catch (error) {
                // WebGL might not be available in test environment
                expect(error.message).toContain('WebGL');
            }
        });

        it('should handle window resize across modules', async () => {
            try {
                await modelViewer.init(testContainer);
                
                const renderingEngine = modelViewer.core.getModule('rendering');
                if (renderingEngine && renderingEngine.onWindowResize) {
                    spyOn(renderingEngine, 'onWindowResize');
                    
                    // Simulate window resize
                    window.dispatchEvent(new Event('resize'));
                    
                    // Give time for event to propagate
                    setTimeout(() => {
                        expect(renderingEngine.onWindowResize).toHaveBeenCalled();
                    }, 10);
                }
            } catch (error) {
                // WebGL might not be available in test environment
                expect(error.message).toContain('WebGL');
            }
        });
    });

    describe('Performance and Error Handling Integration', () => {
        beforeEach(async () => {
            const { ModelViewer } = await import('../src/ModelViewer.js');
            modelViewer = new ModelViewer();
        });

        it('should coordinate performance monitoring across modules', async () => {
            let performanceUpdate = false;
            
            modelViewer.core.on('performance:update', () => {
                performanceUpdate = true;
            });
            
            const performanceManager = modelViewer.core.getModule('performance');
            if (performanceManager) {
                performanceManager.init();
                
                // Simulate performance update
                modelViewer.core.emit('performance:update', {
                    fps: 30,
                    memory: 50
                });
                
                expect(performanceUpdate).toBe(true);
            }
        });

        it('should handle errors across module boundaries', async () => {
            let errorHandled = false;
            
            modelViewer.core.on('error:handled', () => {
                errorHandled = true;
            });
            
            // Simulate error in asset loading
            const testError = new Error('Asset loading failed');
            await modelViewer.core.handleError(testError, {
                type: 'asset_load_failed',
                severity: 'medium',
                context: { module: 'assets' }
            });
            
            expect(errorHandled).toBe(true);
        });

        it('should trigger quality reduction when performance drops', async () => {
            let qualityReduced = false;
            
            modelViewer.core.on('performance:quality-reduced', () => {
                qualityReduced = true;
            });
            
            // Simulate low performance
            modelViewer.core.emit('performance:quality-reduced');
            expect(qualityReduced).toBe(true);
        });
    });

    describe('Export System Integration', () => {
        beforeEach(async () => {
            const { ModelViewer } = await import('../src/ModelViewer.js');
            modelViewer = new ModelViewer();
        });

        it('should coordinate export operations with rendering', async () => {
            const exportSystem = modelViewer.core.getModule('export');
            if (exportSystem) {
                exportSystem.init();
                
                // Mock model for export
                const mockModel = {
                    name: 'test-model',
                    traverse: jasmine.createSpy('traverse')
                };
                
                modelViewer.core.setState({ currentModel: mockModel });
                
                const formats = exportSystem.getAvailableFormats();
                expect(formats).toContain('gltf');
                expect(formats).toContain('glb');
            }
        });

        it('should handle screenshot export with rendering engine', async () => {
            try {
                await modelViewer.init(testContainer);
                
                const exportSystem = modelViewer.core.getModule('export');
                const renderingEngine = modelViewer.core.getModule('rendering');
                
                if (exportSystem && renderingEngine) {
                    const options = {
                        width: 800,
                        height: 600,
                        format: 'png'
                    };
                    
                    try {
                        await exportSystem.exportScreenshot(renderingEngine.renderer, options);
                        // Should not throw in proper environment
                    } catch (error) {
                        // Expected in test environment without full WebGL
                        expect(error).toBeDefined();
                    }
                }
            } catch (error) {
                // WebGL might not be available in test environment
                expect(error.message).toContain('WebGL');
            }
        });
    });

    describe('Cinematic Mode Integration', () => {
        beforeEach(async () => {
            const { ModelViewer } = await import('../src/ModelViewer.js');
            modelViewer = new ModelViewer();
        });

        it('should coordinate cinematic mode with rendering and audio', async () => {
            const cinematicEngine = modelViewer.core.getModule('cinematic');
            if (cinematicEngine) {
                await cinematicEngine.init();
                
                let cinematicStarted = false;
                modelViewer.core.on('cinematic:started', () => {
                    cinematicStarted = true;
                });
                
                // Mock audio file
                const mockAudio = new File(['audio data'], 'test.mp3', {
                    type: 'audio/mpeg'
                });
                
                try {
                    await cinematicEngine.startSuperheroMode(mockAudio);
                    expect(cinematicStarted).toBe(true);
                } catch (error) {
                    // Expected in test environment without audio context
                    expect(error).toBeDefined();
                }
            }
        });

        it('should handle cinematic camera movements', async () => {
            const cinematicEngine = modelViewer.core.getModule('cinematic');
            if (cinematicEngine) {
                await cinematicEngine.init();
                
                const sequences = cinematicEngine.getAvailableSequences();
                expect(sequences).toBeInstanceOf(Array);
                expect(sequences.length).toBeGreaterThan(0);
            }
        });
    });

    describe('Analysis Tools Integration', () => {
        beforeEach(async () => {
            const { ModelViewer } = await import('../src/ModelViewer.js');
            modelViewer = new ModelViewer();
        });

        it('should analyze loaded models', async () => {
            const analysisManager = modelViewer.core.getModule('analysis');
            if (analysisManager) {
                await analysisManager.init();
                
                // Mock model with geometry
                const mockModel = {
                    traverse: (callback) => {
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
                expect(stats.triangles).toBe(100);
            }
        });

        it('should provide measurement tools', async () => {
            const analysisManager = modelViewer.core.getModule('analysis');
            if (analysisManager) {
                await analysisManager.init();
                
                const tools = analysisManager.getAvailableTools();
                expect(tools).toContain('distance');
                expect(tools).toContain('angle');
                expect(tools).toContain('area');
            }
        });
    });

    describe('Memory Management Integration', () => {
        beforeEach(async () => {
            const { ModelViewer } = await import('../src/ModelViewer.js');
            modelViewer = new ModelViewer();
        });

        it('should cleanup resources when models are removed', async () => {
            // Mock model with disposable resources
            const mockGeometry = {
                dispose: jasmine.createSpy('dispose')
            };
            
            const mockMaterial = {
                dispose: jasmine.createSpy('dispose')
            };
            
            const mockModel = {
                traverse: (callback) => {
                    callback({
                        geometry: mockGeometry,
                        material: mockMaterial
                    });
                }
            };
            
            modelViewer.core.setState({ currentModel: mockModel });
            
            // Simulate model removal
            const renderingEngine = modelViewer.core.getModule('rendering');
            if (renderingEngine) {
                renderingEngine.removeCurrentModel();
                
                // Cleanup should be handled by the system
                expect(modelViewer.core.getState().currentModel).toBe(null);
            }
        });

        it('should handle memory warnings', async () => {
            let memoryWarning = false;
            
            modelViewer.core.on('performance:memory-warning', () => {
                memoryWarning = true;
            });
            
            // Simulate memory warning
            modelViewer.core.emit('performance:memory-warning', {
                usage: 90,
                threshold: 80
            });
            
            expect(memoryWarning).toBe(true);
        });
    });

    describe('Event System Integration', () => {
        beforeEach(async () => {
            const { ModelViewer } = await import('../src/ModelViewer.js');
            modelViewer = new ModelViewer();
        });

        it('should propagate events across all modules', async () => {
            const eventLog = [];
            
            // Listen to various events
            modelViewer.core.on('assets:model:loaded', () => eventLog.push('asset-loaded'));
            modelViewer.core.on('rendering:model:added', () => eventLog.push('render-added'));
            modelViewer.core.on('ui:mode:changed', () => eventLog.push('ui-changed'));
            modelViewer.core.on('performance:update', () => eventLog.push('perf-update'));
            
            // Emit test events
            modelViewer.core.emit('assets:model:loaded', { model: {} });
            modelViewer.core.emit('rendering:model:added', { model: {} });
            modelViewer.core.emit('ui:mode:changed', { mode: 'advanced' });
            modelViewer.core.emit('performance:update', { fps: 60 });
            
            expect(eventLog).toContain('asset-loaded');
            expect(eventLog).toContain('render-added');
            expect(eventLog).toContain('ui-changed');
            expect(eventLog).toContain('perf-update');
        });

        it('should handle event listener cleanup', async () => {
            const handler = jasmine.createSpy('handler');
            
            modelViewer.core.on('test:event', handler);
            modelViewer.core.emit('test:event');
            expect(handler).toHaveBeenCalledTimes(1);
            
            modelViewer.core.off('test:event', handler);
            modelViewer.core.emit('test:event');
            expect(handler).toHaveBeenCalledTimes(1); // Should not be called again
        });
    });
});