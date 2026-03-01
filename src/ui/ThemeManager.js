/**
 * ThemeManager - Manages themes, high contrast modes, and visual accessibility features
 * Provides comprehensive theming support with accessibility considerations
 */
export class ThemeManager {
    constructor(coreEngine) {
        this.coreEngine = coreEngine;
        this.initialized = false;
        
        // Current theme state
        this.currentTheme = 'light';
        this.highContrastMode = false;
        this.reducedMotion = false;
        this.largeText = false;
        
        // Available themes
        this.themes = new Map([
            ['light', {
                name: 'Light',
                colors: {
                    primary: '#0066cc',
                    secondary: '#6c757d',
                    success: '#28a745',
                    warning: '#ffc107',
                    danger: '#dc3545',
                    info: '#17a2b8',
                    background: '#ffffff',
                    surface: '#f8f9fa',
                    text: '#212529',
                    textSecondary: '#6c757d',
                    border: '#dee2e6',
                    shadow: 'rgba(0, 0, 0, 0.1)'
                }
            }],
            ['dark', {
                name: 'Dark',
                colors: {
                    primary: '#4dabf7',
                    secondary: '#adb5bd',
                    success: '#51cf66',
                    warning: '#ffd43b',
                    danger: '#ff6b6b',
                    info: '#22b8cf',
                    background: '#1a1a1a',
                    surface: '#2d2d2d',
                    text: '#ffffff',
                    textSecondary: '#adb5bd',
                    border: '#495057',
                    shadow: 'rgba(0, 0, 0, 0.3)'
                }
            }],
            ['high-contrast-light', {
                name: 'High Contrast Light',
                colors: {
                    primary: '#0000ff',
                    secondary: '#000000',
                    success: '#008000',
                    warning: '#ff8c00',
                    danger: '#ff0000',
                    info: '#0000ff',
                    background: '#ffffff',
                    surface: '#ffffff',
                    text: '#000000',
                    textSecondary: '#000000',
                    border: '#000000',
                    shadow: 'rgba(0, 0, 0, 0.5)'
                },
                highContrast: true
            }],
            ['high-contrast-dark', {
                name: 'High Contrast Dark',
                colors: {
                    primary: '#ffff00',
                    secondary: '#ffffff',
                    success: '#00ff00',
                    warning: '#ffff00',
                    danger: '#ff0000',
                    info: '#00ffff',
                    background: '#000000',
                    surface: '#000000',
                    text: '#ffffff',
                    textSecondary: '#ffffff',
                    border: '#ffffff',
                    shadow: 'rgba(255, 255, 255, 0.3)'
                },
                highContrast: true
            }],
            ['blue-light-filter', {
                name: 'Blue Light Filter',
                colors: {
                    primary: '#cc6600',
                    secondary: '#8b4513',
                    success: '#228b22',
                    warning: '#daa520',
                    danger: '#b22222',
                    info: '#4682b4',
                    background: '#fdf6e3',
                    surface: '#f5f0e6',
                    text: '#5d4e37',
                    textSecondary: '#8b7355',
                    border: '#d2b48c',
                    shadow: 'rgba(139, 69, 19, 0.1)'
                }
            }]
        ]);
        
        // Font size scales
        this.fontSizes = new Map([
            ['small', { scale: 0.875, name: 'Small' }],
            ['normal', { scale: 1.0, name: 'Normal' }],
            ['large', { scale: 1.125, name: 'Large' }],
            ['extra-large', { scale: 1.25, name: 'Extra Large' }],
            ['huge', { scale: 1.5, name: 'Huge' }]
        ]);
        
        this.currentFontSize = 'normal';
        
        // Motion preferences
        this.motionSettings = {
            animations: true,
            transitions: true,
            parallax: true,
            autoplay: true
        };
        
        // Custom CSS properties
        this.customProperties = new Map();
    }

    /**
     * Initialize the theme manager
     */
    async initialize() {
        if (this.initialized) {
            console.warn('ThemeManager already initialized');
            return;
        }

        try {
            // Load user preferences
            this.loadThemePreferences();
            
            // Detect system preferences
            this.detectSystemPreferences();
            
            // Apply initial theme
            this.applyTheme(this.currentTheme);
            
            // Setup theme switching UI
            this.setupThemeControls();
            
            // Setup accessibility features
            this.setupAccessibilityFeatures();
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.initialized = true;
            this.coreEngine.emit('theme:initialized', {
                theme: this.currentTheme,
                highContrast: this.highContrastMode,
                fontSize: this.currentFontSize
            });
            
        } catch (error) {
            console.error('Failed to initialize ThemeManager:', error);
            this.coreEngine.emit('error', {
                type: 'ThemeInitializationError',
                message: error.message,
                context: { module: 'ThemeManager' }
            });
        }
    }

    /**
     * Load theme preferences from localStorage
     */
    loadThemePreferences() {
        const savedTheme = localStorage.getItem('theme-preference');
        if (savedTheme && this.themes.has(savedTheme)) {
            this.currentTheme = savedTheme;
        }
        
        const savedFontSize = localStorage.getItem('font-size-preference');
        if (savedFontSize && this.fontSizes.has(savedFontSize)) {
            this.currentFontSize = savedFontSize;
        }
        
        const savedMotion = localStorage.getItem('motion-preferences');
        if (savedMotion) {
            try {
                this.motionSettings = { ...this.motionSettings, ...JSON.parse(savedMotion) };
            } catch (error) {
                console.warn('Failed to parse motion preferences:', error);
            }
        }
        
        this.highContrastMode = localStorage.getItem('high-contrast-mode') === 'true';
        this.reducedMotion = localStorage.getItem('reduced-motion') === 'true';
        this.largeText = localStorage.getItem('large-text') === 'true';
    }

    /**
     * Detect system accessibility preferences
     */
    detectSystemPreferences() {
        // Check for dark mode preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches && this.currentTheme === 'light') {
            this.currentTheme = 'dark';
        }
        
        // Check for high contrast preference
        if (window.matchMedia('(prefers-contrast: high)').matches) {
            this.highContrastMode = true;
            this.currentTheme = this.currentTheme === 'dark' ? 'high-contrast-dark' : 'high-contrast-light';
        }
        
        // Check for reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.reducedMotion = true;
            this.motionSettings.animations = false;
            this.motionSettings.transitions = false;
            this.motionSettings.parallax = false;
            this.motionSettings.autoplay = false;
        }
        
        // Listen for system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme-preference')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
        
        window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
            this.setHighContrastMode(e.matches);
        });
        
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            this.setReducedMotion(e.matches);
        });
    }

    /**
     * Apply a theme
     */
    applyTheme(themeId) {
        const theme = this.themes.get(themeId);
        if (!theme) {
            console.warn(`Theme not found: ${themeId}`);
            return false;
        }
        
        const root = document.documentElement;
        
        // Apply theme colors as CSS custom properties
        Object.entries(theme.colors).forEach(([key, value]) => {
            root.style.setProperty(`--color-${key}`, value);
        });
        
        // Apply theme class
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${themeId}`);
        
        // Apply high contrast if theme supports it
        if (theme.highContrast) {
            document.body.classList.add('high-contrast');
            this.highContrastMode = true;
        } else {
            document.body.classList.remove('high-contrast');
            this.highContrastMode = false;
        }
        
        // Apply font size
        this.applyFontSize(this.currentFontSize);
        
        // Apply motion settings
        this.applyMotionSettings();
        
        // Update theme toggle UI
        this.updateThemeToggle();
        
        this.currentTheme = themeId;
        
        // Save preference
        localStorage.setItem('theme-preference', themeId);
        
        // Emit theme change event
        this.coreEngine.emit('theme:changed', {
            theme: themeId,
            colors: theme.colors,
            highContrast: this.highContrastMode
        });
        
        return true;
    }

    /**
     * Set theme by ID
     */
    setTheme(themeId) {
        return this.applyTheme(themeId);
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        return this.setTheme(newTheme);
    }

    /**
     * Set high contrast mode
     */
    setHighContrastMode(enabled) {
        this.highContrastMode = enabled;
        
        if (enabled) {
            const contrastTheme = this.currentTheme.includes('dark') ? 'high-contrast-dark' : 'high-contrast-light';
            this.applyTheme(contrastTheme);
        } else {
            const normalTheme = this.currentTheme.includes('dark') ? 'dark' : 'light';
            this.applyTheme(normalTheme);
        }
        
        localStorage.setItem('high-contrast-mode', enabled.toString());
        
        this.coreEngine.emit('theme:high-contrast:changed', { enabled });
    }

    /**
     * Toggle high contrast mode
     */
    toggleHighContrast() {
        this.setHighContrastMode(!this.highContrastMode);
    }

    /**
     * Apply font size scale
     */
    applyFontSize(sizeId) {
        const sizeConfig = this.fontSizes.get(sizeId);
        if (!sizeConfig) {
            console.warn(`Font size not found: ${sizeId}`);
            return false;
        }
        
        const root = document.documentElement;
        root.style.setProperty('--font-scale', sizeConfig.scale.toString());
        
        // Apply size class
        document.body.className = document.body.className.replace(/font-size-\w+/g, '');
        document.body.classList.add(`font-size-${sizeId}`);
        
        this.currentFontSize = sizeId;
        this.largeText = sizeId === 'large' || sizeId === 'extra-large' || sizeId === 'huge';
        
        // Save preference
        localStorage.setItem('font-size-preference', sizeId);
        localStorage.setItem('large-text', this.largeText.toString());
        
        this.coreEngine.emit('theme:font-size:changed', {
            size: sizeId,
            scale: sizeConfig.scale,
            largeText: this.largeText
        });
        
        return true;
    }

    /**
     * Set font size
     */
    setFontSize(sizeId) {
        return this.applyFontSize(sizeId);
    }

    /**
     * Increase font size
     */
    increaseFontSize() {
        const sizes = Array.from(this.fontSizes.keys());
        const currentIndex = sizes.indexOf(this.currentFontSize);
        const nextIndex = Math.min(currentIndex + 1, sizes.length - 1);
        return this.setFontSize(sizes[nextIndex]);
    }

    /**
     * Decrease font size
     */
    decreaseFontSize() {
        const sizes = Array.from(this.fontSizes.keys());
        const currentIndex = sizes.indexOf(this.currentFontSize);
        const prevIndex = Math.max(currentIndex - 1, 0);
        return this.setFontSize(sizes[prevIndex]);
    }

    /**
     * Set reduced motion mode
     */
    setReducedMotion(enabled) {
        this.reducedMotion = enabled;
        
        if (enabled) {
            this.motionSettings.animations = false;
            this.motionSettings.transitions = false;
            this.motionSettings.parallax = false;
            this.motionSettings.autoplay = false;
        } else {
            this.motionSettings.animations = true;
            this.motionSettings.transitions = true;
            this.motionSettings.parallax = true;
            this.motionSettings.autoplay = true;
        }
        
        this.applyMotionSettings();
        
        localStorage.setItem('reduced-motion', enabled.toString());
        localStorage.setItem('motion-preferences', JSON.stringify(this.motionSettings));
        
        this.coreEngine.emit('theme:motion:changed', {
            reducedMotion: enabled,
            settings: this.motionSettings
        });
    }

    /**
     * Apply motion settings
     */
    applyMotionSettings() {
        const root = document.documentElement;
        
        // Apply motion preferences as CSS custom properties
        root.style.setProperty('--animation-duration', this.motionSettings.animations ? '0.3s' : '0.01ms');
        root.style.setProperty('--transition-duration', this.motionSettings.transitions ? '0.2s' : '0.01ms');
        
        // Apply motion classes
        document.body.classList.toggle('reduced-motion', this.reducedMotion);
        document.body.classList.toggle('no-animations', !this.motionSettings.animations);
        document.body.classList.toggle('no-transitions', !this.motionSettings.transitions);
        document.body.classList.toggle('no-parallax', !this.motionSettings.parallax);
        document.body.classList.toggle('no-autoplay', !this.motionSettings.autoplay);
    }

    /**
     * Setup theme controls in the UI
     */
    setupThemeControls() {
        // Create accessibility panel if it doesn't exist
        this.createAccessibilityPanel();
        
        // Update existing theme toggle
        this.updateThemeToggle();
    }

    /**
     * Create accessibility panel
     */
    createAccessibilityPanel() {
        // Check if accessibility panel already exists
        if (document.getElementById('accessibilityPanel')) {
            return;
        }
        
        const panel = document.createElement('div');
        panel.id = 'accessibilityPanel';
        panel.className = 'accessibility-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <h3 data-i18n="ui.accessibility">Accessibility</h3>
                <button class="panel-close" aria-label="Close accessibility panel">
                    <svg class="icon" viewBox="0 0 24 24">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="panel-content">
                <div class="control-group">
                    <label for="themeSelect" data-i18n="settings.theme">Theme</label>
                    <select id="themeSelect" class="select-field">
                        ${Array.from(this.themes.entries()).map(([id, theme]) => 
                            `<option value="${id}">${theme.name}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div class="control-group">
                    <label for="fontSizeSelect" data-i18n="settings.fontSize">Font Size</label>
                    <select id="fontSizeSelect" class="select-field">
                        ${Array.from(this.fontSizes.entries()).map(([id, size]) => 
                            `<option value="${id}">${size.name}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div class="control-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="highContrastToggle">
                        <span class="checkmark"></span>
                        <span data-i18n="settings.highContrast">High Contrast</span>
                    </label>
                </div>
                
                <div class="control-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="reducedMotionToggle">
                        <span class="checkmark"></span>
                        <span data-i18n="settings.reducedMotion">Reduce Motion</span>
                    </label>
                </div>
                
                <div class="control-group">
                    <button id="resetAccessibility" class="btn secondary full-width" data-i18n="action.resetToDefaults">
                        Reset to Defaults
                    </button>
                </div>
            </div>
        `;
        
        // Add to sidebar or create floating panel
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            // Add as accordion item
            const accordion = sidebar.querySelector('.accordion');
            if (accordion) {
                const accordionItem = document.createElement('div');
                accordionItem.className = 'accordion-item';
                accordionItem.innerHTML = `
                    <h3 class="accordion-header">
                        <svg class="icon" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
                        </svg>
                        <span data-i18n="ui.accessibility">Accessibility</span>
                    </h3>
                    <div class="accordion-content">
                        <div class="control-section">
                            ${panel.querySelector('.panel-content').innerHTML}
                        </div>
                    </div>
                `;
                accordion.appendChild(accordionItem);
            }
        } else {
            // Create floating panel
            document.body.appendChild(panel);
        }
        
        // Setup event listeners for controls
        this.setupAccessibilityControls();
    }

    /**
     * Setup event listeners for accessibility controls
     */
    setupAccessibilityControls() {
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.value = this.currentTheme;
            themeSelect.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
        }
        
        const fontSizeSelect = document.getElementById('fontSizeSelect');
        if (fontSizeSelect) {
            fontSizeSelect.value = this.currentFontSize;
            fontSizeSelect.addEventListener('change', (e) => {
                this.setFontSize(e.target.value);
            });
        }
        
        const highContrastToggle = document.getElementById('highContrastToggle');
        if (highContrastToggle) {
            highContrastToggle.checked = this.highContrastMode;
            highContrastToggle.addEventListener('change', (e) => {
                this.setHighContrastMode(e.target.checked);
            });
        }
        
        const reducedMotionToggle = document.getElementById('reducedMotionToggle');
        if (reducedMotionToggle) {
            reducedMotionToggle.checked = this.reducedMotion;
            reducedMotionToggle.addEventListener('change', (e) => {
                this.setReducedMotion(e.target.checked);
            });
        }
        
        const resetButton = document.getElementById('resetAccessibility');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetToDefaults();
            });
        }
    }

    /**
     * Update existing theme toggle
     */
    updateThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.checked = this.currentTheme === 'dark';
        }
    }

    /**
     * Setup accessibility features
     */
    setupAccessibilityFeatures() {
        // Add CSS for accessibility features
        const style = document.createElement('style');
        style.textContent = `
            /* High contrast styles */
            .high-contrast {
                --focus-color: #ffff00;
                --focus-width: 3px;
            }
            
            .high-contrast * {
                border-width: 2px !important;
            }
            
            .high-contrast button,
            .high-contrast input,
            .high-contrast select {
                border: 2px solid var(--color-border) !important;
            }
            
            .high-contrast :focus {
                outline: var(--focus-width) solid var(--focus-color) !important;
                outline-offset: 2px !important;
            }
            
            /* Font size scaling */
            .font-size-small { font-size: calc(1rem * var(--font-scale, 0.875)); }
            .font-size-normal { font-size: calc(1rem * var(--font-scale, 1.0)); }
            .font-size-large { font-size: calc(1rem * var(--font-scale, 1.125)); }
            .font-size-extra-large { font-size: calc(1rem * var(--font-scale, 1.25)); }
            .font-size-huge { font-size: calc(1rem * var(--font-scale, 1.5)); }
            
            /* Reduced motion */
            .reduced-motion *,
            .reduced-motion *::before,
            .reduced-motion *::after {
                animation-duration: var(--animation-duration) !important;
                animation-iteration-count: 1 !important;
                transition-duration: var(--transition-duration) !important;
                scroll-behavior: auto !important;
            }
            
            .no-animations * {
                animation: none !important;
            }
            
            .no-transitions * {
                transition: none !important;
            }
            
            /* Accessibility panel styles */
            .accessibility-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 300px;
                background: var(--color-surface);
                border: 1px solid var(--color-border);
                border-radius: 8px;
                box-shadow: 0 4px 12px var(--color-shadow);
                z-index: 1000;
                display: none;
            }
            
            .accessibility-panel.show {
                display: block;
            }
            
            .panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem;
                border-bottom: 1px solid var(--color-border);
            }
            
            .panel-header h3 {
                margin: 0;
                font-size: 1.1rem;
            }
            
            .panel-close {
                background: none;
                border: none;
                cursor: pointer;
                padding: 0.25rem;
                border-radius: 4px;
            }
            
            .panel-close:hover {
                background: var(--color-border);
            }
            
            .panel-content {
                padding: 1rem;
            }
            
            .control-group {
                margin-bottom: 1rem;
            }
            
            .control-group:last-child {
                margin-bottom: 0;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Reset all accessibility settings to defaults
     */
    resetToDefaults() {
        this.setTheme('light');
        this.setFontSize('normal');
        this.setHighContrastMode(false);
        this.setReducedMotion(false);
        
        // Clear localStorage
        localStorage.removeItem('theme-preference');
        localStorage.removeItem('font-size-preference');
        localStorage.removeItem('high-contrast-mode');
        localStorage.removeItem('reduced-motion');
        localStorage.removeItem('motion-preferences');
        
        // Update controls
        this.setupAccessibilityControls();
        
        this.coreEngine.emit('theme:reset');
    }

    /**
     * Get current theme information
     */
    getCurrentTheme() {
        return {
            id: this.currentTheme,
            theme: this.themes.get(this.currentTheme),
            highContrast: this.highContrastMode,
            fontSize: this.currentFontSize,
            reducedMotion: this.reducedMotion
        };
    }

    /**
     * Get available themes
     */
    getAvailableThemes() {
        return Array.from(this.themes.entries()).map(([id, theme]) => ({
            id,
            name: theme.name,
            highContrast: theme.highContrast || false
        }));
    }

    /**
     * Get available font sizes
     */
    getAvailableFontSizes() {
        return Array.from(this.fontSizes.entries()).map(([id, size]) => ({
            id,
            name: size.name,
            scale: size.scale
        }));
    }

    /**
     * Set custom CSS property
     */
    setCustomProperty(name, value) {
        document.documentElement.style.setProperty(`--${name}`, value);
        this.customProperties.set(name, value);
    }

    /**
     * Get custom CSS property
     */
    getCustomProperty(name) {
        return this.customProperties.get(name);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for theme change requests
        this.coreEngine.on('theme:set', (data) => {
            this.setTheme(data.theme);
        });
        
        this.coreEngine.on('theme:toggle', () => {
            this.toggleTheme();
        });
        
        this.coreEngine.on('theme:high-contrast:toggle', () => {
            this.toggleHighContrast();
        });
        
        this.coreEngine.on('theme:font-size:set', (data) => {
            this.setFontSize(data.size);
        });
        
        this.coreEngine.on('theme:font-size:increase', () => {
            this.increaseFontSize();
        });
        
        this.coreEngine.on('theme:font-size:decrease', () => {
            this.decreaseFontSize();
        });
        
        this.coreEngine.on('theme:motion:set', (data) => {
            this.setReducedMotion(data.reducedMotion);
        });
        
        // Listen for existing theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('change', (e) => {
                this.setTheme(e.target.checked ? 'dark' : 'light');
            });
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Remove event listeners
        this.coreEngine.off('theme:set');
        this.coreEngine.off('theme:toggle');
        this.coreEngine.off('theme:high-contrast:toggle');
        this.coreEngine.off('theme:font-size:set');
        this.coreEngine.off('theme:font-size:increase');
        this.coreEngine.off('theme:font-size:decrease');
        this.coreEngine.off('theme:motion:set');
        
        // Clear custom properties
        this.customProperties.clear();
        
        // Remove accessibility panel
        const panel = document.getElementById('accessibilityPanel');
        if (panel) {
            panel.remove();
        }
        
        this.initialized = false;
    }
}