import { ExportPanel } from './ExportPanel.js';
import { NotificationSystem } from './NotificationSystem.js';
import { AccessibilityManager } from './AccessibilityManager.js';
import { ThemeManager } from './ThemeManager.js';
import { KeyboardShortcutManager } from './KeyboardShortcutManager.js';

/**
 * UIManager - Manages the user interface, panels, and UI interactions
 */
export class UIManager {
    constructor(core) {
        this.core = core;
        this.panels = new Map();
        this.eventListeners = new Map();

        // Accessibility and internationalization managers
        this.accessibilityManager = new AccessibilityManager(core);
        this.themeManager = new ThemeManager(core);
        this.keyboardShortcutManager = new KeyboardShortcutManager(core);

        // UI components
        this.layoutManager = new LayoutManager();
        this.helpSystem = new HelpSystem();
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
        await this.accessibilityManager.initialize();
        await this.themeManager.initialize();
        await this.keyboardShortcutManager.initialize();

        // Initialize other sub-managers
        this.layoutManager.init(this);
        this.helpSystem.init(this);
        this.notificationSystem.init();

        this.setupEventListeners();
        this.setupPanels();

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
        this.core.on('assets:loading:error', (data) => {
            this.showProgress(false);
            if (this.notificationSystem) {
                this.notificationSystem.showNotification({
                    id: `load-error-${Date.now()}`,
                    type: 'error',
                    message: data?.message || 'Failed to load model. Please check the URL or file format.',
                    duration: 8000
                });
            }
        });

        this.core.on('assets:model:loaded', (data) => this.onModelLoaded(data));
        this.core.on('assets:model:error', (data) => {
            this.showProgress(false);
            if (this.notificationSystem) {
                this.notificationSystem.showNotification({
                    id: `model-error-${Date.now()}`,
                    type: 'error',
                    message: data?.message || 'Failed to process model.',
                    duration: 8000
                });
            }
        });

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
     * Update panel visibility
     */
    updatePanelVisibility() {
        this.panels.forEach((panel) => {
            if (panel.visible) {
                panel.element.classList.remove('hidden');
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

        // Hide centralized drag-and-drop overlay and show floating toolbar
        const emptyStateOverlay = document.getElementById('emptyStateOverlay');
        if (emptyStateOverlay) emptyStateOverlay.classList.add('hidden');

        const bottomToolbar = document.getElementById('bottomToolbar');
        if (bottomToolbar) {
            bottomToolbar.classList.remove('hidden');
            bottomToolbar.classList.add('visible');
        }
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