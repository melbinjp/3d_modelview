/**
 * UXEnhancementsIntegration - Production-ready integration of UX enhancements
 * Handles initialization, error recovery, and graceful degradation
 */

export class UXEnhancementsIntegration {
    constructor(coreEngine, uiManager) {
        this.coreEngine = coreEngine;
        this.uiManager = uiManager;
        this.initialized = false;
        this.features = {
            onboarding: false,
            gestures: false,
            discovery: false
        };
    }

    /**
     * Initialize all UX enhancements with error handling
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // Initialize onboarding
            await this.initializeOnboarding();
            
            // Initialize mobile gestures
            await this.initializeMobileGestures();
            
            // Initialize feature discovery
            await this.initializeFeatureDiscovery();
            
            // Setup cross-feature integrations
            this.setupIntegrations();
            
            this.initialized = true;
            this.coreEngine.emit('ux-enhancements:initialized', {
                features: this.features
            });
            
            console.log('✅ UX Enhancements initialized successfully', this.features);
            
        } catch (error) {
            console.error('Failed to initialize UX enhancements:', error);
            // Continue without enhancements - graceful degradation
        }
    }

    /**
     * Initialize onboarding manager
     */
    async initializeOnboarding() {
        try {
            if (!this.uiManager.onboardingManager) {
                console.warn('OnboardingManager not available');
                return;
            }

            await this.uiManager.onboardingManager.initialize();
            this.features.onboarding = true;
            
            // Setup onboarding event handlers
            this.coreEngine.on('onboarding:step:completed', (data) => {
                // Track completion for analytics
                this.trackEvent('onboarding_step_completed', data);
            });
            
            this.coreEngine.on('onboarding:completed', () => {
                // User completed onboarding
                this.trackEvent('onboarding_completed');
                
                // Suggest switching to intermediate mode
                setTimeout(() => {
                    this.suggestModeUpgrade();
                }, 2000);
            });
            
        } catch (error) {
            console.error('Onboarding initialization failed:', error);
            this.features.onboarding = false;
        }
    }

    /**
     * Initialize mobile gesture manager
     */
    async initializeMobileGestures() {
        try {
            if (!this.uiManager.mobileGestureManager) {
                console.warn('MobileGestureManager not available');
                return;
            }

            await this.uiManager.mobileGestureManager.initialize();
            this.features.gestures = true;
            
            // Setup gesture event handlers
            this.setupGestureHandlers();
            
        } catch (error) {
            console.error('Mobile gestures initialization failed:', error);
            this.features.gestures = false;
        }
    }

    /**
     * Initialize feature discovery engine
     */
    async initializeFeatureDiscovery() {
        try {
            if (!this.uiManager.featureDiscoveryEngine) {
                console.warn('FeatureDiscoveryEngine not available');
                return;
            }

            await this.uiManager.featureDiscoveryEngine.initialize();
            this.features.discovery = true;
            
            // Setup discovery event handlers
            this.setupDiscoveryHandlers();
            
        } catch (error) {
            console.error('Feature discovery initialization failed:', error);
            this.features.discovery = false;
        }
    }

    /**
     * Setup gesture event handlers
     */
    setupGestureHandlers() {
        const renderingEngine = this.coreEngine.getModule('rendering');
        if (!renderingEngine) return;

        // Pinch to zoom
        this.coreEngine.on('gesture:pinch', (data) => {
            if (renderingEngine.camera && renderingEngine.controls) {
                const zoomSpeed = 0.1;
                const newZoom = renderingEngine.camera.zoom * (1 + data.deltaScale * zoomSpeed);
                renderingEngine.camera.zoom = Math.max(0.1, Math.min(10, newZoom));
                renderingEngine.camera.updateProjectionMatrix();
            }
        });

        // Rotate gesture
        this.coreEngine.on('gesture:rotate', (data) => {
            if (renderingEngine.controls) {
                const rotateSpeed = 0.01;
                renderingEngine.controls.rotateSpeed = Math.abs(data.deltaRotation) * rotateSpeed;
            }
        });

        // Double-tap to reset camera
        this.coreEngine.on('gesture:doubleTap', () => {
            if (renderingEngine.fitCameraToModel) {
                renderingEngine.fitCameraToModel();
            }
        });

        // Long-press for context menu
        this.coreEngine.on('gesture:longPress', (data) => {
            this.showContextMenu(data.x, data.y);
        });

        // Swipe gestures for navigation
        this.coreEngine.on('gesture:swipe', (data) => {
            this.handleSwipeNavigation(data.direction);
        });
    }

    /**
     * Setup feature discovery event handlers
     */
    setupDiscoveryHandlers() {
        // When a feature is activated, track it
        this.coreEngine.on('feature:activate', (data) => {
            this.activateFeature(data.feature);
        });

        // Track skill level changes
        this.coreEngine.on('feature-discovery:skill-level:changed', (data) => {
            this.handleSkillLevelChange(data.oldLevel, data.newLevel);
        });

        // Handle suggestion acceptance
        this.coreEngine.on('feature-discovery:suggestion:accepted', (data) => {
            this.trackEvent('feature_suggestion_accepted', data);
        });
    }

    /**
     * Setup cross-feature integrations
     */
    setupIntegrations() {
        // Integrate onboarding with feature discovery
        if (this.features.onboarding && this.features.discovery) {
            this.coreEngine.on('onboarding:completed', () => {
                // Start feature discovery after onboarding
                const engine = this.uiManager.featureDiscoveryEngine;
                if (engine) {
                    engine.queueSuggestion('lighting-presets', 'high');
                }
            });
        }

        // Integrate gestures with onboarding
        if (this.features.gestures && this.features.onboarding) {
            this.coreEngine.on('gesture:pinch', () => {
                // Track that user discovered pinch gesture
                this.trackEvent('gesture_discovered', { type: 'pinch' });
            });
        }
    }

    /**
     * Activate a feature
     */
    activateFeature(featureId) {
        const featureMap = {
            'lighting-presets': () => this.showLightingPresets(),
            'animation-controls': () => this.showAnimationControls(),
            'camera-presets': () => this.showCameraPresets(),
            'export-screenshot': () => this.showExportPanel(),
            'post-processing': () => this.showPostProcessing(),
            'measurement-tools': () => this.showMeasurementTools(),
            'material-editor': () => this.showMaterialEditor(),
            'physics-simulation': () => this.enablePhysics(),
            'webxr-mode': () => this.enableWebXR(),
            'cinematic-mode': () => this.enableCinematicMode()
        };

        const activator = featureMap[featureId];
        if (activator) {
            activator();
            this.trackEvent('feature_activated', { feature: featureId });
        }
    }

    /**
     * Show lighting presets
     */
    showLightingPresets() {
        const lightingSection = document.querySelector('[data-feature="lighting-controls"]');
        if (lightingSection) {
            lightingSection.classList.add('is-open');
            lightingSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Show animation controls
     */
    showAnimationControls() {
        const animationSection = document.querySelector('[data-feature="animation-controls"]');
        if (animationSection) {
            animationSection.classList.add('is-open');
            animationSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Show camera presets
     */
    showCameraPresets() {
        const cameraSection = document.querySelector('[data-feature="camera-controls"]');
        if (cameraSection) {
            cameraSection.classList.add('is-open');
            cameraSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Show export panel
     */
    showExportPanel() {
        if (this.uiManager.exportPanel) {
            this.uiManager.exportPanel.show();
        }
    }

    /**
     * Show post-processing controls
     */
    showPostProcessing() {
        const effectsSection = document.querySelector('[data-feature="effects-controls"]');
        if (effectsSection) {
            effectsSection.classList.add('is-open');
            effectsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Show measurement tools
     */
    showMeasurementTools() {
        const analysisManager = this.coreEngine.getModule('analysis');
        if (analysisManager) {
            analysisManager.enableMeasurementMode();
        }
    }

    /**
     * Show material editor
     */
    showMaterialEditor() {
        const editingManager = this.coreEngine.getModule('editing');
        if (editingManager) {
            editingManager.showMaterialEditor();
        }
    }

    /**
     * Enable physics simulation
     */
    enablePhysics() {
        const renderingEngine = this.coreEngine.getModule('rendering');
        if (renderingEngine && renderingEngine.enablePhysics) {
            renderingEngine.enablePhysics();
        }
    }

    /**
     * Enable WebXR mode
     */
    enableWebXR() {
        const renderingEngine = this.coreEngine.getModule('rendering');
        if (renderingEngine && renderingEngine.webXRManager) {
            const container = document.getElementById('viewerContainer');
            renderingEngine.addXRButtons(container);
        }
    }

    /**
     * Enable cinematic mode
     */
    enableCinematicMode() {
        const superheroBtn = document.getElementById('superheroBtn');
        if (superheroBtn) {
            superheroBtn.click();
        }
    }

    /**
     * Handle skill level change
     */
    handleSkillLevelChange(oldLevel, newLevel) {
        console.log(`Skill level upgraded: ${oldLevel} → ${newLevel}`);
        
        // Show congratulations
        this.showSkillLevelUpgrade(newLevel);
        
        // Suggest mode change if appropriate
        if (newLevel === 'intermediate' && this.uiManager.currentMode === 'simple') {
            setTimeout(() => {
                this.suggestModeUpgrade();
            }, 2000);
        }
    }

    /**
     * Show skill level upgrade notification
     */
    showSkillLevelUpgrade(level) {
        const notification = document.createElement('div');
        notification.className = 'skill-level-upgrade';
        notification.innerHTML = `
            <div class="upgrade-content">
                <div class="upgrade-icon">🎉</div>
                <h3>Level Up!</h3>
                <p>You're now a <strong>${level}</strong> user</p>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Suggest mode upgrade
     */
    suggestModeUpgrade() {
        if (this.uiManager.currentMode !== 'simple') return;
        
        const suggestion = document.createElement('div');
        suggestion.className = 'mode-upgrade-suggestion';
        suggestion.innerHTML = `
            <div class="suggestion-content">
                <button class="suggestion-close">×</button>
                <h3>Ready for Advanced Mode?</h3>
                <p>You've mastered the basics! Switch to Advanced mode to unlock more features.</p>
                <div class="suggestion-actions">
                    <button class="suggestion-btn primary" id="upgradeToAdvanced">Switch to Advanced</button>
                    <button class="suggestion-btn secondary" id="staySimple">Keep Simple</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(suggestion);
        
        // Event listeners
        const closeBtn = suggestion.querySelector('.suggestion-close');
        const upgradeBtn = suggestion.querySelector('#upgradeToAdvanced');
        const stayBtn = suggestion.querySelector('#staySimple');
        
        const remove = () => {
            suggestion.classList.remove('show');
            setTimeout(() => suggestion.remove(), 300);
        };
        
        closeBtn.addEventListener('click', remove);
        stayBtn.addEventListener('click', remove);
        upgradeBtn.addEventListener('click', () => {
            this.uiManager.setMode('advanced');
            remove();
        });
        
        setTimeout(() => suggestion.classList.add('show'), 100);
    }

    /**
     * Show context menu
     */
    showContextMenu(x, y) {
        // Create context menu
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.innerHTML = `
            <div class="context-menu-item" data-action="reset-camera">Reset Camera</div>
            <div class="context-menu-item" data-action="fit-view">Fit to View</div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="screenshot">Take Screenshot</div>
        `;
        
        document.body.appendChild(menu);
        
        // Handle menu actions
        menu.addEventListener('click', (e) => {
            const item = e.target.closest('.context-menu-item');
            if (item) {
                this.handleContextMenuAction(item.dataset.action);
                menu.remove();
            }
        });
        
        // Remove on click outside
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 100);
    }

    /**
     * Handle context menu action
     */
    handleContextMenuAction(action) {
        const renderingEngine = this.coreEngine.getModule('rendering');
        const exportSystem = this.coreEngine.getModule('export');
        
        switch (action) {
            case 'reset-camera':
                if (renderingEngine) renderingEngine.resetCamera();
                break;
            case 'fit-view':
                if (renderingEngine) renderingEngine.fitCameraToModel();
                break;
            case 'screenshot':
                if (exportSystem) exportSystem.exportScreenshot();
                break;
        }
    }

    /**
     * Handle swipe navigation
     */
    handleSwipeNavigation(direction) {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebarToggleBtn');
        
        if (direction === 'right' && sidebar) {
            // Swipe right to open sidebar
            sidebar.classList.remove('collapsed');
            if (toggleBtn) toggleBtn.classList.add('active');
        } else if (direction === 'left' && sidebar) {
            // Swipe left to close sidebar
            sidebar.classList.add('collapsed');
            if (toggleBtn) toggleBtn.classList.remove('active');
        }
    }

    /**
     * Track event (for analytics)
     */
    trackEvent(eventName, data = {}) {
        // Emit event for analytics tracking
        this.coreEngine.emit('analytics:track', {
            event: eventName,
            data,
            timestamp: Date.now()
        });
        
        // Log to console in development
        if (process.env.NODE_ENV !== 'production') {
            console.log('📊 Analytics:', eventName, data);
        }
    }

    /**
     * Get initialization status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            features: { ...this.features }
        };
    }

    /**
     * Cleanup
     */
    destroy() {
        this.initialized = false;
        this.features = {
            onboarding: false,
            gestures: false,
            discovery: false
        };
    }
}
