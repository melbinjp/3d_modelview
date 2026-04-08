/**
 * AccessibilityManager - Handles keyboard navigation, screen reader support, and accessibility features
 * Ensures WCAG 2.1 AA compliance and provides comprehensive accessibility support
 */
export class AccessibilityManager {
    constructor(coreEngine) {
        this.coreEngine = coreEngine;
        this.initialized = false;
        
        // Keyboard navigation state
        this.keyboardNavigation = {
            enabled: true,
            currentFocus: null,
            focusableElements: [],
            focusIndex: -1,
            trapFocus: false,
            focusHistory: []
        };
        
        // Keyboard shortcuts
        this.shortcuts = new Map([
            ['Space', { action: 'toggleAnimation', description: 'Play/Pause animation' }],
            ['KeyR', { action: 'resetCamera', description: 'Reset camera view' }],
            ['KeyF', { action: 'fitToView', description: 'Fit model to view' }],
            ['KeyG', { action: 'toggleGrid', description: 'Toggle grid visibility' }],
            ['KeyH', { action: 'toggleHelp', description: 'Toggle help panel' }],
            ['KeyS', { action: 'toggleSuperhero', description: 'Toggle superhero mode' }],
            ['Escape', { action: 'closeDialogs', description: 'Close open dialogs' }],
            ['Tab', { action: 'navigate', description: 'Navigate between controls' }],
            ['Enter', { action: 'activate', description: 'Activate focused element' }],
            ['ArrowUp', { action: 'navigateUp', description: 'Navigate up' }],
            ['ArrowDown', { action: 'navigateDown', description: 'Navigate down' }],
            ['ArrowLeft', { action: 'navigateLeft', description: 'Navigate left' }],
            ['ArrowRight', { action: 'navigateRight', description: 'Navigate right' }]
        ]);
        
        // Screen reader support
        this.screenReader = {
            announcements: [],
            liveRegion: null,
            statusRegion: null,
            alertRegion: null
        };
        
        // High contrast and visual accessibility
        this.visualAccessibility = {
            highContrast: false,
            reducedMotion: false,
            largeText: false,
            focusVisible: true
        };
        
        // Focus management
        this.focusManager = {
            lastFocusedElement: null,
            focusStack: [],
            skipLinks: [],
            focusHistory: []
        };
        
        // Accessibility preferences
        this.preferences = {
            announceModelLoading: true,
            announceStateChanges: true,
            keyboardShortcuts: true,
            focusIndicators: true,
            reducedMotion: false
        };
    }

    /**
     * Initialize the accessibility manager
     */
    async initialize() {
        if (this.initialized) {
            console.warn('AccessibilityManager already initialized');
            return;
        }

        try {
            // Setup ARIA live regions
            this.setupLiveRegions();
            
            // Setup keyboard navigation
            this.setupKeyboardNavigation();
            
            // Setup focus management
            this.setupFocusManagement();
            
            // Setup screen reader support
            this.setupScreenReaderSupport();
            
            // Setup visual accessibility features
            this.setupVisualAccessibility();
            
            // Load user preferences
            this.loadAccessibilityPreferences();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Add skip links
            this.addSkipLinks();
            
            // Enhance existing elements
            this.enhanceExistingElements();
            
            this.initialized = true;
            this.coreEngine.emit('accessibility:initialized');
            
            // Announce initialization
            this.announce('3D Model Viewer loaded and ready for interaction');
            
        } catch (error) {
            console.error('Failed to initialize AccessibilityManager:', error);
            this.coreEngine.emit('error', {
                type: 'AccessibilityInitializationError',
                message: error.message,
                context: { module: 'AccessibilityManager' }
            });
        }
    }

    /**
     * Setup ARIA live regions for screen reader announcements
     */
    setupLiveRegions() {
        // Main live region for general announcements
        this.screenReader.liveRegion = document.createElement('div');
        this.screenReader.liveRegion.setAttribute('aria-live', 'polite');
        this.screenReader.liveRegion.setAttribute('aria-atomic', 'true');
        this.screenReader.liveRegion.className = 'sr-only';
        this.screenReader.liveRegion.id = 'live-region';
        document.body.appendChild(this.screenReader.liveRegion);
        
        // Status region for status updates
        this.screenReader.statusRegion = document.createElement('div');
        this.screenReader.statusRegion.setAttribute('aria-live', 'polite');
        this.screenReader.statusRegion.setAttribute('role', 'status');
        this.screenReader.statusRegion.className = 'sr-only';
        this.screenReader.statusRegion.id = 'status-region';
        document.body.appendChild(this.screenReader.statusRegion);
        
        // Alert region for important messages
        this.screenReader.alertRegion = document.createElement('div');
        this.screenReader.alertRegion.setAttribute('aria-live', 'assertive');
        this.screenReader.alertRegion.setAttribute('role', 'alert');
        this.screenReader.alertRegion.className = 'sr-only';
        this.screenReader.alertRegion.id = 'alert-region';
        document.body.appendChild(this.screenReader.alertRegion);
    }

    /**
     * Setup keyboard navigation system
     */
    setupKeyboardNavigation() {
        // Add keyboard event listeners
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Update focusable elements list
        this.updateFocusableElements();
        
        // Setup roving tabindex for complex widgets
        this.setupRovingTabindex();
    }

    /**
     * Handle keydown events for navigation and shortcuts
     */
    handleKeyDown(event) {
        const { code, key, ctrlKey, altKey, shiftKey, metaKey } = event;
        
        // Handle keyboard shortcuts
        if (this.preferences.keyboardShortcuts && !ctrlKey && !altKey && !metaKey) {
            const shortcut = this.shortcuts.get(code);
            if (shortcut) {
                event.preventDefault();
                this.executeShortcut(shortcut.action, event);
                return;
            }
        }
        
        // Handle Tab navigation
        if (key === 'Tab') {
            this.handleTabNavigation(event);
        }
        
        // Handle arrow key navigation in specific contexts
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
            this.handleArrowNavigation(event);
        }
        
        // Handle Enter and Space for activation
        if (key === 'Enter' || key === ' ') {
            this.handleActivation(event);
        }
        
        // Handle Escape for closing dialogs
        if (key === 'Escape') {
            this.handleEscape(event);
        }
    }

    /**
     * Handle keyup events
     */
    handleKeyUp(event) {
        // Handle any keyup-specific logic here
    }

    /**
     * Execute keyboard shortcut actions
     */
    executeShortcut(action, event) {
        switch (action) {
            case 'toggleAnimation':
                this.toggleAnimation();
                break;
            case 'resetCamera':
                this.resetCamera();
                break;
            case 'fitToView':
                this.fitToView();
                break;
            case 'toggleGrid':
                this.toggleGrid();
                break;
            case 'toggleHelp':
                this.toggleHelp();
                break;
            case 'toggleSuperhero':
                this.toggleSuperhero();
                break;
            case 'closeDialogs':
                this.closeDialogs();
                break;
        }
        
        this.announce(`Executed ${action} command`);
    }

    /**
     * Handle Tab navigation
     */
    handleTabNavigation(event) {
        if (this.keyboardNavigation.trapFocus) {
            event.preventDefault();
            this.navigateTrappedFocus(event.shiftKey);
        } else {
            // Let browser handle normal tab navigation
            this.updateCurrentFocus();
        }
    }

    /**
     * Handle arrow key navigation
     */
    handleArrowNavigation(event) {
        const activeElement = document.activeElement;
        
        // Check if we're in a specific navigation context
        if (activeElement.closest('.accordion')) {
            this.handleAccordionNavigation(event);
        } else if (activeElement.closest('.slider-container')) {
            this.handleSliderNavigation(event);
        } else if (activeElement.closest('.button-group')) {
            this.handleButtonGroupNavigation(event);
        }
    }

    /**
     * Handle accordion navigation with arrow keys
     */
    handleAccordionNavigation(event) {
        const accordion = document.querySelector('.accordion');
        const headers = accordion.querySelectorAll('.accordion-header');
        const currentIndex = Array.from(headers).indexOf(document.activeElement);
        
        if (currentIndex === -1) return;
        
        let newIndex;
        if (event.code === 'ArrowDown') {
            newIndex = (currentIndex + 1) % headers.length;
        } else if (event.code === 'ArrowUp') {
            newIndex = (currentIndex - 1 + headers.length) % headers.length;
        } else {
            return;
        }
        
        event.preventDefault();
        headers[newIndex].focus();
        this.announce(`Focused on ${headers[newIndex].textContent}`);
    }

    /**
     * Handle slider navigation with arrow keys
     */
    handleSliderNavigation(event) {
        const slider = document.activeElement;
        if (slider.type !== 'range') return;
        
        const step = parseFloat(slider.step) || 1;
        const min = parseFloat(slider.min) || 0;
        const max = parseFloat(slider.max) || 100;
        let value = parseFloat(slider.value);
        
        if (event.code === 'ArrowRight' || event.code === 'ArrowUp') {
            value = Math.min(max, value + step);
        } else if (event.code === 'ArrowLeft' || event.code === 'ArrowDown') {
            value = Math.max(min, value - step);
        } else {
            return;
        }
        
        slider.value = value;
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        
        const label = slider.closest('.control-group')?.querySelector('label')?.textContent || 'Slider';
        this.announce(`${label} set to ${value}`);
    }

    /**
     * Handle button group navigation
     */
    handleButtonGroupNavigation(event) {
        const buttonGroup = document.activeElement.closest('.button-group');
        const buttons = buttonGroup.querySelectorAll('button:not([disabled])');
        const currentIndex = Array.from(buttons).indexOf(document.activeElement);
        
        if (currentIndex === -1) return;
        
        let newIndex;
        if (event.code === 'ArrowRight') {
            newIndex = (currentIndex + 1) % buttons.length;
        } else if (event.code === 'ArrowLeft') {
            newIndex = (currentIndex - 1 + buttons.length) % buttons.length;
        } else {
            return;
        }
        
        event.preventDefault();
        buttons[newIndex].focus();
    }

    /**
     * Handle Enter/Space activation
     */
    handleActivation(event) {
        const activeElement = document.activeElement;
        
        // Handle accordion headers
        if (activeElement.classList.contains('accordion-header')) {
            event.preventDefault();
            activeElement.click();
            const isOpen = activeElement.parentElement.classList.contains('is-open');
            this.announce(`${activeElement.textContent} ${isOpen ? 'expanded' : 'collapsed'}`);
        }
        
        // Handle custom buttons
        if (activeElement.hasAttribute('role') && activeElement.getAttribute('role') === 'button') {
            event.preventDefault();
            activeElement.click();
        }
    }

    /**
     * Handle Escape key
     */
    handleEscape(event) {
        // Close any open modals or dialogs
        const openModal = document.querySelector('.modal.show, .dialog.show');
        if (openModal) {
            event.preventDefault();
            this.closeModal(openModal);
            return;
        }
        
        // Exit focus trap if active
        if (this.keyboardNavigation.trapFocus) {
            this.exitFocusTrap();
        }
        
        // Collapse expanded accordion items
        const expandedAccordion = document.querySelector('.accordion-item.is-open');
        if (expandedAccordion) {
            expandedAccordion.classList.remove('is-open');
            expandedAccordion.querySelector('.accordion-header').focus();
        }
    }

    /**
     * Setup focus management
     */
    setupFocusManagement() {
        // Track focus changes
        document.addEventListener('focusin', this.handleFocusIn.bind(this));
        document.addEventListener('focusout', this.handleFocusOut.bind(this));
        
        // Setup focus indicators
        this.setupFocusIndicators();
        
        // Setup focus trap functionality
        this.setupFocusTrap();
    }

    /**
     * Handle focus in events
     */
    handleFocusIn(event) {
        this.keyboardNavigation.currentFocus = event.target;
        
        // Add focus history
        this.focusManager.focusHistory.push(event.target);
        if (this.focusManager.focusHistory.length > 10) {
            this.focusManager.focusHistory.shift();
        }
        
        // Announce focused element if appropriate
        this.announceFocusedElement(event.target);
    }

    /**
     * Handle focus out events
     */
    handleFocusOut(event) {
        this.focusManager.lastFocusedElement = event.target;
    }

    /**
     * Announce focused element to screen readers
     */
    announceFocusedElement(element) {
        if (!this.preferences.announceStateChanges) return;
        
        const label = this.getElementLabel(element);
        const role = element.getAttribute('role') || element.tagName.toLowerCase();
        const state = this.getElementState(element);
        
        if (label) {
            let announcement = label;
            if (state) {
                announcement += `, ${state}`;
            }
            announcement += `, ${role}`;
            
            // Delay announcement to avoid conflicts
            setTimeout(() => this.announce(announcement), 100);
        }
    }

    /**
     * Get accessible label for element
     */
    getElementLabel(element) {
        // Check aria-label first
        if (element.hasAttribute('aria-label')) {
            return element.getAttribute('aria-label');
        }
        
        // Check aria-labelledby
        if (element.hasAttribute('aria-labelledby')) {
            const labelId = element.getAttribute('aria-labelledby');
            const labelElement = document.getElementById(labelId);
            if (labelElement) {
                return labelElement.textContent.trim();
            }
        }
        
        // Check associated label
        if (element.id) {
            const label = document.querySelector(`label[for="${element.id}"]`);
            if (label) {
                return label.textContent.trim();
            }
        }
        
        // Check title attribute
        if (element.hasAttribute('title')) {
            return element.getAttribute('title');
        }
        
        // Check text content for buttons
        if (element.tagName === 'BUTTON') {
            return element.textContent.trim();
        }
        
        // Check placeholder for inputs
        if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
            return element.getAttribute('placeholder');
        }
        
        return null;
    }

    /**
     * Get element state information
     */
    getElementState(element) {
        const states = [];
        
        if (element.hasAttribute('aria-expanded')) {
            states.push(element.getAttribute('aria-expanded') === 'true' ? 'expanded' : 'collapsed');
        }
        
        if (element.hasAttribute('aria-checked')) {
            const checked = element.getAttribute('aria-checked');
            if (checked === 'true') states.push('checked');
            else if (checked === 'false') states.push('unchecked');
            else states.push('partially checked');
        }
        
        if (element.hasAttribute('aria-selected')) {
            states.push(element.getAttribute('aria-selected') === 'true' ? 'selected' : 'not selected');
        }
        
        if (element.disabled) {
            states.push('disabled');
        }
        
        if (element.hasAttribute('aria-pressed')) {
            states.push(element.getAttribute('aria-pressed') === 'true' ? 'pressed' : 'not pressed');
        }
        
        return states.join(', ');
    }

    /**
     * Setup focus indicators
     */
    setupFocusIndicators() {
        if (!this.preferences.focusIndicators) return;
        
        // Add focus styles
        const style = document.createElement('style');
        style.textContent = `
            .focus-visible {
                outline: 2px solid var(--focus-color, #0066cc) !important;
                outline-offset: 2px !important;
            }
            
            .high-contrast .focus-visible {
                outline: 3px solid #ffffff !important;
                outline-offset: 3px !important;
            }
            
            /* Hide focus for mouse users */
            .mouse-user *:focus {
                outline: none !important;
            }
            
            /* Show focus for keyboard users */
            .keyboard-user *:focus-visible {
                outline: 2px solid var(--focus-color, #0066cc) !important;
                outline-offset: 2px !important;
            }
        `;
        document.head.appendChild(style);
        
        // Track input method
        this.trackInputMethod();
    }

    /**
     * Track whether user is using keyboard or mouse
     */
    trackInputMethod() {
        let isKeyboardUser = false;
        
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                isKeyboardUser = true;
                document.body.classList.add('keyboard-user');
                document.body.classList.remove('mouse-user');
            }
        });
        
        document.addEventListener('mousedown', () => {
            isKeyboardUser = false;
            document.body.classList.add('mouse-user');
            document.body.classList.remove('keyboard-user');
        });
    }

    /**
     * Setup screen reader support
     */
    setupScreenReaderSupport() {
        // Add screen reader only styles
        const style = document.createElement('style');
        style.textContent = `
            .sr-only {
                position: absolute !important;
                width: 1px !important;
                height: 1px !important;
                padding: 0 !important;
                margin: -1px !important;
                overflow: hidden !important;
                clip: rect(0, 0, 0, 0) !important;
                white-space: nowrap !important;
                border: 0 !important;
            }
            
            .sr-only-focusable:focus {
                position: static !important;
                width: auto !important;
                height: auto !important;
                padding: inherit !important;
                margin: inherit !important;
                overflow: visible !important;
                clip: auto !important;
                white-space: normal !important;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Setup visual accessibility features
     */
    setupVisualAccessibility() {
        // Check for user preferences
        this.checkUserPreferences();
        
        // Setup high contrast mode
        this.setupHighContrastMode();
        
        // Setup reduced motion
        this.setupReducedMotion();
        
        // Setup large text support
        this.setupLargeTextSupport();
    }

    /**
     * Check user's system accessibility preferences
     */
    checkUserPreferences() {
        // Check for reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.visualAccessibility.reducedMotion = true;
            document.body.classList.add('reduced-motion');
        }
        
        // Check for high contrast preference
        if (window.matchMedia('(prefers-contrast: high)').matches) {
            this.visualAccessibility.highContrast = true;
            document.body.classList.add('high-contrast');
        }
        
        // Listen for changes
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            this.visualAccessibility.reducedMotion = e.matches;
            document.body.classList.toggle('reduced-motion', e.matches);
        });
        
        window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
            this.visualAccessibility.highContrast = e.matches;
            document.body.classList.toggle('high-contrast', e.matches);
        });
    }

    /**
     * Setup high contrast mode
     */
    setupHighContrastMode() {
        const style = document.createElement('style');
        style.textContent = `
            .high-contrast {
                --bg-color: #000000;
                --text-color: #ffffff;
                --border-color: #ffffff;
                --focus-color: #ffff00;
                --button-bg: #000000;
                --button-border: #ffffff;
                --input-bg: #000000;
                --input-border: #ffffff;
            }
            
            .high-contrast * {
                background-color: var(--bg-color) !important;
                color: var(--text-color) !important;
                border-color: var(--border-color) !important;
            }
            
            .high-contrast button,
            .high-contrast input,
            .high-contrast select {
                background-color: var(--button-bg) !important;
                border: 2px solid var(--button-border) !important;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Setup reduced motion support
     */
    setupReducedMotion() {
        const style = document.createElement('style');
        style.textContent = `
            .reduced-motion *,
            .reduced-motion *::before,
            .reduced-motion *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                scroll-behavior: auto !important;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Setup large text support
     */
    setupLargeTextSupport() {
        // Add zoom controls
        this.addZoomControls();
    }

    /**
     * Add skip links for keyboard navigation
     */
    addSkipLinks() {
        const skipLinks = document.createElement('div');
        skipLinks.className = 'skip-links';
        skipLinks.innerHTML = `
            <a href="#mainContent" class="skip-link sr-only-focusable" data-i18n="a11y.skipToContent">Skip to main content</a>
            <a href="#sidebar" class="skip-link sr-only-focusable">Skip to controls</a>
            <a href="#viewer" class="skip-link sr-only-focusable">Skip to 3D viewer</a>
        `;
        
        document.body.insertBefore(skipLinks, document.body.firstChild);
        
        // Add IDs to target elements if they don't exist
        const mainContent = document.getElementById('mainContainer');
        if (mainContent && !mainContent.id) {
            mainContent.id = 'mainContent';
        }
        
        const viewer = document.getElementById('viewer');
        if (viewer && !viewer.id) {
            viewer.id = 'viewer';
        }
    }

    /**
     * Enhance existing elements with accessibility features
     */
    enhanceExistingElements() {
        // Add ARIA labels to buttons without labels
        document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])').forEach(button => {
            const text = button.textContent.trim();
            const icon = button.querySelector('.icon');
            
            if (!text && icon) {
                // Try to determine button purpose from context
                const purpose = this.inferButtonPurpose(button);
                if (purpose) {
                    button.setAttribute('aria-label', purpose);
                }
            }
        });
        
        // Add ARIA labels to form controls
        document.querySelectorAll('input, select, textarea').forEach(control => {
            if (!control.hasAttribute('aria-label') && !control.hasAttribute('aria-labelledby')) {
                const label = control.closest('.control-group')?.querySelector('label');
                if (label && !label.hasAttribute('for')) {
                    const id = control.id || `control-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    control.id = id;
                    label.setAttribute('for', id);
                }
            }
        });
        
        // Add role and ARIA attributes to accordion
        document.querySelectorAll('.accordion-header').forEach((header, index) => {
            header.setAttribute('role', 'button');
            header.setAttribute('aria-expanded', 'false');
            header.setAttribute('tabindex', '0');
            
            const content = header.nextElementSibling;
            if (content) {
                const contentId = `accordion-content-${index}`;
                content.id = contentId;
                header.setAttribute('aria-controls', contentId);
                content.setAttribute('role', 'region');
                content.setAttribute('aria-labelledby', header.id || `accordion-header-${index}`);
                if (!header.id) {
                    header.id = `accordion-header-${index}`;
                }
            }
        });
        
        // Add ARIA attributes to sliders
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            const label = slider.closest('.control-group')?.querySelector('label');
            if (label) {
                slider.setAttribute('aria-label', label.textContent);
            }
            
            // Add value announcements
            slider.addEventListener('input', () => {
                const value = slider.value;
                const label = slider.getAttribute('aria-label') || 'Slider';
                slider.setAttribute('aria-valuetext', `${label}: ${value}`);
            });
        });
    }

    /**
     * Infer button purpose from context
     */
    inferButtonPurpose(button) {
        const parent = button.parentElement;
        const classes = button.className;
        
        if (classes.includes('close')) return 'Close';
        if (classes.includes('menu')) return 'Menu';
        if (classes.includes('toggle')) return 'Toggle';
        if (classes.includes('play')) return 'Play';
        if (classes.includes('pause')) return 'Pause';
        if (classes.includes('reset')) return 'Reset';
        if (classes.includes('search')) return 'Search';
        
        if (parent?.className.includes('theme-switcher')) return 'Toggle theme';
        if (parent?.className.includes('sidebar')) return 'Toggle sidebar';
        
        return null;
    }

    /**
     * Announce message to screen readers
     */
    announce(message, priority = 'polite') {
        if (!message) return;
        
        const region = priority === 'assertive' ? 
            this.screenReader.alertRegion : 
            this.screenReader.liveRegion;
        
        if (region) {
            // Clear previous message
            region.textContent = '';
            
            // Add new message after a brief delay
            setTimeout(() => {
                region.textContent = message;
            }, 100);
            
            // Clear message after it's been announced
            setTimeout(() => {
                region.textContent = '';
            }, 5000);
        }
        
        // Store announcement in history
        this.screenReader.announcements.push({
            message,
            priority,
            timestamp: Date.now()
        });
        
        // Keep only recent announcements
        if (this.screenReader.announcements.length > 50) {
            this.screenReader.announcements.shift();
        }
    }

    /**
     * Update status for screen readers
     */
    updateStatus(status) {
        if (this.screenReader.statusRegion) {
            this.screenReader.statusRegion.textContent = status;
        }
    }

    /**
     * Show alert to screen readers
     */
    showAlert(message) {
        this.announce(message, 'assertive');
    }

    /**
     * Shortcut action implementations
     */
    toggleAnimation() {
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        
        if (playBtn && !playBtn.disabled) {
            playBtn.click();
        } else if (pauseBtn && !pauseBtn.disabled) {
            pauseBtn.click();
        }
    }

    resetCamera() {
        const resetBtn = document.getElementById('resetCamera');
        if (resetBtn) {
            resetBtn.click();
        }
    }

    fitToView() {
        const fitBtn = document.getElementById('fitToView');
        if (fitBtn) {
            fitBtn.click();
        }
    }

    toggleGrid() {
        const gridToggle = document.getElementById('showGrid');
        if (gridToggle) {
            gridToggle.checked = !gridToggle.checked;
            gridToggle.dispatchEvent(new Event('change'));
        }
    }

    toggleHelp() {
        // Implementation depends on help system
        this.coreEngine.emit('ui:toggle:help');
    }

    toggleSuperhero() {
        const superheroBtn = document.getElementById('superheroBtn');
        if (superheroBtn) {
            superheroBtn.click();
        }
    }

    closeDialogs() {
        const openDialogs = document.querySelectorAll('.modal.show, .dialog.show');
        openDialogs.forEach(dialog => this.closeModal(dialog));
    }

    /**
     * Close modal and restore focus
     */
    closeModal(modal) {
        modal.classList.remove('show');
        
        // Restore focus to the element that opened the modal
        if (this.focusManager.lastFocusedElement) {
            this.focusManager.lastFocusedElement.focus();
        }
        
        this.announce('Dialog closed');
    }

    /**
     * Update list of focusable elements
     */
    updateFocusableElements() {
        const focusableSelectors = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '[role="button"]:not([disabled])',
            '[role="link"]:not([disabled])'
        ];
        
        this.keyboardNavigation.focusableElements = Array.from(
            document.querySelectorAll(focusableSelectors.join(', '))
        ).filter(el => {
            return el.offsetParent !== null && // Element is visible
                   !el.hasAttribute('aria-hidden') &&
                   getComputedStyle(el).visibility !== 'hidden';
        });
    }

    /**
     * Setup roving tabindex for complex widgets
     */
    setupRovingTabindex() {
        // Setup for button groups
        document.querySelectorAll('.button-group').forEach(group => {
            const buttons = group.querySelectorAll('button:not([disabled])');
            if (buttons.length > 1) {
                buttons.forEach((button, index) => {
                    button.setAttribute('tabindex', index === 0 ? '0' : '-1');
                });
            }
        });
    }

    /**
     * Setup focus trap functionality
     */
    setupFocusTrap() {
        // This will be used for modals and dialogs
    }

    /**
     * Load accessibility preferences from localStorage
     */
    loadAccessibilityPreferences() {
        const saved = localStorage.getItem('accessibility-preferences');
        if (saved) {
            try {
                const preferences = JSON.parse(saved);
                this.preferences = { ...this.preferences, ...preferences };
            } catch (error) {
                console.warn('Failed to load accessibility preferences:', error);
            }
        }
    }

    /**
     * Save accessibility preferences to localStorage
     */
    saveAccessibilityPreferences() {
        localStorage.setItem('accessibility-preferences', JSON.stringify(this.preferences));
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for model loading events
        this.coreEngine.on('assets:loading:start', () => {
            if (this.preferences.announceModelLoading) {
                this.updateStatus('Loading 3D model');
            }
        });
        
        this.coreEngine.on('assets:model:loaded', (data) => {
            if (this.preferences.announceModelLoading) {
                this.announce('3D model loaded and ready for interaction');
                this.updateStatus('Model loaded');
            }
        });
        
        this.coreEngine.on('assets:loading:error', () => {
            if (this.preferences.announceModelLoading) {
                this.showAlert('Failed to load 3D model');
                this.updateStatus('Loading failed');
            }
        });
        
        // Listen for UI state changes
        this.coreEngine.on('ui:mode:changed', (data) => {
            if (this.preferences.announceStateChanges) {
                this.announce(`Switched to ${data.newMode} mode`);
            }
        });
        
        // Listen for accordion state changes
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('accordion-header')) {
                const isOpen = event.target.parentElement.classList.contains('is-open');
                event.target.setAttribute('aria-expanded', isOpen.toString());
            }
        });
    }

    /**
     * Add zoom controls for text scaling
     */
    addZoomControls() {
        // This could be implemented as a separate accessibility toolbar
    }

    /**
     * Get accessibility preferences
     */
    getPreferences() {
        return { ...this.preferences };
    }

    /**
     * Update accessibility preferences
     */
    updatePreferences(newPreferences) {
        this.preferences = { ...this.preferences, ...newPreferences };
        this.saveAccessibilityPreferences();
        this.coreEngine.emit('accessibility:preferences:changed', this.preferences);
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener('focusin', this.handleFocusIn);
        document.removeEventListener('focusout', this.handleFocusOut);
        
        // Remove live regions
        if (this.screenReader.liveRegion) {
            this.screenReader.liveRegion.remove();
        }
        if (this.screenReader.statusRegion) {
            this.screenReader.statusRegion.remove();
        }
        if (this.screenReader.alertRegion) {
            this.screenReader.alertRegion.remove();
        }
        
        // Clear data
        this.shortcuts.clear();
        this.screenReader.announcements = [];
        this.keyboardNavigation.focusableElements = [];
        this.focusManager.focusHistory = [];
        
        this.initialized = false;
    }
}