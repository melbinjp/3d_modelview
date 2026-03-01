const fs = require('fs');
const path = require('path');

// Read the actual HTML file and use it to mock the DOM
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

const { ModelViewer } = require('../script.js');

describe('ModelViewer.loadAudioFile', () => {
    let viewer;

    beforeEach(() => {
        // Mock DOM elements required by constructor and methods
        document.body.innerHTML = html;

        // Mock Three.js since it's used in constructor
        global.THREE = {
            Scene: jest.fn(() => ({
                add: jest.fn()
            })),
            PerspectiveCamera: jest.fn(() => ({
                position: { set: jest.fn(), clone: jest.fn() },
                updateProjectionMatrix: jest.fn(),
                lookAt: jest.fn(),
                add: jest.fn()
            })),
            WebGLRenderer: jest.fn(() => ({
                setSize: jest.fn(),
                setPixelRatio: jest.fn(),
                setClearColor: jest.fn(),
                domElement: document.createElement('canvas'),
                shadowMap: { enabled: false, type: 0 },
                toneMapping: 0,
                toneMappingExposure: 1,
                render: jest.fn()
            })),
            AmbientLight: jest.fn(() => ({
                intensity: 1
            })),
            DirectionalLight: jest.fn(() => ({
                position: { set: jest.fn(), x: 0, y: 0, z: 0 },
                castShadow: false,
                shadow: {
                    mapSize: { width: 1024, height: 1024 },
                    camera: { near: 0.5, far: 50, left: -10, right: 10, top: 10, bottom: -10 }
                }
            })),
            DirectionalLightHelper: jest.fn(),
            LoadingManager: jest.fn(() => ({
                onStart: null,
                onProgress: null,
                onLoad: null,
                onError: null
            })),
            Clock: jest.fn(() => ({
                getDelta: jest.fn(() => 0.16)
            })),
            AudioListener: jest.fn(),
            Audio: jest.fn(() => ({
                setBuffer: jest.fn(),
                setLoop: jest.fn(),
                setVolume: jest.fn(),
                play: jest.fn(),
                pause: jest.fn(),
                stop: jest.fn(),
                isPlaying: false
            })),
            AudioLoader: jest.fn(),
            Color: jest.fn(() => ({
                setHex: jest.fn()
            })),
            AxesHelper: jest.fn(() => ({
                visible: false
            })),
            GridHelper: jest.fn(() => ({
                visible: false,
                material: { transparent: false, opacity: 1 }
            })),
            PMREMGenerator: jest.fn(() => ({
                compileEquirectangularShader: jest.fn()
            })),
            AnimationMixer: jest.fn(),
            OrbitControls: jest.fn(() => ({
                enableDamping: true,
                dampingFactor: 0.05,
                screenSpacePanning: false,
                maxPolarAngle: Math.PI / 2,
                target: { set: jest.fn(), clone: jest.fn() },
                update: jest.fn()
            })),
            GLTFLoader: jest.fn(),
            FBXLoader: jest.fn(),
            OBJLoader: jest.fn(),
            DRACOLoader: jest.fn(() => ({
                setDecoderPath: jest.fn(),
                setDecoderConfig: jest.fn()
            })),
            RGBELoader: jest.fn(),
            PlaneGeometry: jest.fn(),
            MeshLambertMaterial: jest.fn(),
            Mesh: jest.fn(() => ({
                rotation: { x: 0 },
                position: { y: 0 },
                receiveShadow: false
            })),
            Box3: jest.fn(() => ({
                setFromObject: jest.fn(() => ({
                    getCenter: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
                    getSize: jest.fn(() => ({ length: jest.fn(() => 10) }))
                }))
            })),
            Vector3: jest.fn()
        };

        // Also mock OrbitControls on global scope just in case
        global.OrbitControls = global.THREE.OrbitControls;
        global.ResizeObserver = jest.fn(() => ({
            observe: jest.fn(),
            unobserve: jest.fn(),
            disconnect: jest.fn()
        }));

        // Mock requestAnimationFrame
        global.requestAnimationFrame = jest.fn();

        viewer = new ModelViewer();

        // Mock showError method
        viewer.showError = jest.fn();
    });

    test('should show error for unsupported audio format', () => {
        const file = new File([''], 'test.txt', { type: 'text/plain' });

        viewer.loadAudioFile(file);

        expect(viewer.showError).toHaveBeenCalledWith('Unsupported audio format. Please use MP3, WAV, OGG, M4A, AAC, FLAC, or WMA.');
    });

    test('should show error for missing extension', () => {
        const file = new File([''], 'testfile_no_extension', { type: 'audio/mpeg' });

        viewer.loadAudioFile(file);

        expect(viewer.showError).toHaveBeenCalledWith('Unsupported audio format. Please use MP3, WAV, OGG, M4A, AAC, FLAC, or WMA.');
    });

    test('should allow supported audio formats', () => {
        // We'll test with MP3 since it's commonly supported
        const file = new File([''], 'test.mp3', { type: 'audio/mpeg' });

        // Mock FileReader
        const mockFileReader = {
            readAsArrayBuffer: jest.fn(),
            onload: null
        };
        global.FileReader = jest.fn(() => mockFileReader);

        // Mock URL.createObjectURL
        global.URL.createObjectURL = jest.fn(() => 'blob:url');

        viewer.loadAudioFile(file);

        // Verify no error is shown
        expect(viewer.showError).not.toHaveBeenCalled();

        // Verify FileReader was used
        expect(mockFileReader.readAsArrayBuffer).toHaveBeenCalledWith(file);

        // Simulate load
        const mockEvent = {
            target: { result: new ArrayBuffer(8) }
        };
        mockFileReader.onload(mockEvent);

        // Verify state changes
        expect(viewer.customAudioFile).toBe('blob:url');
        const indicator = document.querySelector('.audio-indicator');
        expect(indicator.textContent).toBe('🎵 test.mp3 loaded');
    });

    test('should be case-insensitive when checking audio formats', () => {
        // Uppercase extension
        const file = new File([''], 'test.WAV', { type: 'audio/wav' });

        // Mock FileReader to prevent actual file reading logic errors
        const mockFileReader = { readAsArrayBuffer: jest.fn(), onload: null };
        global.FileReader = jest.fn(() => mockFileReader);

        viewer.loadAudioFile(file);

        expect(viewer.showError).not.toHaveBeenCalled();
    });
});
