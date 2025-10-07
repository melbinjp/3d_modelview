/**
 * WebGLRecovery - Handles WebGL context loss and restoration
 */
export class WebGLRecovery {
    constructor(core) {
        this.core = core;
        this.contextLostHandlers = new Set();
        this.contextRestoredHandlers = new Set();
        this.isContextLost = false;
        this.restoreAttempts = 0;
        this.maxRestoreAttempts = 3;
    }

    /**
     * Check if WebGL is supported
     */
    static isWebGLSupported() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }

    /**
     * Setup context loss handlers for a WebGL renderer
     */
    setupContextLossHandlers(canvas, renderer) {
        if (!canvas || !renderer) {
            console.warn('WebGLRecovery: Invalid canvas or renderer provided');
            return 0;
        }

        // Create default handlers
        const contextLostHandler = (event) => {
            event.preventDefault();
            this.isContextLost = true;
            console.warn('WebGL context lost');
            
            this.core.emit('webgl:context-lost', {
                timestamp: Date.now(),
                attempt: this.restoreAttempts
            });
            
            // Notify all registered handlers
            this.contextLostHandlers.forEach(handler => {
                try {
                    handler(event);
                } catch (error) {
                    console.error('Error in context lost handler:', error);
                }
            });
        };

        const contextRestoredHandler = (event) => {
            this.isContextLost = false;
            console.info('WebGL context restored');
            
            this.core.emit('webgl:context-restored', {
                timestamp: Date.now(),
                attempt: this.restoreAttempts
            });
            
            // Notify all registered handlers
            this.contextRestoredHandlers.forEach(handler => {
                try {
                    handler(event);
                } catch (error) {
                    console.error('Error in context restored handler:', error);
                }
            });
            
            this.restoreAttempts = 0;
        };

        // Add handlers to sets for tracking
        this.contextLostHandlers.add(contextLostHandler);
        this.contextRestoredHandlers.add(contextRestoredHandler);

        // Handle context loss
        canvas.addEventListener('webglcontextlost', contextLostHandler);

        // Handle context restoration
        canvas.addEventListener('webglcontextrestored', contextRestoredHandler);
        
        return 2; // Return count of handlers added
    }

    /**
     * Force context restoration attempt
     */
    async forceContextRestore(renderer) {
        if (!this.isContextLost) {
            return true;
        }

        if (this.restoreAttempts >= this.maxRestoreAttempts) {
            console.error('Maximum context restore attempts reached');
            return false;
        }

        this.restoreAttempts++;
        
        try {
            // Attempt to recreate the WebGL context
            const canvas = renderer.domElement;
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (gl && !gl.isContextLost()) {
                // Context is available, reinitialize renderer
                await this.reinitializeRenderer(renderer);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Failed to restore WebGL context:', error);
            return false;
        }
    }

    /**
     * Reinitialize renderer after context restoration
     */
    async reinitializeRenderer(renderer) {
        try {
            // Clear any cached WebGL resources
            renderer.dispose();
            
            // Reinitialize renderer state
            const canvas = renderer.domElement;
            const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (context) {
                // Restore renderer settings
                renderer.setSize(canvas.width, canvas.height, false);
                renderer.setPixelRatio(window.devicePixelRatio);
                
                this.core.emit('webgl:renderer-reinitialized', {
                    timestamp: Date.now()
                });
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Failed to reinitialize renderer:', error);
            return false;
        }
    }

    /**
     * Register context loss handler
     */
    onContextLost(handler) {
        this.contextLostHandlers.add(handler);
    }

    /**
     * Register context restored handler
     */
    onContextRestored(handler) {
        this.contextRestoredHandlers.add(handler);
    }

    /**
     * Remove context loss handler
     */
    removeContextLostHandler(handler) {
        this.contextLostHandlers.delete(handler);
    }

    /**
     * Remove context restored handler
     */
    removeContextRestoredHandler(handler) {
        this.contextRestoredHandlers.delete(handler);
    }

    /**
     * Get context status
     */
    getStatus() {
        return {
            isContextLost: this.isContextLost,
            restoreAttempts: this.restoreAttempts,
            maxRestoreAttempts: this.maxRestoreAttempts,
            webglSupported: WebGLRecovery.isWebGLSupported()
        };
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.contextLostHandlers.clear();
        this.contextRestoredHandlers.clear();
        this.isContextLost = false;
        this.restoreAttempts = 0;
    }
}