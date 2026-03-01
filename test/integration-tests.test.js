/**
 * Integration Tests Suite
 */
describe('Integration Tests Suite', () => {
    let testContainer;
    let modelViewer;

    beforeEach(() => {
        testContainer = document.createElement('div');
        testContainer.id = 'integration-test-container';
        document.body.appendChild(testContainer);

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
            modelViewer.initialized = false;
            modelViewer = null;
        }
        document.body.innerHTML = '';
        jest.clearAllMocks();
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
        });

        it('should register all core modules with engine', async () => {
            const { ModelViewer } = await import('../src/ModelViewer.js');
            modelViewer = new ModelViewer();

            expect(modelViewer.core.modules.has('rendering')).toBe(true);
            expect(modelViewer.core.modules.has('assets')).toBe(true);
            expect(modelViewer.core.modules.has('ui')).toBe(true);
            expect(modelViewer.core.modules.has('export')).toBe(true);
            expect(modelViewer.core.modules.has('analysis')).toBe(true);
        });
    });
});