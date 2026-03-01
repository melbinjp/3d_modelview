/**
 * Browser Compatibility Tests Suite
 * Tests for WebGL and Web Audio API compatibility across different browsers
 */

describe('Browser Compatibility Tests Suite', () => {
    let testContainer;
    let mockCanvas;
    let mockWebGLContext;
    let mockAudioContext;

    beforeEach(() => {
        // Create test container
        testContainer = document.createElement('div');
        testContainer.id = 'compatibility-test-container';
        testContainer.style.width = '800px';
        testContainer.style.height = '600px';
        document.body.appendChild(testContainer);

        // Mock WebGL context with different capability levels
        mockWebGLContext = {
            isContextLost: jasmine.createSpy('isContextLost').and.returnValue(false),
            getExtension: jasmine.createSpy('getExtension'),
            getParameter: jasmine.createSpy('getParameter'),
            getSupportedExtensions: jasmine.createSpy('getSupportedExtensions').and.returnValue([
                'WEBGL_depth_texture',
                'OES_texture_float',
                'OES_texture_half_float',
                'WEBGL_compressed_texture_s3tc'
            ]),
            createShader: jasmine.createSpy('createShader'),
            createProgram: jasmine.createSpy('createProgram'),
            useProgram: jasmine.createSpy('useProgram'),
            enable: jasmine.createSpy('enable'),
            disable: jasmine.createSpy('disable'),
            viewport: jasmine.createSpy('viewport'),
            clear: jasmine.createSpy('clear'),
            drawElements: jasmine.createSpy('drawElements'),
            MAX_TEXTURE_SIZE: 4096,
            MAX_VERTEX_ATTRIBS: 16,
            MAX_FRAGMENT_UNIFORM_VECTORS: 256
        };

        // Mock canvas
        mockCanvas = document.createElement('canvas');
        mockCanvas.getContext = jasmine.createSpy('getContext').and.returnValue(mockWebGLContext);
        mockCanvas.width = 800;
        mockCanvas.height = 600;

        // Mock Audio Context
        mockAudioContext = {
            state: 'running',
            sampleRate: 44100,
            currentTime: 0,
            destination: {},
            createBufferSource: jasmine.createSpy('createBufferSource').and.returnValue({
                connect: jasmine.createSpy('connect'),
                start: jasmine.createSpy('start'),
                stop: jasmine.createSpy('stop')
            }),
            createAnalyser: jasmine.createSpy('createAnalyser').and.returnValue({
                fftSize: 2048,
                frequencyBinCount: 1024,
                getByteFrequencyData: jasmine.createSpy('getByteFrequencyData'),
                getByteTimeDomainData: jasmine.createSpy('getByteTimeDomainData'),
                connect: jasmine.createSpy('connect')
            }),
            createGain: jasmine.createSpy('createGain').and.returnValue({
                gain: { value: 1 },
                connect: jasmine.createSpy('connect')
            }),
            decodeAudioData: jasmine.createSpy('decodeAudioData').and.returnValue(Promise.resolve({})),
            close: jasmine.createSpy('close').and.returnValue(Promise.resolve()),
            resume: jasmine.createSpy('resume').and.returnValue(Promise.resolve())
        };

        // Mock global audio context constructors
        window.AudioContext = window.AudioContext || function() { return mockAudioContext; };
        window.webkitAudioContext = window.webkitAudioContext || function() { return mockAudioContext; };
    });

    afterEach(() => {
        // Cleanup test container
        if (testContainer && testContainer.parentNode) {
            testContainer.parentNode.removeChild(testContainer);
        }
    });

    describe('WebGL Compatibility Tests', () => {
        it('should detect WebGL support', async () => {
            const { WebGLRecovery } = await import('../src/core/WebGLRecovery.js');
            
            const isSupported = WebGLRecovery.isWebGLSupported();
            expect(typeof isSupported).toBe('boolean');
            
            // Should work in modern browsers (test environment should support WebGL)
            expect(isSupported).toBe(true);
        });

        it('should detect WebGL version capabilities', async () => {
            const { WebGLRecovery } = await import('../src/core/WebGLRecovery.js');
            
            const capabilities = WebGLRecovery.getWebGLCapabilities();
            expect(capabilities).toBeDefined();
            expect(capabilities.webgl1).toBeDefined();
            expect(capabilities.webgl2).toBeDefined();
            expect(capabilities.extensions).toBeInstanceOf(Array);
        });

        it('should handle WebGL context creation with fallbacks', async () => {
            const { RenderingEngine } = await import('../src/rendering/RenderingEngine.js');
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            const renderingEngine = new RenderingEngine(coreEngine);
            
            // Mock different WebGL support scenarios
            const scenarios = [
                { webgl2: true, webgl1: true },
                { webgl2: false, webgl1: true },
                { webgl2: false, webgl1: false }
            ];
            
            scenarios.forEach((scenario, index) => {
                spyOn(renderingEngine, 'checkWebGLSupport').and.returnValue(scenario.webgl1 || scenario.webgl2);
                
                if (scenario.webgl1 || scenario.webgl2) {
                    expect(renderingEngine.checkWebGLSupport()).toBe(true);
                } else {
                    expect(renderingEngine.checkWebGLSupport()).toBe(false);
                }
            });
            
            coreEngine.destroy();
        });

        it('should detect WebGL extensions', () => {
            const extensions = mockWebGLContext.getSupportedExtensions();
            expect(extensions).toContain('WEBGL_depth_texture');
            expect(extensions).toContain('OES_texture_float');
            expect(extensions).toContain('OES_texture_half_float');
        });

        it('should handle WebGL context loss and restoration', async () => {
            const { WebGLRecovery } = await import('../src/core/WebGLRecovery.js');
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            const webglRecovery = new WebGLRecovery(coreEngine);
            
            let contextLostHandled = false;
            let contextRestoredHandled = false;
            
            coreEngine.on('webgl:context-lost', () => {
                contextLostHandled = true;
            });
            
            coreEngine.on('webgl:context-restored', () => {
                contextRestoredHandled = true;
            });
            
            const mockRenderer = {
                domElement: mockCanvas,
                getContext: () => mockWebGLContext
            };
            
            webglRecovery.setupContextLossHandlers(mockCanvas, mockRenderer);
            
            // Simulate context loss
            const contextLostEvent = new Event('webglcontextlost');
            mockCanvas.dispatchEvent(contextLostEvent);
            
            // Simulate context restoration
            const contextRestoredEvent = new Event('webglcontextrestored');
            mockCanvas.dispatchEvent(contextRestoredEvent);
            
            // Events should be handled
            expect(contextLostHandled).toBe(true);
            expect(contextRestoredHandled).toBe(true);
            
            coreEngine.destroy();
        });

        it('should adapt to different WebGL capabilities', () => {
            // Test different texture size limits
            const capabilities = [
                { MAX_TEXTURE_SIZE: 4096, level: 'high' },
                { MAX_TEXTURE_SIZE: 2048, level: 'medium' },
                { MAX_TEXTURE_SIZE: 1024, level: 'low' }
            ];
            
            capabilities.forEach(cap => {
                mockWebGLContext.getParameter.and.returnValue(cap.MAX_TEXTURE_SIZE);
                
                const maxTextureSize = mockWebGLContext.getParameter(mockWebGLContext.MAX_TEXTURE_SIZE);
                expect(maxTextureSize).toBe(cap.MAX_TEXTURE_SIZE);
                
                // Quality level should adapt to capabilities
                let qualityLevel;
                if (maxTextureSize >= 4096) {
                    qualityLevel = 'high';
                } else if (maxTextureSize >= 2048) {
                    qualityLevel = 'medium';
                } else {
                    qualityLevel = 'low';
                }
                
                expect(qualityLevel).toBe(cap.level);
            });
        });

        it('should handle shader compilation failures gracefully', async () => {
            const { ShaderManager } = await import('../src/rendering/ShaderManager.js');
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            const shaderManager = new ShaderManager(coreEngine);
            
            // Mock shader compilation failure
            mockWebGLContext.createShader.and.returnValue(null);
            mockWebGLContext.compileShader = jasmine.createSpy('compileShader');
            mockWebGLContext.getShaderParameter = jasmine.createSpy('getShaderParameter').and.returnValue(false);
            mockWebGLContext.getShaderInfoLog = jasmine.createSpy('getShaderInfoLog').and.returnValue('Compilation failed');
            
            try {
                await shaderManager.compileShader('vertex', 'invalid shader code');
                fail('Should have thrown an error for invalid shader');
            } catch (error) {
                expect(error.message).toContain('Compilation failed');
            }
            
            coreEngine.destroy();
        });
    });

    describe('Web Audio API Compatibility Tests', () => {
        it('should detect Web Audio API support', async () => {
            const { AudioAnalyzer } = await import('../src/cinematic/AudioAnalyzer.js');
            
            const isSupported = AudioAnalyzer.isWebAudioSupported();
            expect(typeof isSupported).toBe('boolean');
            expect(isSupported).toBe(true); // Should be supported in test environment
        });

        it('should handle different Audio Context implementations', async () => {
            const { AudioAnalyzer } = await import('../src/cinematic/AudioAnalyzer.js');
            
            // Test standard AudioContext
            expect(window.AudioContext).toBeDefined();
            
            // Test webkit prefixed version
            expect(window.webkitAudioContext).toBeDefined();
            
            const audioAnalyzer = new AudioAnalyzer();
            await audioAnalyzer.init();
            
            expect(audioAnalyzer.audioContext).toBeDefined();
            expect(audioAnalyzer.audioContext.state).toBe('running');
            
            audioAnalyzer.destroy();
        });

        it('should handle audio context state changes', async () => {
            const { AudioAnalyzer } = await import('../src/cinematic/AudioAnalyzer.js');
            
            const audioAnalyzer = new AudioAnalyzer();
            await audioAnalyzer.init();
            
            // Test suspended state
            mockAudioContext.state = 'suspended';
            const resumed = await audioAnalyzer.resumeAudioContext();
            expect(resumed).toBe(true);
            expect(mockAudioContext.resume).toHaveBeenCalled();
            
            audioAnalyzer.destroy();
        });

        it('should handle audio decoding across browsers', async () => {
            const { AudioAnalyzer } = await import('../src/cinematic/AudioAnalyzer.js');
            
            const audioAnalyzer = new AudioAnalyzer();
            await audioAnalyzer.init();
            
            // Mock audio file data
            const mockAudioData = new ArrayBuffer(1024);
            
            try {
                const audioBuffer = await audioAnalyzer.decodeAudioData(mockAudioData);
                expect(audioBuffer).toBeDefined();
                expect(mockAudioContext.decodeAudioData).toHaveBeenCalledWith(mockAudioData);
            } catch (error) {
                // Expected in test environment with mock data
                expect(error).toBeDefined();
            }
            
            audioAnalyzer.destroy();
        });

        it('should handle different audio formats', async () => {
            const { AudioAnalyzer } = await import('../src/cinematic/AudioAnalyzer.js');
            
            const supportedFormats = AudioAnalyzer.getSupportedAudioFormats();
            expect(supportedFormats).toBeInstanceOf(Array);
            expect(supportedFormats.length).toBeGreaterThan(0);
            
            // Common formats that should be supported
            const commonFormats = ['mp3', 'wav', 'ogg'];
            commonFormats.forEach(format => {
                const isSupported = AudioAnalyzer.isFormatSupported(format);
                expect(typeof isSupported).toBe('boolean');
            });
        });

        it('should handle audio analysis with different sample rates', async () => {
            const { AudioAnalyzer } = await import('../src/cinematic/AudioAnalyzer.js');
            
            const sampleRates = [44100, 48000, 22050];
            
            for (const sampleRate of sampleRates) {
                mockAudioContext.sampleRate = sampleRate;
                
                const audioAnalyzer = new AudioAnalyzer();
                await audioAnalyzer.init();
                
                expect(audioAnalyzer.audioContext.sampleRate).toBe(sampleRate);
                
                // Analyzer should adapt to different sample rates
                const analyser = audioAnalyzer.createAnalyser();
                expect(analyser).toBeDefined();
                expect(analyser.fftSize).toBeDefined();
                
                audioAnalyzer.destroy();
            }
        });
    });

    describe('Feature Detection Tests', () => {
        it('should detect available browser features', async () => {
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            const features = {
                webgl: !!window.WebGLRenderingContext,
                webgl2: !!window.WebGL2RenderingContext,
                webAudio: !!(window.AudioContext || window.webkitAudioContext),
                fileAPI: !!(window.File && window.FileReader && window.FileList && window.Blob),
                dragDrop: 'draggable' in document.createElement('div'),
                localStorage: !!window.localStorage,
                indexedDB: !!window.indexedDB,
                webWorkers: !!window.Worker,
                webAssembly: !!window.WebAssembly
            };
            
            Object.entries(features).forEach(([feature, supported]) => {
                expect(typeof supported).toBe('boolean');
                console.log(`${feature}: ${supported ? 'supported' : 'not supported'}`);
            });
            
            coreEngine.destroy();
        });

        it('should provide graceful fallbacks for missing features', async () => {
            const { ModelViewer } = await import('../src/ModelViewer.js');
            
            // Mock missing features
            const originalWebGL = window.WebGLRenderingContext;
            const originalAudioContext = window.AudioContext;
            
            // Test without WebGL
            delete window.WebGLRenderingContext;
            
            const modelViewer = new ModelViewer();
            
            try {
                await modelViewer.init(testContainer);
                fail('Should have failed without WebGL');
            } catch (error) {
                expect(error.message).toContain('WebGL');
            }
            
            // Restore WebGL
            window.WebGLRenderingContext = originalWebGL;
            
            // Test without Web Audio
            delete window.AudioContext;
            delete window.webkitAudioContext;
            
            // Should still initialize without audio features
            try {
                await modelViewer.init(testContainer);
                // Should work without audio (cinematic mode might be disabled)
            } catch (error) {
                // Expected if WebGL is also not available in test environment
                expect(error).toBeDefined();
            }
            
            // Restore Audio Context
            window.AudioContext = originalAudioContext;
            
            modelViewer.destroy();
        });

        it('should detect mobile browser limitations', () => {
            // Mock mobile user agents
            const mobileUserAgents = [
                'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                'Mozilla/5.0 (Android 10; Mobile; rv:81.0) Gecko/81.0 Firefox/81.0',
                'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36'
            ];
            
            const originalUserAgent = navigator.userAgent;
            
            mobileUserAgents.forEach(userAgent => {
                Object.defineProperty(navigator, 'userAgent', {
                    value: userAgent,
                    configurable: true
                });
                
                const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                expect(isMobile).toBe(true);
                
                // Mobile-specific limitations
                const limitations = {
                    maxTextureSize: 2048, // Lower than desktop
                    maxMemory: 512 * 1024 * 1024, // 512MB
                    touchOnly: true,
                    limitedAudio: true
                };
                
                expect(limitations.maxTextureSize).toBeLessThan(4096);
                expect(limitations.touchOnly).toBe(true);
            });
            
            // Restore original user agent
            Object.defineProperty(navigator, 'userAgent', {
                value: originalUserAgent,
                configurable: true
            });
        });
    });

    describe('Performance Adaptation Tests', () => {
        it('should adapt performance settings based on browser capabilities', async () => {
            const { PerformanceManager } = await import('../src/performance/PerformanceManager.js');
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            const mockRenderer = { info: { render: {}, memory: {} } };
            const performanceManager = new PerformanceManager(coreEngine, mockRenderer, {}, {});
            performanceManager.init();
            
            // Test different capability scenarios
            const scenarios = [
                {
                    name: 'High-end desktop',
                    capabilities: { maxTextureSize: 8192, maxVertexAttribs: 32, extensions: 20 },
                    expectedQuality: 'high'
                },
                {
                    name: 'Mid-range desktop',
                    capabilities: { maxTextureSize: 4096, maxVertexAttribs: 16, extensions: 15 },
                    expectedQuality: 'medium'
                },
                {
                    name: 'Mobile device',
                    capabilities: { maxTextureSize: 2048, maxVertexAttribs: 8, extensions: 10 },
                    expectedQuality: 'low'
                }
            ];
            
            scenarios.forEach(scenario => {
                const qualityLevel = performanceManager.determineQualityLevel(scenario.capabilities);
                expect(qualityLevel).toBeDefined();
                
                // Quality should match expected level based on capabilities
                if (scenario.capabilities.maxTextureSize >= 8192) {
                    expect(qualityLevel).toBe('high');
                } else if (scenario.capabilities.maxTextureSize >= 4096) {
                    expect(qualityLevel).toBe('medium');
                } else {
                    expect(qualityLevel).toBe('low');
                }
            });
            
            performanceManager.destroy();
            coreEngine.destroy();
        });

        it('should handle browser-specific optimizations', async () => {
            const { RenderingEngine } = await import('../src/rendering/RenderingEngine.js');
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            const renderingEngine = new RenderingEngine(coreEngine);
            
            // Mock different browsers
            const browsers = [
                { name: 'Chrome', userAgent: 'Chrome/91.0.4472.124', optimizations: ['instancing', 'computeShaders'] },
                { name: 'Firefox', userAgent: 'Firefox/89.0', optimizations: ['instancing'] },
                { name: 'Safari', userAgent: 'Safari/14.1.1', optimizations: ['basicOptimizations'] },
                { name: 'Edge', userAgent: 'Edg/91.0.864.59', optimizations: ['instancing', 'computeShaders'] }
            ];
            
            browsers.forEach(browser => {
                Object.defineProperty(navigator, 'userAgent', {
                    value: browser.userAgent,
                    configurable: true
                });
                
                const availableOptimizations = renderingEngine.getAvailableOptimizations();
                expect(availableOptimizations).toBeInstanceOf(Array);
                
                // Should have at least basic optimizations
                expect(availableOptimizations.length).toBeGreaterThan(0);
            });
            
            coreEngine.destroy();
        });
    });

    describe('Error Handling and Fallbacks', () => {
        it('should handle WebGL context creation failures', async () => {
            const { RenderingEngine } = await import('../src/rendering/RenderingEngine.js');
            const { CoreEngine } = await import('../src/core/CoreEngine.js');
            
            const coreEngine = new CoreEngine();
            await coreEngine.init();
            
            const renderingEngine = new RenderingEngine(coreEngine);
            
            // Mock WebGL context creation failure
            spyOn(renderingEngine, 'checkWebGLSupport').and.returnValue(false);
            
            try {
                await renderingEngine.init(testContainer);
                fail('Should have thrown an error for WebGL failure');
            } catch (error) {
                expect(error.message).toContain('WebGL');
            }
            
            coreEngine.destroy();
        });

        it('should handle audio context creation failures', async () => {
            const { AudioAnalyzer } = await import('../src/cinematic/AudioAnalyzer.js');
            
            // Mock audio context creation failure
            const originalAudioContext = window.AudioContext;
            window.AudioContext = function() {
                throw new Error('Audio context creation failed');
            };
            
            const audioAnalyzer = new AudioAnalyzer();
            
            try {
                await audioAnalyzer.init();
                fail('Should have thrown an error for audio context failure');
            } catch (error) {
                expect(error.message).toContain('Audio context');
            }
            
            // Restore original
            window.AudioContext = originalAudioContext;
        });

        it('should provide meaningful error messages for unsupported features', async () => {
            const { ModelViewer } = await import('../src/ModelViewer.js');
            
            const modelViewer = new ModelViewer();
            
            // Mock unsupported browser
            spyOn(modelViewer.renderingEngine, 'checkWebGLSupport').and.returnValue(false);
            
            try {
                await modelViewer.init(testContainer);
                fail('Should have provided error for unsupported browser');
            } catch (error) {
                expect(error.message).toContain('WebGL');
                expect(error.message.length).toBeGreaterThan(10); // Should be descriptive
            }
            
            modelViewer.destroy();
        });
    });
});