/**
 * OnboardingManager - Intelligent onboarding system with contextual guidance
 * Provides zero-friction first experience with progressive feature discovery
 */
export class OnboardingManager {
    constructor(coreEngine) {
        this.coreEngine = coreEngine;
        this.initialized = false;
        
        // Onboarding state
        this.isFirstTime = false;
        this.currentStep = 0;
        this.completedSteps = new Set();
        this.userProgress = {
            modelsLoaded: 0,
            featuresUsed: new Set(),
            sessionCount: 0,
            totalTime: 0
        };
        
        // Onboarding steps with smart triggers
        this.steps = [
            {
                id: 'welcome',
                trigger: 'immediate',
                target: '#fileDrop',
                title: 'Welcome to 3D Model Viewer Pro! 🎯',
                message: 'Let\'s get started by loading your first 3D model. Drag & drop a file or try a sample.',
                action: 'highlight',
                position: 'bottom',
                dismissible: true,
                priority: 1
            },
            {
                id: 'first-model-loaded',
                trigger: 'model:loaded',
                target: '#viewerContainer',
                title: 'Great! Your model is loaded 🎉',
                message: 'Use your mouse to rotate (left-click), zoom (scroll), and pan (right-click) the view.',
                action: 'tooltip',
                position: 'center',
                dismissible: true,
                priority: 2
            },
            {
                id: 'camera-controls',
                trigger: 'interaction:5',
                target: '#resetCamera',
                title: 'Camera Controls',
                message: 'Lost your view? Use these buttons to reset or fit the model to screen.',
                action: 'pulse',
                position: 'left',
                dismissible: true,
                priority: 3
            },
            {
                id: 'lighting-intro',
                trigger: 'model:loaded:2',
                target: '.accordion-item[data-feature="lighting-controls"]',
                title: 'Enhance with Lighting ✨',
                message: 'Adjust lighting to make your model look professional. Try different presets!',
                action: 'glow',
                position: 'right',
                dismissible: true,
                priority: 4
            },
            {
                id: 'advanced-features',
                trigger: 'expertise:intermediate',
                target: '#modeToggleBtn',
                title: 'Ready for More? 🚀',
                message: 'You\'re getting good! Switch to Advanced mode to unlock powerful features.',
                action: 'bounce',
                position: 'bottom',
                dismissible: true,
                priority: 5
            }
        ];
        
        // Tooltip templates
        this.tooltipTemplate = null;
        this.activeTooltip = null;
        
        // Interaction tracking
        this.interactionCount = 0;
        this.lastInteraction = Date.now();
    }

    /**
     * Initialize the onboarding manager
     */
    async initialize() {
        if (this.initialized) return;
        
        // Check if user is first-time
        this.isFirstTime = !localStorage.getItem('onboarding:completed');
        
        // Load user progress
        this.loadProgress();
        
        // Create tooltip template
        this.createTooltipTemplate();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start onboarding if first time
        if (this.isFirstTime) {
            setTimeout(() => this.startOnboarding(), 1000);
        }
        
        this.initialized = true;
        this.coreEngine.emit('onboarding:initialized');
    }

    /**
     * Load user progress from localStorage
     */
    loadProgress() {
        const saved = localStorage.getItem('onboarding:progress');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.userProgress = { ...this.userProgress, ...data };
                this.completedSteps = new Set(data.completedSteps || []);
            } catch (error) {
                console.warn('Failed to load onboarding progress:', error);
            }
        }
    }

    /**
     * Save user progress to localStorage
     */
    saveProgress() {
        const data = {
            ...this.userProgress,
            completedSteps: Array.from(this.completedSteps)
        };
        localStorage.setItem('onboarding:progress', JSON.stringify(data));
    }

    /**
     * Create tooltip template
     */
    createTooltipTemplate() {
        const template = document.createElement('div');
        template.className = 'onboarding-tooltip';
        template.innerHTML = `
            <div class="tooltip-content">
                <button class="tooltip-close" aria-label="Close tooltip">×</button>
                <div class="tooltip-icon"></div>
                <h3 class="tooltip-title"></h3>
                <p class="tooltip-message"></p>
                <div class="tooltip-actions">
                    <button class="tooltip-btn primary">Got it!</button>
                    <button class="tooltip-btn secondary">Skip tour</button>
                </div>
                <div class="tooltip-progress"></div>
            </div>
            <div class="tooltip-arrow"></div>
        `;
        this.tooltipTemplate = template;
    }

    /**
     * Setup event listeners for triggers
     */
    setupEventListeners() {
        // Model loaded trigger
        this.coreEngine.on('assets:model:loaded', () => {
            this.userProgress.modelsLoaded++;
            this.saveProgress();
            this.checkTrigger('model:loaded');
            
            if (this.userProgress.modelsLoaded === 2) {
                this.checkTrigger('model:loaded:2');
            }
        });
        
        // Interaction tracking
        document.addEventListener('click', () => {
            this.interactionCount++;
            if (this.interactionCount === 5) {
                this.checkTrigger('interaction:5');
            }
        });
        
        // Expertise level changes
        this.coreEngine.on('ui:expertise:changed', (data) => {
            if (data.newLevel === 'intermediate') {
                this.checkTrigger('expertise:intermediate');
            }
        });
        
        // Feature usage tracking
        this.coreEngine.on('feature:used', (data) => {
            this.userProgress.featuresUsed.add(data.feature);
            this.saveProgress();
        });
    }

    /**
     * Start the onboarding flow
     */
    startOnboarding() {
        // Show welcome step immediately
        const welcomeStep = this.steps.find(s => s.id === 'welcome');
        if (welcomeStep) {
            this.showStep(welcomeStep);
        }
    }

    /**
     * Check if a trigger condition is met
     */
    checkTrigger(trigger) {
        const step = this.steps.find(s => 
            s.trigger === trigger && !this.completedSteps.has(s.id)
        );
        
        if (step) {
            // Delay slightly to avoid overwhelming user
            setTimeout(() => this.showStep(step), 500);
        }
    }

    /**
     * Show an onboarding step
     */
    showStep(step) {
        // Don't show if already completed
        if (this.completedSteps.has(step.id)) return;
        
        // Find target element
        const target = document.querySelector(step.target);
        if (!target) {
            console.warn(`Onboarding target not found: ${step.target}`);
            return;
        }
        
        // Create tooltip
        const tooltip = this.tooltipTemplate.cloneNode(true);
        tooltip.dataset.stepId = step.id;
        
        // Populate content
        tooltip.querySelector('.tooltip-title').textContent = step.title;
        tooltip.querySelector('.tooltip-message').textContent = step.message;
        
        // Position tooltip
        this.positionTooltip(tooltip, target, step.position);
        
        // Apply visual effect to target
        this.applyEffect(target, step.action);
        
        // Setup event listeners
        this.setupTooltipListeners(tooltip, step, target);
        
        // Add to DOM
        document.body.appendChild(tooltip);
        
        // Animate in
        requestAnimationFrame(() => {
            tooltip.classList.add('show');
        });
        
        this.activeTooltip = tooltip;
        this.currentStep = step.id;
        
        this.coreEngine.emit('onboarding:step:shown', { step: step.id });
    }

    /**
     * Position tooltip relative to target
     */
    positionTooltip(tooltip, target, position) {
        const rect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let top, left;
        
        switch (position) {
            case 'top':
                top = rect.top - tooltipRect.height - 20;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                tooltip.classList.add('position-top');
                break;
            case 'bottom':
                top = rect.bottom + 20;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                tooltip.classList.add('position-bottom');
                break;
            case 'left':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.left - tooltipRect.width - 20;
                tooltip.classList.add('position-left');
                break;
            case 'right':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.right + 20;
                tooltip.classList.add('position-right');
                break;
            case 'center':
                top = window.innerHeight / 2 - tooltipRect.height / 2;
                left = window.innerWidth / 2 - tooltipRect.width / 2;
                tooltip.classList.add('position-center');
                break;
        }
        
        // Keep within viewport
        top = Math.max(10, Math.min(top, window.innerHeight - tooltipRect.height - 10));
        left = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10));
        
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    }

    /**
     * Apply visual effect to target element
     */
    applyEffect(target, action) {
        target.classList.add(`onboarding-${action}`);
        
        // Remove effect after animation
        setTimeout(() => {
            target.classList.remove(`onboarding-${action}`);
        }, 3000);
    }

    /**
     * Setup tooltip event listeners
     */
    setupTooltipListeners(tooltip, step, target) {
        // Close button
        const closeBtn = tooltip.querySelector('.tooltip-close');
        closeBtn.addEventListener('click', () => {
            this.dismissStep(step.id);
        });
        
        // Primary action (Got it!)
        const primaryBtn = tooltip.querySelector('.tooltip-btn.primary');
        primaryBtn.addEventListener('click', () => {
            this.completeStep(step.id);
        });
        
        // Secondary action (Skip tour)
        const secondaryBtn = tooltip.querySelector('.tooltip-btn.secondary');
        secondaryBtn.addEventListener('click', () => {
            this.skipOnboarding();
        });
        
        // Click outside to dismiss
        if (step.dismissible) {
            setTimeout(() => {
                document.addEventListener('click', (e) => {
                    if (!tooltip.contains(e.target) && !target.contains(e.target)) {
                        this.dismissStep(step.id);
                    }
                }, { once: true });
            }, 100);
        }
    }

    /**
     * Complete an onboarding step
     */
    completeStep(stepId) {
        this.completedSteps.add(stepId);
        this.saveProgress();
        
        if (this.activeTooltip) {
            this.activeTooltip.classList.remove('show');
            setTimeout(() => {
                this.activeTooltip?.remove();
                this.activeTooltip = null;
            }, 300);
        }
        
        // Check if onboarding is complete
        if (this.completedSteps.size >= this.steps.length) {
            this.completeOnboarding();
        }
        
        this.coreEngine.emit('onboarding:step:completed', { step: stepId });
    }

    /**
     * Dismiss a step without completing
     */
    dismissStep(stepId) {
        if (this.activeTooltip) {
            this.activeTooltip.classList.remove('show');
            setTimeout(() => {
                this.activeTooltip?.remove();
                this.activeTooltip = null;
            }, 300);
        }
        
        this.coreEngine.emit('onboarding:step:dismissed', { step: stepId });
    }

    /**
     * Skip entire onboarding
     */
    skipOnboarding() {
        this.completedSteps = new Set(this.steps.map(s => s.id));
        this.saveProgress();
        localStorage.setItem('onboarding:completed', 'true');
        
        if (this.activeTooltip) {
            this.activeTooltip.remove();
            this.activeTooltip = null;
        }
        
        this.coreEngine.emit('onboarding:skipped');
    }

    /**
     * Complete onboarding
     */
    completeOnboarding() {
        localStorage.setItem('onboarding:completed', 'true');
        this.isFirstTime = false;
        
        // Show completion message
        this.showCompletionMessage();
        
        this.coreEngine.emit('onboarding:completed');
    }

    /**
     * Show onboarding completion message
     */
    showCompletionMessage() {
        const message = document.createElement('div');
        message.className = 'onboarding-completion';
        message.innerHTML = `
            <div class="completion-content">
                <div class="completion-icon">🎉</div>
                <h2>You're all set!</h2>
                <p>You've mastered the basics. Explore advanced features anytime!</p>
            </div>
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => message.classList.add('show'), 100);
        setTimeout(() => {
            message.classList.remove('show');
            setTimeout(() => message.remove(), 300);
        }, 3000);
    }

    /**
     * Check if user is first time
     */
    isFirstTimeUser() {
        return this.isFirstTime;
    }

    /**
     * Show tooltip for element
     */
    showTooltip(elementId, message, position = 'top') {
        const element = document.getElementById(elementId) || document.querySelector(elementId);
        if (!element) {
            console.warn(`Element not found: ${elementId}`);
            return;
        }

        const tooltip = document.createElement('div');
        tooltip.className = 'onboarding-tooltip';
        tooltip.textContent = message;
        tooltip.style.position = 'absolute';
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = position === 'top' ? `${rect.top - 40}px` : `${rect.bottom + 10}px`;
        
        element.classList.add('onboarding-highlight');
        document.body.appendChild(tooltip);
        
        this.currentTooltip = { tooltip, element };
    }

    /**
     * Hide current tooltip
     */
    hideTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.tooltip.remove();
            this.currentTooltip.element.classList.remove('onboarding-highlight');
            this.currentTooltip = null;
        }
    }

    /**
     * Track feature usage
     */
    trackFeatureUsage(featureId) {
        this.userProgress.featuresUsed.add(featureId);
        this.saveProgress();
        this.coreEngine.emit('onboarding:featureUsed', { feature: featureId });
    }

    /**
     * Suggest next feature
     */
    suggestNextFeature() {
        // Find features not yet used
        const allFeatures = ['camera-controls', 'lighting', 'export', 'analysis', 'cinematic'];
        const unused = allFeatures.filter(f => !this.userProgress.featuresUsed.has(f));
        
        if (unused.length > 0) {
            return {
                id: unused[0],
                name: unused[0].replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                description: `Try the ${unused[0]} feature`
            };
        }
        return null;
    }

    /**
     * Show feature hint
     */
    showFeatureHint(feature) {
        if (!feature || !feature.trigger) return;
        
        const element = document.getElementById(feature.trigger) || document.querySelector(feature.trigger);
        if (element) {
            this.showTooltip(feature.trigger, feature.description || feature.name);
        }
    }

    /**
     * Mark step as completed
     */
    markStepCompleted(stepId) {
        this.completedSteps.add(stepId);
        this.saveProgress();
        this.coreEngine.emit('onboarding:stepCompleted', { step: stepId });
    }

    /**
     * Check if step is completed
     */
    isStepCompleted(stepId) {
        return this.completedSteps.has(stepId);
    }

    /**
     * Get completion percentage
     */
    getCompletionPercentage() {
        return Math.round((this.completedSteps.size / this.steps.length) * 100);
    }

    /**
     * Start onboarding manually
     */
    start() {
        this.startOnboarding();
    }

    /**
     * Skip onboarding
     */
    skip() {
        this.skipOnboarding();
    }

    /**
     * Show current step
     */
    showCurrentStep() {
        if (this.currentStep >= 0 && this.currentStep < this.steps.length) {
            const step = this.steps[this.currentStep];
            this.showStep(step);
        }
    }

    /**
     * Go to next step
     */
    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.showCurrentStep();
        } else {
            this.completeOnboarding();
        }
    }

    /**
     * Go to previous step
     */
    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showCurrentStep();
        }
    }

    /**
     * Reset onboarding (for testing)
     */
    reset() {
        localStorage.removeItem('onboarding:completed');
        localStorage.removeItem('onboarding:progress');
        this.completedSteps.clear();
        this.userProgress = {
            modelsLoaded: 0,
            featuresUsed: new Set(),
            sessionCount: 0,
            totalTime: 0
        };
        this.isFirstTime = true;
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.activeTooltip) {
            this.activeTooltip.remove();
        }
        this.initialized = false;
    }
}
