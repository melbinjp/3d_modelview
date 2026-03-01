const { ModelViewer } = require('../script');

describe('ModelViewer', () => {
    let viewer;

    beforeEach(() => {
        // Mock DOM elements required by ModelViewer
        document.body.innerHTML = `
            <div id="loadingScreen"><p></p></div>
            <div id="mainContainer" class="hidden"></div>
            <div id="viewerContainer" style="width: 800px; height: 600px;"></div>
            <input id="modelUrl" />
            <div id="sidebar"></div>
            <button id="sidebarToggleBtn"></button>
            <button id="superheroBtn"></button>
            <button id="superheroPlay"></button>
            <button id="superheroPause"></button>
            <button id="superheroReset"></button>
            <div id="audioDrop"></div>
            <input type="file" id="audioInput" />
            <button id="clearAudio"></button>
            <button id="loadUrlBtn"></button>
            <div id="fileDrop"></div>
            <input type="file" id="fileInput" />
            <select id="backgroundSelect"></select>
            <input type="color" id="bgColor" />
            <input type="range" id="ambientIntensity" />
            <input type="range" id="directionalIntensity" />
            <input type="range" id="lightPosX" />
            <input type="range" id="lightPosY" />
            <input type="checkbox" id="showGrid" />
            <input type="checkbox" id="bloomEnabled" />
            <input type="range" id="bloomStrength" />
            <input type="checkbox" id="autoRotate" />
            <input type="range" id="rotationSpeed" />
            <button id="resetCamera"></button>
            <button id="fitToView"></button>
            <button id="screenshotBtn"></button>
            <button id="playBtn"></button>
            <button id="pauseBtn"></button>
            <button id="resetBtn"></button>
            <button id="closeError"></button>
            <div id="errorModal"></div>
            <div id="errorMessage"></div>
            <div id="fadeOverlay"></div>
            <div id="superheroControls"></div>
            <div id="vertexCount"></div>
            <div id="faceCount"></div>
            <div id="fpsCounter"></div>
            <div id="progressBar" class="hidden"></div>
            <div class="progress-text"></div>
            <div class="progress-fill"></div>
            <div class="audio-indicator"></div>
        `;

        // Mock THREE.js
        global.THREE = {
            Scene: jest.fn(() => ({
                add: jest.fn(),
                remove: jest.fn(),
            })),
            Color: jest.fn(),
            PerspectiveCamera: jest.fn(() => ({
                position: { set: jest.fn(), clone: jest.fn() },
                lookAt: jest.fn(),
                aspect: 1,
                updateProjectionMatrix: jest.fn(),
            })),
            WebGLRenderer: jest.fn(() => ({
                setSize: jest.fn(),
                setPixelRatio: jest.fn(),
                shadowMap: { enabled: false },
                domElement: document.createElement('canvas'),
                render: jest.fn(),
            })),
            OrbitControls: jest.fn(() => ({
                target: { set: jest.fn(), clone: jest.fn() },
                update: jest.fn(),
                reset: jest.fn(),
            })),
            Clock: jest.fn(() => ({
                getDelta: jest.fn(() => 0.016),
            })),
            AmbientLight: jest.fn(() => ({ intensity: 1 })),
            DirectionalLight: jest.fn(() => ({
                position: { set: jest.fn() },
                shadow: { mapSize: {}, camera: {} },
                intensity: 1,
            })),
            DirectionalLightHelper: jest.fn(),
            PlaneGeometry: jest.fn(),
            MeshLambertMaterial: jest.fn(),
            Mesh: jest.fn(() => ({
                rotation: { x: 0 },
                position: { y: 0 },
                traverse: jest.fn(),
            })),
            GridHelper: jest.fn(() => ({
                material: { transparent: false, opacity: 1 },
                visible: false,
            })),
            EffectComposer: jest.fn(() => ({
                addPass: jest.fn(),
                setSize: jest.fn(),
                render: jest.fn(),
            })),
            RenderPass: jest.fn(),
            UnrealBloomPass: jest.fn(() => ({
                enabled: false,
            })),
            Box3: jest.fn(() => ({
                setFromObject: jest.fn(() => ({
                    getSize: jest.fn(() => ({ x: 1, y: 1, z: 1 })),
                    getCenter: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
                    min: { y: 0 },
                })),
                getSize: jest.fn(() => ({ x: 1, y: 1, z: 1 })),
                getCenter: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
                min: { y: 0 },
            })),
            Vector3: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
            Vector2: jest.fn(() => ({ x: 0, y: 0 })),
            PCFSoftShadowMap: 1,
            ACESFilmicToneMapping: 1,
            EquirectangularReflectionMapping: 1,
            CanvasTexture: jest.fn(),
            Fog: jest.fn(),
            SpotLight: jest.fn(() => ({
                position: { set: jest.fn() },
                target: { position: { copy: jest.fn() } },
            })),
        };

        // Suppress console.log for clean test output
        jest.spyOn(console, 'log').mockImplementation(() => {});

        viewer = new ModelViewer();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete global.window.AudioContext;
        delete global.window.webkitAudioContext;
        if (viewer.clock) viewer.clock = null;
    });

    describe('playAmbientDrone', () => {
        it('should handle missing AudioContext gracefully and log error', () => {
            // Ensure AudioContext is not defined to trigger the catch block
            global.window.AudioContext = undefined;
            global.window.webkitAudioContext = undefined;

            const consoleSpy = jest.spyOn(console, 'log');

            viewer.playAmbientDrone();

            expect(consoleSpy).toHaveBeenCalledWith('Audio context not supported');
        });

        it('should handle errors thrown during AudioContext initialization or oscillator start', () => {
            const mockOscillator = {
                connect: jest.fn(),
                frequency: { setValueAtTime: jest.fn() },
                start: jest.fn(() => { throw new Error('Test Error'); }),
                stop: jest.fn(),
            };

            const mockGain = {
                connect: jest.fn(),
                gain: {
                    setValueAtTime: jest.fn(),
                    linearRampToValueAtTime: jest.fn()
                },
            };

            const MockAudioContext = jest.fn(() => ({
                createOscillator: jest.fn(() => mockOscillator),
                createGain: jest.fn(() => mockGain),
                destination: {},
                currentTime: 0,
            }));

            global.window.AudioContext = MockAudioContext;

            const consoleSpy = jest.spyOn(console, 'log');

            viewer.playAmbientDrone();

            expect(consoleSpy).toHaveBeenCalledWith('Audio context not supported');
        });

        it('should play ambient drone when AudioContext is supported', () => {
            const mockOscillator = {
                connect: jest.fn(),
                frequency: { setValueAtTime: jest.fn() },
                start: jest.fn(),
                stop: jest.fn(),
            };

            const mockGain = {
                connect: jest.fn(),
                gain: {
                    setValueAtTime: jest.fn(),
                    linearRampToValueAtTime: jest.fn()
                },
            };

            const MockAudioContext = jest.fn(() => ({
                createOscillator: jest.fn(() => mockOscillator),
                createGain: jest.fn(() => mockGain),
                destination: {},
                currentTime: 0,
            }));

            global.window.AudioContext = MockAudioContext;

            viewer.playAmbientDrone();

            expect(MockAudioContext).toHaveBeenCalled();
            expect(mockOscillator.start).toHaveBeenCalled();
            expect(mockOscillator.stop).toHaveBeenCalledWith(1.0);
        });
    });
});
