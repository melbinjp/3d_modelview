const { ModelViewer } = require('./script.js');

describe('ModelViewer.setupPostProcessing', () => {
    let viewer;

    beforeEach(() => {
        // Create an instance without calling constructor
        viewer = Object.create(ModelViewer.prototype);

        // Mock THREE.js
        global.THREE = {
            Clock: jest.fn(),
            Scene: jest.fn(),
            PerspectiveCamera: jest.fn(() => ({
                position: { set: jest.fn() },
                aspect: 1,
                updateProjectionMatrix: jest.fn()
            })),
            WebGLRenderer: jest.fn(() => ({
                setSize: jest.fn(),
                setPixelRatio: jest.fn(),
                setClearColor: jest.fn(),
                outputColorSpace: 'srgb',
                toneMapping: 'aces',
                domElement: document.createElement('canvas')
            })),
            Vector2: jest.fn(),
            Color: jest.fn()
        };

        // Only do the bare minimum needed for setupPostProcessing to pass
        viewer.scene = new global.THREE.Scene();
        viewer.camera = new global.THREE.PerspectiveCamera();
        viewer.renderer = new global.THREE.WebGLRenderer();
        viewer.composer = null;
        viewer.bloomPass = null;
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete global.THREE.EffectComposer;
        delete global.THREE.RenderPass;
        delete global.THREE.UnrealBloomPass;
    });

    it('should setup post-processing when all dependencies are loaded', () => {
        const mockComposerAddPass = jest.fn();
        global.THREE.EffectComposer = jest.fn(() => ({
            addPass: mockComposerAddPass
        }));
        global.THREE.RenderPass = jest.fn();
        global.THREE.UnrealBloomPass = jest.fn();

        viewer.setupPostProcessing();

        expect(global.THREE.EffectComposer).toHaveBeenCalledWith(viewer.renderer);
        expect(global.THREE.RenderPass).toHaveBeenCalledWith(viewer.scene, viewer.camera);
        expect(global.THREE.UnrealBloomPass).toHaveBeenCalled();
        expect(viewer.composer).toBeDefined();
        expect(viewer.bloomPass).toBeDefined();
        expect(viewer.bloomPass.enabled).toBe(false);
        expect(mockComposerAddPass).toHaveBeenCalledTimes(2);
    });

    it('should fallback to basic rendering when dependencies are missing', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Ensure dependencies are undefined
        delete global.THREE.EffectComposer;
        delete global.THREE.RenderPass;
        delete global.THREE.UnrealBloomPass;

        viewer.setupPostProcessing();

        expect(consoleSpy).toHaveBeenCalledWith('Post-processing dependencies not loaded, using basic rendering');
        expect(viewer.composer).toBeNull();
        expect(viewer.bloomPass).toBeDefined();
        expect(viewer.bloomPass.enabled).toBe(false);

        consoleSpy.mockRestore();
    });

    it('should fallback to basic rendering when only EffectComposer is missing', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        delete global.THREE.EffectComposer;
        global.THREE.RenderPass = jest.fn();
        global.THREE.UnrealBloomPass = jest.fn();

        viewer.setupPostProcessing();

        expect(consoleSpy).toHaveBeenCalled();
        expect(viewer.composer).toBeNull();

        consoleSpy.mockRestore();
    });

    it('should fallback to basic rendering when only UnrealBloomPass is missing', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        global.THREE.EffectComposer = jest.fn();
        global.THREE.RenderPass = jest.fn();
        delete global.THREE.UnrealBloomPass;

        viewer.setupPostProcessing();

        expect(consoleSpy).toHaveBeenCalled();
        expect(viewer.composer).toBeNull();

        consoleSpy.mockRestore();
    });
});
