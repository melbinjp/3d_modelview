const fs = require('fs');
const path = require('path');

// Mock DOM
document.body.innerHTML = `
  <div id="loadingScreen"><p></p></div>
  <div id="mainContainer" class="hidden"></div>
  <div id="viewerContainer"></div>
  <button id="sidebarToggleBtn"></button>
  <div id="sidebar"></div>
  <button id="superheroBtn"></button>
  <button id="superheroPlay"></button>
  <button id="superheroPause"></button>
  <button id="superheroReset"></button>
  <div id="audioDrop"></div>
  <input id="audioInput" type="file" />
  <button id="clearAudio"></button>
  <button id="loadUrlBtn"></button>
  <input id="modelUrl" />
  <div id="fileDrop"></div>
  <input id="fileInput" type="file" />
  <button id="closeError"></button>
  <div id="errorModal"></div>
  <select id="backgroundSelect"></select>
  <input id="bgColor" />
  <input id="ambientIntensity" />
  <input id="directionalIntensity" />
  <input id="lightPosX" />
  <input id="lightPosY" />
  <input type="checkbox" id="showGrid" />
  <input type="checkbox" id="bloomEnabled" />
  <input id="bloomStrength" />
  <input type="checkbox" id="autoRotate" />
  <input id="rotationSpeed" />
  <button id="resetCamera"></button>
  <button id="fitToView"></button>
  <button id="screenshotBtn"></button>
  <button id="playBtn"></button>
  <button id="pauseBtn"></button>
  <button id="resetBtn"></button>
  <span id="vertexCount"></span>
  <span id="faceCount"></span>
  <span id="fpsCounter"></span>
  <div id="progressBar"></div>
  <div class="progress-text"></div>
  <div class="progress-fill"></div>
  <div id="errorMessage"></div>
  <div id="fadeOverlay"></div>
  <div id="superheroControls"></div>
  <div class="audio-indicator"></div>
`;

// Mock Three.js
global.THREE = {
  Scene: jest.fn(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    background: null,
    environment: null
  })),
  PerspectiveCamera: jest.fn(() => ({
    position: { set: jest.fn(), clone: jest.fn() },
    lookAt: jest.fn(),
    aspect: 1,
    updateProjectionMatrix: jest.fn()
  })),
  WebGLRenderer: jest.fn(() => ({
    setSize: jest.fn(),
    setPixelRatio: jest.fn(),
    shadowMap: {},
    domElement: document.createElement('canvas'),
    render: jest.fn(),
  })),
  Color: jest.fn(),
  Clock: jest.fn(() => ({
    getDelta: jest.fn(() => 0.016)
  })),
  OrbitControls: jest.fn(() => ({
    enableDamping: false,
    update: jest.fn()
  })),
  AmbientLight: jest.fn(),
  DirectionalLight: jest.fn(() => ({
    position: { set: jest.fn() },
    shadow: { mapSize: {}, camera: {} }
  })),
  PlaneGeometry: jest.fn(),
  MeshLambertMaterial: jest.fn(),
  Mesh: jest.fn(() => ({
    position: { y: 0 },
    rotation: { x: 0 }
  })),
  GridHelper: jest.fn(() => ({
    material: {}
  })),
  DirectionalLightHelper: jest.fn(),
  CanvasTexture: jest.fn((canvas) => ({
    isTexture: true,
    canvas: canvas
  })),
  EquirectangularReflectionMapping: 1,
  PCFSoftShadowMap: 1,
  ACESFilmicToneMapping: 1
};

// Evaluate the script in the context of global/window so ModelViewer is assigned to window
const scriptContent = fs.readFileSync(path.resolve(__dirname, '../script.js'), 'utf8');
const ModelViewer = eval(scriptContent + '; ModelViewer;');

describe('ModelViewer', () => {
    let viewer;
    let mockContext;

    beforeEach(() => {
        // Clear mocks
        jest.clearAllMocks();

        mockContext = {
            createLinearGradient: jest.fn(() => ({
                addColorStop: jest.fn()
            })),
            fillRect: jest.fn(),
            beginPath: jest.fn(),
            arc: jest.fn(),
            fill: jest.fn()
        };

        // Mock Canvas getContext before creating ModelViewer
        HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext);

        viewer = new ModelViewer();
    });

    describe('updateBackground', () => {
        it('should update background to gradient', () => {
            const createElementSpy = jest.spyOn(document, 'createElement');

            viewer.updateBackground('gradient');

            expect(createElementSpy).toHaveBeenCalledWith('canvas');
            expect(mockContext.createLinearGradient).toHaveBeenCalledWith(0, 0, 0, 512);
            expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 512, 512);
            expect(THREE.CanvasTexture).toHaveBeenCalled();
            expect(viewer.scene.background.isTexture).toBe(true);

            createElementSpy.mockRestore();
        });

        it('should update background to solid color', () => {
            document.getElementById('bgColor').value = '#ff0000';

            viewer.updateBackground('solid');

            expect(THREE.Color).toHaveBeenCalledWith('#ff0000');
            expect(viewer.scene.background).toBeInstanceOf(THREE.Color);
        });

        it('should update background to hdri', () => {
             const createElementSpy = jest.spyOn(document, 'createElement');

             viewer.updateBackground('hdri');

             expect(createElementSpy).toHaveBeenCalledWith('canvas');
             expect(mockContext.createLinearGradient).toHaveBeenCalledWith(0, 0, 0, 512);
             expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 1024, 512);
             expect(mockContext.beginPath).toHaveBeenCalled();
             expect(mockContext.arc).toHaveBeenCalledWith(800, 100, 50, 0, Math.PI * 2);
             expect(mockContext.fill).toHaveBeenCalled();
             expect(THREE.CanvasTexture).toHaveBeenCalled();
             expect(viewer.scene.background.isTexture).toBe(true);
             expect(viewer.scene.environment.isTexture).toBe(true);

             createElementSpy.mockRestore();
        });

        it('should not update background for unknown type', () => {
            const originalBackground = viewer.scene.background;
            viewer.updateBackground('unknown_type');
            expect(viewer.scene.background).toBe(originalBackground);
        });
    });
});
