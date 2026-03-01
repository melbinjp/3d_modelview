/**
 * FeatureDiscoveryEngine - ML-lite intelligent feature suggestion system
 * Analyzes user behavior to suggest relevant features at the right time
 */
export class FeatureDiscoveryEngine {
    constructor(coreEngine) {
        this.coreEngine = coreEngine;
        this.initialized = false;

        // User behavior tracking
        this.behaviorProfile = {
            modelTypes: new Map(), // Track types of models loaded
            featureUsage: new Map(), // Track feature usage frequency
            sessionPatterns: [], // Track session patterns
            skillLevel: 'beginner', // beginner, intermediate, expert
            preferences: new Map() // Inferred preferences
        };

        // Feature catalog with prerequisites and suggestions
        this.features = {
            'lighting-presets': {
                name: 'Lighting Presets',
                category: 'visual',
                difficulty: 'beginner',
                prerequisites: ['model-loaded'],
                suggestAfter: ['model-loaded:2'],
                description: 'One-click professional lighting setups',
                benefit: 'Make your models look stunning instantly'
            },
            'animation-controls': {
                name: 'Animation Controls',
                category: 'interaction',
                difficulty: 'beginner',
                prerequisites: ['model-with-animation'],
                suggestAfter: ['model-with-animation'],
                description: 'Play, pause, and control model animations',
                benefit: 'Bring your animated models to life'
            },
            'camera-presets': {
                name: 'Camera Presets',
                category: 'navigation',
                difficulty: 'beginner',
                prerequisites: ['model-loaded', 'camera-interaction:5'],
                suggestAfter: ['camera-interaction:10'],
                description: 'Quick camera angles (front, top, isometric)',
                benefit: 'View your model from perfect angles'
            },
            'export-screenshot': {
                name: 'Screenshot Export',
                category: 'sharing',
                difficulty: 'beginner',
                prerequisites: ['model-loaded'],
                suggestAfter: ['model-loaded:3', 'session-time:5min'],
                description: 'Capture high-quality images of your models',
                benefit: 'Share your work with others'
            },
            'post-processing': {
                name: 'Visual Effects',
                category: 'visual',
                difficulty: 'intermediate',
                prerequisites: ['lighting-used:3'],
                suggestAfter: ['lighting-used:5'],
                description: 'Bloom, SSAO, and other visual enhancements',
                benefit: 'Add cinematic quality to your renders'
            },
            'measurement-tools': {
                name: 'Measurement Tools',
                category: 'analysis',
                difficulty: 'intermediate',
                prerequisites: ['model-loaded:5'],
                suggestAfter: ['model-loaded:10', 'zoom-used:20'],
                description: 'Measure distances and analyze geometry',
                benefit: 'Get precise measurements of your models'
            },
            'material-editor': {
                name: 'Material Editor',
                category: 'editing',
                difficulty: 'intermediate',
                prerequisites: ['model-loaded:3', 'lighting-used:5'],
                suggestAfter: ['lighting-used:10'],
                description: 'Edit materials and textures',
                benefit: 'Customize the look of your models'
            },
            'physics-simulation': {
                name: 'Physics Simulation',
                category: 'advanced',
                difficulty: 'expert',
                prerequisites: ['model-loaded:10', 'animation-used:5'],
                suggestAfter: ['animation-used:10'],
                description: 'Add realistic physics to your models',
                benefit: 'Create dynamic, interactive scenes'
            },
            'webxr-mode': {
                name: 'VR/AR Mode',
                category: 'advanced',
                difficulty: 'expert',
                prerequisites: ['model-loaded:5', 'webxr-capable'],
                suggestAfter: ['model-loaded:15'],
                description: 'View models in virtual or augmented reality',
                benefit: 'Experience your models in immersive 3D'
            },
            'cinematic-mode': {
                name: 'Cinematic Mode',
                category: 'presentation',
                difficulty: 'intermediate',
                prerequisites: ['model-loaded:3', 'camera-used:10'],
                suggestAfter: ['camera-used:20'],
                description: 'Create dramatic camera sequences',
                benefit: 'Present your models like a pro'
            }
        };

        // Suggestion queue
        this.suggestionQueue = [];
        this.shownSuggestions = new Set();
        this.dismissedSuggestions = new Set();

        // Timing controls
        this.lastSuggestionTime = 0;
        this.suggestionCooldown = 60000; // 1 minute between suggestions
    }

    /**
     * Initialize the feature discovery engine
     */
    async initialize() {
        if (this.initialized) return;

        // Load saved behavior profile
        this.loadBehaviorProfile();

        // Setup event listeners
        this.setupEventListeners();

        // Start behavior analysis
        this.startBehaviorAnalysis();

        this.initialized = true;
        this.coreEngine.emit('feature-discovery:initialized');
    }

    /**
     * Load behavior profile from storage
     */
    loadBehaviorProfile() {
        const saved = localStorage.getItem('feature-discovery:profile');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.behaviorProfile = {
                    ...this.behaviorProfile,
                    ...data,
                    modelTypes: new Map(data.modelTypes || []),
                    featureUsage: new Map(data.featureUsage || []),
                    preferences: new Map(data.preferences || [])
                };
            } catch (error) {
                console.warn('Failed to load behavior profile:', error);
            }
        }
    }

    /**
     * Save behavior profile to storage
     */
    saveBehaviorProfile() {
        const data = {
            ...this.behaviorProfile,
            modelTypes: Array.from(this.behaviorProfile.modelTypes.entries()),
            featureUsage: Array.from(this.behaviorProfile.featureUsage.entries()),
            preferences: Array.from(this.behaviorProfile.preferences.entries())
        };
        localStorage.setItem('feature-discovery:profile', JSON.stringify(data));
    }

    /**
     * Setup event listeners for behavior tracking
     */
    setupEventListeners() {
        // Track model loading
        this.coreEngine.on('assets:model:loaded', (data) => {
            this.trackEvent('model-loaded', data);
            this.analyzeModelType(data.model);
            this.checkSuggestions('model-loaded');
        });

        // Track feature usage
        this.coreEngine.on('feature:used', (data) => {
            this.trackFeatureUsage(data.feature);
            this.checkSuggestions(`${data.feature}-used`);
        });

        // Track camera interactions
        this.coreEngine.on('camera:interaction', () => {
            this.trackEvent('camera-interaction');
        });

        // Track session time
        setInterval(() => {
            this.trackSessionTime();
        }, 60000); // Every minute
    }

    /**
     * Track an event
     */
    trackEvent(eventType, data = {}) {
        const count = (this.behaviorProfile.featureUsage.get(eventType) || 0) + 1;
        this.behaviorProfile.featureUsage.set(eventType, count);
        this.saveBehaviorProfile();

        // Check for milestone-based suggestions
        this.checkMilestone(eventType, count);
    }

    /**
     * Track feature usage
     */
    trackFeatureUsage(feature) {
        const count = (this.behaviorProfile.featureUsage.get(feature) || 0) + 1;
        this.behaviorProfile.featureUsage.set(feature, count);
        this.saveBehaviorProfile();

        // Update skill level based on feature usage
        this.updateSkillLevel();
    }

    /**
     * Analyze model type
     */
    analyzeModelType(model) {
        // Detect model characteristics
        const hasAnimations = model.animations && model.animations.length > 0;
        const hasPBRMaterials = this.detectPBRMaterials(model);
        const complexity = this.calculateComplexity(model);

        // Store model type
        const modelType = {
            hasAnimations,
            hasPBRMaterials,
            complexity,
            timestamp: Date.now()
        };

        const typeKey = `${hasAnimations ? 'animated' : 'static'}-${complexity}`;
        const count = (this.behaviorProfile.modelTypes.get(typeKey) || 0) + 1;
        this.behaviorProfile.modelTypes.set(typeKey, count);

        // Suggest relevant features
        if (hasAnimations) {
            this.queueSuggestion('animation-controls', 'high');
        }

        if (hasPBRMaterials && complexity > 0.5) {
            this.queueSuggestion('post-processing', 'medium');
        }

        this.saveBehaviorProfile();
    }

    /**
     * Detect PBR materials
     */
    detectPBRMaterials(model) {
        let hasPBR = false;
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                if (child.material.metalness !== undefined || child.material.roughness !== undefined) {
                    hasPBR = true;
                }
            }
        });
        return hasPBR;
    }

    /**
     * Calculate model complexity
     */
    calculateComplexity(model) {
        let vertices = 0;
        let materials = 0;

        model.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) {
                    vertices += child.geometry.attributes.position?.count || 0;
                }
                materials++;
            }
        });

        // Normalize complexity (0-1 scale)
        const vertexComplexity = Math.min(vertices / 100000, 1);
        const materialComplexity = Math.min(materials / 20, 1);

        return (vertexComplexity + materialComplexity) / 2;
    }

    /**
     * Check for milestone-based suggestions
     */
    checkMilestone(eventType, count) {
        // Check all features for matching milestones
        Object.entries(this.features).forEach(([featureId, feature]) => {
            feature.suggestAfter.forEach(trigger => {
                const [triggerEvent, triggerCount] = trigger.split(':');

                if (triggerEvent === eventType && parseInt(triggerCount) === count) {
                    this.queueSuggestion(featureId, 'medium');
                }
            });
        });
    }

    /**
     * Check suggestions based on trigger
     */
    checkSuggestions(trigger) {
        Object.entries(this.features).forEach(([featureId, feature]) => {
            if (feature.suggestAfter.includes(trigger)) {
                // Check if prerequisites are met
                if (this.checkPrerequisites(feature.prerequisites)) {
                    this.queueSuggestion(featureId, 'medium');
                }
            }
        });
    }

    /**
     * Check if prerequisites are met
     */
    checkPrerequisites(prerequisites) {
        return prerequisites.every(prereq => {
            const [event, count] = prereq.split(':');
            const currentCount = this.behaviorProfile.featureUsage.get(event) || 0;
            return count ? currentCount >= parseInt(count) : currentCount > 0;
        });
    }

    /**
     * Queue a feature suggestion
     */
    queueSuggestion(featureId, priority = 'medium') {
        // Don't suggest if already shown or dismissed
        if (this.shownSuggestions.has(featureId) || this.dismissedSuggestions.has(featureId)) {
            return;
        }

        // Don't suggest if already in queue
        if (this.suggestionQueue.find(s => s.featureId === featureId)) {
            return;
        }

        const feature = this.features[featureId];
        if (!feature) return;

        // Add to queue with priority
        this.suggestionQueue.push({
            featureId,
            feature,
            priority,
            timestamp: Date.now()
        });

        // Sort by priority
        this.suggestionQueue.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        // Try to show suggestion
        this.tryShowNextSuggestion();
    }

    /**
     * Try to show next suggestion
     */
    tryShowNextSuggestion() {
        // Check cooldown
        const now = Date.now();
        if (now - this.lastSuggestionTime < this.suggestionCooldown) {
            return;
        }

        // Get next suggestion
        const suggestion = this.suggestionQueue.shift();
        if (!suggestion) return;

        // Show suggestion
        this.showSuggestion(suggestion);
        this.lastSuggestionTime = now;
    }

    /**
     * Show a feature suggestion
     */
    showSuggestion(suggestion) {
        const { featureId, feature } = suggestion;

        // Mark as shown
        this.shownSuggestions.add(featureId);

        // Create suggestion UI
        const suggestionEl = document.createElement('div');
        suggestionEl.className = 'feature-suggestion';
        suggestionEl.innerHTML = `
            <div class="suggestion-content">
                <button class="suggestion-close" aria-label="Dismiss">×</button>
                <div class="suggestion-icon">💡</div>
                <h3 class="suggestion-title">${feature.name}</h3>
                <p class="suggestion-description">${feature.description}</p>
                <p class="suggestion-benefit"><strong>Why?</strong> ${feature.benefit}</p>
                <div class="suggestion-actions">
                    <button class="suggestion-btn primary">Try it now</button>
                    <button class="suggestion-btn secondary">Maybe later</button>
                </div>
            </div>
        `;

        // Setup event listeners
        const closeBtn = suggestionEl.querySelector('.suggestion-close');
        const tryBtn = suggestionEl.querySelector('.suggestion-btn.primary');
        const laterBtn = suggestionEl.querySelector('.suggestion-btn.secondary');

        closeBtn.addEventListener('click', () => {
            this.dismissSuggestion(featureId, suggestionEl);
        });

        tryBtn.addEventListener('click', () => {
            this.acceptSuggestion(featureId, suggestionEl);
        });

        laterBtn.addEventListener('click', () => {
            this.deferSuggestion(featureId, suggestionEl);
        });

        // Add to DOM
        document.body.appendChild(suggestionEl);

        // Animate in
        requestAnimationFrame(() => {
            suggestionEl.classList.add('show');
        });

        // Auto-dismiss after 15 seconds
        setTimeout(() => {
            if (suggestionEl.parentElement) {
                this.deferSuggestion(featureId, suggestionEl);
            }
        }, 15000);

        this.coreEngine.emit('feature-discovery:suggestion:shown', { featureId });
    }

    /**
     * Accept a suggestion
     */
    acceptSuggestion(featureId, element) {
        element.classList.remove('show');
        setTimeout(() => element.remove(), 300);

        // Activate the feature
        this.coreEngine.emit('feature:activate', { feature: featureId });

        // Track acceptance
        this.behaviorProfile.preferences.set(`accepted-${featureId}`, true);
        this.saveBehaviorProfile();

        this.coreEngine.emit('feature-discovery:suggestion:accepted', { featureId });
    }

    /**
     * Defer a suggestion
     */
    deferSuggestion(featureId, element) {
        element.classList.remove('show');
        setTimeout(() => element.remove(), 300);

        // Remove from shown set so it can be suggested again later
        this.shownSuggestions.delete(featureId);

        this.coreEngine.emit('feature-discovery:suggestion:deferred', { featureId });
    }

    /**
     * Dismiss a suggestion permanently
     */
    dismissSuggestion(featureId, element) {
        element.classList.remove('show');
        setTimeout(() => element.remove(), 300);

        // Mark as dismissed
        this.dismissedSuggestions.add(featureId);

        // Track dismissal
        this.behaviorProfile.preferences.set(`dismissed-${featureId}`, true);
        this.saveBehaviorProfile();

        this.coreEngine.emit('feature-discovery:suggestion:dismissed', { featureId });
    }

    /**
     * Update skill level based on usage
     */
    updateSkillLevel() {
        const totalFeatures = this.behaviorProfile.featureUsage.size;
        const advancedFeatures = Array.from(this.behaviorProfile.featureUsage.keys())
            .filter(f => f.includes('advanced') || f.includes('expert')).length;

        let newLevel = 'beginner';

        if (totalFeatures > 15 || advancedFeatures > 3) {
            newLevel = 'expert';
        } else if (totalFeatures > 8 || advancedFeatures > 1) {
            newLevel = 'intermediate';
        }

        if (newLevel !== this.behaviorProfile.skillLevel) {
            const oldLevel = this.behaviorProfile.skillLevel;
            this.behaviorProfile.skillLevel = newLevel;
            this.saveBehaviorProfile();

            this.coreEngine.emit('feature-discovery:skill-level:changed', {
                oldLevel,
                newLevel
            });
        }
    }

    /**
     * Track session time
     */
    trackSessionTime() {
        const sessionTime = (this.behaviorProfile.featureUsage.get('session-time') || 0) + 1;
        this.behaviorProfile.featureUsage.set('session-time', sessionTime);
        this.saveBehaviorProfile();

        // Check for time-based suggestions
        if (sessionTime === 5) {
            this.checkSuggestions('session-time:5min');
        }
    }

    /**
     * Start behavior analysis
     */
    startBehaviorAnalysis() {
        // Periodic analysis of user behavior
        setInterval(() => {
            this.analyzeBehaviorPatterns();
        }, 120000); // Every 2 minutes
    }

    /**
     * Analyze behavior patterns
     */
    analyzeBehaviorPatterns() {
        // Analyze usage patterns and make intelligent suggestions
        const patterns = this.detectPatterns();

        patterns.forEach(pattern => {
            if (pattern.confidence > 0.7) {
                this.queueSuggestion(pattern.suggestedFeature, 'high');
            }
        });
    }

    /**
     * Detect usage patterns
     */
    detectPatterns() {
        const patterns = [];

        // Pattern: Frequent camera adjustments → suggest camera presets
        const cameraInteractions = this.behaviorProfile.featureUsage.get('camera-interaction') || 0;
        if (cameraInteractions > 15) {
            patterns.push({
                type: 'camera-heavy',
                confidence: Math.min(cameraInteractions / 30, 1),
                suggestedFeature: 'camera-presets'
            });
        }

        // Pattern: Multiple model loads → suggest export
        const modelsLoaded = this.behaviorProfile.featureUsage.get('model-loaded') || 0;
        if (modelsLoaded > 5) {
            patterns.push({
                type: 'model-explorer',
                confidence: Math.min(modelsLoaded / 10, 1),
                suggestedFeature: 'export-screenshot'
            });
        }

        return patterns;
    }

    /**
     * Get skill level
     */
    getSkillLevel() {
        return this.behaviorProfile.skillLevel;
    }

    /**
     * Reset (for testing)
     */
    reset() {
        localStorage.removeItem('feature-discovery:profile');
        this.behaviorProfile = {
            modelTypes: new Map(),
            featureUsage: new Map(),
            sessionPatterns: [],
            skillLevel: 'beginner',
            preferences: new Map()
        };
        this.shownSuggestions.clear();
        this.dismissedSuggestions.clear();
        this.suggestionQueue = [];
    }


    /**
     * Cleanup
     */
    destroy() {
        this.saveBehaviorProfile();
        this.initialized = false;
    }
}
