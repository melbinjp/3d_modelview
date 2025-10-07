/**
 * KeyboardShortcutManager - Manages customizable keyboard shortcuts
 * Provides comprehensive keyboard shortcut system with conflict detection and user customization
 */
export class KeyboardShortcutManager {
    constructor(coreEngine) {
        this.coreEngine = coreEngine;
        this.initialized = false;
        
        // Shortcut registry
        this.shortcuts = new Map();
        this.customShortcuts = new Map();
        this.activeShortcuts = new Map();
        
        // Shortcut contexts
        this.contexts = new Map([
            ['global', { name: 'Global', description: 'Available everywhere' }],
            ['viewer', { name: '3D Viewer', description: 'When 3D viewer is focused' }],
            ['sidebar', { name: 'Sidebar', description: 'When sidebar is focused' }],
            ['modal', { name: 'Modal', description: 'When modal is open' }]
        ]);
        
        this.currentContext = 'global';
        
        // Key combination tracking
        this.pressedKeys = new Set();
        this.keySequence = [];
        this.sequenceTimeout = null;
        
        // Shortcut recording
        this.recording = {
            active: false,
            target: null,
            callback: null
        };
        
        // Default shortcuts
        this.defaultShortcuts = new Map([
            // Global shortcuts
            ['global.help', {
                keys: ['KeyH'],
                modifiers: [],
                action: 'showHelp',
                description: 'Show help panel',
                category: 'Navigation'
            }],
            ['global.search', {
                keys: ['KeyF'],
                modifiers: ['ctrl'],
                action: 'focusSearch',
                description: 'Focus search field',
                category: 'Navigation'
            }],
            ['global.escape', {
                keys: ['Escape'],
                modifiers: [],
                action: 'closeDialogs',
                description: 'Close open dialogs',
                category: 'Navigation'
            }],
            
            // Viewer shortcuts
            ['viewer.play', {
                keys: ['Space'],
                modifiers: [],
                action: 'toggleAnimation',
                description: 'Play/Pause animation',
                category: 'Animation'
            }],
            ['viewer.reset', {
                keys: ['KeyR'],
                modifiers: [],
                action: 'resetCamera',
                description: 'Reset camera view',
                category: 'Camera'
            }],
            ['viewer.fit', {
                keys: ['KeyF'],
                modifiers: [],
                action: 'fitToView',
                description: 'Fit model to view',
                category: 'Camera'
            }],
            ['viewer.grid', {
                keys: ['KeyG'],
                modifiers: [],
                action: 'toggleGrid',
                description: 'Toggle grid visibility',
                category: 'Display'
            }],
            ['viewer.wireframe', {
                keys: ['KeyW'],
                modifiers: [],
                action: 'toggleWireframe',
                description: 'Toggle wireframe mode',
                category: 'Display'
            }],
            ['viewer.superhero', {
                keys: ['KeyS'],
                modifiers: [],
                action: 'toggleSuperhero',
                description: 'Toggle superhero mode',
                category: 'Effects'
            }],
            ['viewer.fullscreen', {
                keys: ['F11'],
                modifiers: [],
                action: 'toggleFullscreen',
                description: 'Toggle fullscreen',
                category: 'Display'
            }],
            
            // File operations
            ['global.open', {
                keys: ['KeyO'],
                modifiers: ['ctrl'],
                action: 'openFile',
                description: 'Open file dialog',
                category: 'File'
            }],
            ['global.save', {
                keys: ['KeyS'],
                modifiers: ['ctrl'],
                action: 'saveScreenshot',
                description: 'Save screenshot',
                category: 'File'
            }],
            ['global.export', {
                keys: ['KeyE'],
                modifiers: ['ctrl'],
                action: 'showExportDialog',
                description: 'Show export dialog',
                category: 'File'
            }],
            
            // UI shortcuts
            ['global.sidebar', {
                keys: ['KeyB'],
                modifiers: ['ctrl'],
                action: 'toggleSidebar',
                description: 'Toggle sidebar',
                category: 'Interface'
            }],
            ['global.theme', {
                keys: ['KeyT'],
                modifiers: ['ctrl'],
                action: 'toggleTheme',
                description: 'Toggle theme',
                category: 'Interface'
            }],
            ['global.mode', {
                keys: ['KeyM'],
                modifiers: ['ctrl'],
                action: 'toggleUIMode',
                description: 'Toggle UI mode',
                category: 'Interface'
            }],
            
            // Accessibility shortcuts
            ['global.contrast', {
                keys: ['KeyC'],
                modifiers: ['ctrl', 'shift'],
                action: 'toggleHighContrast',
                description: 'Toggle high contrast',
                category: 'Accessibility'
            }],
            ['global.fontSize.increase', {
                keys: ['Equal'],
                modifiers: ['ctrl'],
                action: 'increaseFontSize',
                description: 'Increase font size',
                category: 'Accessibility'
            }],
            ['global.fontSize.decrease', {
                keys: ['Minus'],
                modifiers: ['ctrl'],
                action: 'decreaseFontSize',
                description: 'Decrease font size',
                category: 'Accessibility'
            }],
            
            // Camera controls
            ['viewer.camera.up', {
                keys: ['ArrowUp'],
                modifiers: ['shift'],
                action: 'moveCameraUp',
                description: 'Move camera up',
                category: 'Camera'
            }],
            ['viewer.camera.down', {
                keys: ['ArrowDown'],
                modifiers: ['shift'],
                action: 'moveCameraDown',
                description: 'Move camera down',
                category: 'Camera'
            }],
            ['viewer.camera.left', {
                keys: ['ArrowLeft'],
                modifiers: ['shift'],
                action: 'moveCameraLeft',
                description: 'Move camera left',
                category: 'Camera'
            }],
            ['viewer.camera.right', {
                keys: ['ArrowRight'],
                modifiers: ['shift'],
                action: 'moveCameraRight',
                description: 'Move camera right',
                category: 'Camera'
            }],
            
            // Quick actions
            ['global.quickSample1', {
                keys: ['Digit1'],
                modifiers: ['ctrl'],
                action: 'loadQuickSample1',
                description: 'Load sample model 1',
                category: 'Quick Actions'
            }],
            ['global.quickSample2', {
                keys: ['Digit2'],
                modifiers: ['ctrl'],
                action: 'loadQuickSample2',
                description: 'Load sample model 2',
                category: 'Quick Actions'
            }],
            ['global.quickSample3', {
                keys: ['Digit3'],
                modifiers: ['ctrl'],
                action: 'loadQuickSample3',
                description: 'Load sample model 3',
                category: 'Quick Actions'
            }]
        ]);
        
        // Shortcut categories for organization
        this.categories = new Map([
            ['Navigation', { name: 'Navigation', icon: 'navigation' }],
            ['Camera', { name: 'Camera', icon: 'camera' }],
            ['Animation', { name: 'Animation', icon: 'play' }],
            ['Display', { name: 'Display', icon: 'eye' }],
            ['Effects', { name: 'Effects', icon: 'sparkles' }],
            ['File', { name: 'File', icon: 'folder' }],
            ['Interface', { name: 'Interface', icon: 'layout' }],
            ['Accessibility', { name: 'Accessibility', icon: 'accessibility' }],
            ['Quick Actions', { name: 'Quick Actions', icon: 'zap' }]
        ]);
    }

    /**
     * Initialize the keyboard shortcut manager
     */
    async initialize() {
        if (this.initialized) {
            console.warn('KeyboardShortcutManager already initialized');
            return;
        }

        try {
            // Load custom shortcuts from localStorage
            this.loadCustomShortcuts();
            
            // Register default shortcuts
            this.registerDefaultShortcuts();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup shortcut help system
            this.setupShortcutHelp();
            
            this.initialized = true;
            this.coreEngine.emit('shortcuts:initialized');
            
        } catch (error) {
            console.error('Failed to initialize KeyboardShortcutManager:', error);
            this.coreEngine.emit('error', {
                type: 'ShortcutInitializationError',
                message: error.message,
                context: { module: 'KeyboardShortcutManager' }
            });
        }
    }

    /**
     * Load custom shortcuts from localStorage
     */
    loadCustomShortcuts() {
        const saved = localStorage.getItem('keyboard-shortcuts');
        if (saved) {
            try {
                const shortcuts = JSON.parse(saved);
                this.customShortcuts = new Map(Object.entries(shortcuts));
            } catch (error) {
                console.warn('Failed to load custom shortcuts:', error);
            }
        }
    }

    /**
     * Save custom shortcuts to localStorage
     */
    saveCustomShortcuts() {
        const shortcuts = Object.fromEntries(this.customShortcuts);
        localStorage.setItem('keyboard-shortcuts', JSON.stringify(shortcuts));
    }

    /**
     * Register default shortcuts
     */
    registerDefaultShortcuts() {
        this.defaultShortcuts.forEach((shortcut, id) => {
            this.registerShortcut(id, shortcut);
        });
    }

    /**
     * Register a keyboard shortcut
     */
    registerShortcut(id, shortcut) {
        // Check for custom override
        const customShortcut = this.customShortcuts.get(id);
        if (customShortcut) {
            shortcut = { ...shortcut, ...customShortcut };
        }
        
        // Validate shortcut
        if (!this.validateShortcut(shortcut)) {
            console.warn(`Invalid shortcut configuration for ${id}:`, shortcut);
            return false;
        }
        
        // Check for conflicts
        const conflict = this.findConflict(id, shortcut);
        if (conflict) {
            console.warn(`Shortcut conflict detected for ${id}:`, conflict);
            return false;
        }
        
        // Register shortcut
        this.shortcuts.set(id, shortcut);
        this.activeShortcuts.set(this.getShortcutKey(shortcut), id);
        
        return true;
    }

    /**
     * Unregister a keyboard shortcut
     */
    unregisterShortcut(id) {
        const shortcut = this.shortcuts.get(id);
        if (shortcut) {
            this.shortcuts.delete(id);
            this.activeShortcuts.delete(this.getShortcutKey(shortcut));
            return true;
        }
        return false;
    }

    /**
     * Update a keyboard shortcut
     */
    updateShortcut(id, newShortcut) {
        const oldShortcut = this.shortcuts.get(id);
        if (!oldShortcut) {
            console.warn(`Shortcut not found: ${id}`);
            return false;
        }
        
        // Remove old shortcut
        this.unregisterShortcut(id);
        
        // Register new shortcut
        const updated = { ...oldShortcut, ...newShortcut };
        const success = this.registerShortcut(id, updated);
        
        if (success) {
            // Save custom shortcut
            this.customShortcuts.set(id, newShortcut);
            this.saveCustomShortcuts();
            
            this.coreEngine.emit('shortcuts:updated', { id, shortcut: updated });
        } else {
            // Restore old shortcut if update failed
            this.registerShortcut(id, oldShortcut);
        }
        
        return success;
    }

    /**
     * Validate shortcut configuration
     */
    validateShortcut(shortcut) {
        if (!shortcut.keys || !Array.isArray(shortcut.keys) || shortcut.keys.length === 0) {
            return false;
        }
        
        if (!shortcut.action || typeof shortcut.action !== 'string') {
            return false;
        }
        
        if (!shortcut.modifiers || !Array.isArray(shortcut.modifiers)) {
            return false;
        }
        
        return true;
    }

    /**
     * Find shortcut conflicts
     */
    findConflict(excludeId, shortcut) {
        const key = this.getShortcutKey(shortcut);
        const existingId = this.activeShortcuts.get(key);
        
        if (existingId && existingId !== excludeId) {
            return {
                conflictId: existingId,
                conflictShortcut: this.shortcuts.get(existingId)
            };
        }
        
        return null;
    }

    /**
     * Get shortcut key for indexing
     */
    getShortcutKey(shortcut) {
        const modifiers = [...shortcut.modifiers].sort();
        const keys = [...shortcut.keys].sort();
        return `${modifiers.join('+')}+${keys.join('+')}`;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Context change listeners
        document.addEventListener('focusin', this.handleFocusChange.bind(this));
        
        // Modal state listeners
        this.coreEngine.on('modal:opened', () => {
            this.setContext('modal');
        });
        
        this.coreEngine.on('modal:closed', () => {
            this.setContext('global');
        });
    }

    /**
     * Handle keydown events
     */
    handleKeyDown(event) {
        const { code, key, ctrlKey, altKey, shiftKey, metaKey } = event;
        
        // Skip if recording shortcuts
        if (this.recording.active) {
            this.handleShortcutRecording(event);
            return;
        }
        
        // Skip if in input field (unless it's a global shortcut with modifiers)
        if (this.isInputField(event.target) && !(ctrlKey || altKey || metaKey)) {
            return;
        }
        
        // Track pressed keys
        this.pressedKeys.add(code);
        
        // Build current key combination
        const modifiers = [];
        if (ctrlKey) modifiers.push('ctrl');
        if (altKey) modifiers.push('alt');
        if (shiftKey) modifiers.push('shift');
        if (metaKey) modifiers.push('meta');
        
        const shortcutKey = this.getShortcutKey({
            keys: [code],
            modifiers: modifiers
        });
        
        // Find matching shortcut
        const shortcutId = this.activeShortcuts.get(shortcutKey);
        if (shortcutId) {
            const shortcut = this.shortcuts.get(shortcutId);
            if (shortcut && this.isShortcutActive(shortcutId, shortcut)) {
                event.preventDefault();
                this.executeShortcut(shortcutId, shortcut, event);
            }
        }
    }

    /**
     * Handle keyup events
     */
    handleKeyUp(event) {
        this.pressedKeys.delete(event.code);
    }

    /**
     * Handle focus changes for context switching
     */
    handleFocusChange(event) {
        const target = event.target;
        
        if (target.closest('#viewer, canvas')) {
            this.setContext('viewer');
        } else if (target.closest('#sidebar')) {
            this.setContext('sidebar');
        } else {
            this.setContext('global');
        }
    }

    /**
     * Check if shortcut is active in current context
     */
    isShortcutActive(shortcutId, shortcut) {
        const [context] = shortcutId.split('.');
        return context === 'global' || context === this.currentContext;
    }

    /**
     * Check if element is an input field
     */
    isInputField(element) {
        const inputTypes = ['input', 'textarea', 'select'];
        const tagName = element.tagName.toLowerCase();
        
        if (inputTypes.includes(tagName)) {
            return true;
        }
        
        if (element.contentEditable === 'true') {
            return true;
        }
        
        return false;
    }

    /**
     * Execute a keyboard shortcut
     */
    executeShortcut(shortcutId, shortcut, event) {
        try {
            // Emit shortcut event
            this.coreEngine.emit('shortcut:executed', {
                id: shortcutId,
                shortcut,
                event
            });
            
            // Execute action
            this.executeAction(shortcut.action, event);
            
            // Show feedback if enabled
            this.showShortcutFeedback(shortcut);
            
        } catch (error) {
            console.error(`Error executing shortcut ${shortcutId}:`, error);
            this.coreEngine.emit('error', {
                type: 'ShortcutExecutionError',
                message: error.message,
                context: { shortcutId, action: shortcut.action }
            });
        }
    }

    /**
     * Execute shortcut action
     */
    executeAction(action, event) {
        switch (action) {
            // Navigation
            case 'showHelp':
                this.coreEngine.emit('ui:show:help');
                break;
            case 'focusSearch':
                this.focusSearch();
                break;
            case 'closeDialogs':
                this.coreEngine.emit('ui:close:dialogs');
                break;
                
            // Animation
            case 'toggleAnimation':
                this.coreEngine.emit('animation:toggle');
                break;
                
            // Camera
            case 'resetCamera':
                this.coreEngine.emit('camera:reset');
                break;
            case 'fitToView':
                this.coreEngine.emit('camera:fit');
                break;
            case 'moveCameraUp':
                this.coreEngine.emit('camera:move', { direction: 'up' });
                break;
            case 'moveCameraDown':
                this.coreEngine.emit('camera:move', { direction: 'down' });
                break;
            case 'moveCameraLeft':
                this.coreEngine.emit('camera:move', { direction: 'left' });
                break;
            case 'moveCameraRight':
                this.coreEngine.emit('camera:move', { direction: 'right' });
                break;
                
            // Display
            case 'toggleGrid':
                this.coreEngine.emit('display:toggle:grid');
                break;
            case 'toggleWireframe':
                this.coreEngine.emit('display:toggle:wireframe');
                break;
            case 'toggleFullscreen':
                this.toggleFullscreen();
                break;
                
            // Effects
            case 'toggleSuperhero':
                this.coreEngine.emit('effects:toggle:superhero');
                break;
                
            // File operations
            case 'openFile':
                this.coreEngine.emit('file:open');
                break;
            case 'saveScreenshot':
                this.coreEngine.emit('file:save:screenshot');
                break;
            case 'showExportDialog':
                this.coreEngine.emit('ui:show:export');
                break;
                
            // Interface
            case 'toggleSidebar':
                this.coreEngine.emit('ui:toggle:sidebar');
                break;
            case 'toggleTheme':
                this.coreEngine.emit('theme:toggle');
                break;
            case 'toggleUIMode':
                this.coreEngine.emit('ui:toggle:mode');
                break;
                
            // Accessibility
            case 'toggleHighContrast':
                this.coreEngine.emit('theme:high-contrast:toggle');
                break;
            case 'increaseFontSize':
                this.coreEngine.emit('theme:font-size:increase');
                break;
            case 'decreaseFontSize':
                this.coreEngine.emit('theme:font-size:decrease');
                break;
                
            // Quick actions
            case 'loadQuickSample1':
            case 'loadQuickSample2':
            case 'loadQuickSample3':
                const sampleIndex = parseInt(action.slice(-1)) - 1;
                this.coreEngine.emit('assets:load:sample', { index: sampleIndex });
                break;
                
            default:
                console.warn(`Unknown shortcut action: ${action}`);
        }
    }

    /**
     * Focus search field
     */
    focusSearch() {
        const searchField = document.querySelector('#librarySearch, #fileSearch, input[type="search"]');
        if (searchField) {
            searchField.focus();
            searchField.select();
        }
    }

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn('Failed to enter fullscreen:', err);
            });
        } else {
            document.exitFullscreen().catch(err => {
                console.warn('Failed to exit fullscreen:', err);
            });
        }
    }

    /**
     * Show shortcut feedback
     */
    showShortcutFeedback(shortcut) {
        // Create temporary feedback element
        const feedback = document.createElement('div');
        feedback.className = 'shortcut-feedback';
        feedback.textContent = shortcut.description;
        
        // Style the feedback
        Object.assign(feedback.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid var(--color-border)',
            boxShadow: '0 2px 8px var(--color-shadow)',
            fontSize: '0.875rem',
            zIndex: '10000',
            opacity: '0',
            transform: 'translateY(-10px)',
            transition: 'all 0.2s ease'
        });
        
        document.body.appendChild(feedback);
        
        // Animate in
        requestAnimationFrame(() => {
            feedback.style.opacity = '1';
            feedback.style.transform = 'translateY(0)';
        });
        
        // Remove after delay
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translateY(-10px)';
            setTimeout(() => feedback.remove(), 200);
        }, 2000);
    }

    /**
     * Set current context
     */
    setContext(context) {
        if (this.contexts.has(context)) {
            this.currentContext = context;
            this.coreEngine.emit('shortcuts:context:changed', { context });
        }
    }

    /**
     * Get current context
     */
    getContext() {
        return this.currentContext;
    }

    /**
     * Start recording a new shortcut
     */
    startRecording(targetId, callback) {
        this.recording.active = true;
        this.recording.target = targetId;
        this.recording.callback = callback;
        this.pressedKeys.clear();
        
        this.coreEngine.emit('shortcuts:recording:started', { target: targetId });
    }

    /**
     * Stop recording shortcut
     */
    stopRecording() {
        this.recording.active = false;
        this.recording.target = null;
        this.recording.callback = null;
        
        this.coreEngine.emit('shortcuts:recording:stopped');
    }

    /**
     * Handle shortcut recording
     */
    handleShortcutRecording(event) {
        event.preventDefault();
        
        const { code, ctrlKey, altKey, shiftKey, metaKey } = event;
        
        // Build recorded shortcut
        const modifiers = [];
        if (ctrlKey) modifiers.push('ctrl');
        if (altKey) modifiers.push('alt');
        if (shiftKey) modifiers.push('shift');
        if (metaKey) modifiers.push('meta');
        
        const recordedShortcut = {
            keys: [code],
            modifiers: modifiers
        };
        
        // Call callback with recorded shortcut
        if (this.recording.callback) {
            this.recording.callback(recordedShortcut);
        }
        
        this.stopRecording();
    }

    /**
     * Setup shortcut help system
     */
    setupShortcutHelp() {
        // Create help panel
        this.createShortcutHelpPanel();
        
        // Listen for help requests
        this.coreEngine.on('ui:show:help', () => {
            this.showShortcutHelp();
        });
    }

    /**
     * Create shortcut help panel
     */
    createShortcutHelpPanel() {
        const panel = document.createElement('div');
        panel.id = 'shortcutHelpPanel';
        panel.className = 'shortcut-help-panel modal hidden'; // Start hidden
        panel.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 data-i18n="ui.keyboardShortcuts">Keyboard Shortcuts</h2>
                    <button class="modal-close" aria-label="Close help panel">
                        <svg class="icon" viewBox="0 0 24 24">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="shortcut-categories" id="shortcutCategories">
                        <!-- Categories will be populated here -->
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="customizeShortcuts" class="btn secondary" data-i18n="action.customize">
                        Customize Shortcuts
                    </button>
                    <button id="resetShortcuts" class="btn secondary" data-i18n="action.resetToDefaults">
                        Reset to Defaults
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Setup event listeners
        panel.querySelector('.modal-close').addEventListener('click', () => {
            this.hideShortcutHelp();
        });
        
        panel.querySelector('#customizeShortcuts').addEventListener('click', () => {
            this.showShortcutCustomization();
        });
        
        panel.querySelector('#resetShortcuts').addEventListener('click', () => {
            this.resetShortcuts();
        });
        
        // Close on escape key
        panel.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideShortcutHelp();
            }
        });
        
        // Close when clicking outside the modal content
        panel.addEventListener('click', (e) => {
            if (e.target === panel) {
                this.hideShortcutHelp();
            }
        });
    }

    /**
     * Show shortcut help panel
     */
    showShortcutHelp() {
        const panel = document.getElementById('shortcutHelpPanel');
        if (panel) {
            this.populateShortcutHelp();
            panel.classList.remove('hidden');
            panel.classList.add('show');
            panel.focus();
        }
    }

    /**
     * Hide shortcut help panel
     */
    hideShortcutHelp() {
        const panel = document.getElementById('shortcutHelpPanel');
        if (panel) {
            panel.classList.remove('show');
            panel.classList.add('hidden');
        }
    }

    /**
     * Populate shortcut help content
     */
    populateShortcutHelp() {
        const container = document.getElementById('shortcutCategories');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Group shortcuts by category
        const shortcutsByCategory = new Map();
        
        this.shortcuts.forEach((shortcut, id) => {
            const category = shortcut.category || 'Other';
            if (!shortcutsByCategory.has(category)) {
                shortcutsByCategory.set(category, []);
            }
            shortcutsByCategory.get(category).push({ id, ...shortcut });
        });
        
        // Create category sections
        shortcutsByCategory.forEach((shortcuts, categoryName) => {
            const categorySection = document.createElement('div');
            categorySection.className = 'shortcut-category';
            
            const categoryHeader = document.createElement('h3');
            categoryHeader.textContent = categoryName;
            categorySection.appendChild(categoryHeader);
            
            const shortcutList = document.createElement('div');
            shortcutList.className = 'shortcut-list';
            
            shortcuts.forEach(shortcut => {
                const shortcutItem = document.createElement('div');
                shortcutItem.className = 'shortcut-item';
                
                const shortcutKeys = document.createElement('div');
                shortcutKeys.className = 'shortcut-keys';
                shortcutKeys.innerHTML = this.formatShortcutKeys(shortcut);
                
                const shortcutDesc = document.createElement('div');
                shortcutDesc.className = 'shortcut-description';
                shortcutDesc.textContent = shortcut.description;
                
                shortcutItem.appendChild(shortcutKeys);
                shortcutItem.appendChild(shortcutDesc);
                shortcutList.appendChild(shortcutItem);
            });
            
            categorySection.appendChild(shortcutList);
            container.appendChild(categorySection);
        });
    }

    /**
     * Format shortcut keys for display
     */
    formatShortcutKeys(shortcut) {
        const modifierNames = {
            ctrl: 'Ctrl',
            alt: 'Alt',
            shift: 'Shift',
            meta: 'Cmd'
        };
        
        const keyNames = {
            Space: 'Space',
            Escape: 'Esc',
            ArrowUp: '↑',
            ArrowDown: '↓',
            ArrowLeft: '←',
            ArrowRight: '→',
            F11: 'F11'
        };
        
        const parts = [];
        
        // Add modifiers
        shortcut.modifiers.forEach(mod => {
            parts.push(`<kbd class="modifier">${modifierNames[mod] || mod}</kbd>`);
        });
        
        // Add keys
        shortcut.keys.forEach(key => {
            let keyName = keyNames[key] || key.replace('Key', '').replace('Digit', '');
            parts.push(`<kbd class="key">${keyName}</kbd>`);
        });
        
        return parts.join(' + ');
    }

    /**
     * Show shortcut customization interface
     */
    showShortcutCustomization() {
        // Implementation for shortcut customization UI
        console.log('Shortcut customization not yet implemented');
    }

    /**
     * Reset all shortcuts to defaults
     */
    resetShortcuts() {
        if (confirm('Reset all keyboard shortcuts to defaults? This will remove all customizations.')) {
            this.customShortcuts.clear();
            localStorage.removeItem('keyboard-shortcuts');
            
            // Re-register default shortcuts
            this.shortcuts.clear();
            this.activeShortcuts.clear();
            this.registerDefaultShortcuts();
            
            this.coreEngine.emit('shortcuts:reset');
            
            // Update help panel
            this.populateShortcutHelp();
        }
    }

    /**
     * Get all shortcuts
     */
    getAllShortcuts() {
        return Array.from(this.shortcuts.entries()).map(([id, shortcut]) => ({
            id,
            ...shortcut
        }));
    }

    /**
     * Get shortcuts by category
     */
    getShortcutsByCategory(category) {
        return Array.from(this.shortcuts.entries())
            .filter(([id, shortcut]) => shortcut.category === category)
            .map(([id, shortcut]) => ({ id, ...shortcut }));
    }

    /**
     * Get shortcut by ID
     */
    getShortcut(id) {
        return this.shortcuts.get(id);
    }

    /**
     * Check if shortcut exists
     */
    hasShortcut(id) {
        return this.shortcuts.has(id);
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener('focusin', this.handleFocusChange);
        
        // Remove help panel
        const helpPanel = document.getElementById('shortcutHelpPanel');
        if (helpPanel) {
            helpPanel.remove();
        }
        
        // Clear data
        this.shortcuts.clear();
        this.customShortcuts.clear();
        this.activeShortcuts.clear();
        this.pressedKeys.clear();
        
        // Clear recording state
        this.recording.active = false;
        this.recording.target = null;
        this.recording.callback = null;
        
        this.initialized = false;
    }
}