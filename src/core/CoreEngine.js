import { ErrorManager } from './ErrorManager.js';
import { WebGLRecovery } from './WebGLRecovery.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';

/**
 * CoreEngine - Central orchestrator for the 3D viewer application
 * Manages all modules and provides event system for communication
 */
export class CoreEngine {
    constructor() {
        this.modules = new Map();
        this.eventListeners = new Map();
        this.state = {
            currentModel: null,
            isLoading: false,
            error: null,
            settings: {
                theme: 'light',
                quality: 'high',
                autoRotate: false
            }
        };
        
        this.initialized = false;
        
        // Initialize error handling and monitoring systems
        this.errorManager = new ErrorManager(this);
        this.webglRecovery = new WebGLRecovery(this);
        this.performanceMonitor = new PerformanceMonitor(this);
    }

    /**
     * Initialize the core engine and all modules
     * @returns {Promise<void>} Promise that resolves when initialization is complete
     * @throws {Error} If initialization fails
     */
    async init() {
        if (this.initialized) {
            console.warn('CoreEngine already initialized');
            return;
        }

        try {
            // Initialize error handling systems first
            this.errorManager.init();
            
            // Delay performance monitoring to avoid startup noise
            setTimeout(() => {
                this.performanceMonitor.startMonitoring();
            }, 10000); // Start monitoring after 10 seconds
            
            // Initialize modules will be done by the main application
            this.initialized = true;
            this.emit('core:initialized');
        } catch (error) {
            console.error('Failed to initialize CoreEngine:', error);
            this.setState({ error: error.message });
            
            // Use error manager to handle initialization error
            if (this.errorManager) {
                await this.errorManager.handleError(error, {
                    type: ErrorManager.ERROR_TYPES.INITIALIZATION_ERROR,
                    severity: ErrorManager.ERROR_SEVERITY.CRITICAL,
                    context: { phase: 'core_initialization' }
                });
            }
            
            throw error;
        }
    }

    /**
     * Register a module with the core engine
     */
    registerModule(name, module) {
        if (this.modules.has(name)) {
            console.warn(`Module ${name} already registered`);
            return;
        }

        this.modules.set(name, module);
        this.emit('module:registered', { name, module });
    }

    /**
     * Get a registered module
     */
    getModule(name) {
        return this.modules.get(name);
    }

    /**
     * Event system for module communication
     */
    emit(event, data = null) {
        if (!this.eventListeners.has(event)) {
            return;
        }

        const listeners = this.eventListeners.get(event);
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
                
                // Use error manager to handle event listener errors
                if (this.errorManager) {
                    this.errorManager.handleError(error, {
                        type: ErrorManager.ERROR_TYPES.MODULE_ERROR,
                        severity: ErrorManager.ERROR_SEVERITY.MEDIUM,
                        context: { event, data }
                    });
                }
            }
        });
    }

    /**
     * Subscribe to events
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Unsubscribe from events
     */
    off(event, callback) {
        if (!this.eventListeners.has(event)) {
            return;
        }

        const listeners = this.eventListeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    /**
     * State management
     */
    getState() {
        return { ...this.state };
    }

    setState(newState) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };
        this.emit('state:changed', { oldState, newState: this.state });
    }

    /**
     * Update a specific part of the state
     */
    updateState(path, value) {
        const keys = path.split('.');
        let current = this.state;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        this.emit('state:changed', { path, value, state: this.state });
    }

    /**
     * Handle errors through the error manager
     */
    async handleError(error, options = {}) {
        if (this.errorManager) {
            return await this.errorManager.handleError(error, options);
        } else {
            console.error('Error occurred before ErrorManager initialization:', error);
            return null;
        }
    }

    /**
     * Get error manager instance
     */
    getErrorManager() {
        return this.errorManager;
    }

    /**
     * Get WebGL recovery instance
     */
    getWebGLRecovery() {
        return this.webglRecovery;
    }

    /**
     * Get performance monitor instance
     */
    getPerformanceMonitor() {
        return this.performanceMonitor;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Stop performance monitoring
        if (this.performanceMonitor) {
            this.performanceMonitor.destroy();
        }

        // Cleanup error manager
        if (this.errorManager) {
            this.errorManager.destroy();
        }

        // Cleanup WebGL recovery
        if (this.webglRecovery) {
            this.webglRecovery.destroy();
        }

        // Destroy all modules
        this.modules.forEach((module, name) => {
            if (typeof module.destroy === 'function') {
                try {
                    module.destroy();
                } catch (error) {
                    console.error(`Error destroying module ${name}:`, error);
                }
            }
        });

        // Clear all event listeners
        this.eventListeners.clear();
        this.modules.clear();
        this.initialized = false;
        
        this.emit('core:destroyed');
    }
}