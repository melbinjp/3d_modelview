/**
 * Test suite for modular architecture
 */

// Mock DOM elements for testing
const mockDOM = () => {
    global.document = {
        getElementById: (id) => ({
            classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
            addEventListener: () => {},
            style: {},
            textContent: '',
            innerHTML: '',
            appendChild: () => {},
            querySelector: () => null,
            querySelectorAll: () => []
        }),
        createElement: () => ({
            classList: { add: () => {}, remove: () => {}, toggle: () => {} },
            addEventListener: () => {},
            style: {},
            appendChild: () => {}
        }),
        addEventListener: () => {},
        querySelectorAll: () => []
    };
    
    global.window = {
        addEventListener: () => {},
        innerWidth: 1024,
        innerHeight: 768,
        devicePixelRatio: 1
    };
    
    global.localStorage = {
        getItem: () => null,
        setItem: () => {}
    };
};

describe('Modular Architecture', () => {
    beforeEach(() => {
        mockDOM();
    });

    describe('CoreEngine', () => {
        let CoreEngine;
        
        beforeAll(async () => {
            const module = await import('../src/core/CoreEngine.js');
            CoreEngine = module.CoreEngine;
        });

        it('should initialize successfully', async () => {
            const core = new CoreEngine();
            expect(core.initialized).toBe(false);
            
            await core.init();
            expect(core.initialized).toBe(true);
        });

        it('should register and retrieve modules', () => {
            const core = new CoreEngine();
            const mockModule = { name: 'test' };
            
            core.registerModule('test', mockModule);
            expect(core.getModule('test')).toBe(mockModule);
        });

        it('should handle events correctly', () => {
            const core = new CoreEngine();
            let eventFired = false;
            
            core.on('test:event', () => {
                eventFired = true;
            });
            
            core.emit('test:event');
            expect(eventFired).toBe(true);
        });

        it('should manage state correctly', () => {
            const core = new CoreEngine();
            
            core.setState({ test: 'value' });
            expect(core.getState().test).toBe('value');
            
            core.updateState('nested.property', 'nested value');
            expect(core.getState().nested.property).toBe('nested value');
        });
    });

    describe('RenderingEngine', () => {
        let RenderingEngine, CoreEngine;
        
        beforeAll(async () => {
            const coreModule = await import('../src/core/CoreEngine.js');
            const renderingModule = await import('../src/rendering/RenderingEngine.js');
            CoreEngine = coreModule.CoreEngine;
            RenderingEngine = renderingModule.RenderingEngine;
        });

        it('should initialize with core engine', () => {
            const core = new CoreEngine();
            const rendering = new RenderingEngine(core);
            
            expect(rendering.core).toBe(core);
            expect(rendering.initialized).toBe(false);
        });
    });

    describe('AssetManager', () => {
        let AssetManager, CoreEngine;
        
        beforeAll(async () => {
            const coreModule = await import('../src/core/CoreEngine.js');
            const assetModule = await import('../src/assets/AssetManager.js');
            CoreEngine = coreModule.CoreEngine;
            AssetManager = assetModule.AssetManager;
        });

        it('should initialize with core engine', () => {
            const core = new CoreEngine();
            const assets = new AssetManager(core);
            
            expect(assets.core).toBe(core);
            expect(assets.initialized).toBe(false);
            
            assets.init();
            expect(assets.initialized).toBe(true);
        });

        it('should support multiple file formats', () => {
            const core = new CoreEngine();
            const assets = new AssetManager(core);
            
            const supportedFormats = assets.getSupportedFormats();
            expect(supportedFormats).toContain('gltf');
            expect(supportedFormats).toContain('glb');
            expect(supportedFormats).toContain('fbx');
            expect(supportedFormats).toContain('obj');
        });
    });

    describe('UIManager', () => {
        let UIManager, CoreEngine;
        
        beforeAll(async () => {
            const coreModule = await import('../src/core/CoreEngine.js');
            const uiModule = await import('../src/ui/UIManager.js');
            CoreEngine = coreModule.CoreEngine;
            UIManager = uiModule.UIManager;
        });

        it('should initialize with core engine', () => {
            const core = new CoreEngine();
            const ui = new UIManager(core);
            
            expect(ui.core).toBe(core);
            expect(ui.initialized).toBe(false);
            expect(ui.currentMode).toBe('simple');
        });

        it('should switch between UI modes', () => {
            const core = new CoreEngine();
            const ui = new UIManager(core);
            
            ui.setMode('advanced');
            expect(ui.currentMode).toBe('advanced');
            
            ui.setMode('simple');
            expect(ui.currentMode).toBe('simple');
        });
    });

    describe('ExportSystem', () => {
        let ExportSystem, CoreEngine;
        
        beforeAll(async () => {
            const coreModule = await import('../src/core/CoreEngine.js');
            const exportModule = await import('../src/export/ExportSystem.js');
            CoreEngine = coreModule.CoreEngine;
            ExportSystem = exportModule.ExportSystem;
        });

        it('should initialize with core engine', () => {
            const core = new CoreEngine();
            const exportSys = new ExportSystem(core);
            
            expect(exportSys.core).toBe(core);
            expect(exportSys.initialized).toBe(false);
            
            exportSys.init();
            expect(exportSys.initialized).toBe(true);
        });

        it('should have available formats and presets', () => {
            const core = new CoreEngine();
            const exportSys = new ExportSystem(core);
            
            const formats = exportSys.getAvailableFormats();
            const presets = exportSys.getAvailablePresets();
            
            expect(formats).toContain('gltf');
            expect(formats).toContain('glb');
            expect(presets).toContain('unity');
            expect(presets).toContain('web');
        });
    });
});