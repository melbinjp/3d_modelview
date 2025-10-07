import { ExportPanel } from './ExportPanel.js';
import { FileManagerPanel } from './FileManagerPanel.js';
import { NotificationSystem } from './NotificationSystem.js';
import { I18nManager } from './I18nManager.js';
import { AccessibilityManager } from './AccessibilityManager.js';
import { ThemeManager } from './ThemeManager.js';
import { KeyboardShortcutManager } from './KeyboardShortcutManager.js';

/**
 * UIManager - Manages adaptive UI that switches between simple and advanced modes
 */
export class UIManager {
    constructor(core) {
        this.core = core;
        this.currentMode = 'simple'; // 'simple' or 'advanced'
        this.panels = new Map();
        this.eventListeners = new Map();
        
        // Adaptive UI properties
        this.expertiseLevel = 'beginner'; // 'beginner', 'intermediate', 'expert'
        this.userInteractions = {
            totalClicks: 0,
            advancedFeatureUsage: 0,
            sessionTime: 0,
            modelLoadCount: 0,
            lastActivity: Date.now()
        };
        
        // Progressive disclosure state
        this.revealedFeatures = new Set();
        this.contextualHelp = new Map();
        this.guidedTour = {
            active: false,
            currentStep: 0,
            completed: false,
            steps: []
        };
        
        // Accessibility and internationalization managers
        this.i18nManager = new I18nManager(core);
        this.accessibilityManager = new AccessibilityManager(core);
        this.themeManager = new ThemeManager(core);
        this.keyboardShortcutManager = new KeyboardShortcutManager(core);
        
        // UI components
        this.layoutManager = new LayoutManager();
        this.helpSystem = new HelpSystem();
        this.fileManagerPanel = new FileManagerPanel(core);
        this.notificationSystem = new NotificationSystem(core);
        
        this.initialized = false;
    }

    /**
     * Initialize the UI manager
     */
    async init() {
        if (this.initialized) {
            console.warn('UIManager already initialized');
            return;
        }

        // Initialize accessibility and internationalization first
        await this.i18nManager.initialize();
        await this.accessibilityManager.initialize();
        await this.themeManager.initialize();
        await this.keyboardShortcutManager.initialize();
        
        // Initialize other sub-managers
        this.layoutManager.init(this);
        this.helpSystem.init(this);
        this.notificationSystem.init();

        this.setupEventListeners();
        this.setupPanels();
        this.setupAdaptiveUI();
        this.detectUserExpertise();
        this.initializeGuidedTour();
        
        // Wait for AssetManager to be fully initialized before enabling asset library features
        this.core.on('assets:initialized', () => {
            // Silent asset initialization
            console.log('FileManager available:', !!this.core.assetManager?.fileManager);
            this.enableAssetLibraryFeatures();
            this.initializeFileManagerPanel();
        });
        
        // Start tracking user interactions
        this.startInteractionTracking();
        
        this.initialized = true;
        this.core.emit('ui:initialized');
    }

    /**
     * Setup core event listeners
     */
    setupEventListeners() {
        // Listen to core events - only show loading progress, no error messages to users
        this.core.on('assets:loading:start', () => this.showProgress(true));
        this.core.on('assets:loading:progress', (data) => this.updateProgress(data.progress));
        this.core.on('assets:loading:complete', () => this.showProgress(false));
        this.core.on('assets:loading:error', () => this.showProgress(false)); // Just hide loading, no error message
        
        this.core.on('assets:model:loaded', (data) => this.onModelLoaded(data));
        this.core.on('assets:model:error', () => this.showProgress(false)); // Just hide loading, no error message
        
        // Setup UI event listeners
        this.setupSidebarToggle();
        this.setupAccordion();
        this.setupThemeToggle();
        // Remove error modal setup - no error messages to users
    }

    /**
     * Setup sidebar toggle functionality
     */
    setupSidebarToggle() {
        const toggleBtn = document.getElementById('sidebarToggleBtn');
        const sidebar = document.getElementById('sidebar');
        
        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                toggleBtn.classList.toggle('active');
            });

            // Close sidebar when clicking outside
            document.addEventListener('click', (e) => {
                if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
                    sidebar.classList.add('collapsed');
                    toggleBtn.classList.remove('active');
                }
            });
        }
    }

    /**
     * Setup accordion functionality
     */
    setupAccordion() {
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                const item = header.parentElement;
                if (item.classList.contains('is-open')) {
                    item.classList.remove('is-open');
                } else {
                    // Close other accordion items
                    document.querySelectorAll('.accordion-item.is-open').forEach(openItem => {
                        openItem.classList.remove('is-open');
                    });
                    item.classList.add('is-open');
                }
            });
        });
    }

    /**
     * Setup theme toggle functionality
     */
    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('change', () => {
                this.toggleTheme(themeToggle.checked);
            });
            this.loadTheme();
        }
    }

    /**
     * Setup error modal functionality - REMOVED: No error modals for users
     */
    setupErrorModal() {
        // No error modals - errors are handled silently in console
    }

    // URL modal removed - now using direct input in ModelViewer

    /**
     * Detect user expertise level and set appropriate mode
     */
    detectUserExpertise() {
        // Check localStorage for previous expertise level
        const savedExpertise = localStorage.getItem('ui-expertise-level');
        const savedMode = localStorage.getItem('ui-mode');
        
        if (savedExpertise && savedMode) {
            this.expertiseLevel = savedExpertise;
            this.setMode(savedMode);
            return;
        }

        // Analyze user behavior patterns
        const interactions = this.getUserInteractionHistory();
        
        if (interactions.totalSessions > 10 && interactions.advancedFeatureUsage > 5) {
            this.expertiseLevel = 'expert';
            this.setMode('advanced');
        } else if (interactions.totalSessions > 3 && interactions.modelLoadCount > 5) {
            this.expertiseLevel = 'intermediate';
            this.setMode('simple'); // Start simple but allow quick progression
        } else {
            this.expertiseLevel = 'beginner';
            this.setMode('simple');
        }

        // Save detected expertise
        localStorage.setItem('ui-expertise-level', this.expertiseLevel);
        localStorage.setItem('ui-mode', this.currentMode);
    }

    /**
     * Set UI mode (simple or advanced)
     */
    setMode(mode) {
        if (mode !== 'simple' && mode !== 'advanced') {
            console.warn(`Invalid UI mode: ${mode}`);
            return;
        }

        const oldMode = this.currentMode;
        this.currentMode = mode;

        // Update UI based on mode
        document.body.classList.remove(`ui-mode-${oldMode}`);
        document.body.classList.add(`ui-mode-${mode}`);

        // Show/hide panels based on mode
        this.updatePanelVisibility();
        this.updateModeSpecificFeatures();
        this.layoutManager.adaptLayout(mode);

        // Save mode preference
        localStorage.setItem('ui-mode', mode);

        this.core.emit('ui:mode:changed', { oldMode, newMode: mode });
    }

    /**
     * Setup adaptive UI system
     */
    setupAdaptiveUI() {
        // Create mode switcher
        this.createModeToggle();
        
        // Setup progressive disclosure triggers
        this.setupProgressiveDisclosure();
        
        // Initialize contextual help
        this.setupContextualHelp();
        
        // Setup smart defaults
        this.applySmartDefaults();
    }

    /**
     * Create mode toggle button
     */
    createModeToggle() {
        const modeToggle = document.createElement('div');
        modeToggle.className = 'mode-toggle';
        modeToggle.innerHTML = `
            <button id="modeToggleBtn" class="mode-toggle-btn" title="Switch UI Mode">
                <svg class="icon simple-icon" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
                </svg>
                <svg class="icon advanced-icon" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <path d="M9 9h6v6H9z"/>
                    <path d="M3 9h6M15 9h6M9 3v6M9 15v6"/>
                </svg>
                <span class="mode-label">Advanced</span>
            </button>
        `;

        // Insert after theme toggle in sidebar header
        const sidebarHeader = document.querySelector('.sidebar-header');
        if (sidebarHeader) {
            sidebarHeader.appendChild(modeToggle);
        }

        // Add event listener
        const toggleBtn = document.getElementById('modeToggleBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggleMode();
            });
        }
    }

    /**
     * Toggle between simple and advanced modes
     */
    toggleMode() {
        const newMode = this.currentMode === 'simple' ? 'advanced' : 'simple';
        
        // Track advanced feature usage
        if (newMode === 'advanced') {
            this.trackAdvancedFeatureUsage('mode_switch');
        }
        
        this.setMode(newMode);
        this.showModeTransitionFeedback(newMode);
    }

    /**
     * Show feedback when mode changes
     */
    showModeTransitionFeedback(newMode) {
        const feedback = document.createElement('div');
        feedback.className = 'mode-transition-feedback';
        feedback.innerHTML = `
            <div class="feedback-content">
                <svg class="icon" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4"/>
                    <circle cx="12" cy="12" r="10"/>
                </svg>
                <span>Switched to ${newMode} mode</span>
            </div>
        `;

        document.body.appendChild(feedback);

        // Animate in
        setTimeout(() => feedback.classList.add('show'), 10);

        // Remove after delay
        setTimeout(() => {
            feedback.classList.remove('show');
            setTimeout(() => feedback.remove(), 300);
        }, 2000);
    }

    /**
     * Update mode-specific features
     */
    updateModeSpecificFeatures() {
        const isAdvanced = this.currentMode === 'advanced';
        
        // Update mode toggle button
        const modeToggleBtn = document.getElementById('modeToggleBtn');
        if (modeToggleBtn) {
            modeToggleBtn.classList.toggle('advanced', isAdvanced);
            const label = modeToggleBtn.querySelector('.mode-label');
            if (label) {
                label.textContent = isAdvanced ? 'Simple' : 'Advanced';
            }
        }

        // Show/hide advanced controls
        document.querySelectorAll('.advanced-only').forEach(el => {
            el.style.display = isAdvanced ? '' : 'none';
        });

        // Update help system
        this.helpSystem.updateForMode(this.currentMode);
    }

    /**
     * Setup progressive disclosure system
     */
    setupProgressiveDisclosure() {
        // Define feature progression paths
        this.featureProgression = {
            'basic-loading': ['drag-drop', 'url-loading'],
            'model-interaction': ['camera-controls', 'animation-controls'],
            'visual-enhancement': ['lighting-controls', 'effects-controls'],
            'advanced-features': ['export-system', 'measurement-tools', 'asset-library']
        };

        // Setup reveal triggers
        this.setupRevealTriggers();
    }

    /**
     * Setup feature reveal triggers
     */
    setupRevealTriggers() {
        // Reveal camera controls after first model load
        this.core.on('assets:model:loaded', (data) => {
            // Silent model loaded event
            this.revealFeature('camera-controls');
            
            // Track model load count
            this.userInteractions.modelLoadCount++;
        });

        // Reveal animation controls if model has animations
        this.core.on('assets:model:loaded', (data) => {
            console.log('Checking for animations in loaded model:', data);
            if (data.model && this.hasAnimations(data.model)) {
                console.log('Model has animations, revealing animation controls');
                this.revealFeature('animation-controls');
            }
        });

        // Reveal advanced features based on usage patterns
        this.core.on('ui:interaction', (data) => {
            this.handleInteractionForProgression(data);
        });
    }

    /**
     * Reveal a feature with smooth animation
     */
    revealFeature(featureId) {
        if (this.revealedFeatures.has(featureId)) {
            return;
        }

        const featureElement = document.querySelector(`[data-feature="${featureId}"]`);
        if (!featureElement) {
            console.warn(`Feature element not found for: ${featureId}`);
            return;
        }

        this.revealedFeatures.add(featureId);
        
        // Add reveal animation
        featureElement.classList.add('feature-revealing');
        
        // Show contextual help for new feature only if element exists
        this.showFeatureIntroduction(featureId);
        
        setTimeout(() => {
            featureElement.classList.remove('feature-revealing');
            featureElement.classList.add('feature-revealed');
        }, 500);
    }

    /**
     * Show introduction for newly revealed feature
     */
    showFeatureIntroduction(featureId) {
        // Disable feature introductions for production
        return;
        
        const introductions = {
            'camera-controls': 'New controls available! Use these buttons to reset your camera view.',
            'animation-controls': 'This model has animations! Use these controls to play them.',
            'lighting-controls': 'Enhance your model with professional lighting controls.',
            'effects-controls': 'Add visual effects like bloom to make your model shine.',
            'export-system': 'Ready to share? Export your model or take screenshots.',
            'measurement-tools': 'Measure distances and analyze your model in detail.',
            'asset-library': 'Discover thousands of 3D models in our online library.'
        };

        const message = introductions[featureId];
        if (message) {
            this.showTooltip(featureId, message, 5000);
        }
    }

    /**
     * Setup contextual help system
     */
    setupContextualHelp() {
        // Define help content for different UI elements
        this.contextualHelp.set('file-drop', {
            title: 'Load 3D Models',
            content: 'Drag and drop 3D model files here, or click to browse. Supported formats: GLB, GLTF, FBX, OBJ, and more.',
            position: 'bottom'
        });

        this.contextualHelp.set('superhero-btn', {
            title: 'Cinematic Mode',
            content: 'Create dramatic reveals of your 3D models with cinematic camera movements and lighting.',
            position: 'left'
        });

        this.contextualHelp.set('asset-library', {
            title: 'Online Asset Library',
            content: 'Browse and download 3D models from various online libraries including Sketchfab and Poly Haven.',
            position: 'right'
        });

        // Setup help triggers
        this.setupHelpTriggers();
    }

    /**
     * Setup help triggers for UI elements
     */
    setupHelpTriggers() {
        document.addEventListener('mouseover', (e) => {
            const helpTarget = e.target.closest('[data-help]');
            if (helpTarget && !this.helpSystem.isTooltipVisible()) {
                const helpId = helpTarget.dataset.help;
                const helpContent = this.contextualHelp.get(helpId);
                if (helpContent) {
                    this.showContextualHelp(helpTarget, helpContent);
                }
            }
        });

        document.addEventListener('mouseout', (e) => {
            const helpTarget = e.target.closest('[data-help]');
            if (helpTarget) {
                this.hideContextualHelp();
            }
        });
    }

    /**
     * Show contextual help tooltip
     */
    showContextualHelp(element, helpContent) {
        this.helpSystem.showTooltip(element, helpContent);
    }

    /**
     * Hide contextual help
     */
    hideContextualHelp() {
        this.helpSystem.hideTooltip();
    }

    /**
     * Initialize guided tour system
     */
    initializeGuidedTour() {
        // Check if user has completed tour
        const tourCompleted = localStorage.getItem('guided-tour-completed');
        if (tourCompleted) {
            return;
        }

        // Define tour steps
        this.guidedTour.steps = [
            {
                target: '#fileDrop',
                title: 'Welcome to 3D Model Viewer Pro!',
                content: 'Let\'s start by loading a 3D model. You can drag and drop files here or click to browse.',
                position: 'bottom'
            },
            {
                target: '#superheroBtn',
                title: 'Cinematic Mode',
                content: 'Once you load a model, try the cinematic mode for dramatic reveals!',
                position: 'left'
            },
            {
                target: '.sidebar-header',
                title: 'Advanced Features',
                content: 'As you use the viewer, more advanced features will become available in this sidebar.',
                position: 'right'
            },
            {
                target: '#modeToggleBtn',
                title: 'UI Modes',
                content: 'Switch between Simple and Advanced modes based on your needs.',
                position: 'bottom'
            }
        ];

        // Show tour after a short delay for new users
        if (this.expertiseLevel === 'beginner') {
            setTimeout(() => {
                this.offerGuidedTour();
            }, 2000);
        }
    }

    /**
     * Offer guided tour to new users
     */
    offerGuidedTour() {
        const tourOffer = document.createElement('div');
        tourOffer.className = 'tour-offer';
        tourOffer.innerHTML = `
            <div class="tour-offer-content">
                <h3>Welcome to 3D Model Viewer Pro!</h3>
                <p>Would you like a quick tour to get started?</p>
                <div class="tour-offer-buttons">
                    <button id="startTour" class="btn primary">Yes, show me around</button>
                    <button id="skipTour" class="btn secondary">Skip tour</button>
                </div>
            </div>
        `;

        document.body.appendChild(tourOffer);

        // Add event listeners
        document.getElementById('startTour').addEventListener('click', () => {
            tourOffer.remove();
            this.startGuidedTour();
        });

        document.getElementById('skipTour').addEventListener('click', () => {
            tourOffer.remove();
            localStorage.setItem('guided-tour-completed', 'true');
        });
    }

    /**
     * Start guided tour
     */
    startGuidedTour() {
        this.guidedTour.active = true;
        this.guidedTour.currentStep = 0;
        this.showTourStep(0);
    }

    /**
     * Show specific tour step
     */
    showTourStep(stepIndex) {
        if (stepIndex >= this.guidedTour.steps.length) {
            this.completeTour();
            return;
        }

        const step = this.guidedTour.steps[stepIndex];
        const target = document.querySelector(step.target);
        
        if (!target) {
            // Skip to next step if target not found
            this.showTourStep(stepIndex + 1);
            return;
        }

        this.helpSystem.showTourStep(target, step, stepIndex, this.guidedTour.steps.length);
    }

    /**
     * Complete guided tour
     */
    completeTour() {
        this.guidedTour.active = false;
        this.guidedTour.completed = true;
        localStorage.setItem('guided-tour-completed', 'true');
        
        this.showTooltip('tour-complete', 'Tour completed! Enjoy exploring 3D Model Viewer Pro.', 3000);
    }

    /**
     * Apply smart defaults based on user expertise
     */
    applySmartDefaults() {
        const defaults = {
            beginner: {
                autoRotate: true,
                showGrid: false,
                bloomEnabled: true,
                ambientIntensity: 0.6
            },
            intermediate: {
                autoRotate: false,
                showGrid: true,
                bloomEnabled: true,
                ambientIntensity: 0.4
            },
            expert: {
                autoRotate: false,
                showGrid: true,
                bloomEnabled: false,
                ambientIntensity: 0.3
            }
        };

        const userDefaults = defaults[this.expertiseLevel];
        Object.entries(userDefaults).forEach(([setting, value]) => {
            this.applyDefaultSetting(setting, value);
        });
    }

    /**
     * Apply a default setting if not already set by user
     */
    applyDefaultSetting(setting, value) {
        const savedValue = localStorage.getItem(`setting-${setting}`);
        if (savedValue === null) {
            // Apply default and update UI
            const element = document.getElementById(setting);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else if (element.type === 'range') {
                    element.value = value;
                }
                // Trigger change event to update the application
                element.dispatchEvent(new Event('change'));
            }
        }
    }

    /**
     * Start tracking user interactions for expertise detection
     */
    startInteractionTracking() {
        // Track clicks on advanced features
        document.addEventListener('click', (e) => {
            this.userInteractions.totalClicks++;
            
            // Check if clicking on advanced features
            if (e.target.closest('.advanced-feature')) {
                this.trackAdvancedFeatureUsage('click');
            }
            
            // Update last activity
            this.userInteractions.lastActivity = Date.now();
            
            // Emit interaction event for progressive disclosure
            this.core.emit('ui:interaction', {
                type: 'click',
                target: e.target,
                timestamp: Date.now()
            });
        });

        // Track session time
        setInterval(() => {
            this.userInteractions.sessionTime += 1000;
        }, 1000);

        // Save interaction data periodically
        setInterval(() => {
            this.saveInteractionData();
        }, 30000);
    }

    /**
     * Track usage of advanced features
     */
    trackAdvancedFeatureUsage(feature) {
        this.userInteractions.advancedFeatureUsage++;
        
        // Update expertise level if threshold reached
        if (this.userInteractions.advancedFeatureUsage > 3 && this.expertiseLevel === 'beginner') {
            this.updateExpertiseLevel('intermediate');
        } else if (this.userInteractions.advancedFeatureUsage > 10 && this.expertiseLevel === 'intermediate') {
            this.updateExpertiseLevel('expert');
        }
    }

    /**
     * Update user expertise level
     */
    updateExpertiseLevel(newLevel) {
        const oldLevel = this.expertiseLevel;
        this.expertiseLevel = newLevel;
        
        localStorage.setItem('ui-expertise-level', newLevel);
        
        // Show progression feedback
        this.showExpertiseProgression(oldLevel, newLevel);
        
        // Suggest mode upgrade if appropriate
        if (newLevel === 'expert' && this.currentMode === 'simple') {
            this.suggestModeUpgrade();
        }
    }

    /**
     * Show expertise progression feedback
     */
    showExpertiseProgression(oldLevel, newLevel) {
        const feedback = document.createElement('div');
        feedback.className = 'expertise-progression';
        feedback.innerHTML = `
            <div class="progression-content">
                <svg class="icon" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <h3>Level Up!</h3>
                <p>You've progressed from ${oldLevel} to ${newLevel} user</p>
                <small>More features are now available</small>
            </div>
        `;

        document.body.appendChild(feedback);
        
        setTimeout(() => feedback.classList.add('show'), 10);
        setTimeout(() => {
            feedback.classList.remove('show');
            setTimeout(() => feedback.remove(), 300);
        }, 4000);
    }

    /**
     * Suggest mode upgrade to advanced
     */
    suggestModeUpgrade() {
        const suggestion = document.createElement('div');
        suggestion.className = 'mode-upgrade-suggestion';
        suggestion.innerHTML = `
            <div class="suggestion-content">
                <h3>Ready for Advanced Mode?</h3>
                <p>Based on your usage, you might enjoy the advanced interface with more features.</p>
                <div class="suggestion-buttons">
                    <button id="upgradeMode" class="btn primary">Switch to Advanced</button>
                    <button id="staySimple" class="btn secondary">Keep Simple</button>
                </div>
            </div>
        `;

        document.body.appendChild(suggestion);

        document.getElementById('upgradeMode').addEventListener('click', () => {
            suggestion.remove();
            this.setMode('advanced');
        });

        document.getElementById('staySimple').addEventListener('click', () => {
            suggestion.remove();
        });
    }

    /**
     * Handle interactions for progressive disclosure
     */
    handleInteractionForProgression(data) {
        // Reveal features based on interaction patterns
        if (data.type === 'click') {
            const target = data.target;
            
            // Reveal export features after multiple model loads
            if (target.closest('#loadUrlBtn, #fileInput') && this.userInteractions.modelLoadCount > 2) {
                this.revealFeature('export-system');
            }
            
            // Reveal measurement tools after camera interactions
            if (target.closest('.camera-controls') && this.userInteractions.totalClicks > 20) {
                this.revealFeature('measurement-tools');
            }
        }
    }

    /**
     * Get user interaction history from localStorage
     */
    getUserInteractionHistory() {
        const saved = localStorage.getItem('user-interaction-history');
        return saved ? JSON.parse(saved) : {
            totalSessions: 0,
            advancedFeatureUsage: 0,
            modelLoadCount: 0,
            sessionTime: 0
        };
    }

    /**
     * Save interaction data to localStorage
     */
    saveInteractionData() {
        const history = this.getUserInteractionHistory();
        const updated = {
            ...history,
            totalSessions: history.totalSessions + 1,
            advancedFeatureUsage: Math.max(history.advancedFeatureUsage, this.userInteractions.advancedFeatureUsage),
            modelLoadCount: Math.max(history.modelLoadCount, this.userInteractions.modelLoadCount),
            sessionTime: history.sessionTime + this.userInteractions.sessionTime
        };
        
        localStorage.setItem('user-interaction-history', JSON.stringify(updated));
    }

    /**
     * Check if model has animations
     */
    hasAnimations(model) {
        let hasAnimations = false;
        model.traverse((child) => {
            if (child.animations && child.animations.length > 0) {
                hasAnimations = true;
            }
        });
        return hasAnimations;
    }

    /**
     * Show tooltip with message
     */
    showTooltip(id, message, duration = 3000) {
        // Disabled for production - no UI messages
        return;
    }

    /**
     * Clear asset results
     */
    clearAssetResults() {
        const resultsContainer = document.getElementById('assetGrid');
        const resultsCount = document.querySelector('.results-count');
        
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }
        
        if (resultsCount) {
            resultsCount.textContent = 'Ready to search';
        }
    }

    /**
     * Enable asset library features after AssetManager is initialized
     */
    enableAssetLibraryFeatures() {
        console.log('Asset library features enabled');
        // Asset library is now ready to use
        // Clear any "not ready" messages
        const resultsContainer = document.getElementById('assetGrid');
        if (resultsContainer && resultsContainer.innerHTML.includes('initializing')) {
            resultsContainer.innerHTML = '';
            const resultsCount = document.querySelector('.results-count');
            if (resultsCount) {
                resultsCount.textContent = 'Ready to search';
            }
        }
    }

    /**
     * Show message when asset library is not ready
     */
    showAssetLibraryNotReady() {
        const resultsContainer = document.getElementById('assetGrid');
        const resultsCount = document.querySelector('.results-count');
        
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <div style="margin-bottom: 1rem;">
                        <svg style="width: 48px; height: 48px; opacity: 0.5; animation: spin 1s linear infinite;" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
                        </svg>
                    </div>
                    <p><strong>Asset Library Initializing...</strong></p>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem;">Please wait while the online library loads.</p>
                </div>
            `;
        }
        
        if (resultsCount) {
            resultsCount.textContent = 'Initializing...';
        }
        
        // Try again in 1 second
        setTimeout(() => {
            if (this.core.assetManager?.onlineLibraryManager) {
                this.enableAssetLibraryFeatures();
                // Retry the last tab action
                const activeTab = document.querySelector('.tab-btn.active');
                if (activeTab) {
                    this.switchAssetTab(activeTab.dataset.tab);
                }
            }
        }, 1000);
    }

    /**
     * Setup asset library modal functionality
     */
    setupAssetLibraryModal() {
        // Open modal button
        const openModalBtn = document.getElementById('openAssetLibraryModal');
        const modal = document.getElementById('assetLibraryModal');
        const closeModalBtn = document.getElementById('closeAssetLibrary');
        
        if (openModalBtn && modal) {
            openModalBtn.addEventListener('click', () => {
                modal.classList.remove('hidden');
                // Focus on search input
                const modalSearchInput = document.getElementById('modalLibrarySearch');
                if (modalSearchInput) {
                    setTimeout(() => modalSearchInput.focus(), 100);
                }
            });
        }
        
        if (closeModalBtn && modal) {
            closeModalBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }
        
        // Close modal when clicking outside
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        }
        
        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
            }
        });
    }

    /**
     * Switch asset library tab
     */
    switchAssetTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        // Check if AssetManager is ready
        if (!this.core.assetManager?.onlineLibraryManager) {
            this.showAssetLibraryNotReady();
            return;
        }
        
        // Load tab content
        switch (tab) {
            case 'search':
                this.performAssetSearch();
                break;
            case 'favorites':
                this.loadFavoriteAssets();
                break;
            case 'offline':
                this.loadOfflineAssets();
                break;
        }
    }

    /**
     * Load favorite assets
     */
    async loadFavoriteAssets() {
        try {
            if (!this.core.assetManager?.onlineLibraryManager) {
                console.warn('OnlineLibraryManager not available yet');
                return;
            }
            
            const favorites = this.core.assetManager.onlineLibraryManager.getFavorites();
            const resultsCount = document.querySelector('.results-count');
            
            if (resultsCount) {
                resultsCount.textContent = `${favorites.length} favorites`;
            }
            
            this.displayAssetResults(favorites);
        } catch (error) {
            console.error('Failed to load favorites:', error);
        }
    }

    /**
     * Load offline assets
     */
    async loadOfflineAssets() {
        try {
            if (!this.core.assetManager?.onlineLibraryManager) {
                console.warn('OnlineLibraryManager not available yet');
                return;
            }
            
            const offline = await this.core.assetManager.onlineLibraryManager.searchOfflineAssets('', null, { count: 100 });
            const resultsCount = document.querySelector('.results-count');
            
            if (resultsCount) {
                resultsCount.textContent = `${offline.length} offline assets`;
            }
            
            this.displayAssetResults(offline);
        } catch (error) {
            console.error('Failed to load offline assets:', error);
        }
    }

    /**
     * Set asset view mode
     */
    setAssetView(mode) {
        const gridViewBtn = document.getElementById('gridView');
        const listViewBtn = document.getElementById('listView');
        const assetGrid = document.getElementById('assetGrid');
        
        if (mode === 'grid') {
            gridViewBtn?.classList.add('active');
            listViewBtn?.classList.remove('active');
            assetGrid?.classList.remove('list-view');
            assetGrid?.querySelectorAll('.asset-item').forEach(item => {
                item.classList.remove('list-view');
            });
        } else {
            listViewBtn?.classList.add('active');
            gridViewBtn?.classList.remove('active');
            assetGrid?.classList.add('list-view');
            assetGrid?.querySelectorAll('.asset-item').forEach(item => {
                item.classList.add('list-view');
            });
        }
    }

    /**
     * Setup panels
     */
    setupPanels() {
        // Register default panels
        this.registerPanel('loading', document.getElementById('loadingScreen'));
        this.registerPanel('progress', document.getElementById('progressBar'));
        // Error modal removed - no user-facing error messages
        this.registerPanel('sidebar', document.getElementById('sidebar'));
        this.registerPanel('controls', document.getElementById('superheroControls'));
        
        // Initialize export panel
        this.exportPanel = new ExportPanel(this.core);
        this.registerPanel('export', this.exportPanel.element);
        
        // Setup asset library UI
        this.setupAssetLibraryUI();
        this.setupAssetLibraryModal();
    }

    /**
     * Register a UI panel
     */
    registerPanel(name, element) {
        if (!element) {
            console.warn(`Panel element not found: ${name}`);
            return;
        }
        
        this.panels.set(name, {
            element,
            visible: !element.classList.contains('hidden'),
            mode: 'both' // 'simple', 'advanced', or 'both'
        });
    }

    /**
     * Show a panel
     */
    showPanel(name) {
        const panel = this.panels.get(name);
        if (panel) {
            panel.element.classList.remove('hidden');
            panel.visible = true;
            this.core.emit('ui:panel:shown', { name });
        }
    }

    /**
     * Hide a panel
     */
    hidePanel(name) {
        const panel = this.panels.get(name);
        if (panel) {
            panel.element.classList.add('hidden');
            panel.visible = false;
            this.core.emit('ui:panel:hidden', { name });
        }
    }

    /**
     * Update panel visibility based on current mode
     */
    updatePanelVisibility() {
        this.panels.forEach((panel, name) => {
            if (panel.mode === 'both' || panel.mode === this.currentMode) {
                // Panel should be visible in current mode
                if (panel.visible) {
                    panel.element.classList.remove('hidden');
                }
            } else {
                // Panel should be hidden in current mode
                panel.element.classList.add('hidden');
            }
        });
    }

    /**
     * Show progress indicator
     */
    showProgress(show, text = 'Loading...') {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.querySelector('.progress-text');
        
        if (show) {
            this.showPanel('progress');
            if (progressText) {
                progressText.textContent = text;
            }
        } else {
            this.hidePanel('progress');
        }
    }

    /**
     * Update progress indicator
     */
    updateProgress(progress) {
        const progressFill = document.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = `${progress * 100}%`;
        }
    }

    /**
     * Show error message - REMOVED: No user-facing error messages
     * Errors are logged to console only for developers
     */
    showError(message) {
        // Silent - no user-facing error messages
        // Errors are handled in console for developers only
        console.error('UI Error (silent):', message);
    }

    /**
     * Toggle theme (light/dark)
     */
    toggleTheme(isDark) {
        document.body.classList.toggle('dark-mode', isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        this.core.updateState('settings.theme', isDark ? 'dark' : 'light');
        this.core.emit('ui:theme:changed', { theme: isDark ? 'dark' : 'light' });
    }

    /**
     * Load theme from localStorage
     */
    loadTheme() {
        const theme = localStorage.getItem('theme');
        const isDark = theme === 'dark';
        const themeToggle = document.getElementById('themeToggle');
        
        if (themeToggle) {
            themeToggle.checked = isDark;
        }
        this.toggleTheme(isDark);
    }

    /**
     * Handle model loaded event
     */
    onModelLoaded(data) {
        // Update UI elements that depend on loaded model
        this.updateModelStats(data.model);
        this.updateHierarchy(data.model);
    }

    /**
     * Update model statistics display
     */
    updateModelStats(model) {
        let vertices = 0;
        let faces = 0;

        model.traverse((child) => {
            if (child.isMesh && child.geometry) {
                const geometry = child.geometry;
                if (geometry.attributes.position) {
                    vertices += geometry.attributes.position.count;
                }
                if (geometry.index) {
                    faces += geometry.index.count / 3;
                } else {
                    faces += geometry.attributes.position.count / 3;
                }
            }
        });

        const vertexCount = document.getElementById('vertexCount');
        const faceCount = document.getElementById('faceCount');
        
        if (vertexCount) vertexCount.textContent = vertices.toLocaleString();
        if (faceCount) faceCount.textContent = Math.floor(faces).toLocaleString();
    }

    /**
     * Update hierarchy display
     */
    updateHierarchy(model) {
        const hierarchyContainer = document.getElementById('hierarchyContainer');
        if (!hierarchyContainer) return;

        hierarchyContainer.innerHTML = '';
        const ul = document.createElement('ul');
        ul.className = 'hierarchy-list';

        const createHierarchyItem = (object, depth) => {
            const li = document.createElement('li');
            li.style.paddingLeft = `${depth * 15}px`;

            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = object.visible;
            checkbox.addEventListener('change', () => {
                object.visible = checkbox.checked;
            });

            const span = document.createElement('span');
            span.textContent = object.name || `[${object.type}]`;

            label.appendChild(checkbox);
            label.appendChild(span);
            li.appendChild(label);

            if (object.children.length > 0) {
                const childUl = document.createElement('ul');
                object.children.forEach(child => {
                    childUl.appendChild(createHierarchyItem(child, depth + 1));
                });
                li.appendChild(childUl);
            }

            return li;
        };

        ul.appendChild(createHierarchyItem(model, 0));
        hierarchyContainer.appendChild(ul);
    }

    /**
     * Set sidebar height to match window height
     */
    setSidebarHeight() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.style.height = window.innerHeight + 'px';
        }
    }

    /**
     * Setup asset library UI functionality
     */
    setupAssetLibraryUI() {
        // Search functionality
        const searchInput = document.getElementById('librarySearch');
        const searchBtn = document.getElementById('searchBtn');
        const suggestionsContainer = document.getElementById('searchSuggestions');
        
        console.log('Asset library elements found:', {
            searchInput: !!searchInput,
            searchBtn: !!searchBtn,
            suggestionsContainer: !!suggestionsContainer
        });
        
        if (searchInput && searchBtn) {
            // Search on button click
            searchBtn.addEventListener('click', (e) => {
                console.log('Search button clicked');
                e.preventDefault();
                this.performAssetSearch();
            });
            
            // Search on Enter key
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    console.log('Enter key pressed in search');
                    e.preventDefault();
                    this.performAssetSearch();
                }
            });
            
            // Show suggestions on input
            searchInput.addEventListener('input', (e) => {
                this.showSearchSuggestions(e.target.value);
            });
            
            // Hide suggestions when clicking outside
            document.addEventListener('click', (e) => {
                if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                    suggestionsContainer.classList.add('hidden');
                }
            });
        }
        
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchAssetTab(btn.dataset.tab);
            });
        });
        
        // View toggle
        const gridViewBtn = document.getElementById('gridView');
        const listViewBtn = document.getElementById('listView');
        
        if (gridViewBtn && listViewBtn) {
            gridViewBtn.addEventListener('click', () => this.setAssetView('grid'));
            listViewBtn.addEventListener('click', () => this.setAssetView('list'));
        }
        
        // Filter changes
        const librarySelect = document.getElementById('librarySelect');
        const formatFilter = document.getElementById('formatFilter');
        
        if (librarySelect) {
            librarySelect.addEventListener('change', () => this.performAssetSearch());
        }
        
        if (formatFilter) {
            formatFilter.addEventListener('change', () => this.performAssetSearch());
        }
    }

    /**
     * Perform asset search
     */
    async performAssetSearch() {
        console.log('performAssetSearch called');
        
        const searchInput = document.getElementById('librarySearch');
        const librarySelect = document.getElementById('librarySelect');
        const formatFilter = document.getElementById('formatFilter');
        const loadingIndicator = document.getElementById('loadingAssets');
        const resultsContainer = document.getElementById('assetGrid');
        const resultsCount = document.querySelector('.results-count');
        
        console.log('Elements found:', {
            searchInput: !!searchInput,
            librarySelect: !!librarySelect,
            formatFilter: !!formatFilter,
            loadingIndicator: !!loadingIndicator,
            resultsContainer: !!resultsContainer,
            resultsCount: !!resultsCount
        });
        
        if (!searchInput) {
            console.log('No search input found, returning');
            return;
        }
        
        // Direct check using window.modelViewer as fallback
        const assetManager = this.core?.assetManager || window.modelViewer?.assetManager;
        const onlineLibraryManager = assetManager?.onlineLibraryManager;
        
        console.log('Checking asset managers:', {
            coreAssetManager: !!this.core?.assetManager,
            windowAssetManager: !!window.modelViewer?.assetManager,
            onlineLibraryManager: !!onlineLibraryManager,
            assetManagerInitialized: assetManager?.initialized
        });
        
        if (!onlineLibraryManager) {
            console.log('OnlineLibraryManager not ready');
            this.showAssetLibraryNotReady();
            return;
        }
        
        console.log('All checks passed, proceeding with search');
        
        // Get current values
        const query = searchInput.value.trim();
        const libraryId = librarySelect?.value || null;
        const format = formatFilter?.value || null;
        
        console.log('Search parameters:', { query, libraryId, format });
        
        // Allow empty query to show all assets from selected library
        if (!query && !libraryId) {
            // If no query and no library selected, show message
            this.clearAssetResults();
            const resultsCount = document.querySelector('.results-count');
            if (resultsCount) {
                resultsCount.textContent = 'Enter a search term or select a library';
            }
            return;
        }
        
        // Use empty string for query if not provided but library is selected
        const searchQuery = query || '';
        
        try {
            // Show loading and clear results
            if (loadingIndicator) {
                loadingIndicator.classList.remove('hidden');
                console.log('Loading indicator shown');
            }
            if (resultsContainer) {
                resultsContainer.innerHTML = '';
                console.log('Results container cleared');
            }
            
            console.log('Performing search with:', { query: searchQuery, libraryId, format });
            
            // Perform search using the found asset manager
            const results = await assetManager.searchOnlineAssets(searchQuery, libraryId, {
                format,
                count: 20
            });
            
            console.log('Search completed, results:', results);
            
            // Hide loading
            if (loadingIndicator) {
                loadingIndicator.classList.add('hidden');
                console.log('Loading indicator hidden');
            }
            
            // Update results count
            if (resultsCount) {
                resultsCount.textContent = `${results.length} results found`;
                console.log('Results count updated');
            }
            
            // Display results
            console.log('Displaying results...');
            this.displayAssetResults(results);
            console.log('Results displayed');
            
        } catch (error) {
            console.error('Asset search failed:', error);
            
            // Always hide loading indicator
            loadingIndicator?.classList.add('hidden');
            
            if (resultsCount) {
                resultsCount.textContent = 'Search failed';
            }
            
            // Show error in results area
            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #dc3545;">
                        <p><strong>Search Failed</strong></p>
                        <p style="font-size: 0.9rem; margin-top: 0.5rem;">${error.message}</p>
                    </div>
                `;
            }
            
            // Silent error - no user message
        } finally {
            // Ensure loading is always hidden
            loadingIndicator?.classList.add('hidden');
        }
    }

    /**
     * Display asset search results
     */
    displayAssetResults(results) {
        const resultsContainer = document.getElementById('assetGrid');
        if (!resultsContainer) return;
        
        resultsContainer.innerHTML = '';
        
        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">No assets found</div>';
            return;
        }
        
        results.forEach(asset => {
            const assetElement = this.createAssetElement(asset);
            resultsContainer.appendChild(assetElement);
        });
    }

    /**
     * Create asset element
     */
    createAssetElement(asset) {
        const div = document.createElement('div');
        div.className = 'asset-item';
        div.dataset.assetId = asset.id;
        div.dataset.library = asset.library;
        
        const thumbnail = asset.thumbnail || this.getPlaceholderThumbnail();
        
        div.innerHTML = `
            <div class="asset-thumbnail">
                ${asset.thumbnail ? 
                    `<img src="${asset.thumbnail}" alt="${asset.name}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;">` :
                    `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; color: #666; text-align: center; padding: 1rem;">
                        <svg style="width: 48px; height: 48px; margin-bottom: 0.5rem; opacity: 0.5;" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                            <line x1="12" y1="22.08" x2="12" y2="12"/>
                        </svg>
                        <div style="font-size: 0.8rem; font-weight: 500;">${asset.format.toUpperCase()}</div>
                        <div style="font-size: 0.7rem; opacity: 0.7;">3D Model</div>
                    </div>`
                }
                <div class="asset-actions">
                    <button class="asset-action-btn" data-action="favorite" title="Add to Favorites">
                        <svg class="icon" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    </button>
                    <button class="asset-action-btn" data-action="download" title="Download for Offline">
                        <svg class="icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                    </button>
                </div>
                <div class="asset-badges">
                    ${asset.isOfflineAvailable ? '<div class="asset-badge"><svg class="icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>Offline</div>' : ''}
                    ${asset.isFavorite ? '<div class="asset-badge"><svg class="icon" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>Fav</div>' : ''}
                </div>
            </div>
            <div class="asset-info">
                <div class="asset-name" title="${asset.name}">${asset.name}</div>
                ${asset.description ? `<div class="asset-description" title="${asset.description}">${asset.description}</div>` : ''}
                <div class="asset-meta">
                    <span class="asset-library">${asset.libraryName}</span>
                    <span class="asset-format">${asset.format.toUpperCase()}</span>
                </div>
                ${asset.author ? `<div class="asset-author" title="Created by ${asset.author}">by ${asset.author}</div>` : ''}
                <div class="asset-load-hint">Click to load model</div>
            </div>
        `;
        
        // Add click handler to load asset
        div.addEventListener('click', (e) => {
            if (!e.target.closest('.asset-action-btn')) {
                this.loadAssetFromLibrary(asset);
            }
        });
        
        // Add action button handlers
        const favoriteBtn = div.querySelector('[data-action="favorite"]');
        const downloadBtn = div.querySelector('[data-action="download"]');
        
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleAssetFavorite(asset, div);
            });
        }
        
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.downloadAssetOffline(asset, div);
            });
        }
        
        return div;
    }

    /**
     * Load asset from library
     */
    async loadAssetFromLibrary(asset) {
        try {
            this.showProgress(true, `Loading ${asset.name}...`);
            
            // Use the same fallback approach as in search
            const assetManager = this.core?.assetManager || window.modelViewer?.assetManager;
            
            if (!assetManager) {
                throw new Error('AssetManager not available');
            }
            
            await assetManager.loadAssetFromLibrary(asset);
        } catch (error) {
            console.error('Failed to load asset:', error);
            // Silent error - no user message
        } finally {
            this.showProgress(false);
        }
    }

    /**
     * Toggle asset favorite status
     */
    async toggleAssetFavorite(asset, element) {
        try {
            const assetManager = this.core?.assetManager || window.modelViewer?.assetManager;
            const onlineLibraryManager = assetManager?.onlineLibraryManager;
            
            if (!onlineLibraryManager) {
                throw new Error('OnlineLibraryManager not available');
            }
            
            if (asset.isFavorite) {
                onlineLibraryManager.removeFromFavorites(asset);
                asset.isFavorite = false;
            } else {
                onlineLibraryManager.addToFavorites(asset);
                asset.isFavorite = true;
            }
            
            // Update UI
            this.updateAssetElement(element, asset);
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        }
    }

    /**
     * Download asset for offline use
     */
    async downloadAssetOffline(asset, element) {
        try {
            const downloadBtn = element.querySelector('[data-action="download"]');
            if (downloadBtn) {
                downloadBtn.innerHTML = '<div class="loader-small"></div>';
                downloadBtn.disabled = true;
            }
            
            const assetManager = this.core?.assetManager || window.modelViewer?.assetManager;
            const onlineLibraryManager = assetManager?.onlineLibraryManager;
            
            if (!onlineLibraryManager) {
                throw new Error('OnlineLibraryManager not available');
            }
            
            await onlineLibraryManager.downloadAsset(asset, { saveOffline: true });
            asset.isOfflineAvailable = true;
            
            // Update UI
            this.updateAssetElement(element, asset);
        } catch (error) {
            console.error('Failed to download asset:', error);
            // Silent error - no user message
        } finally {
            const downloadBtn = element.querySelector('[data-action="download"]');
            if (downloadBtn) {
                downloadBtn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>';
                downloadBtn.disabled = false;
            }
        }
    }

    /**
     * Update asset element UI
     */
    updateAssetElement(element, asset) {
        const badges = element.querySelector('.asset-badges');
        if (badges) {
            badges.innerHTML = `
                ${asset.isOfflineAvailable ? '<div class="asset-badge"><svg class="icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>Offline</div>' : ''}
                ${asset.isFavorite ? '<div class="asset-badge"><svg class="icon" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>Fav</div>' : ''}
            `;
        }
    }

    /**
     * Show search suggestions
     */
    showSearchSuggestions(query) {
        const suggestionsContainer = document.getElementById('searchSuggestions');
        if (!suggestionsContainer || !query.trim()) {
            suggestionsContainer?.classList.add('hidden');
            return;
        }
        
        if (this.core.assetManager?.onlineLibraryManager) {
            const suggestions = this.core.assetManager.onlineLibraryManager.getSearchSuggestions(query);
            
            if (suggestions.length > 0) {
                suggestionsContainer.innerHTML = suggestions.map(suggestion => `
                    <div class="search-suggestion" data-query="${suggestion.text}">
                        <span class="suggestion-type">${suggestion.type}</span>
                        <span>${suggestion.text}</span>
                    </div>
                `).join('');
                
                // Add click handlers
                suggestionsContainer.querySelectorAll('.search-suggestion').forEach(item => {
                    item.addEventListener('click', () => {
                        document.getElementById('librarySearch').value = item.dataset.query;
                        suggestionsContainer.classList.add('hidden');
                        this.performAssetSearch();
                    });
                });
                
                suggestionsContainer.classList.remove('hidden');
            } else {
                suggestionsContainer.classList.add('hidden');
            }
        }
    }

    /**
     * Switch asset library tab
     */
    switchAssetTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        // Check if AssetManager is ready
        if (!this.core.assetManager?.onlineLibraryManager) {
            this.showAssetLibraryNotReady();
            return;
        }
        
        // Load tab content
        switch (tab) {
            case 'search':
                this.performAssetSearch();
                break;
            case 'favorites':
                this.loadFavoriteAssets();
                break;
            case 'offline':
                this.loadOfflineAssets();
                break;
        }
    }

    /**
     * Load favorite assets
     */
    async loadFavoriteAssets() {
        try {
            if (!this.core.assetManager?.onlineLibraryManager) {
                console.warn('OnlineLibraryManager not available yet');
                return;
            }
            
            const favorites = this.core.assetManager.onlineLibraryManager.getFavorites();
            const resultsCount = document.querySelector('.results-count');
            
            if (resultsCount) {
                resultsCount.textContent = `${favorites.length} favorites`;
            }
            
            this.displayAssetResults(favorites);
        } catch (error) {
            console.error('Failed to load favorites:', error);
        }
    }

    /**
     * Load offline assets
     */
    async loadOfflineAssets() {
        try {
            if (!this.core.assetManager?.onlineLibraryManager) {
                console.warn('OnlineLibraryManager not available yet');
                return;
            }
            
            const offline = await this.core.assetManager.onlineLibraryManager.searchOfflineAssets('', null, { count: 100 });
            const resultsCount = document.querySelector('.results-count');
            
            if (resultsCount) {
                resultsCount.textContent = `${offline.length} offline assets`;
            }
            
            this.displayAssetResults(offline);
        } catch (error) {
            console.error('Failed to load offline assets:', error);
        }
    }

    /**
     * Set asset view mode
     */
    setAssetView(mode) {
        const gridViewBtn = document.getElementById('gridView');
        const listViewBtn = document.getElementById('listView');
        const assetGrid = document.getElementById('assetGrid');
        
        if (mode === 'grid') {
            gridViewBtn?.classList.add('active');
            listViewBtn?.classList.remove('active');
            assetGrid?.classList.remove('list-view');
            assetGrid?.querySelectorAll('.asset-item').forEach(item => {
                item.classList.remove('list-view');
            });
        } else {
            listViewBtn?.classList.add('active');
            gridViewBtn?.classList.remove('active');
            assetGrid?.classList.add('list-view');
            assetGrid?.querySelectorAll('.asset-item').forEach(item => {
                item.classList.add('list-view');
            });
        }
    }

    /**
     * Clear asset results
     */
    clearAssetResults() {
        const resultsContainer = document.getElementById('assetGrid');
        const resultsCount = document.querySelector('.results-count');
        
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }
        
        if (resultsCount) {
            resultsCount.textContent = 'Ready to search';
        }
    }

    /**
     * Enable asset library features after AssetManager is initialized
     */
    enableAssetLibraryFeatures() {
        console.log('Asset library features enabled');
        // Asset library is now ready to use
        // Clear any "not ready" messages
        const resultsContainer = document.getElementById('assetGrid');
        if (resultsContainer && resultsContainer.innerHTML.includes('initializing')) {
            resultsContainer.innerHTML = '';
            const resultsCount = document.querySelector('.results-count');
            if (resultsCount) {
                resultsCount.textContent = 'Ready to search';
            }
        }
    }

    /**
     * Show message when asset library is not ready
     */
    showAssetLibraryNotReady() {
        const resultsContainer = document.getElementById('assetGrid');
        const resultsCount = document.querySelector('.results-count');
        
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <div style="margin-bottom: 1rem;">
                        <svg style="width: 48px; height: 48px; opacity: 0.5; animation: spin 1s linear infinite;" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
                        </svg>
                    </div>
                    <p><strong>Asset Library Initializing...</strong></p>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem;">Please wait while the online library loads.</p>
                </div>
            `;
        }
        
        if (resultsCount) {
            resultsCount.textContent = 'Initializing...';
        }
        
        // Try again in 1 second
        setTimeout(() => {
            if (this.core.assetManager?.onlineLibraryManager) {
                this.enableAssetLibraryFeatures();
                // Retry the last tab action
                const activeTab = document.querySelector('.tab-btn.active');
                if (activeTab) {
                    this.switchAssetTab(activeTab.dataset.tab);
                }
            }
        }, 1000);
    }

    /**
     * Setup asset library modal functionality
     */
    setupAssetLibraryModal() {
        // Open modal button
        const openModalBtn = document.getElementById('openAssetLibraryModal');
        const modal = document.getElementById('assetLibraryModal');
        const closeModalBtn = document.getElementById('closeAssetLibrary');
        
        if (openModalBtn && modal) {
            openModalBtn.addEventListener('click', () => {
                modal.classList.remove('hidden');
                // Focus on search input
                const modalSearchInput = document.getElementById('modalLibrarySearch');
                if (modalSearchInput) {
                    setTimeout(() => modalSearchInput.focus(), 100);
                }
            });
        }
        
        if (closeModalBtn && modal) {
            closeModalBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }
        
        // Close modal when clicking outside
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        }
        
        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
            }
        });
        
        // Modal search functionality
        const modalSearchInput = document.getElementById('modalLibrarySearch');
        const modalSearchBtn = document.getElementById('modalSearchBtn');
        
        if (modalSearchInput && modalSearchBtn) {
            modalSearchBtn.addEventListener('click', () => {
                this.performModalAssetSearch();
            });
            
            modalSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performModalAssetSearch();
                }
            });
        }
        
        // Modal view toggle
        const modalGridViewBtn = document.getElementById('modalGridView');
        const modalListViewBtn = document.getElementById('modalListView');
        
        if (modalGridViewBtn && modalListViewBtn) {
            modalGridViewBtn.addEventListener('click', () => this.setModalAssetView('grid'));
            modalListViewBtn.addEventListener('click', () => this.setModalAssetView('list'));
        }
        
        // Modal tab switching
        document.querySelectorAll('.modal-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchModalAssetTab(btn.dataset.tab);
            });
        });
    }

    /**
     * Perform asset search in modal
     */
    async performModalAssetSearch() {
        const searchInput = document.getElementById('modalLibrarySearch');
        const librarySelect = document.getElementById('modalLibrarySelect');
        const formatFilter = document.getElementById('modalFormatFilter');
        const loadingIndicator = document.getElementById('modalLoadingAssets');
        const resultsContainer = document.getElementById('modalAssetGrid');
        const resultsCount = document.getElementById('modalResultsCount');
        
        // Use the same search logic as the sidebar
        const assetManager = this.core?.assetManager || window.modelViewer?.assetManager;
        const onlineLibraryManager = assetManager?.onlineLibraryManager;
        
        if (!onlineLibraryManager) {
            console.log('OnlineLibraryManager not ready for modal search');
            return;
        }
        
        const query = searchInput?.value.trim() || '';
        const libraryId = librarySelect?.value || null;
        const format = formatFilter?.value || null;
        const category = document.getElementById('modalCategoryFilter')?.value || null;
        const sortBy = document.getElementById('modalSortFilter')?.value || 'relevance';
        const hasAnimations = document.getElementById('hasAnimations')?.checked;
        const hasTextures = document.getElementById('hasTextures')?.checked;
        
        console.log('Modal search parameters:', { query, libraryId, format, category, sortBy, hasAnimations, hasTextures });
        
        try {
            // Show loading
            if (loadingIndicator) {
                loadingIndicator.classList.remove('hidden');
            }
            if (resultsContainer) {
                resultsContainer.innerHTML = '';
            }
            
            // Perform search
            const results = await assetManager.searchOnlineAssets(query, libraryId, {
                format,
                category,
                sortBy,
                hasAnimations,
                hasTextures,
                count: 50 // More results for modal
            });
            
            console.log('Modal search results:', results);
            
            // Hide loading
            if (loadingIndicator) {
                loadingIndicator.classList.add('hidden');
            }
            
            // Update results count
            if (resultsCount) {
                resultsCount.textContent = `${results.length} results found`;
            }
            
            // Display results in modal
            this.displayModalAssetResults(results);
            
        } catch (error) {
            console.error('Modal asset search failed:', error);
            
            if (loadingIndicator) {
                loadingIndicator.classList.add('hidden');
            }
            
            if (resultsCount) {
                resultsCount.textContent = 'Search failed';
            }
            
            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <div style="text-align: center; padding: 4rem 2rem; color: #dc3545; grid-column: 1 / -1;">
                        <svg style="width: 64px; height: 64px; margin-bottom: 1rem; opacity: 0.3;" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        <h3 style="margin: 0 0 0.5rem 0; font-size: 1.2rem;">Search Failed</h3>
                        <p style="margin: 0; opacity: 0.8; font-size: 0.9rem;">${error.message}</p>
                        <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Try Again
                        </button>
                    </div>
                `;
            }
        }
    }

    /**
     * Display asset results in modal
     */
    displayModalAssetResults(results) {
        const resultsContainer = document.getElementById('modalAssetGrid');
        if (!resultsContainer) return;
        
        resultsContainer.innerHTML = '';
        
        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: #666;">
                    <svg style="width: 64px; height: 64px; margin-bottom: 1rem; opacity: 0.3;" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                    </svg>
                    <h3 style="margin: 0 0 0.5rem 0; font-size: 1.2rem;">No models found</h3>
                    <p style="margin: 0; opacity: 0.8;">Try adjusting your search terms or selecting a different library</p>
                </div>
            `;
            return;
        }
        
        results.forEach(asset => {
            const assetElement = this.createAssetElement(asset);
            resultsContainer.appendChild(assetElement);
        });
    }

    /**
     * Set modal asset view mode
     */
    setModalAssetView(mode) {
        const gridViewBtn = document.getElementById('modalGridView');
        const listViewBtn = document.getElementById('modalListView');
        const assetGrid = document.getElementById('modalAssetGrid');
        
        if (mode === 'grid') {
            gridViewBtn?.classList.add('active');
            listViewBtn?.classList.remove('active');
            assetGrid?.classList.remove('list-view');
            assetGrid?.querySelectorAll('.asset-item').forEach(item => {
                item.classList.remove('list-view');
            });
        } else {
            listViewBtn?.classList.add('active');
            gridViewBtn?.classList.remove('active');
            assetGrid?.classList.add('list-view');
            assetGrid?.querySelectorAll('.asset-item').forEach(item => {
                item.classList.add('list-view');
            });
        }
    }

    /**
     * Switch modal asset tab
     */
    switchModalAssetTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.modal-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        // Load tab content (reuse existing logic)
        switch (tab) {
            case 'search':
                this.performModalAssetSearch();
                break;
            case 'favorites':
                // Load favorites in modal
                break;
            case 'offline':
                // Load offline assets in modal
                break;
        }
    }

    /**
     * Get placeholder thumbnail
     */
    getPlaceholderThumbnail() {
        return 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80">
                <rect width="120" height="80" fill="#f0f0f0"/>
                <path d="M60 20L70 35L50 35Z" fill="#ccc"/>
                <circle cx="60" cy="50" r="8" fill="#ccc"/>
            </svg>
        `);
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Remove core event listeners
        this.core.off('assets:initialized');
        this.core.off('assets:loading:start');
        this.core.off('assets:loading:progress');
        this.core.off('assets:loading:complete');
        this.core.off('assets:loading:error');
        this.core.off('assets:model:loaded');
        this.core.off('assets:model:error');
        this.core.off('ui:interaction');
        
        // Destroy sub-managers
        if (this.i18nManager) {
            this.i18nManager.destroy();
        }
        if (this.accessibilityManager) {
            this.accessibilityManager.destroy();
        }
        if (this.themeManager) {
            this.themeManager.destroy();
        }
        if (this.keyboardShortcutManager) {
            this.keyboardShortcutManager.destroy();
        }
        if (this.notificationSystem) {
            this.notificationSystem.destroy();
        }
        if (this.fileManagerPanel) {
            this.fileManagerPanel.destroy();
        }
        
        // Remove DOM event listeners
        this.eventListeners.forEach((listeners, element) => {
            listeners.forEach(({ event, handler }) => {
                element.removeEventListener(event, handler);
            });
        });
        
        this.eventListeners.clear();
        this.panels.clear();
        this.initialized = false;
    }
}

/**
 * LayoutManager - Handles responsive layouts and panel management
 */
class LayoutManager {
    constructor() {
        this.breakpoints = {
            mobile: 768,
            tablet: 1024,
            desktop: 1200
        };
        this.currentBreakpoint = 'desktop';
    }

    init(uiManager) {
        this.uiManager = uiManager;
        this.setupResponsiveHandling();
    }

    setupResponsiveHandling() {
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        this.handleResize(); // Initial check
    }

    handleResize() {
        const width = window.innerWidth;
        let newBreakpoint = 'desktop';
        
        if (width <= this.breakpoints.mobile) {
            newBreakpoint = 'mobile';
        } else if (width <= this.breakpoints.tablet) {
            newBreakpoint = 'tablet';
        }

        if (newBreakpoint !== this.currentBreakpoint) {
            this.currentBreakpoint = newBreakpoint;
            this.adaptLayoutForBreakpoint(newBreakpoint);
        }
    }

    adaptLayoutForBreakpoint(breakpoint) {
        document.body.classList.remove('layout-mobile', 'layout-tablet', 'layout-desktop');
        document.body.classList.add(`layout-${breakpoint}`);

        // Adjust UI mode for mobile
        if (breakpoint === 'mobile' && this.uiManager.currentMode === 'advanced') {
            this.uiManager.setMode('simple');
        }
    }

    adaptLayout(mode) {
        // Adjust layout based on UI mode
        document.body.classList.toggle('compact-layout', mode === 'simple');
        document.body.classList.toggle('expanded-layout', mode === 'advanced');
    }
}

/**
 * HelpSystem - Manages contextual help, tooltips, and guided tours
 */
class HelpSystem {
    constructor() {
        this.activeTooltip = null;
        this.tourOverlay = null;
        this.messageContainer = null;
    }

    init(uiManager) {
        this.uiManager = uiManager;
        this.createMessageContainer();
    }

    createMessageContainer() {
        this.messageContainer = document.createElement('div');
        this.messageContainer.className = 'help-messages';
        document.body.appendChild(this.messageContainer);
    }

    showTooltip(element, content) {
        this.hideTooltip();

        this.activeTooltip = document.createElement('div');
        this.activeTooltip.className = 'help-tooltip';
        this.activeTooltip.innerHTML = `
            <div class="tooltip-content">
                <h4>${content.title}</h4>
                <p>${content.content}</p>
            </div>
            <div class="tooltip-arrow"></div>
        `;

        document.body.appendChild(this.activeTooltip);
        this.positionTooltip(element, content.position);
    }

    positionTooltip(element, position = 'top') {
        if (!this.activeTooltip) return;

        const rect = element.getBoundingClientRect();
        const tooltip = this.activeTooltip;
        const tooltipRect = tooltip.getBoundingClientRect();

        let top, left;

        switch (position) {
            case 'bottom':
                top = rect.bottom + 10;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.left - tooltipRect.width - 10;
                break;
            case 'right':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.right + 10;
                break;
            default: // top
                top = rect.top - tooltipRect.height - 10;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
        }

        tooltip.style.top = `${Math.max(10, top)}px`;
        tooltip.style.left = `${Math.max(10, Math.min(window.innerWidth - tooltipRect.width - 10, left))}px`;
        tooltip.classList.add('show');
    }

    hideTooltip() {
        if (this.activeTooltip) {
            this.activeTooltip.remove();
            this.activeTooltip = null;
        }
    }

    isTooltipVisible() {
        return this.activeTooltip !== null;
    }

    showTourStep(element, step, stepIndex, totalSteps) {
        // Create tour overlay if not exists
        if (!this.tourOverlay) {
            this.tourOverlay = document.createElement('div');
            this.tourOverlay.className = 'tour-overlay';
            document.body.appendChild(this.tourOverlay);
        }

        // Highlight target element
        this.highlightElement(element);

        // Create tour step content
        const tourStep = document.createElement('div');
        tourStep.className = 'tour-step';
        tourStep.innerHTML = `
            <div class="tour-step-content">
                <div class="tour-step-header">
                    <h3>${step.title}</h3>
                    <span class="tour-step-counter">${stepIndex + 1} of ${totalSteps}</span>
                </div>
                <p>${step.content}</p>
                <div class="tour-step-buttons">
                    ${stepIndex > 0 ? '<button id="tourPrev" class="btn secondary">Previous</button>' : ''}
                    <button id="tourNext" class="btn primary">${stepIndex === totalSteps - 1 ? 'Finish' : 'Next'}</button>
                    <button id="tourSkip" class="btn secondary">Skip Tour</button>
                </div>
            </div>
        `;

        this.tourOverlay.innerHTML = '';
        this.tourOverlay.appendChild(tourStep);
        this.tourOverlay.classList.add('active');

        // Position tour step
        this.positionTourStep(element, tourStep, step.position);

        // Add event listeners
        const nextBtn = document.getElementById('tourNext');
        const prevBtn = document.getElementById('tourPrev');
        const skipBtn = document.getElementById('tourSkip');

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (stepIndex === totalSteps - 1) {
                    // This is the finish button
                    this.endTour();
                } else {
                    this.uiManager.showTourStep(stepIndex + 1);
                }
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.uiManager.showTourStep(stepIndex - 1);
            });
        }

        if (skipBtn) {
            skipBtn.addEventListener('click', () => {
                this.endTour();
            });
        }
    }

    highlightElement(element) {
        // Remove previous highlights
        document.querySelectorAll('.tour-highlight').forEach(el => {
            el.classList.remove('tour-highlight');
        });

        // Add highlight to current element
        element.classList.add('tour-highlight');
    }

    positionTourStep(element, tourStep, position) {
        const rect = element.getBoundingClientRect();
        const stepRect = tourStep.getBoundingClientRect();

        let top, left;

        switch (position) {
            case 'bottom':
                top = rect.bottom + 20;
                left = rect.left + (rect.width - stepRect.width) / 2;
                break;
            case 'left':
                top = rect.top + (rect.height - stepRect.height) / 2;
                left = rect.left - stepRect.width - 20;
                break;
            case 'right':
                top = rect.top + (rect.height - stepRect.height) / 2;
                left = rect.right + 20;
                break;
            default: // top
                top = rect.top - stepRect.height - 20;
                left = rect.left + (rect.width - stepRect.width) / 2;
        }

        tourStep.style.top = `${Math.max(20, top)}px`;
        tourStep.style.left = `${Math.max(20, Math.min(window.innerWidth - stepRect.width - 20, left))}px`;
    }

    endTour() {
        if (this.tourOverlay) {
            this.tourOverlay.classList.remove('active');
            setTimeout(() => {
                this.tourOverlay.remove();
                this.tourOverlay = null;
            }, 300);
        }

        // Remove highlights
        document.querySelectorAll('.tour-highlight').forEach(el => {
            el.classList.remove('tour-highlight');
        });

        this.uiManager.completeTour();
    }

    showMessage(message, duration = 3000) {
        const messageEl = document.createElement('div');
        messageEl.className = 'help-message';
        messageEl.textContent = message;

        this.messageContainer.appendChild(messageEl);

        setTimeout(() => messageEl.classList.add('show'), 10);
        setTimeout(() => {
            messageEl.classList.remove('show');
            setTimeout(() => messageEl.remove(), 300);
        }, duration);
    }

    updateForMode(mode) {
        // Update help content based on current mode
        const helpElements = document.querySelectorAll('[data-help]');
        helpElements.forEach(el => {
            const helpId = el.dataset.help;
            const modeSpecificHelp = el.dataset[`help${mode.charAt(0).toUpperCase() + mode.slice(1)}`];
            if (modeSpecificHelp) {
                el.dataset.help = modeSpecificHelp;
            }
        });
    }
}