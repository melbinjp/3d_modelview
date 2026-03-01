/**
 * MobileGestureManager Tests
 */
describe('MobileGestureManager', () => {
    let mockCore;
    let manager;
    let MobileGestureManager;

    beforeEach(async () => {
        mockCore = { emit: jest.fn(), on: jest.fn() };
        // Create mock canvas and append to fake viewer Container
        const container = document.createElement('div');
        container.id = 'viewerContainer';
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);
        document.body.appendChild(container);

        const module = await import('../src/ui/MobileGestureManager.js');
        MobileGestureManager = module.MobileGestureManager;
        manager = new MobileGestureManager(mockCore);
        await manager.initialize();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        if (manager) manager.destroy();
    });

    test('should initialize correctly', () => {
        expect(manager.initialized).toBe(true);
        expect(manager.touches).toBeDefined();
    });

    test('should detect mobile device', () => {
        const isMobile = manager.isMobileDevice();
        expect(typeof isMobile).toBe('boolean');
    });

    test('should clean old touches', () => {
        manager.touchHistory = [{ timestamp: 0 }];
        manager.cleanupOldTouches();
        expect(manager.touchHistory.length).toBe(0);
    });

    test('should get gesture description', () => {
        const desc = manager.getGestureDescription('tap');
        expect(desc).toBeDefined();
        expect(typeof desc).toBe('string');
    });

    test('should disable haptic feedback', () => {
        manager.setHapticEnabled(false);
        expect(manager.hapticSupported).toBe(false);
    });
});
