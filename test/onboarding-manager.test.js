/**
 * OnboardingManager Tests
 */
describe('OnboardingManager', () => {
    let mockCore;
    let manager;
    let OnboardingManager;

    beforeEach(async () => {
        mockCore = { emit: jest.fn(), on: jest.fn() };
        const module = await import('../src/ui/OnboardingManager.js');
        OnboardingManager = module.OnboardingManager;
        manager = new OnboardingManager(mockCore);
        // Clean start
        localStorage.clear();
        await manager.initialize();
    });

    test('should initialize correctly', () => {
        expect(manager.initialized).toBe(true);
        expect(manager.currentStep).toBe(0);
    });

    test('should track feature usage', () => {
        manager.trackFeatureUsage('camera-controls');
        expect(manager.userProgress.featuresUsed.has('camera-controls')).toBe(true);
    });

    test('should track completed steps', () => {
        manager.completeStep('welcome');
        expect(manager.completedSteps.has('welcome')).toBe(true);
        expect(manager.isStepCompleted('welcome')).toBe(true);
    });

    test('should calculate completion percentage', () => {
        manager.completeStep('welcome');
        const percentage = manager.getCompletionPercentage();
        expect(percentage).toBeGreaterThan(0);
        expect(percentage).toBeLessThanOrEqual(100);
    });

    test('should suggest next feature', () => {
        manager.userProgress.featuresUsed.add('camera-controls');
        const suggestion = manager.suggestNextFeature();
        expect(suggestion).toBeDefined();
        expect(suggestion.id).not.toBe('camera-controls');
    });
});
