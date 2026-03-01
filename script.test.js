// Set up global before requiring script.js
global.document = {
    addEventListener: jest.fn(),
    getElementById: jest.fn().mockReturnValue({
        classList: { add: jest.fn(), remove: jest.fn() },
        appendChild: jest.fn(),
        addEventListener: jest.fn(),
        clientWidth: 800,
        clientHeight: 600,
        textContent: '',
    }),
    querySelector: jest.fn().mockReturnValue({
        classList: { add: jest.fn(), remove: jest.fn() },
        innerHTML: '',
        textContent: '',
        style: {}
    }),
    querySelectorAll: jest.fn().mockReturnValue([]),
    createElement: jest.fn(),
};
global.window = {
    addEventListener: jest.fn(),
    devicePixelRatio: 1,
    innerWidth: 800,
    innerHeight: 600,
    location: { hostname: 'localhost' },
};
global.requestAnimationFrame = jest.fn();
// Avoid executing the timeout callback for loadDefaultModel immediately during initialization.
global.setTimeout = jest.fn();
global.THREE = {
    Scene: jest.fn().mockImplementation(() => ({
        add: jest.fn(),
        remove: jest.fn(),
    })),
    Color: jest.fn(),
    PerspectiveCamera: jest.fn().mockImplementation(() => ({
        position: { set: jest.fn() },
        lookAt: jest.fn(),
        updateProjectionMatrix: jest.fn()
    })),
    WebGLRenderer: jest.fn().mockImplementation(() => ({
        setSize: jest.fn(),
        setPixelRatio: jest.fn(),
        domElement: {},
        shadowMap: {},
        render: jest.fn(),
    })),
    OrbitControls: jest.fn().mockImplementation(() => ({
        update: jest.fn(),
        target: { copy: jest.fn() },
    })),
    AmbientLight: jest.fn(),
    DirectionalLight: jest.fn().mockImplementation(() => ({
        position: { set: jest.fn() },
        shadow: { mapSize: {}, camera: {} },
    })),
    DirectionalLightHelper: jest.fn(),
    PlaneGeometry: jest.fn(),
    MeshLambertMaterial: jest.fn(),
    Mesh: jest.fn().mockImplementation(() => ({
        rotation: {},
        position: {},
    })),
    GridHelper: jest.fn().mockImplementation(() => ({
        material: {},
    })),
    Clock: jest.fn().mockImplementation(() => ({
        getDelta: jest.fn().mockReturnValue(0.016),
    })),
    GLTFLoader: jest.fn(),
    FBXLoader: jest.fn(),
    OBJLoader: jest.fn(),
    ColladaLoader: jest.fn(),
    STLLoader: jest.fn(),
    PLYLoader: jest.fn(),
};

const { ModelViewer } = require('./script.js');

describe('ModelViewer', () => {
    let viewer;

    beforeEach(() => {
        viewer = new ModelViewer();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getLoaderForExtension', () => {
        it('should return null for an unknown extension', () => {
            const result = viewer.getLoaderForExtension('unknown');
            expect(result).toBeNull();
        });

        it('should return a GLTFLoader for glb extension', () => {
            const result = viewer.getLoaderForExtension('glb');
            expect(global.THREE.GLTFLoader).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should return a GLTFLoader for gltf extension', () => {
            const result = viewer.getLoaderForExtension('gltf');
            expect(global.THREE.GLTFLoader).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should return an FBXLoader for fbx extension', () => {
            const result = viewer.getLoaderForExtension('fbx');
            expect(global.THREE.FBXLoader).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should return an OBJLoader for obj extension', () => {
            const result = viewer.getLoaderForExtension('obj');
            expect(global.THREE.OBJLoader).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should return a ColladaLoader for dae extension', () => {
            const result = viewer.getLoaderForExtension('dae');
            expect(global.THREE.ColladaLoader).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should return an STLLoader for stl extension', () => {
            const result = viewer.getLoaderForExtension('stl');
            expect(global.THREE.STLLoader).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should return a PLYLoader for ply extension', () => {
            const result = viewer.getLoaderForExtension('ply');
            expect(global.THREE.PLYLoader).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });
});
