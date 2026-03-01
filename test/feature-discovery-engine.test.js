/**
 * FeatureDiscoveryEngine Tests
 */
describe('FeatureDiscoveryEngine', () => {
    let mockCore;
    let engine;
    let FeatureDiscoveryEngine;

    beforeEach(async () => {
        mockCore = { emit: jest.fn(), on: jest.fn() };
        const module = await import('../src/ui/FeatureDiscoveryEngine.js');
        FeatureDiscoveryEngine = module.FeatureDiscoveryEngine;
        engine = new FeatureDiscoveryEngine(mockCore);
        // Clear localStorage
        localStorage.clear();
        await engine.initialize();
    });

    afterEach(() => {
        localStorage.clear();
    });

    test('should initialize correctly', () => {
        expect(engine.initialized).toBe(true);
        expect(engine.behaviorProfile).toBeDefined();
    });

    test('should track event usage', () => {
        engine.trackEvent('test-event');
        expect(engine.behaviorProfile.featureUsage.get('test-event')).toBe(1);
    });

    test('should queue suggestions', () => {
        engine.features['lighting-presets'] = {};
        engine.queueSuggestion('lighting-presets', 'high');
        expect(engine.suggestionQueue).toBeDefined();
    });

    test('should track feature usage and update skill level', () => {
        engine.trackFeatureUsage('camera-controls');
        expect(engine.behaviorProfile.featureUsage.get('camera-controls')).toBe(1);
        expect(engine.behaviorProfile.skillLevel).toBeDefined();
    });

    test('should get skill level', () => {
        expect(engine.getSkillLevel()).toBe('beginner');
    });
});
