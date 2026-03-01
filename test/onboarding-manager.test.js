/**
 * Comprehensive Test Suite for OnboardingManager
 * Tests intelligent onboarding, tooltips, and progressive feature discovery
 */

describe('OnboardingManager', () => {
    let mockCore;
    let onboardingManager;
    let OnboardingManager;

    beforeEach(async () => {
        // Mock CoreEngine
        mockCore = {
            modules: new Map(),
            eventListeners: new Map(),
            getModule: function(name) { return this.modules.get(name); },
            registerModule: function(name, module) { this.modules.set(name, module); },
            emit: function(event, data) {
                if (this.eventListeners.has(event)) {
                    this.eventListeners.get(event).forEach(callback => callback(data));
                }
            },
            on: function(event, callback) {
                if (!this.eventListeners.has(event)) {
                    this.eventListeners.set(event, []);
                }
                this.eventListeners.get(event).push(callback);
            },
            off: function(event, callback) {
                if (this.eventListeners.has(event)) {
                    const callbacks = this.eventListeners.get(event);
                    const index = callbacks.indexOf(callback);
                    if (index > -1) {
                        callbacks.splice(index, 1);
                    }
                }
            }
        };

        // Import module
        const module = await import('../src/ui/OnboardingManager.js');
        OnboardingManager = module.OnboardingManager;
        
        onboardingManager = new OnboardingManager(mockCore);
        await onboardingManager.initialize();
    });

    afterEach(() => {
        if (onboardingManager) {
            onboardingManager.destroy();
        }
        // Clean up DOM
        document.body.innerHTML = '';
        localStorage.clear();
    });

    describe('Initialization', () => {
        test('should initialize with correct default values', () => {
            expect(onboardingManager.coreEngine).toBe(mockCore);
            expect(onboardingManager.initialized).toBe(true);
            expect(onboardingManager.currentStep).toBe(0);
            expect(onboardingManager.isActive).toBe(false);
        });

        test('should load user progress from localStorage', () => {
            localStorage.setItem('onboarding_progress', JSON.stringify({
                completedSteps: ['welcome', 'load-model'],
                skipped: false,
                lastSeen: Date.now()
            }));

            const newManager = new OnboardingManager(mockCore);
            expect(newManager.userProgress.completedSteps).toContain('welcome');
            expect(newManager.userProgress.completedSteps).toContain('load-model');
        });

        test('should create overlay container in DOM', () => {
            const overlay = document.querySelector('.onboarding-overlay');
            expect(overlay).toBeTruthy();
        });

        test('should register event listeners', () => {
            expect(mockCore.eventListeners.has('modelLoaded')).toBe(true);
            expect(mockCore.eventListeners.has('featureUsed')).toBe(true);
        });
    });

    describe('First-Time User Detection', () => {
        test('should detect first-time user', () => {
            localStorage.clear();
            const isFirstTime = onboardingManager.isFirstTimeUser();
            expect(isFirstTime).toBe(true);
        });

        test('should detect returning user', () => {
            localStorage.setItem('onboarding_completed', 'true');
            const isFirstTime = onboardingManager.isFirstTimeUser();
            expect(isFirstTime).toBe(false);
        });

        test('should auto-start onboarding for first-time users', async () => {
            localStorage.clear();
            const newManager = new OnboardingManager(mockCore);
            await newManager.initialize();
            
            // Should start automatically
            setTimeout(() => {
                expect(newManager.isActive).toBe(true);
            }, 100);
        });
    });

    describe('Onboarding Flow', () => {
        test('should start onboarding flow', () => {
            onboardingManager.start();
            
            expect(onboardingManager.isActive).toBe(true);
            expect(onboardingManager.currentStep).toBe(0);
            
            const overlay = document.querySelector('.onboarding-overlay');
            expect(overlay.classList.contains('active')).toBe(true);
        });

        test('should show welcome step', () => {
            onboardingManager.start();
            
            const tooltip = document.querySelector('.onboarding-tooltip');
            expect(tooltip).toBeTruthy();
            expect(tooltip.textContent).toContain('Welcome');
        });

        test('should advance to next step', () => {
            onboardingManager.start();
            const initialStep = onboardingManager.currentStep;
            
            onboardingManager.nextStep();
            
            expect(onboardingManager.currentStep).toBe(initialStep + 1);
        });

        test('should go to previous step', () => {
            onboardingManager.start();
            onboardingManager.nextStep();
            const currentStep = onboardingManager.currentStep;
            
            onboardingManager.previousStep();
            
            expect(onboardingManager.currentStep).toBe(currentStep - 1);
        });

        test('should not go below step 0', () => {
            onboardingManager.start();
            onboardingManager.previousStep();
            
            expect(onboardingManager.currentStep).toBe(0);
        });

        test('should complete onboarding at final step', () => {
            onboardingManager.start();
            
            // Advance to last step
            while (onboardingManager.currentStep < onboardingManager.steps.length - 1) {
                onboardingManager.nextStep();
            }
            
            onboardingManager.nextStep();
            
            expect(onboardingManager.isActive).toBe(false);
            expect(localStorage.getItem('onboarding_completed')).toBe('true');
        });

        test('should skip onboarding', () => {
            onboardingManager.start();
            onboardingManager.skip();
            
            expect(onboardingManager.isActive).toBe(false);
            expect(onboardingManager.userProgress.skipped).toBe(true);
        });

        test('should emit events during flow', () => {
            let eventEmitted = false;
            mockCore.on('onboarding:started', () => {
                eventEmitted = true;
            });
            
            onboardingManager.start();
            expect(eventEmitted).toBe(true);
        });
    });

    describe('Context-Aware Tooltips', () => {
        test('should show tooltip for element', () => {
            const button = document.createElement('button');
            button.id = 'test-button';
            document.body.appendChild(button);
            
            onboardingManager.showTooltip('test-button', 'Test tooltip', 'top');
            
            const tooltip = document.querySelector('.onboarding-tooltip');
            expect(tooltip).toBeTruthy();
            expect(tooltip.textContent).toContain('Test tooltip');
        });

        test('should position tooltip correctly', () => {
            const button = document.createElement('button');
            button.id = 'test-button';
            button.style.position = 'absolute';
            button.style.top = '100px';
            button.style.left = '100px';
            document.body.appendChild(button);
            
            onboardingManager.showTooltip('test-button', 'Test', 'top');
            
            const tooltip = document.querySelector('.onboarding-tooltip');
            expect(tooltip.style.position).toBe('absolute');
        });

        test('should hide tooltip', () => {
            const button = document.createElement('button');
            button.id = 'test-button';
            document.body.appendChild(button);
            
            onboardingManager.showTooltip('test-button', 'Test');
            onboardingManager.hideTooltip();
            
            const tooltip = document.querySelector('.onboarding-tooltip');
            expect(tooltip).toBeFalsy();
        });

        test('should highlight target element', () => {
            const button = document.createElement('button');
            button.id = 'test-button';
            document.body.appendChild(button);
            
            onboardingManager.showTooltip('test-button', 'Test');
            
            expect(button.classList.contains('onboarding-highlight')).toBe(true);
        });

        test('should remove highlight when hiding tooltip', () => {
            const button = document.createElement('button');
            button.id = 'test-button';
            document.body.appendChild(button);
            
            onboardingManager.showTooltip('test-button', 'Test');
            onboardingManager.hideTooltip();
            
            expect(button.classList.contains('onboarding-highlight')).toBe(false);
        });
    });

    describe('Progressive Feature Discovery', () => {
        test('should track feature usage', () => {
            onboardingManager.trackFeatureUsage('camera-controls');
            
            expect(onboardingManager.featureUsage.has('camera-controls')).toBe(true);
            expect(onboardingManager.featureUsage.get('camera-controls')).toBe(1);
        });

        test('should increment usage count', () => {
            onboardingManager.trackFeatureUsage('camera-controls');
            onboardingManager.trackFeatureUsage('camera-controls');
            
            expect(onboardingManager.featureUsage.get('camera-controls')).toBe(2);
        });

        test('should suggest next feature based on usage', () => {
            onboardingManager.trackFeatureUsage('load-model');
            onboardingManager.trackFeatureUsage('load-model');
            onboardingManager.trackFeatureUsage('load-model');
            
            const suggestion = onboardingManager.suggestNextFeature();
            expect(suggestion).toBeTruthy();
            expect(suggestion.id).toBeDefined();
        });

        test('should not suggest already used features', () => {
            // Mark all features as used
            onboardingManager.advancedFeatures.forEach(feature => {
                onboardingManager.trackFeatureUsage(feature.id);
            });
            
            const suggestion = onboardingManager.suggestNextFeature();
            expect(suggestion).toBeFalsy();
        });

        test('should show feature hint', () => {
            const feature = {
                id: 'test-feature',
                name: 'Test Feature',
                description: 'Test description',
                trigger: 'test-button'
            };
            
            const button = document.createElement('button');
            button.id = 'test-button';
            document.body.appendChild(button);
            
            onboardingManager.showFeatureHint(feature);
            
            const hint = document.querySelector('.feature-hint');
            expect(hint).toBeTruthy();
        });
    });

    describe('User Progress Tracking', () => {
        test('should save progress to localStorage', () => {
            onboardingManager.userProgress.completedSteps.push('welcome');
            onboardingManager.saveProgress();
            
            const saved = JSON.parse(localStorage.getItem('onboarding_progress'));
            expect(saved.completedSteps).toContain('welcome');
        });

        test('should mark step as completed', () => {
            onboardingManager.markStepCompleted('load-model');
            
            expect(onboardingManager.userProgress.completedSteps).toContain('load-model');
        });

        test('should check if step is completed', () => {
            onboardingManager.markStepCompleted('load-model');
            
            const isCompleted = onboardingManager.isStepCompleted('load-model');
            expect(isCompleted).toBe(true);
        });

        test('should calculate completion percentage', () => {
            onboardingManager.markStepCompleted('welcome');
            onboardingManager.markStepCompleted('load-model');
            
            const percentage = onboardingManager.getCompletionPercentage();
            expect(percentage).toBeGreaterThan(0);
            expect(percentage).toBeLessThanOrEqual(100);
        });
    });

    describe('Interactive Elements', () => {
        test('should handle button clicks', () => {
            onboardingManager.start();
            
            const nextButton = document.querySelector('.onboarding-next');
            expect(nextButton).toBeTruthy();
            
            const initialStep = onboardingManager.currentStep;
            nextButton.click();
            
            expect(onboardingManager.currentStep).toBe(initialStep + 1);
        });

        test('should handle skip button', () => {
            onboardingManager.start();
            
            const skipButton = document.querySelector('.onboarding-skip');
            skipButton.click();
            
            expect(onboardingManager.isActive).toBe(false);
        });

        test('should handle close button', () => {
            onboardingManager.start();
            
            const closeButton = document.querySelector('.onboarding-close');
            if (closeButton) {
                closeButton.click();
                expect(onboardingManager.isActive).toBe(false);
            }
        });
    });

    describe('Event Integration', () => {
        test('should respond to modelLoaded event', () => {
            onboardingManager.start();
            
            mockCore.emit('modelLoaded', { modelName: 'test.glb' });
            
            expect(onboardingManager.userProgress.completedSteps).toContain('load-model');
        });

        test('should respond to featureUsed event', () => {
            mockCore.emit('featureUsed', { feature: 'camera-controls' });
            
            expect(onboardingManager.featureUsage.has('camera-controls')).toBe(true);
        });

        test('should emit progress events', () => {
            let progressEvent = null;
            mockCore.on('onboarding:progress', (data) => {
                progressEvent = data;
            });
            
            onboardingManager.markStepCompleted('welcome');
            
            expect(progressEvent).toBeTruthy();
            expect(progressEvent.step).toBe('welcome');
        });
    });

    describe('Accessibility', () => {
        test('should have ARIA labels', () => {
            onboardingManager.start();
            
            const overlay = document.querySelector('.onboarding-overlay');
            expect(overlay.getAttribute('role')).toBe('dialog');
            expect(overlay.getAttribute('aria-label')).toBeTruthy();
        });

        test('should support keyboard navigation', () => {
            onboardingManager.start();
            
            const event = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(event);
            
            // Should close on Escape
            setTimeout(() => {
                expect(onboardingManager.isActive).toBe(false);
            }, 100);
        });

        test('should have focusable elements', () => {
            onboardingManager.start();
            
            const buttons = document.querySelectorAll('.onboarding-overlay button');
            buttons.forEach(button => {
                expect(button.tabIndex).toBeGreaterThanOrEqual(0);
            });
        });
    });

    describe('Cleanup and Destroy', () => {
        test('should remove event listeners on destroy', () => {
            const listenerCount = mockCore.eventListeners.get('modelLoaded')?.length || 0;
            
            onboardingManager.destroy();
            
            const newCount = mockCore.eventListeners.get('modelLoaded')?.length || 0;
            expect(newCount).toBeLessThan(listenerCount);
        });

        test('should remove DOM elements on destroy', () => {
            onboardingManager.start();
            onboardingManager.destroy();
            
            const overlay = document.querySelector('.onboarding-overlay');
            expect(overlay).toBeFalsy();
        });

        test('should reset state on destroy', () => {
            onboardingManager.start();
            onboardingManager.destroy();
            
            expect(onboardingManager.initialized).toBe(false);
            expect(onboardingManager.isActive).toBe(false);
        });
    });

    describe('Edge Cases', () => {
        test('should handle missing DOM elements gracefully', () => {
            expect(() => {
                onboardingManager.showTooltip('non-existent-element', 'Test');
            }).not.toThrow();
        });

        test('should handle invalid step index', () => {
            onboardingManager.currentStep = 999;
            expect(() => {
                onboardingManager.showCurrentStep();
            }).not.toThrow();
        });

        test('should handle corrupted localStorage data', () => {
            localStorage.setItem('onboarding_progress', 'invalid json');
            
            expect(() => {
                const newManager = new OnboardingManager(mockCore);
            }).not.toThrow();
        });

        test('should handle rapid start/stop calls', () => {
            expect(() => {
                onboardingManager.start();
                onboardingManager.skip();
                onboardingManager.start();
                onboardingManager.skip();
            }).not.toThrow();
        });
    });
});
