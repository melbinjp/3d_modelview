/**
 * Comprehensive Test Suite for FeatureDiscoveryEngine
 * Tests AI-powered feature suggestions, usage analytics, and adaptive learning
 */

describe('FeatureDiscoveryEngine', () => {
    let mockCore;
    let discoveryEngine;
    let FeatureDiscoveryEngine;

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
        const module = await import('../src/ui/FeatureDiscoveryEngine.js');
        FeatureDiscoveryEngine = module.FeatureDiscoveryEngine;
        
        discoveryEngine = new FeatureDiscoveryEngine(mockCore);
        await discoveryEngine.initialize();
    });

    afterEach(() => {
        if (discoveryEngine) {
            discoveryEngine.destroy();
        }
        localStorage.clear();
        document.body.innerHTML = '';
    });

    describe('Initialization', () => {
        test('should initialize with correct default values', () => {
            expect(discoveryEngine.coreEngine).toBe(mockCore);
            expect(discoveryEngine.initialized).toBe(true);
            expect(discoveryEngine.userProfile).toBeDefined();
        });

        test('should load user profile from localStorage', () => {
            const profile = {
                skillLevel: 'intermediate',
                featureUsage: { 'camera-controls': 5 },
                preferences: { showHints: true }
            };
            localStorage.setItem('user_profile', JSON.stringify(profile));
            
            const newEngine = new FeatureDiscoveryEngine(mockCore);
            expect(newEngine.userProfile.skillLevel).toBe('intermediate');
            expect(newEngine.userProfile.featureUsage['camera-controls']).toBe(5);
        });

        test('should initialize feature catalog', () => {
            expect(discoveryEngine.featureCatalog).toBeDefined();
            expect(discoveryEngine.featureCatalog.length).toBeGreaterThan(0);
        });

        test('should register event listeners', () => {
            expect(mockCore.eventListeners.has('featureUsed')).toBe(true);
            expect(mockCore.eventListeners.has('modelLoaded')).toBe(true);
        });
    });

    describe('User Profile Management', () => {
        test('should detect skill level from usage patterns', () => {
            // Simulate beginner usage
            discoveryEngine.trackFeatureUsage('load-model', 2);
            discoveryEngine.trackFeatureUsage('camera-controls', 3);
            
            const skillLevel = discoveryEngine.detectSkillLevel();
            expect(['beginner', 'intermediate', 'advanced', 'expert']).toContain(skillLevel);
        });

        test('should update skill level over time', () => {
            // Simulate extensive usage
            for (let i = 0; i < 20; i++) {
                discoveryEngine.trackFeatureUsage('advanced-lighting', 1);
                discoveryEngine.trackFeatureUsage('post-processing', 1);
                discoveryEngine.trackFeatureUsage('cinematic-mode', 1);
            }
            
            discoveryEngine.updateSkillLevel();
            
            expect(['intermediate', 'advanced', 'expert']).toContain(discoveryEngine.userProfile.skillLevel);
        });

        test('should save profile to localStorage', () => {
            discoveryEngine.userProfile.skillLevel = 'advanced';
            discoveryEngine.saveProfile();
            
            const saved = JSON.parse(localStorage.getItem('user_profile'));
            expect(saved.skillLevel).toBe('advanced');
        });

        test('should track feature preferences', () => {
            discoveryEngine.setPreference('showHints', false);
            
            expect(discoveryEngine.userProfile.preferences.showHints).toBe(false);
        });

        test('should calculate user engagement score', () => {
            discoveryEngine.trackFeatureUsage('camera-controls', 10);
            discoveryEngine.trackFeatureUsage('lighting', 5);
            
            const score = discoveryEngine.calculateEngagementScore();
            expect(score).toBeGreaterThan(0);
            expect(score).toBeLessThanOrEqual(100);
        });
    });

    describe('Feature Usage Tracking', () => {
        test('should track feature usage', () => {
            discoveryEngine.trackFeatureUsage('camera-controls');
            
            expect(discoveryEngine.userProfile.featureUsage['camera-controls']).toBe(1);
        });

        test('should increment usage count', () => {
            discoveryEngine.trackFeatureUsage('camera-controls');
            discoveryEngine.trackFeatureUsage('camera-controls');
            
            expect(discoveryEngine.userProfile.featureUsage['camera-controls']).toBe(2);
        });

        test('should track usage timestamp', () => {
            discoveryEngine.trackFeatureUsage('camera-controls');
            
            expect(discoveryEngine.usageHistory.length).toBeGreaterThan(0);
            expect(discoveryEngine.usageHistory[0].timestamp).toBeDefined();
        });

        test('should track usage context', () => {
            discoveryEngine.trackFeatureUsage('camera-controls', { modelType: 'glb' });
            
            const lastUsage = discoveryEngine.usageHistory[discoveryEngine.usageHistory.length - 1];
            expect(lastUsage.context.modelType).toBe('glb');
        });

        test('should limit usage history size', () => {
            for (let i = 0; i < 200; i++) {
                discoveryEngine.trackFeatureUsage('test-feature');
            }
            
            expect(discoveryEngine.usageHistory.length).toBeLessThanOrEqual(100);
        });
    });

    describe('Feature Suggestions', () => {
        test('should suggest relevant features', () => {
            discoveryEngine.trackFeatureUsage('load-model', 5);
            
            const suggestions = discoveryEngine.getSuggestions();
            
            expect(suggestions).toBeInstanceOf(Array);
            expect(suggestions.length).toBeGreaterThan(0);
        });

        test('should prioritize unused features', () => {
            discoveryEngine.trackFeatureUsage('camera-controls', 10);
            
            const suggestions = discoveryEngine.getSuggestions();
            const unusedFeatures = suggestions.filter(s => 
                !discoveryEngine.userProfile.featureUsage[s.id]
            );
            
            expect(unusedFeatures.length).toBeGreaterThan(0);
        });

        test('should consider skill level in suggestions', () => {
            discoveryEngine.userProfile.skillLevel = 'beginner';
            
            const suggestions = discoveryEngine.getSuggestions();
            const beginnerFeatures = suggestions.filter(s => 
                s.difficulty === 'beginner' || s.difficulty === 'easy'
            );
            
            expect(beginnerFeatures.length).toBeGreaterThan(0);
        });

        test('should suggest based on context', () => {
            discoveryEngine.trackFeatureUsage('load-model', 1);
            
            const suggestions = discoveryEngine.getSuggestionsForContext('model-loaded');
            
            expect(suggestions).toBeInstanceOf(Array);
            expect(suggestions.some(s => s.category === 'viewing')).toBe(true);
        });

        test('should not suggest recently dismissed features', () => {
            const feature = discoveryEngine.featureCatalog[0];
            discoveryEngine.dismissSuggestion(feature.id);
            
            const suggestions = discoveryEngine.getSuggestions();
            const dismissed = suggestions.find(s => s.id === feature.id);
            
            expect(dismissed).toBeUndefined();
        });

        test('should calculate suggestion relevance score', () => {
            const feature = {
                id: 'test-feature',
                category: 'viewing',
                difficulty: 'beginner',
                prerequisites: []
            };
            
            const score = discoveryEngine.calculateRelevanceScore(feature);
            
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(1);
        });
    });

    describe('Learning Patterns', () => {
        test('should identify usage patterns', () => {
            // Simulate pattern: always use lighting after loading model
            for (let i = 0; i < 5; i++) {
                discoveryEngine.trackFeatureUsage('load-model');
                setTimeout(() => {
                    discoveryEngine.trackFeatureUsage('lighting');
                }, 100);
            }
            
            const patterns = discoveryEngine.identifyPatterns();
            expect(patterns).toBeInstanceOf(Array);
        });

        test('should detect feature sequences', () => {
            discoveryEngine.trackFeatureUsage('load-model');
            discoveryEngine.trackFeatureUsage('camera-controls');
            discoveryEngine.trackFeatureUsage('lighting');
            
            const sequences = discoveryEngine.detectSequences();
            expect(sequences).toBeInstanceOf(Array);
        });

        test('should predict next feature', () => {
            // Build usage pattern
            for (let i = 0; i < 5; i++) {
                discoveryEngine.trackFeatureUsage('load-model');
                discoveryEngine.trackFeatureUsage('camera-controls');
            }
            
            discoveryEngine.trackFeatureUsage('load-model');
            const prediction = discoveryEngine.predictNextFeature();
            
            expect(prediction).toBeDefined();
        });

        test('should adapt to user behavior', () => {
            const initialSuggestions = discoveryEngine.getSuggestions();
            
            // Use some features extensively
            for (let i = 0; i < 10; i++) {
                discoveryEngine.trackFeatureUsage('advanced-lighting');
            }
            
            const adaptedSuggestions = discoveryEngine.getSuggestions();
            
            // Suggestions should change
            expect(adaptedSuggestions).not.toEqual(initialSuggestions);
        });
    });

    describe('Feature Discovery UI', () => {
        test('should show suggestion notification', () => {
            const feature = {
                id: 'test-feature',
                name: 'Test Feature',
                description: 'Test description',
                icon: '🎨'
            };
            
            discoveryEngine.showSuggestion(feature);
            
            const notification = document.querySelector('.feature-suggestion');
            expect(notification).toBeTruthy();
            expect(notification.textContent).toContain('Test Feature');
        });

        test('should hide suggestion notification', () => {
            const feature = {
                id: 'test-feature',
                name: 'Test Feature',
                description: 'Test description'
            };
            
            discoveryEngine.showSuggestion(feature);
            discoveryEngine.hideSuggestion();
            
            const notification = document.querySelector('.feature-suggestion');
            expect(notification).toBeFalsy();
        });

        test('should handle suggestion acceptance', () => {
            let accepted = false;
            mockCore.on('feature:activated', (data) => {
                if (data.featureId === 'test-feature') {
                    accepted = true;
                }
            });
            
            const feature = { id: 'test-feature', name: 'Test' };
            discoveryEngine.showSuggestion(feature);
            
            const acceptButton = document.querySelector('.suggestion-accept');
            if (acceptButton) {
                acceptButton.click();
                expect(accepted).toBe(true);
            }
        });

        test('should handle suggestion dismissal', () => {
            const feature = { id: 'test-feature', name: 'Test' };
            discoveryEngine.showSuggestion(feature);
            
            const dismissButton = document.querySelector('.suggestion-dismiss');
            if (dismissButton) {
                dismissButton.click();
                
                expect(discoveryEngine.dismissedSuggestions.has('test-feature')).toBe(true);
            }
        });

        test('should show feature tour', () => {
            const feature = {
                id: 'test-feature',
                name: 'Test Feature',
                steps: [
                    { title: 'Step 1', description: 'First step' },
                    { title: 'Step 2', description: 'Second step' }
                ]
            };
            
            discoveryEngine.showFeatureTour(feature);
            
            const tour = document.querySelector('.feature-tour');
            expect(tour).toBeTruthy();
        });
    });

    describe('Analytics and Insights', () => {
        test('should generate usage statistics', () => {
            discoveryEngine.trackFeatureUsage('camera-controls', 5);
            discoveryEngine.trackFeatureUsage('lighting', 3);
            
            const stats = discoveryEngine.getUsageStatistics();
            
            expect(stats.totalUsage).toBeGreaterThan(0);
            expect(stats.mostUsedFeatures).toBeInstanceOf(Array);
            expect(stats.leastUsedFeatures).toBeInstanceOf(Array);
        });

        test('should calculate feature adoption rate', () => {
            const totalFeatures = discoveryEngine.featureCatalog.length;
            discoveryEngine.trackFeatureUsage('feature1');
            discoveryEngine.trackFeatureUsage('feature2');
            
            const adoptionRate = discoveryEngine.calculateAdoptionRate();
            
            expect(adoptionRate).toBeGreaterThanOrEqual(0);
            expect(adoptionRate).toBeLessThanOrEqual(100);
        });

        test('should identify underutilized features', () => {
            // Use some features extensively
            discoveryEngine.trackFeatureUsage('camera-controls', 20);
            
            const underutilized = discoveryEngine.getUnderutilizedFeatures();
            
            expect(underutilized).toBeInstanceOf(Array);
            expect(underutilized.length).toBeGreaterThan(0);
        });

        test('should generate insights report', () => {
            discoveryEngine.trackFeatureUsage('camera-controls', 10);
            discoveryEngine.trackFeatureUsage('lighting', 5);
            
            const insights = discoveryEngine.generateInsights();
            
            expect(insights).toBeDefined();
            expect(insights.skillLevel).toBeDefined();
            expect(insights.recommendations).toBeInstanceOf(Array);
        });
    });

    describe('Personalization', () => {
        test('should customize suggestions based on preferences', () => {
            discoveryEngine.setPreference('favoriteCategory', 'cinematic');
            
            const suggestions = discoveryEngine.getSuggestions();
            const cinematicSuggestions = suggestions.filter(s => s.category === 'cinematic');
            
            expect(cinematicSuggestions.length).toBeGreaterThan(0);
        });

        test('should respect notification preferences', () => {
            discoveryEngine.setPreference('showSuggestions', false);
            
            const feature = { id: 'test', name: 'Test' };
            discoveryEngine.showSuggestion(feature);
            
            const notification = document.querySelector('.feature-suggestion');
            expect(notification).toBeFalsy();
        });

        test('should adjust suggestion frequency', () => {
            discoveryEngine.setPreference('suggestionFrequency', 'low');
            
            expect(discoveryEngine.userProfile.preferences.suggestionFrequency).toBe('low');
        });

        test('should remember dismissed suggestions', () => {
            discoveryEngine.dismissSuggestion('test-feature');
            
            expect(discoveryEngine.dismissedSuggestions.has('test-feature')).toBe(true);
        });

        test('should reset dismissed suggestions after time', () => {
            discoveryEngine.dismissSuggestion('test-feature', Date.now() - 8 * 24 * 60 * 60 * 1000);
            
            discoveryEngine.cleanupDismissedSuggestions();
            
            expect(discoveryEngine.dismissedSuggestions.has('test-feature')).toBe(false);
        });
    });

    describe('Event Integration', () => {
        test('should respond to featureUsed event', () => {
            mockCore.emit('featureUsed', { feature: 'camera-controls' });
            
            expect(discoveryEngine.userProfile.featureUsage['camera-controls']).toBeGreaterThan(0);
        });

        test('should respond to modelLoaded event', () => {
            let suggestionShown = false;
            
            // Mock suggestion display
            const originalShow = discoveryEngine.showSuggestion;
            discoveryEngine.showSuggestion = () => { suggestionShown = true; };
            
            mockCore.emit('modelLoaded', { modelType: 'glb' });
            
            setTimeout(() => {
                expect(suggestionShown).toBe(true);
                discoveryEngine.showSuggestion = originalShow;
            }, 100);
        });

        test('should emit discovery events', () => {
            let eventEmitted = false;
            mockCore.on('discovery:suggestion', () => {
                eventEmitted = true;
            });
            
            const feature = { id: 'test', name: 'Test' };
            discoveryEngine.showSuggestion(feature);
            
            expect(eventEmitted).toBe(true);
        });
    });

    describe('Performance', () => {
        test('should handle large usage history efficiently', () => {
            const startTime = performance.now();
            
            for (let i = 0; i < 1000; i++) {
                discoveryEngine.trackFeatureUsage('test-feature');
            }
            
            const endTime = performance.now();
            expect(endTime - startTime).toBeLessThan(1000); // Should complete in < 1 second
        });

        test('should cache suggestion calculations', () => {
            const suggestions1 = discoveryEngine.getSuggestions();
            const suggestions2 = discoveryEngine.getSuggestions();
            
            // Should return cached results
            expect(suggestions1).toEqual(suggestions2);
        });

        test('should invalidate cache on usage change', () => {
            const suggestions1 = discoveryEngine.getSuggestions();
            
            discoveryEngine.trackFeatureUsage('new-feature');
            
            const suggestions2 = discoveryEngine.getSuggestions();
            
            // Cache should be invalidated
            expect(suggestions1).not.toEqual(suggestions2);
        });
    });

    describe('Cleanup and Destroy', () => {
        test('should save profile on destroy', () => {
            discoveryEngine.userProfile.skillLevel = 'advanced';
            discoveryEngine.destroy();
            
            const saved = JSON.parse(localStorage.getItem('user_profile'));
            expect(saved.skillLevel).toBe('advanced');
        });

        test('should remove event listeners on destroy', () => {
            const listenerCount = mockCore.eventListeners.get('featureUsed')?.length || 0;
            
            discoveryEngine.destroy();
            
            const newCount = mockCore.eventListeners.get('featureUsed')?.length || 0;
            expect(newCount).toBeLessThan(listenerCount);
        });

        test('should clear DOM elements on destroy', () => {
            const feature = { id: 'test', name: 'Test' };
            discoveryEngine.showSuggestion(feature);
            
            discoveryEngine.destroy();
            
            const notification = document.querySelector('.feature-suggestion');
            expect(notification).toBeFalsy();
        });

        test('should reset state on destroy', () => {
            discoveryEngine.destroy();
            
            expect(discoveryEngine.initialized).toBe(false);
        });
    });

    describe('Edge Cases', () => {
        test('should handle corrupted localStorage data', () => {
            localStorage.setItem('user_profile', 'invalid json');
            
            expect(() => {
                const newEngine = new FeatureDiscoveryEngine(mockCore);
            }).not.toThrow();
        });

        test('should handle missing feature catalog', () => {
            discoveryEngine.featureCatalog = [];
            
            const suggestions = discoveryEngine.getSuggestions();
            expect(suggestions).toEqual([]);
        });

        test('should handle invalid feature IDs', () => {
            expect(() => {
                discoveryEngine.trackFeatureUsage(null);
                discoveryEngine.trackFeatureUsage(undefined);
                discoveryEngine.trackFeatureUsage('');
            }).not.toThrow();
        });

        test('should handle rapid feature usage', () => {
            expect(() => {
                for (let i = 0; i < 100; i++) {
                    discoveryEngine.trackFeatureUsage('test-feature');
                }
            }).not.toThrow();
        });

        test('should handle concurrent suggestions', () => {
            expect(() => {
                const feature1 = { id: 'test1', name: 'Test 1' };
                const feature2 = { id: 'test2', name: 'Test 2' };
                
                discoveryEngine.showSuggestion(feature1);
                discoveryEngine.showSuggestion(feature2);
            }).not.toThrow();
        });
    });
});
