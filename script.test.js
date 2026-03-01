const fs = require('fs');
const path = require('path');
const ModelViewer = require('./script.js');

describe('ModelViewer Core Tests', () => {
    let viewer;

    beforeEach(() => {
        // Setup document body
        const html = fs.readFileSync(path.resolve(__dirname, './index.html'), 'utf8');
        document.documentElement.innerHTML = html.toString();

        // Mock container dimensions
        const viewerContainer = document.getElementById('viewerContainer');
        Object.defineProperty(viewerContainer, 'clientWidth', { value: 800, configurable: true });
        Object.defineProperty(viewerContainer, 'clientHeight', { value: 600, configurable: true });

        // Mock global THREE
        global.THREE = {
            Scene: jest.fn(() => ({
                add: jest.fn(),
                remove: jest.fn(),
                traverse: jest.fn(),
                background: null,
                fog: null
            })),
            Color: jest.fn((hex) => ({ hex })),
            Fog: jest.fn(),
            PerspectiveCamera: jest.fn(() => ({
                position: { set: jest.fn(), clone: jest.fn(() => ({ set: jest.fn(), x: 0, y: 0, z: 0 })), x: 0, y: 0, z: 0 },
                lookAt: jest.fn(),
                updateProjectionMatrix: jest.fn()
            })),
            WebGLRenderer: jest.fn(() => ({
                setSize: jest.fn(),
                setPixelRatio: jest.fn(),
                render: jest.fn(),
                domElement: document.createElement('canvas'),
                shadowMap: { enabled: false, type: null },
                toneMapping: null,
                toneMappingExposure: 1
            })),
            OrbitControls: jest.fn(() => ({
                target: { set: jest.fn(), clone: jest.fn(() => ({ set: jest.fn() })) },
                reset: jest.fn(),
                update: jest.fn(),
                enableDamping: false,
                dampingFactor: 0.05,
                screenSpacePanning: false,
                minDistance: 1,
                maxDistance: 100
            })),
            Clock: jest.fn(() => ({
                getDelta: jest.fn(() => 0.016)
            })),
            AmbientLight: jest.fn(() => ({ intensity: 1 })),
            DirectionalLight: jest.fn(() => ({
                position: { set: jest.fn() },
                shadow: { mapSize: { width: 0, height: 0 }, camera: { near: 0, far: 0 } },
                castShadow: false,
                intensity: 1
            })),
            DirectionalLightHelper: jest.fn(() => ({ visible: true })),
            SpotLight: jest.fn(() => ({
                position: { set: jest.fn() },
                target: { position: { copy: jest.fn() } },
                castShadow: false
            })),
            PlaneGeometry: jest.fn(),
            MeshLambertMaterial: jest.fn(),
            Mesh: jest.fn(() => ({
                rotation: { x: 0, y: 0, z: 0 },
                position: { x: 0, y: 0, z: 0 },
                receiveShadow: false
            })),
            GridHelper: jest.fn(() => ({
                material: { transparent: false, opacity: 1 },
                visible: true
            })),
            PCFSoftShadowMap: 'PCFSoftShadowMap',
            ACESFilmicToneMapping: 'ACESFilmicToneMapping',
            Box3: jest.fn(() => ({
                setFromObject: jest.fn(() => ({
                    getSize: jest.fn(() => ({ x: 10, y: 10, z: 10 })),
                    getCenter: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
                    min: { y: -5 }
                }))
            })),
            Vector3: jest.fn(),
            Vector2: jest.fn(),
            GLTFLoader: jest.fn(() => ({
                load: jest.fn((url, onLoad) => onLoad({ scene: {} }))
            })),
            FBXLoader: jest.fn(),
            OBJLoader: jest.fn()
        };

        // Mock global URL
        global.URL.createObjectURL = jest.fn();
        global.URL.revokeObjectURL = jest.fn();

        // Silence console warnings for clean test output
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});

        // Mock window resizing
        global.window.innerWidth = 1024;
        global.window.innerHeight = 768;
    });

    afterEach(() => {
        jest.clearAllMocks();
        document.body.innerHTML = '';
    });

    test('init() sets up basic Three.js components correctly', () => {
        viewer = new ModelViewer();

        expect(viewer.scene).toBeDefined();
        expect(viewer.camera).toBeDefined();
        expect(viewer.renderer).toBeDefined();
        expect(viewer.controls).toBeDefined();

        // Check renderer configuration
        expect(global.THREE.WebGLRenderer).toHaveBeenCalledWith({ antialias: true, preserveDrawingBuffer: true });

        // Check camera setup
        expect(global.THREE.PerspectiveCamera).toHaveBeenCalledWith(75, 800 / 600, 0.1, 1000);
    });

    test('setupPostProcessing() handles missing dependencies gracefully', () => {
        viewer = new ModelViewer();

        // Call setupPostProcessing (it's called in init, but we test the specific outcome here)
        // With THREE.EffectComposer not defined
        expect(console.warn).toHaveBeenCalledWith('Post-processing dependencies not loaded, using basic rendering');
        expect(viewer.composer).toBeNull();
        expect(viewer.bloomPass.enabled).toBe(false);
    });

    test('setupPostProcessing() configures composer when dependencies exist', () => {
        // Mock post-processing dependencies
        global.THREE.EffectComposer = jest.fn(() => ({
            addPass: jest.fn()
        }));
        global.THREE.RenderPass = jest.fn();
        global.THREE.UnrealBloomPass = jest.fn(() => ({
            enabled: false
        }));

        viewer = new ModelViewer();

        expect(global.THREE.EffectComposer).toHaveBeenCalled();
        expect(global.THREE.RenderPass).toHaveBeenCalled();
        expect(global.THREE.UnrealBloomPass).toHaveBeenCalled();
        expect(viewer.composer).toBeDefined();
        expect(viewer.composer.addPass).toHaveBeenCalledTimes(2);

        // Cleanup global mock modifications
        delete global.THREE.EffectComposer;
        delete global.THREE.RenderPass;
        delete global.THREE.UnrealBloomPass;
    });

    test('loadModelFromUrl() correctly fetches a GLTF model', () => {
        viewer = new ModelViewer();

        // Mock getLoaderForUrl to return our mock GLTFLoader
        const mockLoader = new global.THREE.GLTFLoader();
        jest.spyOn(viewer, 'getLoaderForUrl').mockReturnValue(mockLoader);
        jest.spyOn(viewer, 'onModelLoaded').mockImplementation(() => {});
        jest.spyOn(viewer, 'showProgress').mockImplementation(() => {});

        const testUrl = 'https://example.com/model.gltf';
        viewer.loadModelFromUrl(testUrl);

        expect(viewer.showProgress).toHaveBeenCalledWith(true, 'Loading model...');
        expect(mockLoader.load).toHaveBeenCalled();

        // Check if onModelLoaded is called by simulating the onLoad callback
        const loadCallback = mockLoader.load.mock.calls[0][1];
        loadCallback({ scene: {} });

        expect(viewer.onModelLoaded).toHaveBeenCalled();
    });

    test('loadModelFromUrl() handles unsupported formats gracefully', () => {
        viewer = new ModelViewer();

        jest.spyOn(viewer, 'getLoaderForUrl').mockReturnValue(null);
        jest.spyOn(viewer, 'showError').mockImplementation(() => {});

        viewer.loadModelFromUrl('test.unsupported');

        expect(viewer.showError).toHaveBeenCalledWith('Unsupported file format');
    });
});
